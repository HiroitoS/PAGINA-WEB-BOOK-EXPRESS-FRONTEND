import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { FiArrowRight, FiCheckCircle, FiMapPin } from "react-icons/fi";
import {
  actualizarUbicacionAlmacen,
  crearUbicacionAlmacen,
  listarUbicacionesAlmacen,
} from "../../api/warehouseApi";
import WarehouseReconciliationPanel from "./WarehouseReconciliationPanel";

const TIPOS = [
  { value: "main", label: "Almacén principal" },
  { value: "store", label: "Tienda" },
  { value: "fair", label: "Feria temporal" },
  { value: "consignment", label: "Consignación" },
  { value: "other", label: "Otro depósito" },
];

const FORMULARIO_VACIO = {
  name: "", kind: "main", address: "", notes: "", is_active: true,
};

const DESCRIPCIONES_TIPO = {
  main: "Depósito donde Book Express custodia y organiza la mercadería.",
  store: "Punto de venta físico que podrá recibir libros del almacén principal.",
  fair: "Lugar temporal de venta durante una feria escolar.",
  consignment: "Lugar bajo custodia de un tercero. Su mercadería se controlará por separado.",
  other: "Otro lugar de almacenamiento que realmente utilice la empresa.",
};

const campoClase = "mt-1 min-h-11 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-red-600 focus:outline-none disabled:bg-gray-100";

function mostrarTipo(tipo) {
  return TIPOS.find((item) => item.value === tipo)?.label ?? tipo;
}

function mensajeError(error) {
  const status = error?.response?.status;
  if (!error?.response) return "No pudimos conectarnos. Comprueba tu conexión e inténtalo nuevamente.";
  if (status === 403) return "No tienes autorización para modificar ubicaciones. Solicita apoyo a un administrador.";
  const datos = error.response.data;
  if (typeof datos?.detail === "string") return datos.detail;
  if (Array.isArray(datos?.detail)) return datos.detail.join(" ");
  if (datos && typeof datos === "object") {
    const campos = { name: "Nombre", kind: "Tipo de ubicación", address: "Dirección",
      notes: "Observaciones", is_active: "Estado", non_field_errors: "Revisa los datos" };
    return Object.entries(datos).map(([campo, valor]) =>
      `${campos[campo] || "Revisa el formulario"}: ${Array.isArray(valor) ? valor.join(" ") : String(valor)}`
    ).join(" ");
  }
  return "No pudimos completar la operación. Comprueba los datos e inténtalo nuevamente.";
}

