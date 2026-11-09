import { useEffect, useState } from "react";
import { Link } from "react-router";
import { FiArrowLeft, FiClipboard, FiPlus, FiSearch, FiTrash2 } from "react-icons/fi";
import {
  buscarLibrosParaSolicitud,
  crearSolicitudMercaderia,
  listarSolicitudesMercaderia,
  listarUbicacionesParaSolicitud,
  resolverSolicitudMercaderia,
} from "../../../api/warehouseApi";
import ConfirmActionDialog from "../../../components/admin/ConfirmActionDialog";
import { useAuth } from "../../../hooks/useAuth";
import { userHasPermission } from "../../../utils/adminAccess";
import { warehouseErrorMessage } from "../../../utils/warehouseErrorMessage";

const inputClass = "mt-1 min-h-11 w-full min-w-0 rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-red-600 focus:outline-none";
const statusLabels = {
  submitted: "Pendiente de aprobación",
  approved: "Aprobada para preparación",
  rejected: "Rechazada",
  cancelled: "Anulada",
};
const emptyForm = {
  source_id: "", destination_id: "", responsible_name: "",
  operation_name: "", needed_on: "", notes: "",
};

function readableDate(value) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Fecha no disponible"
    : date.toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" });
}

export default function ERPSolicitudesMercaderiaPage() {
  const { user } = useAuth();
  const canManage = userHasPermission(user, ["warehouse.manage_internal_stock_requests"]);
  const canApprove = userHasPermission(user, ["warehouse.approve_internal_stock_requests"]);
  const [locations, setLocations] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [errorOptions, setErrorOptions] = useState("");
  const [records, setRecords] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState("");
  const [matches, setMatches] = useState([]);
  const [searching, setSearching] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [decisionNote, setDecisionNote] = useState("");

  useEffect(() => {
    let ignore = false;
    listarUbicacionesParaSolicitud()
      .then((result) => {
        if (ignore) return;
        setLocations(result);
        setForm((current) => ({
          ...current,
          source_id: current.source_id ||
            String(result.find((location) => location.kind === "main")?.id ?? result[0]?.id ?? ""),
        }));
      })
      .catch((err) => {
        if (!ignore) setErrorOptions(warehouseErrorMessage(err, "No pudimos consultar los almacenes."));
      })
      .finally(() => { if (!ignore) setLoadingOptions(false); });
    return () => { ignore = true; };
  }, []);

  useEffect(() => {
    let ignore = false;
    listarSolicitudesMercaderia(page, status)
      .then((result) => {
        if (ignore) return;
        setRecords(result.results ?? []);
        setPages(result.pages ?? 1);
        setTotal(result.count ?? 0);
        setError("");
      })
      .catch((err) => {
        if (!ignore) {
          setRecords([]);
          setError(warehouseErrorMessage(err, "No pudimos cargar las solicitudes. Inténtalo nuevamente."));
        }
      })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [page, status, reloadKey]);

  useEffect(() => {
    let ignore = false;
    if (!formOpen || search.trim().length < 2) return undefined;
    const timer = setTimeout(() => {
      setSearching(true);
      buscarLibrosParaSolicitud(search.trim())
        .then((items) => {
          if (!ignore) setMatches(Array.isArray(items) ? items : []);
        })
        .catch(() => {
          if (!ignore) setMatches([]);
        })
        .finally(() => { if (!ignore) setSearching(false); });
    }, 300);
    return () => { ignore = true; clearTimeout(timer); };
  }, [search, formOpen]);

  function changeForm(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function addProduct(product) {
    setSelected((current) => current.some((line) => line.product_id === product.id)
      ? current
      : [...current, { product_id: product.id, name: product.name, code: product.code, quantity: "1" }]);
    setSearch("");
    setMatches([]);
  }

  function updateQuantity(productId, quantity) {
    setSelected((current) => current.map((line) =>
      line.product_id === productId ? { ...line, quantity } : line,
    ));
  }

  function resetForm() {
    setForm((current) => ({
      ...emptyForm, source_id: current.source_id,
    }));
    setSelected([]);
    setSearch("");
    setMatches([]);
    setFormOpen(false);
  }

  function refresh() {
    setLoading(true);
    setReloadKey((current) => current + 1);
  }

  async function saveRequest(event) {
    event.preventDefault();
    if (processing) return;
    setMessage("");
    setError("");
    if (!selected.length) {
      setError("Selecciona al menos un libro para solicitar.");
      return;
    }
    const lines = selected.map((line) => ({
      product_id: line.product_id, quantity: Number(line.quantity),
    }));
    if (lines.some((line) => !Number.isInteger(line.quantity) || line.quantity < 1)) {
      setError("Indica una cantidad válida para cada libro.");
      return;
    }
    setProcessing(true);
    try {
      await crearSolicitudMercaderia({
        ...form,
        source_id: Number(form.source_id),
        destination_id: Number(form.destination_id),
        needed_on: form.needed_on || null,
        items: lines,
      });
      resetForm();
      setMessage("Solicitud registrada. Está pendiente de aprobación y todavía no cambia las existencias.");
      setPage(1);
      refresh();
    } catch (err) {
      setError(warehouseErrorMessage(err, "No pudimos registrar la solicitud. Revisa los datos e inténtalo nuevamente."));
    } finally {
      setProcessing(false);
    }
  }

  async function resolveRequest() {
    if (!confirmation || processing) return;
    setProcessing(true);
    setError("");
    setMessage("");
    try {
      await resolverSolicitudMercaderia(confirmation.id, confirmation.action, decisionNote.trim());
      const messages = {
        aprobar: "Solicitud aprobada para preparar los libros. Las existencias todavía no han cambiado.",
        rechazar: "Solicitud rechazada. El motivo quedó registrado en el historial.",
        anular: "Solicitud anulada. Los libros no fueron afectados.",
      };
      setMessage(messages[confirmation.action]);
      setConfirmation(null);
      setDecisionNote("");
      refresh();
    } catch (err) {
      setError(warehouseErrorMessage(err, "No pudimos actualizar la solicitud. Inténtalo nuevamente."));
    } finally {
      setProcessing(false);
    }
  }

  const destination = locations.find((item) => String(item.id) === form.destination_id);
  const requiresOperation = ["fair", "consignment"].includes(destination?.kind);

  return (
    <main className="mx-auto w-full min-w-0 max-w-6xl space-y-4">
      <header className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-red-700">ERP / Almacén / Preparación</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-gray-950">Solicitudes de mercadería</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-600">
            Solicita libros para tienda, feria o consignación. La aprobación autoriza la preparación,
            pero no descuenta ni reserva existencias.
          </p>
        </div>
        <Link to="/admin/erp/almacen/inventario"
          className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 text-sm font-bold text-gray-800 hover:bg-gray-50 sm:w-auto">
          <FiArrowLeft aria-hidden="true" /> Inventario
        </Link>
      </header>
      {message && <p role="status" className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-800">{message}</p>}
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

      {canManage && (
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <h2 className="text-base font-black text-gray-950">Nueva solicitud</h2>
              <p className="mt-1 text-xs text-gray-600">Registra los libros y la persona que los recibirá.</p>
            </div>
            <button type="button" onClick={() => setFormOpen((current) => !current)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-700 px-4 text-sm font-bold text-white hover:bg-red-800">
              <FiPlus aria-hidden="true" /> {formOpen ? "Cerrar formulario" : "Registrar solicitud"}
            </button>
          </div>
          {formOpen && (
            <form onSubmit={saveRequest} className="space-y-4 border-t border-gray-200 p-4">
              {errorOptions && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{errorOptions}</p>}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-semibold text-gray-800">Almacén de origen
                  <select required disabled={loadingOptions} value={form.source_id} onChange={(e) => changeForm("source_id", e.target.value)} className={inputClass}>
                    <option value="">Selecciona el origen</option>
                    {locations.map((loc) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                  </select>
                </label>
                <label className="text-sm font-semibold text-gray-800">Destino
                  <select required disabled={loadingOptions} value={form.destination_id} onChange={(e) => changeForm("destination_id", e.target.value)} className={inputClass}>
                    <option value="">Selecciona el destino</option>
                    {locations.filter((loc) => String(loc.id) !== form.source_id).map((loc) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                  </select>
                </label>
                <label className="text-sm font-semibold text-gray-800">Responsable de recepción
                  <input className={inputClass} required maxLength={180} value={form.responsible_name}
                    onChange={(e) => changeForm("responsible_name", e.target.value)}
                    placeholder="Nombre de la persona responsable" />
                </label>
                <label className="text-sm font-semibold text-gray-800">
                  {requiresOperation ? "Feria o colegio destinatario" : "Referencia del destino (opcional)"}
                  <input className={inputClass} required={requiresOperation} maxLength={180}
                    value={form.operation_name} onChange={(e) => changeForm("operation_name", e.target.value)}
                    placeholder={requiresOperation ? "Identifica la feria o el colegio" : "Identificación de esta entrega"} />
                </label>
                <label className="text-sm font-semibold text-gray-800">Fecha requerida (opcional)
                  <input className={inputClass} type="date" value={form.needed_on}
                    onChange={(e) => changeForm("needed_on", e.target.value)} />
                </label>
                <label className="text-sm font-semibold text-gray-800">Observaciones (opcional)
                  <input className={inputClass} value={form.notes} maxLength={500}
                    onChange={(e) => changeForm("notes", e.target.value)}
                    placeholder="Indicaciones para preparar los libros" />
                </label>
              </div>
              <div className="rounded-xl border border-gray-200 p-3">
                <label className="block text-sm font-black text-gray-950" htmlFor="buscar-libros-solicitud">Agregar libros</label>
                <div className="relative mt-2">
                  <FiSearch aria-hidden="true" className="absolute left-3 top-3.5 text-gray-500" />
                  <input id="buscar-libros-solicitud" type="search" value={search}
                    onChange={(e) => { setSearch(e.target.value); setMatches([]); }}
                    placeholder="Busca por nombre, código o editorial"
                    className={`${inputClass} mt-0 pl-10`} />
                </div>
                {search.trim().length >= 2 && (
                  <div className="mt-2 space-y-1 rounded-xl border border-gray-200 bg-gray-50 p-2">
                    {searching ? <p className="p-2 text-sm text-gray-600">Buscando libros…</p>
                      : matches.length === 0 ? <p className="p-2 text-sm text-gray-600">No encontramos libros con esta búsqueda.</p>
                        : matches.map((product) => (
                          <button key={product.id} type="button" onClick={() => addProduct(product)}
                            className="flex min-h-11 w-full flex-wrap justify-between gap-2 rounded-lg bg-white px-3 py-2 text-left text-sm hover:bg-red-50">
                            <span className="break-words font-semibold text-gray-900">{product.name} <span className="text-gray-600">· {product.editorial}</span></span>
                            <span className="text-xs font-bold text-red-700">Agregar</span>
                          </button>
                        ))}
                  </div>
                )}
                {selected.length === 0 ? (
                  <p className="mt-3 text-sm text-gray-600">Aún no has seleccionado libros.</p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {selected.map((line) => (
                      <div key={line.product_id} className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3 sm:flex-row sm:items-center">
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm font-bold text-gray-950">{line.name}</p>
                          <p className="text-xs text-gray-600">Código: {line.code || "Sin código"}</p>
                        </div>
                        <label className="text-xs font-bold text-gray-700">Unidades
                          <input type="number" min="1" max="100000" step="1" required value={line.quantity}
                            onChange={(e) => updateQuantity(line.product_id, e.target.value)}
                            className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 px-3 text-sm sm:w-24" />
                        </label>
                        <button type="button" onClick={() => setSelected((items) => items.filter((item) => item.product_id !== line.product_id))}
                          aria-label={`Quitar ${line.name}`}
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 text-sm font-bold text-gray-700 sm:mt-4">
                          <FiTrash2 aria-hidden="true" /> Quitar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={resetForm} className="min-h-11 rounded-xl border border-gray-300 px-4 text-sm font-bold text-gray-700">Cancelar</button>
                <button type="submit" disabled={processing || !selected.length || loadingOptions || !form.source_id}
                  className="min-h-11 rounded-xl bg-red-700 px-4 text-sm font-bold text-white disabled:opacity-50">
                  {processing ? "Registrando…" : "Enviar para aprobación"}
                </button>
              </div>
            </form>
          )}
        </section>
      )}
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-gray-950">Solicitudes registradas</h2>
            <p className="mt-1 text-xs text-gray-600">{total} {total === 1 ? "solicitud" : "solicitudes"}</p>
          </div>
          <label className="text-xs font-semibold text-gray-700">Estado
            <select className={`${inputClass} mt-1`} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); setLoading(true); }}>
              <option value="">Todos los estados</option>
              {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>
        {loading ? <p role="status" className="mt-4 text-sm text-gray-600">Consultando solicitudes…</p>
          : records.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
              Todavía no hay solicitudes con el estado seleccionado.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {records.map((record) => (
                <article key={record.id} className="rounded-xl border border-gray-200 p-3 sm:p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-gray-950">Solicitud N.º {record.id}</p>
                      <p className="mt-1 break-words text-sm text-gray-800">{record.source_name} → {record.destination_name}</p>
                      <p className="mt-1 text-xs text-gray-600">{record.operation_name || "Sin referencia adicional"} · {readableDate(record.created_at)}</p>
                    </div>
                    <span className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-bold text-gray-800">{statusLabels[record.status] || record.status}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => setExpandedId((current) => current === record.id ? null : record.id)}
                      className="min-h-11 rounded-lg border border-gray-300 px-3 text-sm font-bold text-gray-700">
                      {expandedId === record.id ? "Ocultar detalle" : "Ver libros e historial"}
                    </button>
                    {record.status === "submitted" && canApprove && (
                      <>
                        <button type="button" onClick={() => { setDecisionNote(""); setConfirmation({ id: record.id, action: "aprobar" }); }}
                          className="min-h-11 rounded-lg bg-gray-950 px-3 text-sm font-bold text-white">Aprobar</button>
                        <button type="button" onClick={() => { setDecisionNote(""); setConfirmation({ id: record.id, action: "rechazar" }); }}
                          className="min-h-11 rounded-lg border border-red-300 px-3 text-sm font-bold text-red-700">Rechazar</button>
                      </>
                    )}
                    {record.status === "submitted" && canManage && (canApprove || record.created_by === user?.id) && (
                      <button type="button" onClick={() => { setDecisionNote(""); setConfirmation({ id: record.id, action: "anular" }); }}
                        className="min-h-11 rounded-lg px-3 text-sm font-bold text-gray-600 hover:bg-gray-100">Anular</button>
                    )}
                  </div>
                  {expandedId === record.id && (
                    <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
                      <p className="text-sm text-gray-700">Responsable: <strong>{record.responsible_name}</strong> · Fecha requerida: {record.needed_on || "No indicada"}</p>
                      <p className="text-sm text-gray-700">Solicitado por: {record.created_by_name}</p>
                      <ul className="space-y-1">
                        {record.items.map((line) => (
                          <li key={line.id} className="flex flex-wrap justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm">
                            <span className="break-words text-gray-800">{line.product_name_snapshot}</span>
                            <span className="font-bold text-gray-950">{line.quantity_requested} unidades</span>
                          </li>
                        ))}
                      </ul>
                      <h3 className="text-sm font-black text-gray-900">Historial de esta solicitud</h3>
                      <ol className="space-y-2">
                        {record.events.map((event) => (
                          <li key={event.id} className="border-l-2 border-gray-300 pl-3 text-xs text-gray-700">
                            <span className="font-bold">{event.actor_name}</span> · {readableDate(event.created_at)}
                            <span className="block">{statusLabels[event.to_status] || "Solicitud registrada"}</span>
                            {event.note && <span className="block text-gray-600">{event.note}</span>}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        <div className="mt-4 flex items-center justify-between gap-2">
          <p className="text-xs text-gray-600">Página {page} de {pages}</p>
          <div className="flex gap-2">
            <button type="button" disabled={page <= 1 || loading} onClick={() => { setPage((value) => value - 1); setLoading(true); }}
              className="min-h-11 rounded-lg border border-gray-300 px-3 text-sm font-bold disabled:opacity-40">Anterior</button>
            <button type="button" disabled={page >= pages || loading} onClick={() => { setPage((value) => value + 1); setLoading(true); }}
              className="min-h-11 rounded-lg border border-gray-300 px-3 text-sm font-bold disabled:opacity-40">Siguiente</button>
          </div>
        </div>
      </section>
      <p className="rounded-xl bg-gray-50 p-3 text-xs leading-5 text-gray-600">
        <FiClipboard aria-hidden="true" className="mr-2 inline" /> La aprobación es administrativa.
        El despacho, los packs y la recepción en destino se registrarán cuando estén disponibles sus procesos.
      </p>
      <ConfirmActionDialog
        open={Boolean(confirmation)} title="Confirmar decisión" processing={processing}
        description={confirmation?.action === "aprobar"
          ? "Se autorizará la preparación de los libros. Esto no modifica existencias."
          : confirmation?.action === "rechazar"
            ? "Indica el motivo del rechazo. Quedará en el historial."
            : "Se anulará la solicitud pendiente sin afectar inventario."}
        confirmLabel={confirmation?.action === "aprobar" ? "Aprobar solicitud"
          : confirmation?.action === "rechazar" ? "Rechazar solicitud" : "Anular solicitud"}
        onCancel={() => { setConfirmation(null); setDecisionNote(""); }}
        onConfirm={resolveRequest}>
        {confirmation?.action === "rechazar" && (
          <label className="mt-4 block text-sm font-bold text-gray-700">Motivo
            <textarea value={decisionNote} maxLength={500} rows={3} required
              onChange={(e) => setDecisionNote(e.target.value)}
              className="mt-2 w-full rounded-lg border border-gray-300 p-3 text-sm"
              placeholder="Explica brevemente por qué no se aprueba" />
          </label>
        )}
      </ConfirmActionDialog>
    </main>
  );
}
