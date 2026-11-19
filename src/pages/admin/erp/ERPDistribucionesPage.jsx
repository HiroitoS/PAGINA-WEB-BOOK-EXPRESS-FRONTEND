import { useEffect, useState } from "react";
import { Link } from "react-router";
import { FiArrowLeft, FiChevronDown, FiRefreshCw } from "react-icons/fi";
import {
  actualizarDistribucion,
  anularDistribucion,
  crearDistribucion,
  consultarAsignacionDistribucion,
  listarDistribuciones,
  opcionesDistribucion,
} from "../../../api/warehouseApi";
import WarehouseMovementTabs from "../../../components/admin/WarehouseMovementTabs";
import DistributionPreparationPanel from "../../../components/admin/DistributionPreparationPanel";
import DistributionDispatchPanel from "../../../components/admin/DistributionDispatchPanel";
import { useAuth } from "../../../hooks/useAuth";
import { userHasPermission } from "../../../utils/adminAccess";

const fieldClass = "mt-1 min-h-11 w-full min-w-0 rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-950 focus:border-red-700 focus:outline-none";
const buttonClass = "inline-flex min-h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 text-xs font-bold text-gray-800 transition-colors hover:border-red-300 hover:text-red-700 disabled:opacity-50";
const MODE_LABELS = {
  point_of_sale: "Punto de venta",
  fair: "Feria",
  consignment: "Consignación",
};
const MODE_INFO = {
  point_of_sale: "Libros que se atenderán desde la tienda o librería.",
  fair: "Libros destinados a una feria escolar programada.",
  consignment: "Libros que quedarán en custodia para su posterior rendición.",
};
const MODE_LOCATION_KIND = {
  point_of_sale: "store",
  fair: "fair",
  consignment: "consignment",
};
const LOCATION_KIND_LABEL = {
  main: "Almacén principal",
  store: "Tienda",
  fair: "Feria temporal",
  consignment: "Consignación",
  other: "Otro depósito",
};

const EDITABLE_FIELDS = [
  "mode", "source_id", "destination_id", "operation_name",
  "responsible_name", "scheduled_on", "scheduled_until", "notes",
];

const DELIVERY_FILTERS = [
  { id: "planned,reserved", label: "Por preparar" },
  { id: "prepared", label: "Preparadas" },
  { id: "in_transit", label: "En tránsito" },
  { id: "delivered", label: "Recibidas" },
  { id: "", label: "Todas" },
];

const STATUS = {
  planned: {
    name: "Por preparar",
    styles: "border-amber-200 bg-amber-50 text-amber-800",
  },
  reserved: {
    name: "Existencias reservadas",
    styles: "border-blue-200 bg-blue-50 text-blue-900",
  },
  prepared: {
    name: "Preparada",
    styles: "border-gray-300 bg-gray-50 text-gray-900",
  },
  in_transit: {
    name: "En tránsito",
    styles: "border-blue-200 bg-blue-50 text-blue-900",
  },
  delivered: {
    name: "Recibida en destino",
    styles: "border-green-200 bg-green-50 text-green-900",
  },
  cancelled: {
    name: "Anulada",
    styles: "border-red-200 bg-red-50 text-red-800",
  },
};

function blank() {
  return {
    adoption_id: "", mode: "", source_id: "", destination_id: "",
    operation_name: "", responsible_name: "", scheduled_on: "",
    scheduled_until: "", notes: "", reason: "",
  };
}

function messageFromError(error) {
  if (!error?.response) return "No se pudo establecer conexión. Comprueba el servidor e inténtalo nuevamente.";
  if (error.response.status === 403) return "No tienes autorización para modificar esta distribución.";
  const data = error.response.data;
  for (const field of ["detail", "reason", "destination_id", "scheduled_until", "adoption_id", "mode", "buscar", "anio", "page", "items"]) {
    const value = data?.[field];
    if (typeof value === "string" && value.length < 240) return value;
    if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  }
  return "Revisa los datos de la operación e inténtalo nuevamente.";
}

