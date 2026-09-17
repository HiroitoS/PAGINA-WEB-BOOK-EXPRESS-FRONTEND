import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { motion } from "motion/react";
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaEnvelope,
  FaExclamationTriangle,
  FaEye,
  FaFilter,
  FaHistory,
  FaPhoneAlt,
  FaRegCommentDots,
  FaSave,
  FaSearch,
  FaSyncAlt,
  FaTimes,
  FaUndo,
  FaUserCheck,
  FaWhatsapp,
} from "react-icons/fa";
import {
  getAdminContactRequestById,
  getAdminContactRequests,
  registerAdminContactRequestAttention,
  reopenAdminContactRequest,
} from "../../api/adminApi";
import { getResults } from "../../utils/formatters";

const STATUS_OPTIONS = [
  { value: "new", label: "Nuevo" },
  { value: "under_review", label: "En revisión" },
  { value: "contacted", label: "Contactado" },
  { value: "in_follow_up", label: "En seguimiento" },
  { value: "closed", label: "Cerrado" },
  { value: "discarded", label: "Descartado" },
];

const SOURCE_OPTIONS = [
  { value: "catalog", label: "Catálogo" },
  { value: "web", label: "Web" },
  { value: "whatsapp", label: "WhatsApp" },
];

const INQUIRY_TYPE_OPTIONS = [
  { value: "product", label: "Libro o material educativo" },
  { value: "school", label: "Consulta para colegio" },
  { value: "reading_plan", label: "Plan lector" },
  { value: "catalog", label: "Editoriales y catálogo" },
  { value: "training", label: "Capacitación docente" },
  { value: "other", label: "Otra consulta" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Baja" },
  { value: "medium", label: "Media" },
  { value: "high", label: "Alta" },
  { value: "urgent", label: "Urgente" },
];

const ACTION_TYPE_OPTIONS = [
  { value: "general", label: "Comentario general" },
  { value: "whatsapp", label: "Contacto por WhatsApp" },
  { value: "phone", label: "Llamada telefónica" },
  { value: "email", label: "Correo electrónico" },
  { value: "follow_up", label: "Seguimiento" },
  { value: "internal", label: "Nota interna" },
  { value: "other", label: "Otro" },
];

function getEmptyFilters() {
  return {
    search: "",
    status: "",
    source: "",
    inquiry_type: "",
    priority: "",
  };
}

function getInitialFilters(searchParams) {
  return {
    search: searchParams.get("search") || "",
    status: searchParams.get("status") || "",
    source: searchParams.get("source") || "",
    inquiry_type: searchParams.get("inquiry_type") || "",
    priority: searchParams.get("priority") || "",
  };
}

function buildRequestParams(filters) {
  const params = {};

  if (filters.search.trim()) {
    params.search = filters.search.trim();
  }

  if (filters.status) {
    params.status = filters.status;
  }

  if (filters.source) {
    params.source = filters.source;
  }

  if (filters.inquiry_type) {
    params.inquiry_type = filters.inquiry_type;
  }

  if (filters.priority) {
    params.priority = filters.priority;
  }

  return params;
}

function getStatusLabel(value) {
  const option = STATUS_OPTIONS.find((item) => item.value === value);
  return option?.label || value || "-";
}

function getStatusClass(value) {
  if (value === "new") return "bg-blue-50 text-blue-700 ring-blue-100";
  if (value === "under_review") {
    return "bg-sky-50 text-sky-700 ring-sky-100";
  }
  if (value === "contacted") {
    return "bg-purple-50 text-purple-700 ring-purple-100";
  }
  if (value === "in_follow_up") {
    return "bg-yellow-50 text-yellow-800 ring-yellow-100";
  }
  if (value === "closed") return "bg-green-50 text-green-700 ring-green-100";
  if (value === "discarded") return "bg-red-50 text-red-700 ring-red-100";

  return "bg-gray-100 text-gray-700 ring-gray-200";
}

function getSourceLabel(value) {
  const option = SOURCE_OPTIONS.find((item) => item.value === value);
  return option?.label || value || "-";
}

function getInquiryTypeLabel(value) {
  const option = INQUIRY_TYPE_OPTIONS.find((item) => item.value === value);
  return option?.label || value || "-";
}

function getPriorityLabel(value) {
  const option = PRIORITY_OPTIONS.find((item) => item.value === value);
  return option?.label || value || "-";
}

function getPriorityClass(value) {
  if (value === "urgent") return "bg-red-50 text-red-700 ring-red-100";
  if (value === "high") return "bg-orange-50 text-orange-700 ring-orange-100";
  if (value === "medium") {
    return "bg-yellow-50 text-yellow-800 ring-yellow-100";
  }
  if (value === "low") return "bg-gray-100 text-gray-700 ring-gray-200";

  return "bg-gray-100 text-gray-700 ring-gray-200";
}

function getActionTypeLabel(value) {
  const option = ACTION_TYPE_OPTIONS.find((item) => item.value === value);
  return option?.label || value || "-";
}

function formatDate(value) {
  if (!value) return "-";

  try {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "-";

    return new Intl.DateTimeFormat("es-PE", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(date);
  } catch {
    return "-";
  }
}

function getRequestDate(request) {
  return (
    request.created_at ||
    request.creado_en ||
    request.created ||
    request.fecha_creacion ||
    request.fecha ||
    ""
  );
}

function getRequestProduct(request) {
  return request.product_name || request.product_display || "Consulta general";
}

function getRequestProvider(request) {
  return request.provider_name || request.provider_display || "-";
}

function getWhatsappLink(phone) {
  const cleanPhone = String(phone || "").replace(/\D/g, "");

  if (!cleanPhone) return "";

  if (cleanPhone.startsWith("51")) {
    return `https://wa.me/${cleanPhone}`;
  }

  return `https://wa.me/51${cleanPhone}`;
}

function getActiveFilterInfo(filters) {
  if (filters.status === "new") {
    return {
      title: "Solicitudes nuevas",
      description:
        "Consultas pendientes de primera atención. Prioriza responderlas antes de que pierdan oportunidad comercial.",
      tone: "blue",
    };
  }

  if (filters.status === "under_review") {
    return {
      title: "Solicitudes en revisión",
      description:
        "Consultas que ya fueron vistas y necesitan clasificación o primera gestión.",
      tone: "blue",
    };
  }

  if (filters.status === "contacted") {
    return {
      title: "Solicitudes contactadas",
      description:
        "Consultas que ya tuvieron una primera respuesta y pueden requerir seguimiento.",
      tone: "purple",
    };
  }

  if (filters.status === "in_follow_up") {
    return {
      title: "Solicitudes en seguimiento",
      description:
        "Consultas que necesitan continuidad comercial o confirmación del cliente.",
      tone: "yellow",
    };
  }

  if (filters.status === "closed") {
    return {
      title: "Solicitudes cerradas",
      description:
        "Consultas finalizadas. Sirven como historial de atención comercial.",
      tone: "green",
    };
  }

  if (filters.status === "discarded") {
    return {
      title: "Solicitudes descartadas",
      description:
        "Consultas que no continuaron o no aplican para atención comercial.",
      tone: "red",
    };
  }

  if (filters.source) {
    return {
      title: `Solicitudes desde ${getSourceLabel(filters.source)}`,
      description:
        "Vista filtrada por origen para revisar de dónde llegan las consultas.",
      tone: "gray",
    };
  }

  if (filters.inquiry_type) {
    return {
      title: `Consultas: ${getInquiryTypeLabel(filters.inquiry_type)}`,
      description:
        "Vista filtrada por tipo de consulta para ordenar mejor la atención comercial.",
      tone: "gray",
    };
  }

  if (filters.priority) {
    return {
      title: `Solicitudes con prioridad ${getPriorityLabel(filters.priority)}`,
      description:
        "Vista filtrada por prioridad para ordenar la atención interna.",
      tone: "gray",
    };
  }

  return null;
}

function getActiveFiltersCount(filters) {
  return [
    filters.search,
    filters.status,
    filters.source,
    filters.inquiry_type,
    filters.priority,
  ].filter(Boolean).length;
}

function getInitialAttentionForm() {
  return {
    action_type: "whatsapp",
    status: "",
    comment: "",
  };
}

export default function ContactRequestsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [requests, setRequests] = useState([]);
  const [filters, setFilters] = useState(() => getInitialFilters(searchParams));

  const [totalRequests, setTotalRequests] = useState(0);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const [attentionForm, setAttentionForm] = useState(() =>
    getInitialAttentionForm()
  );
  const [savingAttention, setSavingAttention] = useState(false);
  const [reopenReason, setReopenReason] = useState("");
  const [reopeningRequest, setReopeningRequest] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const activeFilterInfo = getActiveFilterInfo(filters);
  const activeFiltersCount = getActiveFiltersCount(filters);

  function handleFilterChange(event) {
    const { name, value } = event.target;

    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function applyQuickFilter(status) {
    if (!status) {
      clearFilters();
      return;
    }

    const nextFilters = {
      ...getEmptyFilters(),
      status,
    };

    setFilters(nextFilters);
    setSearchParams({ status }, { replace: true });
  }

  async function loadRequests(currentFilters = filters) {
    setLoading(true);
    setError("");

    try {
      const data = await getAdminContactRequests(
        buildRequestParams(currentFilters)
      );

      setRequests(getResults(data));
      setTotalRequests(data?.count || getResults(data).length);
    } catch {
      setError("No se pudieron cargar las solicitudes.");
    } finally {
      setLoading(false);
    }
  }

  async function loadRequestDetail(requestId) {
    setDetailsLoading(true);
    setError("");

    try {
      const data = await getAdminContactRequestById(requestId);

      setSelectedRequest(data);

      return data;
    } catch {
      setError("No se pudo cargar el detalle de la solicitud.");
      return null;
    } finally {
      setDetailsLoading(false);
    }
  }

  async function openRequestDetail(request) {
    setSelectedRequest(request);
    setAttentionForm(getInitialAttentionForm());
    setReopenReason("");
    await loadRequestDetail(request.id);
  }

  function closeRequestDetail() {
    setSelectedRequest(null);
    setAttentionForm(getInitialAttentionForm());
    setReopenReason("");
    setDetailsLoading(false);
    setSavingAttention(false);
    setReopeningRequest(false);
  }

  async function handleAttentionSubmit(event) {
    event.preventDefault();

    if (!selectedRequest) return;

    if (!attentionForm.comment.trim()) {
      setError("Ingresa el detalle o resultado de la atención.");
      return;
    }

    setSavingAttention(true);
    setError("");
    setSuccessMessage("");

    const payload = {
      action_type: attentionForm.action_type,
      comment: attentionForm.comment.trim(),
    };

    if (attentionForm.status) {
      payload.status = attentionForm.status;
    }

    try {
      await registerAdminContactRequestAttention(
        selectedRequest.id,
        payload
      );

      setSuccessMessage(
        attentionForm.status
          ? "Atención registrada y estado actualizado correctamente."
          : "Atención registrada correctamente. El estado se mantuvo sin cambios."
      );
      await loadRequests(filters);
      await loadRequestDetail(selectedRequest.id);
      setAttentionForm(getInitialAttentionForm());
    } catch {
      setError("No se pudo registrar la atención de la solicitud.");
    } finally {
      setSavingAttention(false);
    }
  }

  async function handleReopenRequest(event) {
    event.preventDefault();

    if (!selectedRequest) return;

    if (!reopenReason.trim()) {
      setError("Ingresa el motivo de reapertura de la solicitud.");
      return;
    }

    setReopeningRequest(true);
    setError("");
    setSuccessMessage("");

    try {
      await reopenAdminContactRequest(selectedRequest.id, {
        reason: reopenReason.trim(),
      });

      setSuccessMessage(
        "Solicitud reabierta correctamente. Ahora está En seguimiento."
      );
      setReopenReason("");
      await loadRequests(filters);
      await loadRequestDetail(selectedRequest.id);
    } catch {
      setError("No se pudo reabrir la solicitud.");
    } finally {
      setReopeningRequest(false);
    }
  }

  function clearFilters() {
    setFilters(getEmptyFilters());
    setSearchParams({}, { replace: true });
  }

  useEffect(() => {
    let ignore = false;

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      setError("");

      try {
        const data = await getAdminContactRequests(buildRequestParams(filters));

        if (!ignore) {
          setRequests(getResults(data));
          setTotalRequests(data?.count || getResults(data).length);
        }
      } catch {
        if (!ignore) {
          setError("No se pudieron cargar las solicitudes.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }, 300);

    return () => {
      ignore = true;
      clearTimeout(timeoutId);
    };
  }, [filters]);

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="rounded-3xl bg-gray-950 p-6 text-white shadow-xl shadow-gray-950/10"
      >
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-red-400">
              Atención comercial
            </p>

            <h1 className="mt-2 text-3xl font-black">
              Solicitudes de contacto
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-300">
              Gestiona consultas recibidas desde la web pública, catálogo y
              fichas de producto. Registra evidencia de atención y controla el
              seguimiento comercial.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to="/admin/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/15"
            >
              <FaArrowLeft className="text-xs" />
              Volver al Dashboard
            </Link>

            <button
              type="button"
              onClick={() => loadRequests(filters)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/15"
            >
              <FaSyncAlt className={loading ? "animate-spin" : ""} />
              Actualizar
            </button>
          </div>
        </div>
      </motion.div>

      {activeFilterInfo && (
        <FilterBanner
          info={activeFilterInfo}
          total={totalRequests}
          onClear={clearFilters}
        />
      )}

      {error && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700">
          {successMessage}
        </div>
      )}

      <section className="mt-6 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-red-700">
              <FaFilter />
              Filtros
            </div>

            <h2 className="mt-2 text-xl font-black text-gray-950">
              Revisar solicitudes
            </h2>
          </div>

          <button
            type="button"
            onClick={clearFilters}
            disabled={activeFiltersCount === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FaTimes className="text-xs" />
            Limpiar filtros
          </button>
        </div>

        <div className="mb-5 flex flex-wrap gap-2 rounded-2xl bg-gray-50 p-3 ring-1 ring-gray-100">
          <QuickFilterButton
            active={activeFiltersCount === 0}
            label="Todas"
            onClick={() => applyQuickFilter("")}
          />

          <QuickFilterButton
            active={filters.status === "new"}
            label="Nuevas"
            onClick={() => applyQuickFilter("new")}
            tone="blue"
          />

          <QuickFilterButton
            active={filters.status === "under_review"}
            label="En revisión"
            onClick={() => applyQuickFilter("under_review")}
            tone="blue"
          />

          <QuickFilterButton
            active={filters.status === "contacted"}
            label="Contactadas"
            onClick={() => applyQuickFilter("contacted")}
            tone="purple"
          />

          <QuickFilterButton
            active={filters.status === "in_follow_up"}
            label="Seguimiento"
            onClick={() => applyQuickFilter("in_follow_up")}
            tone="yellow"
          />

          <QuickFilterButton
            active={filters.status === "closed"}
            label="Cerradas"
            onClick={() => applyQuickFilter("closed")}
            tone="green"
          />

          <QuickFilterButton
            active={filters.status === "discarded"}
            label="Descartadas"
            onClick={() => applyQuickFilter("discarded")}
            tone="red"
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-semibold text-gray-800">
              Buscar
            </label>

            <div className="relative">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400" />

              <input
                type="text"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Nombre, teléfono, correo, producto o editorial..."
                className="w-full rounded-xl border border-gray-300 px-4 py-3 pl-11 text-sm font-medium text-gray-900 outline-none transition focus:border-red-700 focus:ring-2 focus:ring-red-100"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-800">
              Estado
            </label>

            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="w-full rounded-xl border border-gray-300 px-3 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-red-700 focus:ring-2 focus:ring-red-100"
            >
              <option value="">Todos</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-800">
              Prioridad
            </label>

            <select
              name="priority"
              value={filters.priority}
              onChange={handleFilterChange}
              className="w-full rounded-xl border border-gray-300 px-3 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-red-700 focus:ring-2 focus:ring-red-100"
            >
              <option value="">Todas</option>
              {PRIORITY_OPTIONS.map((priority) => (
                <option key={priority.value} value={priority.value}>
                  {priority.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-800">
              Tipo de consulta
            </label>

            <select
              name="inquiry_type"
              value={filters.inquiry_type}
              onChange={handleFilterChange}
              className="w-full rounded-xl border border-gray-300 px-3 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-red-700 focus:ring-2 focus:ring-red-100"
            >
              <option value="">Todos</option>
              {INQUIRY_TYPE_OPTIONS.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-800">
              Origen
            </label>

            <select
              name="source"
              value={filters.source}
              onChange={handleFilterChange}
              className="w-full rounded-xl border border-gray-300 px-3 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-red-700 focus:ring-2 focus:ring-red-100"
            >
              <option value="">Todos</option>
              {SOURCE_OPTIONS.map((source) => (
                <option key={source.value} value={source.value}>
                  {source.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-gray-200 bg-gray-50 px-5 py-4 md:flex-row md:items-center">
          <div>
            <h2 className="font-black text-gray-950">
              Listado de solicitudes
            </h2>

            <p className="mt-1 text-sm text-gray-600">
              Mostrando{" "}
              <span className="font-black text-gray-950">
                {requests.length}
              </span>{" "}
              de{" "}
              <span className="font-black text-gray-950">
                {totalRequests}
              </span>{" "}
              solicitud(es).
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <StatusPill
              label="Nuevas"
              value={requests.filter((item) => item.status === "new").length}
              tone="blue"
            />
            <StatusPill
              label="Seguimiento"
              value={
                requests.filter((item) => item.status === "in_follow_up")
                  .length
              }
              tone="yellow"
            />
          </div>
        </div>

        {loading && (
          <div className="p-8 text-center text-gray-600">
            Cargando solicitudes...
          </div>
        )}

        {!loading && !error && requests.length === 0 && (
          <div className="p-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
              <FaRegCommentDots />
            </div>

            <p className="mt-4 font-black text-gray-950">
              No se encontraron solicitudes.
            </p>

            <p className="mt-2 text-sm text-gray-600">
              Cambia los filtros o limpia la búsqueda para ver más resultados.
            </p>
          </div>
        )}

        {!loading && !error && requests.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-white">
                <tr>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Consulta</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Prioridad</TableHead>
                  <TableHead>Seguimiento</TableHead>
                  <TableHead>Acciones</TableHead>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 bg-white">
                {requests.map((request) => {
                  const whatsappLink = getWhatsappLink(request.phone);
                  const isClosed = ["closed", "discarded"].includes(
                    request.status
                  );

                  return (
                    <tr
                      key={request.id}
                      className="align-top transition hover:bg-gray-50"
                    >
                      <td className="px-5 py-4">
                        <p className="font-black text-gray-950">
                          {request.full_name || "-"}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {request.email || "Sin correo"}
                        </p>

                        <p className="mt-2 text-xs text-gray-400">
                          Recibido: {formatDate(getRequestDate(request))}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <div className="space-y-2">
                          <p className="inline-flex items-center gap-2 font-bold text-gray-900">
                            <FaPhoneAlt className="text-xs text-gray-400" />
                            {request.phone || "-"}
                          </p>

                          {request.email && (
                            <p className="flex items-center gap-2 text-xs text-gray-500">
                              <FaEnvelope className="text-xs" />
                              {request.email}
                            </p>
                          )}

                          {whatsappLink && !isClosed && (
                            <a
                              href={whatsappLink}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700 ring-1 ring-green-100 transition hover:bg-green-100"
                            >
                              <FaWhatsapp />
                              WhatsApp
                            </a>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-black text-gray-950">
                          {getRequestProduct(request)}
                        </p>

                        <p className="mt-1 text-xs font-bold text-red-700">
                          {getRequestProvider(request)}
                        </p>

                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700 ring-1 ring-red-100">
                            {request.inquiry_type_display ||
                              getInquiryTypeLabel(request.inquiry_type)}
                          </span>
                          <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700 ring-1 ring-gray-200">
                            {getSourceLabel(request.source)}
                          </span>
                        </div>

                        {request.message && (
                          <p className="mt-3 max-w-md rounded-2xl bg-gray-50 p-3 text-xs leading-5 text-gray-600 ring-1 ring-gray-100">
                            {request.message}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${getStatusClass(
                            request.status
                          )}`}
                        >
                          {getStatusLabel(request.status)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${getPriorityClass(
                            request.priority
                          )}`}
                        >
                          {getPriorityLabel(request.priority)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="space-y-2 text-xs text-gray-600">
                          <p className="flex items-center gap-2">
                            <FaUserCheck className="text-gray-400" />
                            {request.assigned_to_name || "Sin responsable"}
                          </p>

                          <p className="flex items-center gap-2">
                            <FaCalendarAlt className="text-gray-400" />
                            {formatDate(request.next_action_at)}
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => openRequestDetail(request)}
                          className="inline-flex items-center gap-2 rounded-xl bg-gray-950 px-4 py-2 text-xs font-black text-white transition hover:bg-red-700"
                        >
                          <FaEye />
                          {["closed", "discarded"].includes(request.status)
                            ? "Ver detalle"
                            : "Atender"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedRequest && (
        <RequestDetailModal
          request={selectedRequest}
          detailsLoading={detailsLoading}
          attentionForm={attentionForm}
          setAttentionForm={setAttentionForm}
          savingAttention={savingAttention}
          reopenReason={reopenReason}
          setReopenReason={setReopenReason}
          reopeningRequest={reopeningRequest}
          onClose={closeRequestDetail}
          onAttentionSubmit={handleAttentionSubmit}
          onReopenRequest={handleReopenRequest}
        />
      )}
    </div>
  );
}

function RequestDetailModal({
  request,
  detailsLoading,
  attentionForm,
  setAttentionForm,
  savingAttention,
  reopenReason,
  setReopenReason,
  reopeningRequest,
  onClose,
  onAttentionSubmit,
  onReopenRequest,
}) {
  const whatsappLink = getWhatsappLink(request.phone);
  const isClosed = ["closed", "discarded"].includes(request.status);
  const comments = request.comments || [];
  const statusHistory = request.status_history || [];

  function handleAttentionChange(event) {
    const { name, value } = event.target;

    setAttentionForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-950/70 px-3 py-4 backdrop-blur-sm">
      <div className="mx-auto max-w-5xl">
        <div className="overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="flex flex-col justify-between gap-3 border-b border-gray-200 bg-gray-950 px-5 py-4 text-white md:flex-row md:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-red-400">
                {isClosed ? "Detalle de solicitud" : "Atención de solicitud"}
              </p>

              <h2 className="mt-1 text-xl font-black">
                {request.full_name || "Solicitud"}
              </h2>

              <p className="mt-1 text-xs text-gray-300">
                {isClosed
                  ? "Consulta la información y el historial. Si vuelve a requerir atención, reábrela con un motivo."
                  : "Registra la atención una sola vez y revisa la trazabilidad completa."}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/15"
            >
              <FaTimes />
              Cerrar
            </button>
          </div>

          {detailsLoading && (
            <div className="border-b border-gray-200 bg-yellow-50 px-5 py-2 text-xs font-semibold text-yellow-800">
              Actualizando detalle de solicitud...
            </div>
          )}

          <div className="grid gap-4 p-4 lg:grid-cols-12">
            <section className="rounded-2xl border border-gray-200 bg-gray-50 p-4 lg:col-span-4">
              <h3 className="text-base font-black text-gray-950">
                Datos de la consulta
              </h3>

              <div className="mt-3 grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-1">
                <InfoBlock label="Cliente" value={request.full_name} />
                <InfoBlock label="Teléfono / WhatsApp" value={request.phone} />
                <InfoBlock label="Correo" value={request.email || "Sin correo"} />
                <InfoBlock label="Producto" value={getRequestProduct(request)} />
                <InfoBlock
                  label="Editorial"
                  value={getRequestProvider(request)}
                />
                <InfoBlock
                  label="Tipo de consulta"
                  value={
                    request.inquiry_type_display ||
                    getInquiryTypeLabel(request.inquiry_type)
                  }
                />
                <InfoBlock label="Origen" value={getSourceLabel(request.source)} />
                <InfoBlock
                  label="Fecha de recepción"
                  value={formatDate(getRequestDate(request))}
                />
                <InfoBlock
                  label="Responsable"
                  value={request.assigned_to_name || "Sin responsable"}
                />
                <InfoBlock
                  label="Próxima acción"
                  value={formatDate(request.next_action_at)}
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${getStatusClass(
                    request.status
                  )}`}
                >
                  {getStatusLabel(request.status)}
                </span>

                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${getPriorityClass(
                    request.priority
                  )}`}
                >
                  Prioridad {getPriorityLabel(request.priority)}
                </span>
              </div>

              {whatsappLink && !isClosed && (
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-xs font-black text-white transition hover:bg-green-700"
                >
                  <FaWhatsapp />
                  Contactar por WhatsApp
                </a>
              )}

              {request.message && (
                <div className="mt-4 rounded-2xl bg-white p-3 text-xs leading-5 text-gray-700 ring-1 ring-gray-200">
                  <p className="mb-1 text-xs font-black uppercase tracking-wide text-gray-500">
                    Mensaje del cliente
                  </p>
                  {request.message}
                </div>
              )}
            </section>

            <section className="space-y-4 lg:col-span-8">
              {isClosed ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                    <p className="text-xs font-black uppercase tracking-wide text-blue-800">
                      Solicitud finalizada
                    </p>
                    <h3 className="mt-1 text-base font-black text-gray-950">
                      La atención está cerrada y protegida
                    </h3>
                    <p className="mt-2 text-xs leading-5 text-blue-900">
                      El historial permanece disponible para consulta. Si el cliente vuelve a requerir atención, reabre la solicitud antes de registrar una nueva gestión.
                    </p>
                  </div>

                  <form
                    onSubmit={onReopenRequest}
                    className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-yellow-800 ring-1 ring-yellow-200">
                        <FaUndo />
                      </div>

                      <div>
                        <p className="text-xs font-black uppercase tracking-wide text-yellow-800">
                          Acción excepcional
                        </p>
                        <h3 className="text-sm font-black text-gray-950">
                          Reabrir solicitud
                        </h3>
                      </div>
                    </div>

                    <p className="mt-3 text-xs leading-5 text-gray-700">
                      La solicitud volverá a En seguimiento y el motivo quedará registrado en el historial.
                    </p>

                    <label className="mt-4 block text-xs font-semibold text-gray-800">
                      Motivo de reapertura *
                    </label>
                    <textarea
                      value={reopenReason}
                      onChange={(event) => setReopenReason(event.target.value)}
                      rows={4}
                      placeholder="Ejemplo: El cliente solicitó ampliar la cotización a otro nivel educativo."
                      className="mt-1 w-full rounded-xl border border-yellow-300 bg-white px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-yellow-600 focus:ring-2 focus:ring-yellow-100"
                    />

                    <button
                      type="submit"
                      disabled={reopeningRequest}
                      className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 py-2.5 text-xs font-black text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <FaUndo />
                      {reopeningRequest ? "Reabriendo..." : "Reabrir solicitud"}
                    </button>
                  </form>
                </div>
              ) : (
              <form
                onSubmit={onAttentionSubmit}
                className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-red-50 text-red-700 ring-1 ring-red-100">
                    <FaRegCommentDots />
                  </div>

                  <div>
                    <h3 className="text-sm font-black text-gray-950">
                      Registrar atención
                    </h3>
                    <p className="text-xs text-gray-600">
                      Registra lo realizado una sola vez. El cambio de estado es opcional.
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-800">
                      Tipo de atención
                    </label>

                    <select
                      name="action_type"
                      value={attentionForm.action_type}
                      onChange={handleAttentionChange}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm font-medium text-gray-900 outline-none transition focus:border-red-700 focus:ring-2 focus:ring-red-100"
                    >
                      {ACTION_TYPE_OPTIONS.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-800">
                      Estado después de la atención
                    </label>

                    <select
                      name="status"
                      value={attentionForm.status}
                      onChange={handleAttentionChange}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm font-medium text-gray-900 outline-none transition focus:border-red-700 focus:ring-2 focus:ring-red-100"
                    >
                      <option value="">
                        Mantener {getStatusLabel(request.status)}
                      </option>
                      {STATUS_OPTIONS.filter(
                        (status) => status.value !== request.status
                      ).map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Déjalo sin cambio si solo estás registrando una llamada, correo o coordinación.
                    </p>
                  </div>
                </div>

                <div className="mt-3">
                  <label className="mb-1 block text-xs font-semibold text-gray-800">
                    Detalle / resultado *
                  </label>

                  <textarea
                    name="comment"
                    value={attentionForm.comment}
                    onChange={handleAttentionChange}
                    rows={4}
                    placeholder="Ejemplo: Se contactó al cliente por WhatsApp y se acordó enviar la información mañana."
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-red-700 focus:ring-2 focus:ring-red-100"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingAttention}
                  className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-xs font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <FaSave />
                  {savingAttention ? "Guardando..." : "Guardar atención"}
                </button>
              </form>
              )}
            </section>
          </div>

          <div className="grid gap-4 border-t border-gray-200 bg-gray-50 p-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <h3 className="flex items-center gap-2 text-sm font-black text-gray-950">
                <FaRegCommentDots className="text-red-700" />
                Evidencias registradas
              </h3>

              {comments.length === 0 ? (
                <EmptyInfo
                  icon={<FaExclamationTriangle />}
                  title="Sin evidencias registradas"
                  description="Cuando Atención registre una acción, aparecerá en esta sección."
                />
              ) : (
                <div className="mt-3 space-y-3">
                  {comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="rounded-2xl bg-gray-50 p-3 ring-1 ring-gray-100"
                    >
                      <div className="flex flex-col justify-between gap-2 md:flex-row">
                        <p className="text-xs font-black text-gray-950">
                          {comment.user_name || "Usuario"}
                        </p>

                        <span className="text-xs font-bold text-gray-500">
                          {formatDate(comment.created_at)}
                        </span>
                      </div>

                      <p className="mt-1 text-xs font-bold uppercase tracking-wide text-red-700">
                        {comment.action_type_display ||
                          getActionTypeLabel(comment.action_type)}
                      </p>

                      <p className="mt-2 text-xs leading-5 text-gray-700">
                        {comment.comment}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <h3 className="flex items-center gap-2 text-sm font-black text-gray-950">
                <FaHistory className="text-red-700" />
                Historial de estados
              </h3>

              {statusHistory.length === 0 ? (
                <EmptyInfo
                  icon={<FaExclamationTriangle />}
                  title="Sin cambios registrados"
                  description="Cuando se cambie el estado con nota, aparecerá el historial."
                />
              ) : (
                <div className="mt-3 space-y-3">
                  {statusHistory.map((history) => (
                    <div
                      key={history.id}
                      className="rounded-2xl bg-gray-50 p-3 ring-1 ring-gray-100"
                    >
                      <div className="flex flex-col justify-between gap-2 md:flex-row">
                        <p className="text-xs font-black text-gray-950">
                          {history.changed_by_name || "Usuario"}
                        </p>

                        <span className="text-xs font-bold text-gray-500">
                          {formatDate(history.created_at)}
                        </span>
                      </div>

                      <p className="mt-2 text-xs font-bold text-gray-800">
                        {history.old_status_display ||
                          getStatusLabel(history.old_status)}{" "}
                        →{" "}
                        {history.new_status_display ||
                          getStatusLabel(history.new_status)}
                      </p>

                      {history.note && (
                        <p className="mt-2 text-xs leading-5 text-gray-700">
                          {history.note}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterBanner({ info, total, onClear }) {
  const styles = {
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    purple: "border-purple-200 bg-purple-50 text-purple-700",
    yellow: "border-yellow-200 bg-yellow-50 text-yellow-800",
    green: "border-green-200 bg-green-50 text-green-700",
    red: "border-red-200 bg-red-50 text-red-700",
    gray: "border-gray-200 bg-gray-50 text-gray-700",
  };

  return (
    <div
      className={`mt-6 rounded-3xl border p-5 ${
        styles[info.tone] || styles.gray
      }`}
    >
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="text-sm font-black uppercase tracking-wide">
            Vista filtrada
          </p>

          <h2 className="mt-1 text-xl font-black text-gray-950">
            {info.title}
          </h2>

          <p className="mt-1 text-sm leading-6 opacity-80">
            {info.description}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="rounded-2xl bg-white/70 px-4 py-2 text-center ring-1 ring-white/60">
            <p className="text-xs font-bold uppercase tracking-wide opacity-70">
              Resultados
            </p>
            <p className="text-2xl font-black text-gray-950">{total}</p>
          </div>

          <Link
            to="/admin/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-gray-800 ring-1 ring-gray-200 transition hover:bg-gray-100"
          >
            <FaArrowLeft className="text-xs" />
            Volver al Dashboard
          </Link>

          <button
            type="button"
            onClick={onClear}
            className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-gray-800 ring-1 ring-gray-200 transition hover:bg-gray-100"
          >
            Quitar vista
          </button>
        </div>
      </div>
    </div>
  );
}

function QuickFilterButton({ active, label, onClick, tone = "red" }) {
  const activeStyles = {
    red: "bg-red-700 text-white ring-red-700",
    blue: "bg-blue-700 text-white ring-blue-700",
    purple: "bg-purple-700 text-white ring-purple-700",
    yellow: "bg-yellow-500 text-gray-950 ring-yellow-500",
    green: "bg-green-700 text-white ring-green-700",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? `rounded-full px-4 py-2 text-xs font-black ring-1 transition ${
              activeStyles[tone] || activeStyles.red
            }`
          : "rounded-full bg-white px-4 py-2 text-xs font-bold text-gray-700 ring-1 ring-gray-200 transition hover:bg-red-50 hover:text-red-700"
      }
    >
      {label}
    </button>
  );
}

function StatusPill({ label, value, tone }) {
  const styles = {
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
    yellow: "bg-yellow-50 text-yellow-800 ring-yellow-100",
  };

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ring-1 ${
        styles[tone] || styles.blue
      }`}
    >
      {label}: {value}
    </span>
  );
}

function InfoBlock({ label, value }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-wide text-gray-500">
        {label}
      </p>

      <p className="mt-1 font-semibold text-gray-900">{value || "-"}</p>
    </div>
  );
}

function EmptyInfo({ icon, title, description }) {
  return (
    <div className="mt-3 rounded-2xl bg-gray-50 p-4 text-center ring-1 ring-gray-100">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-gray-500 ring-1 ring-gray-200">
        {icon}
      </div>

      <p className="mt-3 text-sm font-black text-gray-950">{title}</p>

      <p className="mt-1 text-xs leading-5 text-gray-600">{description}</p>
    </div>
  );
}

function TableHead({ children }) {
  return (
    <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wide text-gray-500">
      {children}
    </th>
  );
}