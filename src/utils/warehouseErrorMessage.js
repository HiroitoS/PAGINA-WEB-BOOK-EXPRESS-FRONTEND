// Mensajes para el personal de Book Express. Nunca mostrar detalles internos del servidor.
const labels = {
  name: "Nombre",
  kind: "Tipo de ubicación",
  address: "Dirección",
  notes: "Observaciones",
  is_active: "Estado",
  source_id: "Almacén de origen",
  destination_id: "Almacén de destino",
  stock_entry_id: "Libro seleccionado",
  receipt_id: "Guía seleccionada",
  quantity: "Cantidad",
  items: "Libros",
  page: "Página",
  idempotency_key: "Confirmación",
  non_field_errors: "",
  detail: "",
};

const technical = /(?:traceback|integrityerror|exception|database|sql|queryset|serializer|endpoint|localhost|https?:\/\/|\bapi\b|\bbackend\b|\bfrontend\b|\bnull\b|\bundefined\b|\bjson\b|\bhttp\b|\btoken\b|\bkeyerror\b|\btypeerror\b|\bvalueerror\b|\bfieldname\b|\.py\b|\.jsx\b|[{}<>])/i;
const humanPrefix = /^(?:No |Selecciona|Confirma|Ingresa|Revisa|Indica|Debes|Solo |Esta |Este |Estas |Estos |El |La |Los |Las |Hay |Ya |Se |Faltan |Cantidad |Primero |Puedes |Tu |No puedes)/i;

function userFacingText(value) {
  const parts = Array.isArray(value) ? value : [value];
  return parts
    .filter((part) => typeof part === "string")
    .map((part) => part.trim())
    .filter((part) =>
      part.length > 2 && part.length <= 220
      && humanPrefix.test(part) && !technical.test(part)
    )
    .slice(0, 2)
    .join(" ");
}

export function warehouseErrorMessage(
  error,
  fallback = "No pudimos completar la operación. Revisa los datos e inténtalo nuevamente.",
) {
  if (!error?.response) {
    return "No pudimos conectarnos. Revisa tu conexión e inténtalo nuevamente.";
  }
  const { status, data } = error.response;
  if (status === 401) return "Tu sesión terminó. Vuelve a ingresar para continuar.";
  if (status === 403) return "No tienes autorización para realizar esta operación.";
  if (status === 404) return "No encontramos el registro solicitado. Actualiza la página y vuelve a intentarlo.";
  if (status === 429) return "Se realizaron demasiadas solicitudes. Inténtalo nuevamente en unos minutos.";
  if (status >= 500) return "Ocurrió un problema al consultar el sistema. Inténtalo nuevamente.";

  if (status === 400 || status === 409 || status === 422) {
    if (typeof data === "string" || Array.isArray(data)) {
      return userFacingText(data) || fallback;
    }
    if (data && typeof data === "object") {
      const messages = Object.entries(data).flatMap(([field, value]) => {
        if (!(field in labels)) return [];
        const text = userFacingText(value);
        return text ? [labels[field] ? `${labels[field]}: ${text}` : text] : [];
      });
      if (messages.length) return messages.slice(0, 2).join(" ");
    }
  }
  return fallback;
}
