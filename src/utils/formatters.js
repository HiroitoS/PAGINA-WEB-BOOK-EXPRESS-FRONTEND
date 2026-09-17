export function getResults(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  return [];
}

export function formatPrice(value) {
  if (value === null || value === undefined || value === "") {
    return "Consultar precio";
  }

  const number = Number(value);

  if (Number.isNaN(number)) {
    return "Consultar precio";
  }

  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
  }).format(number);
}

export function cleanText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

export function getDisplayName(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  return (
    value.nombre ||
    value.name ||
    value.titulo ||
    value.descripcion ||
    value.razon_social ||
    ""
  );
}