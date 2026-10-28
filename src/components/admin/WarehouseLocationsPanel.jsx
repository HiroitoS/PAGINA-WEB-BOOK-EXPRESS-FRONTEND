import { useEffect, useState } from "react";
import {
  listarUbicacionesAlmacen,
  crearUbicacionAlmacen,
  actualizarUbicacionAlmacen,
} from "../../api/warehouseApi";

const TIPOS = [
  { value: "main", label: "Almacén principal" },
  { value: "store", label: "Tienda" },
  { value: "fair", label: "Feria temporal" },
  { value: "consignment", label: "Consignación" },
  { value: "other", label: "Otro depósito" },
];

const FORMULARIO_VACIO = {
  code: "", name: "", kind: "main", address: "", notes: "", is_active: true,
};

function mensajeError(error) {
  const datos = error?.response?.data;
  if (typeof datos?.detail === "string") return datos.detail;
  if (datos && typeof datos === "object") {
    return Object.entries(datos).map(([campo, valor]) =>
      `${campo}: ${Array.isArray(valor) ? valor.join(" ") : String(valor)}`
    ).join(" ");
  }
  return "No se pudo completar la operación. Revisa los datos e intenta de nuevo.";
}

export default function WarehouseLocationsPanel({ puedeGestionar }) {
  const [ubicaciones, setUbicaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [editandoId, setEditandoId] = useState(null);
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO);

  useEffect(() => {
    let ignore = false;
    Promise.resolve().then(listarUbicacionesAlmacen).then((data) => {
      if (!ignore) setUbicaciones(Array.isArray(data) ? data : data.results ?? []);
    }).catch((err) => {
      if (!ignore) setError(mensajeError(err));
    }).finally(() => {
      if (!ignore) setCargando(false);
    });
    return () => { ignore = true; };
  }, []);

  function editar(ubicacion) {
    setEditandoId(ubicacion.id);
    setFormulario({
      code: ubicacion.code,
      name: ubicacion.name,
      kind: ubicacion.kind,
      address: ubicacion.address ?? "",
      notes: ubicacion.notes ?? "",
      is_active: ubicacion.is_active,
    });
    setError("");
    setMensaje("");
  }

  function cancelar() {
    setFormulario(FORMULARIO_VACIO);
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
        : await crearUbicacionAlmacen({ ...payload, code: formulario.code.trim() });
      setUbicaciones((anteriores) => [...anteriores.filter((item) => item.id !== guardado.id), guardado]
        .sort((a, b) => a.name.localeCompare(b.name, "es")));
      setMensaje(editandoId !== null ? "Ubicación actualizada." : "Ubicación registrada.");
      setEditandoId(null);
      setFormulario(FORMULARIO_VACIO);
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-3 p-3 sm:p-4">
      <div>
        <h2 className="text-base font-black text-gray-950">Ubicaciones de almacén</h2>
        <p className="mt-1 text-sm text-gray-600">
          Define los lugares donde se custodiará mercadería. Registrar una ubicación no traslada libros
          ni asigna automáticamente el inventario histórico.
        </p>
      </div>

      {mensaje && <p role="status" className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm font-semibold text-gray-800">{mensaje}</p>}
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      {puedeGestionar && (
        <form onSubmit={guardar} className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-gray-900">
              {editandoId !== null ? "Editar ubicación" : "Nueva ubicación"}
            </h3>
            {editandoId !== null && (
              <button type="button" onClick={cancelar} className="text-sm font-semibold text-gray-600 underline hover:text-red-700">
                Cancelar edición
              </button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-xs font-semibold text-gray-700">
              Código
              <input required maxLength={32} disabled={editandoId !== null}
                value={formulario.code} onChange={(event) => actualizarCampo("code", event.target.value)}
                placeholder="Ej. ALM-PRINCIPAL"
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm disabled:bg-gray-100" />
            </label>
            <label className="text-xs font-semibold text-gray-700">
              Nombre
              <input required maxLength={120}
                value={formulario.name} onChange={(event) => actualizarCampo("name", event.target.value)}
                placeholder="Nombre del lugar"
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm" />
            </label>
            <label className="text-xs font-semibold text-gray-700">
              Tipo de ubicación
              <select required value={formulario.kind}
                onChange={(event) => actualizarCampo("kind", event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
                {TIPOS.map((tipo) => <option key={tipo.value} value={tipo.value}>{tipo.label}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-gray-700 sm:col-span-2">
              Dirección o referencia (opcional)
              <input maxLength={255} value={formulario.address}
                onChange={(event) => actualizarCampo("address", event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm" />
            </label>
            <label className="text-xs font-semibold text-gray-700">
              Estado
              <select value={formulario.is_active ? "active" : "inactive"}
                onChange={(event) => actualizarCampo("is_active", event.target.value === "active")}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
                <option value="active">Activa</option>
                <option value="inactive">Inactiva</option>
              </select>
            </label>
          </div>
          <label className="block text-xs font-semibold text-gray-700">
            Observaciones (opcional)
            <textarea rows={2} value={formulario.notes}
              onChange={(event) => actualizarCampo("notes", event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm" />
          </label>
          <div className="flex justify-end">
            <button type="submit" disabled={guardando || !formulario.name.trim() || !formulario.code.trim()}
              className="rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-800 disabled:opacity-50">
              {guardando ? "Guardando…" : editandoId !== null ? "Guardar cambios" : "Registrar ubicación"}
            </button>
          </div>
        </form>
      )}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full min-w-max text-left text-sm">
          <thead className="bg-gray-50 text-xs text-gray-600">
            <tr>
              <th scope="col" className="p-3">Código</th>
              <th scope="col" className="p-3">Ubicación</th>
              <th scope="col" className="p-3">Tipo</th>
              <th scope="col" className="p-3">Estado</th>
              {puedeGestionar && <th scope="col" className="p-3">Acción</th>}
            </tr>
          </thead>
          <tbody>
            {ubicaciones.map((item) => (
              <tr key={item.id} className="border-t border-gray-100">
                <td className="p-3 font-semibold">{item.code}</td>
                <td className="p-3">{item.name}</td>
                <td className="p-3">{TIPOS.find((tipo) => tipo.value === item.kind)?.label ?? item.kind}</td>
                <td className="p-3">{item.is_active ? "Activa" : "Inactiva"}</td>
                {puedeGestionar && (
                  <td className="p-3">
                    <button type="button" onClick={() => editar(item)}
                      className="font-semibold text-red-700 hover:underline">Editar</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {!cargando && ubicaciones.length === 0 && !error && (
          <p className="p-4 text-center text-sm text-gray-500">No se han configurado ubicaciones.</p>
        )}
        {cargando && <p role="status" className="p-4 text-center text-sm text-gray-500">Consultando ubicaciones…</p>}
      </div>
      <p className="text-xs leading-5 text-gray-600">
        El stock sigue siendo global hasta que se concilien y asignen los lotes a ubicaciones reales.
        Los traslados se habilitarán después de esa conciliación.
      </p>
    </div>
  );
}
