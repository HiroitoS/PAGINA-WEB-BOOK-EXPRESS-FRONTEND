import { useEffect, useState } from "react";
import { Link } from "react-router";
import { FiArrowLeft, FiChevronDown, FiRefreshCw } from "react-icons/fi";
import {
  actualizarDistribucion,
  anularDistribucion,
  crearDistribucion,
  listarDistribuciones,
  opcionesDistribucion,
} from "../../../api/warehouseApi";
import WarehouseMovementTabs from "../../../components/admin/WarehouseMovementTabs";
import { useAuth } from "../../../hooks/useAuth";
import { userHasPermission } from "../../../utils/adminAccess";

const fieldClass = "mt-1 min-h-11 w-full min-w-0 rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-950 focus:border-red-700 focus:outline-none";
const buttonClass = "inline-flex min-h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 text-xs font-bold text-gray-800 transition-colors hover:border-red-300 hover:text-red-700 disabled:opacity-50";
const MODE_LABELS = {
  point_of_sale: "Punto de venta",
  fair: "Feria",
  consignment: "Consignación",
};

const EDITABLE_FIELDS = [
  "mode", "source_id", "destination_id", "operation_name",
  "responsible_name", "scheduled_on", "scheduled_until", "notes",
];

const STATUS = {
  planned: {
    name: "Por preparar",
    styles: "border-amber-200 bg-amber-50 text-amber-800",
  },
  cancelled: {
    name: "Anulada",
    styles: "border-red-200 bg-red-50 text-red-800",
  },
};

function blank() {
  return {
    adoption_id: "", mode: "fair", source_id: "", destination_id: "",
    operation_name: "", responsible_name: "", scheduled_on: "",
    scheduled_until: "", notes: "", reason: "",
  };
}

function messageFromError(error) {
  if (!error?.response) return "No se pudo establecer conexión. Comprueba el servidor e inténtalo nuevamente.";
  if (error.response.status === 403) return "No tienes autorización para modificar esta distribución.";
  const data = error.response.data;
  for (const field of ["detail", "reason", "destination_id", "scheduled_until", "adoption_id", "mode", "buscar", "anio", "page"]) {
    const value = data?.[field];
    if (typeof value === "string" && value.length < 240) return value;
    if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  }
  return "Revisa los datos de la operación e inténtalo nuevamente.";
}