export default function WarehouseLocationsPanel({ puedeGestionar, puedeConciliar = false }) {
  const [ubicaciones, setUbicaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO);
  const formRef = useRef(null);
  const principalActivo = ubicaciones.some((item) => item.kind === "main" && item.is_active);
  const destinosActivos = ubicaciones.filter((item) => item.kind !== "main" && item.is_active).length;
  const listoParaTrasladar = principalActivo && destinosActivos > 0;

  useEffect(() => {
    let ignore = false;
    Promise.resolve().then(listarUbicacionesAlmacen).then((data) => {
      if (!ignore) {
        setUbicaciones(Array.isArray(data) ? data : data?.results ?? []);
      }
    }).catch((err) => {
      if (!ignore) setError(mensajeError(err));
    }).finally(() => {
      if (!ignore) setCargando(false);
    });
    return () => { ignore = true; };
  }, []);

  function moverAlFormulario() {
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function abrirNuevo() {
    const existePrincipal = ubicaciones.some((item) => item.kind === "main" && item.is_active);
    setFormulario({
      ...FORMULARIO_VACIO,
      kind: existePrincipal ? "store" : "main",
    });
    setEditandoId(null);
    setError("");
    setMensaje("");
    setFormularioAbierto(true);
    moverAlFormulario();
  }

  function editar(ubicacion) {
    setEditandoId(ubicacion.id);
    setFormulario({
      name: ubicacion.name,
      kind: ubicacion.kind,
      address: ubicacion.address ?? "",
      notes: ubicacion.notes ?? "",
      is_active: ubicacion.is_active,
    });
    setError("");
    setMensaje("");
    setFormularioAbierto(true);
    moverAlFormulario();
  }

  function cancelar() {
    setFormulario(FORMULARIO_VACIO);
    setFormularioAbierto(false);
    setEditandoId(null);
    setError("");
  }

  function actualizarCampo(campo, valor) {
    setFormulario((previo) => ({ ...previo, [campo]: valor }));
  }

  async function guardar(event) {
    event.preventDefault();
    if (guardando || !puedeGestionar) return;
    setGuardando(true);
    setError("");
    setMensaje("");
    try {
      const payload = {
        name: formulario.name.trim(),
        kind: formulario.kind,
        address: formulario.address.trim(),
        notes: formulario.notes.trim(),
        is_active: formulario.is_active,
      };
      const guardado = editandoId !== null
        ? await actualizarUbicacionAlmacen(editandoId, payload)
        : await crearUbicacionAlmacen(payload);
      setUbicaciones((anteriores) => [
        ...anteriores.filter((item) => item.id !== guardado.id),
        guardado,
      ].sort((a, b) => a.name.localeCompare(b.name, "es")));
      setMensaje(editandoId !== null
        ? "La ubicación se actualizó correctamente."
        : "Ubicación registrada correctamente. No se modificaron las existencias.");
      setEditandoId(null);
      setFormulario(FORMULARIO_VACIO);
      setFormularioAbierto(false);
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="min-w-0 space-y-4 p-3 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-black text-gray-950">Lugares registrados</h2>
          <p className="mt-1 text-sm text-gray-600">
            Configura los almacenes y destinos de futuros traslados. Las cantidades se consultan en Inventario.
          </p>
          {!cargando && !error && (
            <p className="mt-1 text-xs font-semibold text-gray-500">
              {ubicaciones.length} {ubicaciones.length === 1 ? "ubicación registrada" : "ubicaciones registradas"}
            </p>
          )}
        </div>
        {puedeGestionar && !formularioAbierto && (
          <button type="button" onClick={abrirNuevo}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-800 sm:w-auto">
            + Agregar ubicación
          </button>
        )}
      </div>

      {!cargando && !error && (
        <section aria-label="Preparación de almacenes" className="rounded-xl border border-gray-200 bg-gray-50 p-3 sm:p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-600">Configuración inicial</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className={`flex items-start gap-3 rounded-xl border bg-white p-3 ${principalActivo ? "border-gray-200" : "border-red-200"}`}>
              <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${principalActivo ? "bg-gray-100 text-gray-700" : "bg-red-50 text-red-700"}`}>
                {principalActivo ? <FiCheckCircle aria-hidden="true" /> : <FiMapPin aria-hidden="true" />}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-950">1. Almacén principal</p>
                <p className="mt-1 text-xs leading-5 text-gray-600">{principalActivo
                  ? "Ya existe un almacén principal activo."
                  : "Registra el lugar real donde Book Express recibe y custodia los libros."}</p>
              </div>
            </div>
            <div className={`flex items-start gap-3 rounded-xl border bg-white p-3 ${destinosActivos ? "border-gray-200" : "border-red-200"}`}>
              <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${destinosActivos ? "bg-gray-100 text-gray-700" : "bg-red-50 text-red-700"}`}>
                {destinosActivos ? <FiCheckCircle aria-hidden="true" /> : <FiMapPin aria-hidden="true" />}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-950">2. Destino de traslado</p>
                <p className="mt-1 text-xs leading-5 text-gray-600">{destinosActivos
                  ? `${destinosActivos} ${destinosActivos === 1 ? "destino activo" : "destinos activos"} para traslados.`
                  : "Agrega un destino físico real, como una tienda. No crees ubicaciones de prueba en producción."}</p>
              </div>
            </div>
          </div>
          {listoParaTrasladar ? (
            <div className="mt-3 flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-700">Los lugares están preparados. Para mover libros, primero confirma dónde se encuentran físicamente sus existencias.</p>
              <Link to="/admin/erp/almacen/traslados" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-gray-950 px-4 text-sm font-bold text-white transition hover:bg-gray-800">
                Ir a traslados <FiArrowRight aria-hidden="true" />
              </Link>
            </div>
          ) : null}
        </section>
      )}

      {mensaje && (
        <p role="status" className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm font-semibold text-gray-800">
          {mensaje}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {puedeGestionar && formularioAbierto && (
        <form ref={formRef} onSubmit={guardar}
          className="scroll-mt-24 space-y-4 rounded-xl border border-red-200 bg-red-50/50 p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-black text-gray-900">
                {editandoId !== null ? "Modificar ubicación" : "Registrar ubicación"}
              </h3>
              <p className="mt-1 text-xs text-gray-600">
                El identificador se genera automáticamente. Esta acción no mueve libros ni modifica existencias.
              </p>
            </div>
            <button type="button" onClick={cancelar}
              className="min-h-11 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700">
              Cancelar
            </button>
          </div>
          <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="min-w-0 text-xs font-semibold text-gray-700">
              Nombre de la ubicación
              <input required maxLength={120} value={formulario.name}
                onChange={(event) => actualizarCampo("name", event.target.value)}
                placeholder={formulario.kind === "fair" ? "Ej. Feria escolar de noviembre" : "Ej. Almacén principal de Huancayo"} className={campoClase} />
            </label>
            <label className="min-w-0 text-xs font-semibold text-gray-700">
              Tipo de ubicación
              <select value={formulario.kind}
                onChange={(event) => actualizarCampo("kind", event.target.value)}
                className={campoClase}>
                {TIPOS.map((tipo) => <option key={tipo.value} value={tipo.value}>{tipo.label}</option>)}
              </select>
            </label>
            <label className="min-w-0 text-xs font-semibold text-gray-700 sm:col-span-2">
              Dirección o referencia (opcional)
              <input maxLength={255} value={formulario.address}
                onChange={(event) => actualizarCampo("address", event.target.value)}
                placeholder="Referencia para ubicar el depósito" className={campoClase} />
            </label>
            {editandoId !== null && <label className="min-w-0 text-xs font-semibold text-gray-700">
              Estado
              <select value={formulario.is_active ? "active" : "inactive"}
                onChange={(event) => actualizarCampo("is_active", event.target.value === "active")}
                className={campoClase}>
                <option value="active">Activa</option>
                <option value="inactive">Inactiva</option>
              </select>
            </label>}
          </div>
          <p className="rounded-lg bg-white px-3 py-2 text-xs leading-5 text-gray-600">
            {DESCRIPCIONES_TIPO[formulario.kind]}
            {" "}Los traslados se habilitarán cuando las existencias estén conciliadas por ubicación.
          </p>
          <label className="block text-xs font-semibold text-gray-700">
            Observaciones (opcional)
            <textarea rows={2} value={formulario.notes}
              onChange={(event) => actualizarCampo("notes", event.target.value)}
              className={campoClase} />
          </label>
          <button type="submit"
            disabled={guardando || !formulario.name.trim()}
            className="min-h-11 w-full rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
            {guardando ? "Guardando…" : editandoId !== null ? "Guardar cambios" : "Registrar ubicación"}
          </button>
        </form>
      )}

      {cargando && (
        <p role="status" className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">Consultando ubicaciones…</p>
      )}
      {!cargando && ubicaciones.length === 0 && !error && !formularioAbierto && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-5 text-center sm:p-8">
          <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-gray-100 text-gray-700"><FiMapPin aria-hidden="true" size={22} /></span>
          <h3 className="mt-3 text-base font-black text-gray-950">Empieza con tu almacén principal</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-600">
            Aún no hay ubicaciones registradas. Primero identifica dónde se reciben los libros;
            después podrás configurar los lugares donde realmente se trasladan.
          </p>
          {puedeGestionar ? (
            <button type="button" onClick={abrirNuevo} className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-red-700 px-5 text-sm font-bold text-white hover:bg-red-800 sm:w-auto">
              Registrar almacén principal
            </button>
          ) : (
            <p className="mt-3 text-sm text-gray-600">Solicita al administrador que configure el almacén principal.</p>
          )}
        </div>
      )}

      {ubicaciones.length > 0 && (
        <>
          <div className="grid gap-2 sm:hidden">
            {ubicaciones.map((item) => (
              <article key={item.id} className="min-w-0 space-y-2 rounded-xl border border-gray-200 bg-white p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="break-words text-sm font-bold text-gray-900">{item.name}</h3>
                  </div>
                  <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-600">
                    {item.is_active ? "Activa" : "Inactiva"}
                  </span>
                </div>
                <p className="text-xs text-gray-600">{mostrarTipo(item.kind)}</p>
                {item.address && <p className="break-words text-xs text-gray-600">{item.address}</p>}
                {puedeGestionar && (
                  <button type="button" onClick={() => editar(item)}
                    className="min-h-11 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-red-700">
                    Editar ubicación
                  </button>
                )}
              </article>
            ))}
          </div>
          <div className="hidden overflow-x-auto rounded-lg border border-gray-200 sm:block">
            <table className="w-full min-w-max text-left text-sm">
              <thead className="bg-gray-50 text-xs text-gray-600">
                <tr>
                  <th scope="col" className="p-3">Nombre</th>
                  <th scope="col" className="p-3">Tipo</th>
                  <th scope="col" className="p-3">Estado</th>
                  {puedeGestionar && <th scope="col" className="p-3">Acción</th>}
                </tr>
              </thead>
              <tbody>
                {ubicaciones.map((item) => (
                  <tr key={item.id} className="border-t border-gray-100">
                    <td className="p-3">{item.name}</td>
                    <td className="p-3">{mostrarTipo(item.kind)}</td>
                    <td className="p-3">{item.is_active ? "Activa" : "Inactiva"}</td>
                    {puedeGestionar && (
                      <td className="p-3">
                        <button type="button" onClick={() => editar(item)}
                          className="min-h-11 rounded-lg px-2 font-semibold text-red-700 hover:underline">
                          Editar
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {puedeConciliar && !cargando && ubicaciones.length > 0 && (
        <WarehouseReconciliationPanel ubicaciones={ubicaciones} />
      )}
    </div>
  );
}