export default function ERPDistribucionesPage() {
  const { user } = useAuth();
  const puedeGestionar = userHasPermission(user, ["warehouse.manage_distribution_operations"]);
  const puedeTrasladar = userHasPermission(user, ["warehouse.manage_stock_transfers"]);
  const puedeResolverIncidencias = userHasPermission(user, ["warehouse.validate_receiving"]);
  const [opciones, setOpciones] = useState({
    adoptions: [], adoptions_meta: { count: 0, page: 1, pages: 1 },
    locations: [], modes: [], campaign_years: [],
  });
  const [adoptionSearch, setAdoptionSearch] = useState("");
  const [adoptionYear, setAdoptionYear] = useState("");
  const [adoptionPage, setAdoptionPage] = useState(1);
  const [adoptionBusy, setAdoptionBusy] = useState(false);
  const [selectedAdoption, setSelectedAdoption] = useState(null);
  const [showAdoptionResults, setShowAdoptionResults] = useState(true);
  const [allocation, setAllocation] = useState(null);
  const [allocationBusy, setAllocationBusy] = useState(false);
  const [quantities, setQuantities] = useState({});
  const [originalQuantities, setOriginalQuantities] = useState({});
  const [lista, setLista] = useState({ results: [], page: 1, pages: 1, count: 0 });
  const [page, setPage] = useState(1);
  const [deliveryFilter, setDeliveryFilter] = useState("planned,reserved");
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formStep, setFormStep] = useState(0);
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
    listarDistribuciones(page, deliveryFilter)
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
  }, [page, version, deliveryFilter]);

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

  useEffect(() => {
    if (!formOpen || !form.adoption_id) return undefined;
    let ignore = false;
    consultarAsignacionDistribucion(Number(form.adoption_id), editingId)
      .then((summary) => {
        if (ignore) return;
        setAllocation(summary);
        const values = Object.fromEntries(summary.items.map((line) => [
          line.product_id, String(editingId ? line.current_planned : line.assignable),
        ]));
        setQuantities(values);
        if (editingId) setOriginalQuantities(values);
        setError("");
      })
      .catch((err) => {
        if (!ignore) {
          setAllocation(null);
          setError(messageFromError(err));
        }
      })
      .finally(() => { if (!ignore) setAllocationBusy(false); });
    return () => { ignore = true; };
  }, [formOpen, form.adoption_id, editingId, version]);

  function createNew() {
    setFormStep(0);
    setForm(blank());
    setSelectedAdoption(null);
    setAllocation(null);
    setAllocationBusy(false);
    setQuantities({});
    setOriginalQuantities({});
    setAdoptionSearch("");
    setAdoptionYear("");
    setAdoptionPage(1);
    setShowAdoptionResults(true);
    setAdoptionBusy(true);
    setNonce(crypto.randomUUID());
    setEditingId(null);
    setOriginalPlan(null);
    setCancelId(null);
    setFormOpen(true);
    setError("");
    setNotice("");
  }

  function editExisting(item) {
    setFormStep(1);
    setAllocation(null);
    setAllocationBusy(true);
    setQuantities({});
    setOriginalQuantities({});
    setEditingId(item.id);
    setShowAdoptionResults(false);
    setAdoptionBusy(true);
    setSelectedAdoption({
      id: item.adoption_id,
      school: item.school,
      campaign: item.campaign || "",
      campaign_year: item.campaign_year ?? null,
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

  const metadataChanged = Boolean(
    editingId && originalPlan && EDITABLE_FIELDS.some(
      (name) => String(form[name] ?? "").trim() !== String(originalPlan[name] ?? "").trim(),
    ),
  );
  const quantitiesChanged = Boolean(
    editingId && allocation && allocation.items.some((line) => (
      Number(quantities[line.product_id] || 0)
      !== Number(originalQuantities[line.product_id] || 0)
    )),
  );
  const hasChanges = metadataChanged || quantitiesChanged;

  function field(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function clearChosenAdoption() {
    setSelectedAdoption(null);
    setShowAdoptionResults(true);
    setAllocation(null);
    setAllocationBusy(false);
    setQuantities({});
    setForm((prev) => ({
      ...prev, adoption_id: "", mode: "", destination_id: "", operation_name: "",
    }));
  }

  function changeAdoptionFilter(name, value) {
    if (name === "search") setAdoptionSearch(value);
    if (name === "year") setAdoptionYear(value);
    setAdoptionPage(1);
    setAdoptionBusy(true);
    clearChosenAdoption();
  }

  function chooseAdoption(value) {
    const found = opciones.adoptions.find((item) => String(item.id) === value);
    if (!found) return;
    setSelectedAdoption(found);
    setShowAdoptionResults(false);
    setFormStep(1);
    setAllocation(null);
    setAllocationBusy(true);
    setQuantities({});
    setForm((prev) => {
      // Nunca presuponer que los libros están en Principal: revisar Inventario.
      const origin = prev.source_id;
      const mode = MODE_LABELS[found.sale_mode] ? found.sale_mode : prev.mode;
      const suggested = opciones.locations.filter(
        (location) => location.kind === MODE_LOCATION_KIND[mode]
          && (mode !== "fair" || Boolean(location.fair_event_id))
          && String(location.id) !== origin,
      );
      return {
        ...prev, adoption_id: value,
        mode, source_id: origin,
        destination_id: suggested.length === 1 ? String(suggested[0].id) : "",
        operation_name: `Entrega · ${found.school}`,
      };
    });
  }

  function chooseMode(mode) {
    setForm((prev) => {
      const suggested = opciones.locations.filter(
        (location) => location.kind === MODE_LOCATION_KIND[mode]
          && (mode !== "fair" || Boolean(location.fair_event_id))
          && String(location.id) !== prev.source_id,
      );
      return {
        ...prev, mode,
        destination_id: suggested.length === 1 ? String(suggested[0].id) : "",
      };
    });
  }

  function siguientePaso() {
    setError("");
    if (formStep === 0 && !form.adoption_id) {
      setError("Selecciona primero la adopción confirmada que vas a atender.");
      return;
    }
    if (formStep === 1 && (
      !form.mode || !form.source_id || !form.destination_id
      || form.source_id === form.destination_id
    )) {
      setError("Elige modalidad, lugar de origen y un destino diferente.");
      return;
    }
    if (formStep === 2) {
      if (!allocation || allocationBusy) {
        setError("Primero revisa las cantidades de la adopción.");
        return;
      }
      const items = allocation.items.filter((line) => {
        const raw = String(quantities[line.product_id] ?? "0");
        const qty = Number(raw);
        return /^\d+$/.test(raw) && Number.isSafeInteger(qty)
          && qty >= 0 && qty <= line.assignable;
      });
      if (items.length !== allocation.items.length
        || !items.some((line) => Number(quantities[line.product_id] || 0) > 0)) {
        setError("Revisa los saldos e indica al menos un libro para la entrega.");
        return;
      }
    }
    setFormStep((current) => Math.min(3, current + 1));
  }

  async function save(event) {
    event.preventDefault();
    if (saving) return;
    if (!form.adoption_id || !form.mode || !form.source_id || !form.destination_id) {
      setError("Selecciona la adopción, el tipo de atención y los lugares de salida y llegada.");
      return;
    }
    if (form.source_id === form.destination_id) {
      setError("Selecciona un destino diferente del almacén de origen.");
      return;
    }
    if (!form.operation_name.trim() || !form.responsible_name.trim()) {
      setError("Indica el nombre de la entrega y el responsable de recepción.");
      return;
    }
    if (form.scheduled_on && form.scheduled_until && form.scheduled_until < form.scheduled_on) {
      setError("La fecha final debe ser igual o posterior a la inicial.");
      return;
    }
    if (!allocation || allocationBusy || allocation.adoption_id !== Number(form.adoption_id)) {
      setError("Consulta las cantidades de la adopción antes de guardar.");
      return;
    }
    const items = [];
    for (const line of allocation.items) {
      const raw = String(quantities[line.product_id] ?? "0").trim();
      if (!/^\d+$/.test(raw)) {
        setError("Indica unidades enteras para " + line.product + "; no se admiten decimales.");
        return;
      }
      const quantity = Number(raw);
      if (!Number.isSafeInteger(quantity) || quantity > line.assignable) {
        setError("Para " + line.product + " puedes asignar hasta " + line.assignable + " unidades.");
        return;
      }
      if (quantity > 0) items.push({ product_id: line.product_id, quantity });
    }
    if (!items.length) {
      setError("Asigna al menos un libro para esta entrega.");
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
          items,
        });
        setNotice("Planificación y cantidades actualizadas con historial. No se movieron libros.");
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
          items,
        });
        setNotice("Cantidades planificadas. Los libros todavía no se han reservado ni enviado.");
      }
      setEditingId(null);
      setOriginalPlan(null);
      setAllocation(null);
      setFormOpen(false);
      setLoading(true);
      setDeliveryFilter("planned,reserved");
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

  function refrescarEntrega(nextStatus) {
    if (nextStatus === "prepared" || nextStatus === "in_transit"
      || nextStatus === "delivered") {
      setDeliveryFilter(nextStatus);
      setPage(1);
    } else if (nextStatus === "planned" || nextStatus === "reserved") {
      setDeliveryFilter("planned,reserved");
      setPage(1);
    }
    setLoading(true);
    setVersion((v) => v + 1);
  }

  const seleccionada = selectedAdoption || opciones.adoptions.find((item) =>
    String(item.id) === String(form.adoption_id));
  const source = opciones.locations.find((place) => String(place.id) === form.source_id);
  const destination = opciones.locations.find(
    (place) => String(place.id) === form.destination_id,
  );
  const destinationMismatch = Boolean(
    destination && form.mode && MODE_LOCATION_KIND[form.mode]
    && destination.kind !== MODE_LOCATION_KIND[form.mode],
  );
  const matchingLocations = opciones.locations.filter(
    (place) => place.kind === MODE_LOCATION_KIND[form.mode]
      && (form.mode !== "fair" || Boolean(place.fair_event_id))
      && String(place.id) !== form.source_id,
  );
  const legacyFairDestination = form.mode === "fair" && destination?.kind === "fair"
    && !destination.fair_event_id;
  const otherLocations = opciones.locations.filter(
    (place) => !matchingLocations.some((match) => match.id === place.id),
  );
  const totalPlanned = allocation
    ? allocation.items.reduce((sum, line) => sum + Number(quantities[line.product_id] || 0), 0)
    : 0;
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
            <h2 className="text-base font-black text-gray-950">Distribuciones y entregas</h2>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-gray-600">
              Organiza los libros para tienda, feria o consignación. Sigue cada entrega
              desde la reserva y preparación hasta la recepción en destino.
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
                Nueva distribución
              </button>
            )}
          </div>
        </div>
        <nav aria-label="Filtrar entregas por avance"
          className="flex gap-1 overflow-x-auto rounded-xl bg-gray-100 p-1">
          {DELIVERY_FILTERS.map(({ id, label }) => (
            <button key={id} type="button" aria-pressed={deliveryFilter === id}
              onClick={() => {
                if (deliveryFilter === id) return;
                setDeliveryFilter(id);
                setExpandedId(null);
                setPage(1);
                setLoading(true);
              }}
              className={
                "min-h-10 shrink-0 rounded-lg px-3 text-xs font-semibold transition-colors sm:px-4 " +
                (deliveryFilter === id
                  ? "bg-white text-gray-950 shadow-sm ring-1 ring-gray-200"
                  : "text-gray-600 hover:bg-white/80")
              }>
              {label}
            </button>
          ))}
        </nav>
        {notice && <p role="status" className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-800">{notice}</p>}
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}

        {formOpen && puedeGestionar && (
          <form onSubmit={save} className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-black text-gray-950">
                {editingId ? "Cambiar planificación" : "Planificar entrega"}
              </h3>
              <button type="button" onClick={() => { setFormOpen(false); setError(""); }}
                className={buttonClass}>Cerrar</button>
            </div>
            <nav aria-label="Pasos de la planificación" className="grid grid-cols-4 gap-1 rounded-xl bg-gray-200 p-1">
              {["Adopción", "Modalidad y destino", "Cantidades", "Responsable"].map((name, index) => (
                <button key={name} type="button" disabled={index > formStep}
                  aria-current={index === formStep ? "step" : undefined}
                  className={"min-h-11 rounded-lg px-2 text-center text-xs font-semibold transition-colors " + (
                    index === formStep
                      ? "bg-white text-red-700 shadow-sm"
                      : index < formStep ? "text-gray-900 hover:bg-white" : "text-gray-500"
                  )}
                  onClick={() => { setFormStep(index); setError(""); }}>
                  <span className="hidden sm:inline">{index + 1}. </span>{name}
                </button>
              ))}
            </nav>

            {formStep === 0 && (
              <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-3 sm:p-4">
              <div>
                <h4 className="text-sm font-black text-gray-950">1. Elegir adopción confirmada</h4>
                <p className="mt-1 text-xs text-gray-600">
                  Busca por colegio, campaña o número de adopción. Solo se muestran las adopciones vigentes.
                </p>
              </div>
              {!editingId && (showAdoptionResults || !seleccionada) && (
                <div className="grid min-w-0 gap-3 sm:grid-cols-3">
                  <label className="block min-w-0 text-xs font-bold text-gray-700 sm:col-span-2">
                    Buscar colegio o campaña
                    <input type="search" maxLength={100} className={fieldClass}
                      value={adoptionSearch}
                      onChange={(event) => changeAdoptionFilter("search", event.target.value)}
                      placeholder="Ej. colegio de demostración o número de adopción" />
                  </label>
                  <label className="block min-w-0 text-xs font-bold text-gray-700">
                    Año de campaña
                    <select value={adoptionYear} className={fieldClass}
                      onChange={(event) => changeAdoptionFilter("year", event.target.value)}>
                      <option value="">Todos los años</option>
                      {opciones.campaign_years.map((year) => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
              {seleccionada && (
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
                  <div className="min-w-0">
                    <p className="text-xs font-black text-red-800">
                      Adopción seleccionada
                    </p>
                    <p className="break-words text-sm font-bold text-gray-950">{seleccionada.school}</p>
                    <p className="text-xs text-gray-600">
                      {seleccionada.campaign || "Campaña"}
                      {seleccionada.campaign_year ? " · " + seleccionada.campaign_year : ""}
                      {" · "}Adopción #{seleccionada.id}
                    </p>
                  </div>
                  {!editingId && !showAdoptionResults && (
                    <button type="button" className={buttonClass}
                      onClick={() => setShowAdoptionResults(true)}>
                      Cambiar adopción
                    </button>
                  )}
                </div>
              )}
              {!editingId && showAdoptionResults && (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600">
                    <span aria-live="polite">
                      {adoptionBusy ? "Buscando adopciones…" : (
                        (opciones.adoptions_meta?.count ?? 0) === 1
                          ? "1 adopción encontrada"
                          : (opciones.adoptions_meta?.count ?? 0) + " adopciones encontradas"
                      )}
                    </span>
                    {(adoptionSearch || adoptionYear) && (
                      <button type="button" className="font-bold text-red-700 underline underline-offset-2"
                        onClick={() => {
                          setAdoptionSearch("");
                          setAdoptionYear("");
                          setAdoptionPage(1);
                          setAdoptionBusy(true);
                          clearChosenAdoption();
                        }}>
                        Limpiar filtros
                      </button>
                    )}
                  </div>
                  {adoptionBusy ? (
                    <p role="status" className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
                      Consultando colegios y campañas…
                    </p>
                  ) : opciones.adoptions.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-gray-300 p-3 text-sm text-gray-600">
                      No se encontraron adopciones vigentes con esos filtros. Prueba con otro
                      colegio, un año distinto o limpia los filtros.
                    </p>
                  ) : (
                    <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                      {opciones.adoptions.map((item) => (
                        <button key={item.id} type="button"
                          aria-pressed={String(form.adoption_id) === String(item.id)}
                          onClick={() => chooseAdoption(String(item.id))}
                          className={"flex w-full min-w-0 flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-left transition-colors " + (
                            String(form.adoption_id) === String(item.id)
                              ? "border-red-500 bg-red-50"
                              : "border-gray-200 bg-gray-50 hover:border-red-300 hover:bg-white"
                          )}>
                          <span className="min-w-0">
                            <span className="block break-words text-sm font-bold text-gray-950">{item.school}</span>
                            <span className="mt-1 block text-xs text-gray-600">
                              {item.campaign} · {item.campaign_year} · Adopción #{item.id}
                              {" · "}{item.items.length} títulos
                            </span>
                          </span>
                          <span className="shrink-0 text-xs font-black text-red-700">
                            {String(form.adoption_id) === String(item.id) ? "Seleccionada" : "Elegir"}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  {!adoptionBusy && (opciones.adoptions_meta?.pages ?? 1) > 1 && (
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600">
                      <span>
                        Página {opciones.adoptions_meta.page} de {opciones.adoptions_meta.pages}
                      </span>
                      <div className="flex gap-2">
                        <button type="button" className={buttonClass}
                          disabled={adoptionPage <= 1}
                          onClick={() => { setAdoptionBusy(true); setAdoptionPage((p) => p - 1); }}>
                          Anterior
                        </button>
                        <button type="button" className={buttonClass}
                          disabled={adoptionPage >= (opciones.adoptions_meta?.pages ?? 1)}
                          onClick={() => { setAdoptionBusy(true); setAdoptionPage((p) => p + 1); }}>
                          Siguiente
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              </section>
            )}

            {formStep === 1 && (
              <>
            <fieldset className="space-y-3 rounded-xl border border-gray-200 bg-white p-3 sm:p-4">
              <legend className="sr-only">Tipo de atención</legend>
              <div>
                <h4 className="text-sm font-black text-gray-950">2. ¿Para qué se preparan los libros?</h4>
                <p className="mt-1 text-xs text-gray-600">
                  Elige una sola modalidad para ESTA entrega. Puedes crear otra entrega de la
                  misma adopción para una modalidad diferente, con las cantidades pendientes.
                </p>
              </div>
              <div className="grid gap-2 md:grid-cols-3">
                {Object.entries(MODE_LABELS).map(([mode, label]) => (
                  <label key={mode}
                    className={"flex min-w-0 cursor-pointer items-start gap-2 rounded-xl border p-3 transition-colors " + (
                      form.mode === mode
                        ? "border-red-600 bg-red-50"
                        : "border-gray-200 bg-gray-50 hover:border-red-300"
                    )}>
                    <input type="radio" name="distribution_mode" value={mode} required
                      className="mt-0.5 size-4 shrink-0 accent-red-700"
                      checked={form.mode === mode}
                      onChange={() => chooseMode(mode)} />
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-gray-950">{label}</span>
                      <span className="mt-1 block text-xs leading-5 text-gray-600">
                        {MODE_INFO[mode]}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              {seleccionada?.sale_mode && form.mode !== seleccionada.sale_mode && (
                <p className="text-xs text-gray-600">
                  En la adopción se acordó {MODE_LABELS[seleccionada.sale_mode]}.
                  Puedes modificar el tipo de atención aquí sin cambiar el acuerdo del CRM.
                </p>
              )}
            </fieldset>

            <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-3 sm:p-4">
              <div>
                <h4 className="text-sm font-black text-gray-950">3. ¿Desde dónde salen y dónde quedarán?</h4>
                <p className="mt-1 text-xs leading-5 text-gray-600">
                  Estos campos identifican lugares físicos, no la modalidad de atención.
                  Elige dónde están los libros ahora y dónde se atenderán o custodiarán después.
                  Guardar el plan no traslada mercadería.
                </p>
                <Link to="/admin/erp/almacen/inventario?vista=consolidado"
                  target="_blank" rel="noopener noreferrer"
                  className="mt-2 inline-flex min-h-10 items-center text-xs font-bold text-red-700 underline underline-offset-2">
                  Consultar existencias antes de elegir la salida
                </Link>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block min-w-0 text-xs font-bold text-gray-700">
                  Lugar de salida de los libros
                  <select required value={form.source_id} className={fieldClass}
                    onChange={(event) => field("source_id", event.target.value)}>
                    <option value="">Elegir lugar de salida</option>
                    {opciones.locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name} · {LOCATION_KIND_LABEL[location.kind] || "Depósito"}
                      </option>
                    ))}
                  </select>
                  <span className="mt-1 block font-normal leading-5 text-gray-600">
                    Comprueba la ubicación real en Inventario. No se selecciona automáticamente.
                  </span>
                </label>
                <label className="block min-w-0 text-xs font-bold text-gray-700">
                  Lugar de llegada o atención
                  <select required value={form.destination_id} className={fieldClass}
                    onChange={(event) => field("destination_id", event.target.value)}>
                    <option value="">Elegir destino</option>
                    {matchingLocations.length > 0 && (
                      <optgroup label="Sugeridos para esta modalidad">
                        {matchingLocations.map((location) => (
                          <option key={location.id} value={location.id}>
                            {location.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    <optgroup label="Otros lugares">
                      {otherLocations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.name} · {LOCATION_KIND_LABEL[location.kind] || "Depósito"}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  <span className="mt-1 block font-normal leading-5 text-gray-600">
                    Lugar donde quedarán los libros para la atención o custodia.
                  </span>
                </label>
              </div>
              {form.mode === "fair" && matchingLocations.length === 0 && (
                <p className="rounded-lg border border-gray-300 bg-gray-50 p-3 text-xs leading-5 text-gray-700">
                  Para una nueva feria registra primero el evento y su dirección real en
                  {" "}<Link to="/admin/erp/almacen/ubicaciones"
                    className="font-bold text-red-700 underline underline-offset-2">
                    Ferias y subalmacenes
                  </Link>. Así cada evento tendrá mercadería separada.
                </p>
              )}
              {legacyFairDestination && (
                <p role="status" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                  Elegiste una ubicación genérica de feria. Las ferias nuevas deben
                  tener un destino propio para no mezclar existencias entre eventos.
                  Las planificaciones antiguas conservan su destino hasta su revisión.
                </p>
              )}
              {source && destination && source.id === destination.id && (
                <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                  El lugar de salida y el de llegada son el mismo.
                  Selecciona otro destino para esta planificación de traslado.
                </p>
              )}
              {destinationMismatch && (
                <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                  Estás planificando {MODE_LABELS[form.mode]}, pero elegiste
                  {" "}{destination.name} ({LOCATION_KIND_LABEL[destination.kind] || "otro lugar"}).
                  Si esa es realmente la ubicación de atención, puedes conservarla;
                  de lo contrario, revisa el destino antes de guardar.
                </p>
              )}
              {form.mode && source && destination && (
                <p className="rounded-lg bg-gray-950 p-3 text-xs leading-5 text-white">
                  <strong>Resumen del recorrido:</strong> {MODE_LABELS[form.mode]}
                  {" · "}Sale de <strong>{source.name}</strong> y se planifica hacia
                  {" "}<strong>{destination.name}</strong>.
                  Todavía no registra un traslado ni una venta.
                </p>
              )}
            </section>
              </>
            )}

            {formStep === 2 && form.adoption_id && (
              <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-3 text-xs">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h4 className="font-black text-gray-950">4. ¿Cuántos libros irán en esta entrega?</h4>
                    <p className="mt-1 max-w-2xl leading-5 text-gray-600">
                      Puedes planificar toda la adopción o solo una parte. El saldo es comercial:
                      aún no se verifica el stock físico ni se reservan libros.
                    </p>
                  </div>
                  {allocation && !allocationBusy && (
                    <button type="button" className={buttonClass}
                      onClick={() => setQuantities(Object.fromEntries(
                        allocation.items.map((line) => [line.product_id, String(line.assignable)]),
                      ))}>
                      Asignar todo el saldo
                    </button>
                  )}
                </div>
                {(allocationBusy || !allocation || allocation.adoption_id !== Number(form.adoption_id)) ? (
                  <p role="status" className="rounded-lg bg-gray-50 px-3 py-2 text-gray-600">
                    Consultando cantidades de esta adopción…
                  </p>
                ) : (
                  <>
                    {allocation.items.some((line) => line.overallocated > 0) && (
                      <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900">
                        Algunas planificaciones anteriores superan las cantidades adoptadas.
                        Revisa y corrige o anula las entregas duplicadas antes de continuar.
                      </p>
                    )}
                    <div className="space-y-2">
                      {allocation.items.map((line) => (
                        <div key={line.product_id}
                          className="grid min-w-0 gap-2 rounded-lg border border-gray-100 bg-gray-50 p-3 sm:grid-cols-4 sm:items-center">
                          <div className="min-w-0 sm:col-span-2">
                            <p className="break-words font-bold text-gray-900">{line.product}</p>
                            <p className="mt-1 text-gray-600">
                              Adoptados: <strong className="tabular-nums">{line.adopted}</strong>
                              {" · "}En otras entregas: <strong className="tabular-nums">{line.other_planned}</strong>
                            </p>
                            <p className="text-gray-700">
                              Saldo para esta entrega: <strong className="tabular-nums">{line.assignable}</strong>
                            </p>
                          </div>
                          <label className="block font-bold text-gray-700 sm:col-span-2 sm:ml-auto sm:w-40">
                            Cantidad a planificar
                            <input type="number" inputMode="numeric" step="1" min="0"
                              max={line.assignable}
                              value={quantities[line.product_id] ?? ""}
                              onChange={(event) => setQuantities((prev) => ({
                                ...prev, [line.product_id]: event.target.value,
                              }))}
                              className={fieldClass} />
                          </label>
                        </div>
                      ))}
                    </div>
                    {allocation.items.length === 0 && (
                      <p className="text-gray-600">Esta adopción no tiene productos disponibles para planificar.</p>
                    )}
                    {seleccionada && (
                      <p className="text-gray-500">
                        Colegio: {seleccionada.school}. Si asignas cero a un producto,
                        no se incluirá en esta entrega.
                      </p>
                    )}
                  </>
                )}
              </section>
            )}
            {formStep === 3 && (
              <>
            <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-3 sm:p-4">
              <div>
                <h4 className="text-sm font-black text-gray-950">5. Responsable y fechas</h4>
                <p className="mt-1 text-xs text-gray-600">
                  Identifica la entrega para que el equipo pueda coordinar su preparación.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block min-w-0 text-xs font-bold text-gray-700">
                  Nombre de esta entrega
                  <input required maxLength={180} value={form.operation_name}
                    onChange={(event) => field("operation_name", event.target.value)}
                    className={fieldClass} placeholder="Ej. Feria del colegio" />
                </label>
                <label className="block min-w-0 text-xs font-bold text-gray-700">
                  Persona que recibirá los libros
                  <input required maxLength={180} value={form.responsible_name}
                    onChange={(event) => field("responsible_name", event.target.value)}
                    className={fieldClass} placeholder="Nombre del encargado" />
                </label>
                <label className="block min-w-0 text-xs font-bold text-gray-700">
                  Fecha prevista de entrega (opcional)
                  <input type="date" value={form.scheduled_on}
                    onChange={(event) => field("scheduled_on", event.target.value)}
                    className={fieldClass} />
                </label>
                <label className="block min-w-0 text-xs font-bold text-gray-700">
                  Fecha final (opcional)
                  <input type="date" value={form.scheduled_until}
                    onChange={(event) => field("scheduled_until", event.target.value)}
                    className={fieldClass} />
                </label>
              </div>
              <label className="block text-xs font-bold text-gray-700">
                Observaciones (opcional)
                <textarea rows={2} maxLength={500} value={form.notes}
                  onChange={(event) => field("notes", event.target.value)}
                  className={fieldClass} placeholder="Indicaciones para organizar la entrega" />
              </label>
            </section>
            {editingId && hasChanges && (
              <label className="block text-xs font-bold text-gray-700">
                Motivo del cambio
                <textarea required minLength={8} maxLength={500} rows={2} value={form.reason}
                  onChange={(event) => field("reason", event.target.value)}
                  className={fieldClass}
                  placeholder="Ej. El colegio cambió de Feria a Consignación" />
              </label>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3">
              <p className="text-xs leading-5 text-gray-700">
                <strong className="text-gray-950">Antes de guardar:</strong>
                {" "}{Number.isFinite(totalPlanned) ? totalPlanned : 0} libros planificados
                {form.mode ? " · " + MODE_LABELS[form.mode] : ""}
                {destination ? " · " + destination.name : ""}.
                {" "}No se han reservado ni trasladado físicamente.
              </p>
              <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setFormOpen(false)} className={buttonClass}>
                Cancelar
              </button>
              <button type="submit" disabled={saving || (Boolean(editingId) && !hasChanges)}
                className="min-h-11 rounded-xl bg-red-700 px-4 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-50">
                {saving ? "Guardando…" : editingId ? "Guardar cambio" : "Guardar planificación"}
              </button>
              </div>
            </div>
              </>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-gray-600">Paso {formStep + 1} de 4</p>
              <div className="flex gap-2">
                {formStep > 0 && (
                  <button type="button" className={buttonClass}
                    onClick={() => { setFormStep((value) => Math.max(0, value - 1)); setError(""); }}>
                    Anterior
                  </button>
                )}
                {formStep < 3 && (
                  <button type="button" onClick={siguientePaso}
                    className="min-h-11 rounded-lg bg-gray-950 px-5 text-xs font-bold text-white hover:bg-gray-800">
                    Siguiente paso →
                  </button>
                )}
              </div>
            </div>
          </form>
        )}

        {loading && <p role="status" className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">Consultando entregas…</p>}
        {!loading && lista.results.length === 0 && (
          <p className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-600">
            No hay entregas en esta etapa. Puedes consultar otra pestaña
            o planificar una nueva entrega desde una adopción confirmada.
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
                <p className="mt-1 text-xs leading-5 text-gray-700">
                  <strong>Colegio:</strong> {item.school}
                  {item.campaign_year ? " · Campaña " + item.campaign_year : ""}
                </p>
                <p className="text-xs leading-5 text-gray-600">
                  <strong>Salida:</strong> {item.source}
                  {" → "}<strong>Destino:</strong> {item.destination}
                </p>
                {item.destination_kind && MODE_LOCATION_KIND[item.mode] !== item.destination_kind && (
                  <p className="mt-1 text-xs font-bold text-amber-800">
                    Revisar destino: el lugar elegido no es del tipo habitual para esta modalidad.
                  </p>
                )}
                <p className="text-xs leading-5 text-gray-600">
                  Responsable: {item.responsible_name}
                  {item.scheduled_on ? ` · ${item.scheduled_on}` : ""}
                </p>
                {item.status === "planned" && (
                  <p className="mt-1 text-xs font-semibold text-red-700">
                    Siguiente: abre Detalle para revisar existencias y reservar.
                  </p>
                )}
                {item.status === "reserved" && (
                  <p className="mt-1 text-xs font-semibold text-gray-800">
                    Siguiente: abre Detalle para verificar el conteo físico.
                  </p>
                )}
                {item.status === "prepared" && (
                  <p className="mt-1 text-xs font-semibold text-red-700">
                    Siguiente: generar orden interna y organizar la salida.
                  </p>
                )}
                {item.status === "in_transit" && (
                  <p className="mt-1 text-xs font-semibold text-blue-800">
                    Mercadería despachada: pendiente de conteo y recepción en destino.
                  </p>
                )}
                {item.status === "delivered" && (
                  <p className="mt-1 text-xs font-semibold text-green-800">
                    Llegada confirmada. La mercadería ya figura en la ubicación de destino.
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button"
                  className={
                    "inline-flex min-h-10 items-center justify-center gap-1 rounded-lg border px-3 text-xs font-bold transition-colors " +
                    (expandedId === item.id
                      ? "border-gray-300 bg-gray-50 text-gray-900"
                      : "border-red-700 bg-red-700 text-white hover:bg-red-800")
                  }
                  aria-expanded={expandedId === item.id}
                  onClick={() => setExpandedId((current) => current === item.id ? null : item.id)}>
                  {item.status === "planned" || item.status === "reserved"
                    ? "Preparar libros"
                    : item.status === "prepared" || item.status === "in_transit"
                      ? "Continuar despacho"
                      : "Ver detalle"}
                  <FiChevronDown aria-hidden="true" />
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
                  Estas cantidades corresponden a esta entrega.
                  {item.status === "planned"
                    ? " Aún no se han reservado ni despachado libros."
                    : item.status === "reserved"
                      ? " Los libros están reservados, pero no despachados."
                      : item.status === "prepared"
                        ? " Los libros están preparados; falta confirmar la salida."
                        : item.status === "in_transit"
                          ? " Los libros salieron y esperan confirmación de llegada."
                          : item.status === "delivered"
                            ? " La recepción en destino ya fue confirmada."
                            : " Esta entrega fue anulada."}
                </p>
                <div className="space-y-1">
                  {item.items.map((line) => (
                    <p key={line.product_id} className="flex justify-between gap-2 text-gray-700">
                      <span>{line.product}</span>
                      <strong className="shrink-0 tabular-nums">{line.quantity_planned}</strong>
                    </p>
                  ))}
                </div>
                {["planned", "reserved"].includes(item.status) && (
                  <DistributionPreparationPanel operation={item} canManage={puedeGestionar}
                    onChanged={refrescarEntrega} />
                )}
                {item.status === "prepared" && (
                  <details className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                    <summary className="cursor-pointer text-sm font-bold text-gray-900">
                      Ver conteo confirmado y coordinación opcional
                    </summary>
                    <div className="mt-3">
                      <DistributionPreparationPanel operation={item} canManage={puedeGestionar}
                        onChanged={refrescarEntrega} />
                    </div>
                  </details>
                )}
                {["prepared", "in_transit", "delivered"].includes(item.status) && (
                  <DistributionDispatchPanel operation={item} canManage={puedeGestionar}
                    canMoveStock={puedeTrasladar}
                    canResolveIncidents={puedeResolverIncidencias}
                    onChanged={refrescarEntrega} />
                )}
                <details className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <summary className="cursor-pointer text-sm font-bold text-gray-900">
                    Historial de la operación ({item.events.length})
                  </summary>
                  <div className="mt-3 space-y-2">
                {item.events.map((event, idx) => (
                  <p key={idx} className="break-words text-gray-700">
                    {event.actor} · {event.action === "created" ? "Planificación creada"
                      : event.action === "cancelled" ? "Planificación anulada"
                        : event.action === "stock_reserved" ? "Existencias reservadas"
                          : event.action === "split_by_stock" ? "Entrega dividida: saldo pendiente en otra planificación"
                            : event.action === "prepared" ? "Preparación verificada"
                            : event.action === "transport_draft_updated" ? "Datos de coordinación actualizados"
                              : event.action === "dispatch_document" ? "Orden interna generada"
                                : event.action === "dispatched" ? "Salida física confirmada"
                                  : event.action === "received_destination" ? "Recepción en destino confirmada"
                                    : "Planificación modificada"}
                    {event.previous?.mode && event.previous.mode !== event.current?.mode
                      ? ` · ${MODE_LABELS[event.previous.mode]} → ${MODE_LABELS[event.current.mode]}`
                      : ""}
                    {event.reason ? ` · ${event.reason}` : ""}
                  </p>
                ))}
                  </div>
                </details>
                {puedeGestionar && ["planned", "reserved"].includes(item.status) && (
                  cancelId === item.id ? (
                    <div className="space-y-2 rounded-lg bg-gray-50 p-3">
                      <label className="block text-xs font-bold text-gray-800">
                        ¿Por qué se anula esta entrega? Las reservas se liberarán.
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
                      Anular entrega
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