export default function ERPDistribucionesPage() {
  const { user } = useAuth();
  const puedeGestionar = userHasPermission(user, ["warehouse.manage_distribution_operations"]);
  const [opciones, setOpciones] = useState({
    adoptions: [], adoptions_meta: { count: 0, page: 1, pages: 1 },
    locations: [], modes: [],
  });
  const [adoptionSearch, setAdoptionSearch] = useState("");
  const [adoptionYear, setAdoptionYear] = useState("");
  const [adoptionPage, setAdoptionPage] = useState(1);
  const [adoptionBusy, setAdoptionBusy] = useState(false);
  const [selectedAdoption, setSelectedAdoption] = useState(null);
  const [lista, setLista] = useState({ results: [], page: 1, pages: 1, count: 0 });
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [originalPlan, setOriginalPlan] = useState(null);
  const [nonce, setNonce] = useState("");
  const [form, setForm] = useState(blank());
  const [expandedId, setExpandedId] = useState(null);
  const [cancelId, setCancelId] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let ignore = false;
    listarDistribuciones(page)
      .then((records) => {
        if (ignore) return;
        setLista(records);
        setError("");
      })
      .catch((err) => {
        if (!ignore) setError(messageFromError(err));
      })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [page, version]);

  useEffect(() => {
    if (!formOpen) return undefined;
    let ignore = false;
    const timer = window.setTimeout(() => {
      setAdoptionBusy(true);
      opcionesDistribucion({
        buscar: adoptionSearch.trim(),
        anio: adoptionYear.length === 4 ? adoptionYear : "",
        page: adoptionPage,
      })
        .then((choices) => {
          if (ignore) return;
          setOpciones(choices);
        })
        .catch((err) => {
          if (!ignore) setError(messageFromError(err));
        })
        .finally(() => {
          if (!ignore) setAdoptionBusy(false);
        });
    }, 250);
    return () => { ignore = true; window.clearTimeout(timer); };
  }, [formOpen, adoptionSearch, adoptionYear, adoptionPage]);

  function createNew() {
    setForm(blank());
    setSelectedAdoption(null);
    setAdoptionSearch("");
    setAdoptionYear("");
    setAdoptionPage(1);
    setNonce(crypto.randomUUID());
    setEditingId(null);
    setOriginalPlan(null);
    setCancelId(null);
    setFormOpen(true);
    setError("");
    setNotice("");
  }

  function editExisting(item) {
    setEditingId(item.id);
    setSelectedAdoption({
      id: item.adoption_id,
      school: item.school,
      campaign: "",
      items: item.items.map((line) => ({
        product: line.product,
        quantity: line.quantity_planned,
      })),
    });
    setCancelId(null);
    const initial = {
      adoption_id: String(item.adoption_id),
      mode: item.mode,
      source_id: String(item.source_id),
      destination_id: String(item.destination_id),
      operation_name: item.operation_name,
      responsible_name: item.responsible_name,
      scheduled_on: item.scheduled_on ?? "",
      scheduled_until: item.scheduled_until ?? "",
      notes: item.notes ?? "",
      reason: "",
    };
    setForm(initial);
    setOriginalPlan(initial);
    setFormOpen(true);
    setError("");
    setNotice("");
  }

  const hasChanges = Boolean(
    editingId && originalPlan && EDITABLE_FIELDS.some(
      (name) => String(form[name] ?? "").trim() !== String(originalPlan[name] ?? "").trim(),
    ),
  );

  function field(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function chooseAdoption(value) {
    const found = opciones.adoptions.find((item) => String(item.id) === value);
    setSelectedAdoption(found || null);
    setForm((prev) => ({
      ...prev, adoption_id: value,
      mode: MODE_LABELS[found?.sale_mode] ? found.sale_mode : prev.mode,
      operation_name: found ? `Entrega · ${found.school}` : "",
    }));
  }

  async function save(event) {
    event.preventDefault();
    if (saving) return;
    if (!form.adoption_id || !form.source_id || !form.destination_id) {
      setError("Selecciona la adopción y los almacenes de origen y destino.");
      return;
    }
    if (form.source_id === form.destination_id) {
      setError("Selecciona un destino diferente del almacén de origen.");
      return;
    }
    if (form.scheduled_on && form.scheduled_until && form.scheduled_until < form.scheduled_on) {
      setError("La fecha final debe ser igual o posterior a la inicial.");
      return;
    }
    if (editingId && !hasChanges) {
      setError("Modifica algún dato de la planificación antes de guardar.");
      return;
    }
    if (editingId && form.reason.trim().length < 8) {
      setError("Explica el motivo del cambio en al menos ocho caracteres.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      if (editingId) {
        await actualizarDistribucion(editingId, {
          mode: form.mode,
          source_id: Number(form.source_id),
          destination_id: Number(form.destination_id),
          operation_name: form.operation_name.trim(),
          responsible_name: form.responsible_name.trim(),
          scheduled_on: form.scheduled_on || null,
          scheduled_until: form.scheduled_until || null,
          notes: form.notes.trim(),
          reason: form.reason.trim(),
        });
        setNotice("Cambio de distribución registrado con su motivo e historial. No se movieron libros.");
      } else {
        await crearDistribucion({
          idempotency_key: nonce,
          adoption_id: Number(form.adoption_id),
          mode: form.mode,
          source_id: Number(form.source_id),
          destination_id: Number(form.destination_id),
          operation_name: form.operation_name.trim(),
          responsible_name: form.responsible_name.trim(),
          scheduled_on: form.scheduled_on || null,
          scheduled_until: form.scheduled_until || null,
          notes: form.notes.trim(),
        });
        setNotice("Distribución planificada. Los libros todavía no se han preparado ni enviado.");
      }
      setEditingId(null);
      setOriginalPlan(null);
      setFormOpen(false);
      setLoading(true);
      setPage(1);
      setVersion((v) => v + 1);
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setSaving(false);
    }
  }

  async function cancelOperation(item) {
    if (saving) return;
    if (cancelReason.trim().length < 8) {
      setError("Explica por qué se anula la planificación (mínimo ocho caracteres).");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await anularDistribucion(item.id, cancelReason.trim());
      setNotice("La planificación fue anulada y conserva su historial. No cambió el inventario.");
      setCancelId(null);
      setCancelReason("");
      setLoading(true);
      setVersion((v) => v + 1);
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setSaving(false);
    }
  }

  const seleccionada = selectedAdoption || opciones.adoptions.find((item) =>
    String(item.id) === String(form.adoption_id));
  return (
    <main className="mx-auto w-full min-w-0 max-w-6xl space-y-3">
      <header className="space-y-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-red-700">ERP · Almacén</p>
            <h1 className="mt-1 text-xl font-black text-gray-950 sm:text-2xl">Movimientos</h1>
            <p className="mt-1 text-sm leading-5 text-gray-600">
              Organiza entregas por colegio, responsable y modalidad.
            </p>
          </div>
          <Link to="/admin/erp/almacen/inventario" className={buttonClass}>
            <FiArrowLeft className="mr-1" aria-hidden="true" /> Inventario
          </Link>
        </div>
        <WarehouseMovementTabs />
      </header>

      <section className="space-y-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-gray-950">Planificación de entregas</h2>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-gray-600">
              Puedes cambiar entre Punto de venta, Feria y Consignación sin volver al CRM.
              Esta planificación aún no mueve ni reserva mercadería. La entrega se confirma por separado.
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" className={buttonClass} disabled={loading}
              onClick={() => { setLoading(true); setVersion((v) => v + 1); }}>
              <FiRefreshCw className="mr-1" aria-hidden="true" /> Actualizar
            </button>
            {puedeGestionar && (
              <button type="button" onClick={createNew}
                className="min-h-10 rounded-lg bg-red-700 px-3 text-xs font-bold text-white transition-colors hover:bg-red-800">
                Planificar entrega
              </button>
            )}
          </div>
        </div>
        {notice && <p role="status" className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-800">{notice}</p>}
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}

        {formOpen && puedeGestionar && (
          <form onSubmit={save} className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-black text-gray-950">
                {editingId ? "Cambiar planificación" : "Planificar entrega"}
              </h3>
              <button type="button" onClick={() => { setFormOpen(false); setError(""); }}
                className={buttonClass}>Cerrar</button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2 text-xs font-bold text-gray-700">
                <label className="block">
                  Buscar adopción por colegio
                  <input type="search" maxLength={100} value={adoptionSearch}
                    disabled={Boolean(editingId)}
                    onChange={(event) => { setAdoptionSearch(event.target.value); setAdoptionPage(1); }}
                    className={fieldClass} placeholder="Nombre del colegio o campaña" />
                </label>
                <label className="block">
                  Año de campaña (opcional)
                  <input type="text" inputMode="numeric" maxLength={4} value={adoptionYear}
                    disabled={Boolean(editingId)}
                    onChange={(event) => { setAdoptionYear(event.target.value.replace(/\D/g, "")); setAdoptionPage(1); }}
                    className={fieldClass} placeholder="Ej. 2027" />
                </label>
                <label className="block">
                  Adopción confirmada
                  <select required disabled={Boolean(editingId) || adoptionBusy}
                    value={form.adoption_id}
                    onChange={(event) => chooseAdoption(event.target.value)} className={fieldClass}>
                    <option value="">Seleccionar adopción</option>
                    {seleccionada && !opciones.adoptions.some((item) => item.id === seleccionada.id) && (
                      <option value={seleccionada.id}>
                        {seleccionada.school} · #{seleccionada.id}
                      </option>
                    )}
                    {opciones.adoptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.school} · {item.campaign} · #{item.id}
                      </option>
                    ))}
                  </select>
                </label>
                {!editingId && (
                  <div className="flex flex-wrap items-center justify-between gap-2 font-normal text-gray-600">
                    <span aria-live="polite">
                      {adoptionBusy ? "Buscando adopciones…" : `${opciones.adoptions_meta?.count ?? 0} adopciones encontradas`}
                    </span>
                    <div className="flex gap-2">
                      <button type="button" className={buttonClass}
                        disabled={adoptionBusy || adoptionPage <= 1}
                        onClick={() => setAdoptionPage((p) => Math.max(1, p - 1))}>
                        Anterior
                      </button>
                      <button type="button" className={buttonClass}
                        disabled={adoptionBusy || adoptionPage >= (opciones.adoptions_meta?.pages ?? 1)}
                        onClick={() => setAdoptionPage((p) => p + 1)}>
                        Siguiente
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <label className="text-xs font-bold text-gray-700">
                Modalidad de entrega
                <select required value={form.mode} onChange={(event) => field("mode", event.target.value)}
                  className={fieldClass}>
                  {Object.entries(MODE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-bold text-gray-700">
                Almacén de origen
                <select required value={form.source_id}
                  onChange={(event) => field("source_id", event.target.value)} className={fieldClass}>
                  <option value="">Seleccionar origen</option>
                  {opciones.locations.map((location) => (
                    <option key={location.id} value={location.id}>{location.name}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-bold text-gray-700">
                Destino físico
                <select required value={form.destination_id}
                  onChange={(event) => field("destination_id", event.target.value)} className={fieldClass}>
                  <option value="">Seleccionar destino</option>
                  {opciones.locations.map((location) => (
                    <option key={location.id} value={location.id}>{location.name}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-bold text-gray-700">
                Nombre de la operación
                <input required maxLength={180} value={form.operation_name}
                  onChange={(event) => field("operation_name", event.target.value)} className={fieldClass}
                  placeholder="Ej. Feria del Colegio Zárate" />
              </label>
              <label className="text-xs font-bold text-gray-700">
                Persona que recibirá los libros
                <input required maxLength={180} value={form.responsible_name}
                  onChange={(event) => field("responsible_name", event.target.value)} className={fieldClass}
                  placeholder="Nombre del encargado" />
              </label>
              <label className="text-xs font-bold text-gray-700">
                Fecha prevista
                <input type="date" value={form.scheduled_on}
                  onChange={(event) => field("scheduled_on", event.target.value)} className={fieldClass} />
              </label>
              <label className="text-xs font-bold text-gray-700">
                Fecha final (opcional)
                <input type="date" value={form.scheduled_until}
                  onChange={(event) => field("scheduled_until", event.target.value)} className={fieldClass} />
              </label>
            </div>
            {seleccionada && (
              <div className="rounded-xl border border-gray-200 bg-white p-3 text-xs">
                <p className="font-black text-gray-900">
                  {editingId ? "Libros de esta planificación" : "Libros de la adopción"}
                </p>
                <p className="mt-1 text-gray-600">
                  {editingId
                    ? "Estas cifras son las registradas en la planificación; no equivalen a libros reservados."
                    : "Cantidades de referencia, todavía sin repartir entre entregas ni reservar en el inventario. Si planificas más de un destino, se deberá validar la asignación real de cada libro antes de preparar."}
                </p>
                <div className="mt-2 space-y-1">
                  {seleccionada.items.map((item, idx) => (
                    <p key={idx} className="flex justify-between gap-3 text-gray-800">
                      <span className="min-w-0 break-words">{item.product}</span>
                      <strong className="shrink-0 tabular-nums">{item.quantity}</strong>
                    </p>
                  ))}
                </div>
              </div>
            )}
            <label className="block text-xs font-bold text-gray-700">
              Observaciones (opcional)
              <textarea rows={2} maxLength={500} value={form.notes}
                onChange={(event) => field("notes", event.target.value)}
                className={fieldClass} placeholder="Indicaciones para organizar la entrega" />
            </label>
            {editingId && hasChanges && (
              <label className="block text-xs font-bold text-gray-700">
                Motivo del cambio
                <textarea required minLength={8} maxLength={500} rows={2} value={form.reason}
                  onChange={(event) => field("reason", event.target.value)}
                  className={fieldClass}
                  placeholder="Ej. El colegio cambió de Feria a Consignación" />
              </label>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setFormOpen(false)} className={buttonClass}>
                Cancelar
              </button>
              <button type="submit" disabled={saving || (Boolean(editingId) && !hasChanges)}
                className="min-h-11 rounded-xl bg-red-700 px-4 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-50">
                {saving ? "Guardando…" : editingId ? "Guardar cambio" : "Guardar planificación"}
              </button>
            </div>
          </form>
        )}

        {loading && <p role="status" className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">Consultando entregas…</p>}
        {!loading && lista.results.length === 0 && (
          <p className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-600">
            Todavía no hay entregas planificadas. Puedes crearlas desde una adopción confirmada.
          </p>
        )}
        {!loading && lista.results.map((item) => (
          <article key={item.id} className="min-w-0 rounded-xl border border-gray-200 p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-gray-100 px-2 py-1 text-xs font-bold text-gray-800">
                    {MODE_LABELS[item.mode] || item.mode}
                  </span>
                  <span className={`rounded-lg border px-2 py-1 text-xs font-bold ${STATUS[item.status]?.styles || "border-gray-200 bg-gray-50 text-gray-700"}`}>
                    {STATUS[item.status]?.name || "Estado por confirmar"}
                  </span>
                </div>
                <h3 className="mt-2 break-words text-sm font-black text-gray-950">
                  {item.operation_name}
                </h3>
                <p className="mt-1 text-xs leading-5 text-gray-600">
                  {item.school} · {item.source} → {item.destination}
                </p>
                <p className="text-xs leading-5 text-gray-600">
                  Responsable: {item.responsible_name}
                  {item.scheduled_on ? ` · ${item.scheduled_on}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={buttonClass}
                  aria-expanded={expandedId === item.id}
                  onClick={() => setExpandedId((current) => current === item.id ? null : item.id)}>
                  Detalle <FiChevronDown className="ml-1" aria-hidden="true" />
                </button>
                {puedeGestionar && item.status === "planned" && (
                  <button type="button" className={buttonClass} onClick={() => editExisting(item)}>
                    Editar planificación
                  </button>
                )}
              </div>
            </div>
            {expandedId === item.id && (
              <div className="mt-3 space-y-3 border-t border-gray-100 pt-3 text-xs">
                <p className="font-bold text-gray-900">
                  Modalidad acordada en CRM: {MODE_LABELS[item.original_mode] || "No indicada"}
                </p>
                <p className="text-gray-600">
                  Cantidades de la adopción: referencia comercial, no libros reservados.
                  La distribución por destino se confirmará durante la preparación.
                </p>
                <div className="space-y-1">
                  {item.items.map((line) => (
                    <p key={line.product_id} className="flex justify-between gap-2 text-gray-700">
                      <span>{line.product}</span>
                      <strong className="shrink-0 tabular-nums">{line.quantity_planned}</strong>
                    </p>
                  ))}
                </div>
                <p className="font-black text-gray-900">Historial de cambios</p>
                {item.events.map((event, idx) => (
                  <p key={idx} className="break-words text-gray-700">
                    {event.actor} · {event.action === "created" ? "Planificación creada"
                      : event.action === "cancelled" ? "Planificación anulada" : "Planificación modificada"}
                    {event.previous?.mode && event.previous.mode !== event.current?.mode
                      ? ` · ${MODE_LABELS[event.previous.mode]} → ${MODE_LABELS[event.current.mode]}`
                      : ""}
                    {event.reason ? ` · ${event.reason}` : ""}
                  </p>
                ))}
                {puedeGestionar && item.status === "planned" && (
                  cancelId === item.id ? (
                    <div className="space-y-2 rounded-lg bg-gray-50 p-3">
                      <label className="block text-xs font-bold text-gray-800">
                        ¿Por qué se anula la planificación?
                        <textarea minLength={8} maxLength={500} rows={2} value={cancelReason}
                          onChange={(event) => setCancelReason(event.target.value)}
                          className={fieldClass} />
                      </label>
                      <div className="flex gap-2">
                        <button type="button" className={buttonClass}
                          disabled={saving} onClick={() => cancelOperation(item)}>
                          Confirmar anulación
                        </button>
                        <button type="button" className={buttonClass}
                          onClick={() => { setCancelId(null); setCancelReason(""); }}>
                          Volver
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" className={buttonClass} onClick={() => {
                      setCancelId(item.id); setCancelReason(""); setError("");
                    }}>
                      Anular planificación
                    </button>
                  )
                )}
              </div>
            )}
          </article>
        ))}
        {!loading && lista.count > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs text-gray-600">
            <span>{lista.count} operaciones · Página {lista.page} de {lista.pages}</span>
            <div className="flex gap-2">
              <button type="button" className={buttonClass}
                disabled={page <= 1} onClick={() => { setLoading(true); setPage((p) => p - 1); }}>
                Anterior
              </button>
              <button type="button" className={buttonClass}
                disabled={page >= lista.pages} onClick={() => { setLoading(true); setPage((p) => p + 1); }}>
                Siguiente
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
