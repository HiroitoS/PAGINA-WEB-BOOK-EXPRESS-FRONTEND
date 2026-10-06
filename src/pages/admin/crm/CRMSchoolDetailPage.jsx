import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router";
import {
  FaArrowLeft,
  FaBriefcase,
  FaBuilding,
  FaCalendarAlt,
  FaChartLine,
  FaEnvelope,
  FaExclamationTriangle,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaPlus,
  FaSchool,
  FaStar,
  FaTasks,
  FaUserTie,
  FaUsers,
  FaWhatsapp,
} from "react-icons/fa";

import {
  createCRMOpportunity,
  getCRMCampaigns,
  getCRMOpportunity,
  getCRMOpportunities,
  getCRMSchool,
  getCRMSchoolActivities,
  getCRMSchoolWorkItems,
  updateCRMSchoolCommercialProfile,
} from "../../../api/crmApi";
import CRMSchoolActivityDrawer from "../../../components/admin/crm/CRMSchoolActivityDrawer";
import CRMSchoolAssignmentPanel from "../../../components/admin/crm/CRMSchoolAssignmentPanel";
import SchoolInstitutionalPopulationSection from "../../../components/admin/crm/SchoolInstitutionalPopulationSection";
import SchoolEditorialUsagesSection from "../../../components/admin/crm/SchoolEditorialUsagesSection";
import { getCRMActivityTypeLabel } from "../../../utils/crmActivityTypes";
import {
  buildNavigationState,
  resolveReturnContext,
} from "../../../utils/navigationContext";

const ACTIVITY_FILTERS = [
  { value: "all", label: "Todas" },
  { value: "call", label: "Llamadas" },
  { value: "visit", label: "Visitas coordinadas" },
  { value: "cold_visit", label: "Visitas en frío" },
  { value: "presentation", label: "Presentaciones" },
  { value: "meeting", label: "Reuniones" },
  { value: "follow_up", label: "Seguimientos" },
];

const RELATIONSHIP_LEVEL_LABELS = {
  1: "Contacto inicial",
  2: "Relación en desarrollo",
  3: "Buena relación",
  4: "Relación sólida",
  5: "Relación estratégica",
};

function formatRelationshipLevel(value) {
  const level = Number(value);

  if (!Number.isInteger(level)) {
    return "Sin evaluar";
  }

  return RELATIONSHIP_LEVEL_LABELS[level] || "Sin evaluar";
}

function normalizeResults(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  return [];
}

function getErrorMessage(error, fallback) {
  const data = error?.response?.data;

  if (typeof data?.detail === "string" && data.detail.trim()) {
    return data.detail;
  }

  if (Array.isArray(data?.detail) && data.detail.length > 0) {
    return data.detail.join(" ");
  }

  if (data && typeof data === "object") {
    const messages = Object.values(data)
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .filter((value) => typeof value === "string" && value.trim());

    if (messages.length > 0) {
      return messages.join(" ");
    }
  }

  return fallback;
}

function hasValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function formatLocation(school) {
  return [school?.district, school?.province, school?.department]
    .filter(Boolean)
    .join(", ");
}

function formatOwner(owner) {
  if (!owner) {
    return "Sin asesor asignado";
  }

  return owner.full_name || owner.username || "Asesor asignado";
}

function formatTeam(team) {
  return team?.name || "Sin equipo comercial";
}

function formatSegment(segment) {
  if (!segment || segment === "OUT") {
    return "Fuera del objetivo base";
  }

  return `Segmento ${segment}`;
}

function formatCommercialScore(profile) {
  if (!profile?.scored_at) {
    return "Sin evaluar";
  }

  const score = Number(profile.priority_score);

  if (!Number.isFinite(score)) {
    return "Sin evaluar";
  }

  return `${score} / 100`;
}

function formatCommercialPriority(profile) {
  if (!profile?.scored_at) {
    return "Sin evaluar";
  }

  return profile.priority_display || "Sin evaluar";
}

function formatPopulation(school) {
  return (
    school?.current_population_total ??
    school?.estimated_students ??
    "Sin información"
  );
}

function formatMonthlyTuition(value) {
  if (value === null || value === undefined || value === "") {
    return "Sin información";
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "Sin información";
  }

  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDateTime(value) {
  if (!value) {
    return "Sin fecha";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function StatusBadge({ isActive }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${
        isActive
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
          : "bg-gray-100 text-gray-600 ring-1 ring-gray-200"
      }`}
    >
      {isActive ? "Activo" : "Inactivo"}
    </span>
  );
}

function SummaryItem({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-3 py-3 shadow-sm sm:px-4">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gray-950 text-xs text-white sm:h-9 sm:w-9">
          <Icon />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
            {label}
          </p>

          <p className="mt-1 wrap-break-word text-sm font-black text-gray-950">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-2xl bg-gray-50 px-3 py-3 ring-1 ring-gray-200">
      <div className="mt-0.5 shrink-0 text-gray-500">
        <Icon />
      </div>

      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
          {label}
        </p>

        <p className="mt-1 wrap-break-word text-sm font-semibold text-gray-900">
          {value || "No registrado"}
        </p>
      </div>
    </div>
  );
}

function WorkItemIcon({ type }) {
  if (type === "event") {
    return <FaCalendarAlt />;
  }

  if (type === "task") {
    return <FaTasks />;
  }

  return <FaStar />;
}

function getWorkItemDate(workItem) {
  const item = workItem?.item || {};

  if (workItem?.type === "event") {
    return item.start_at;
  }

  if (workItem?.type === "task") {
    return item.due_at || item.reminder_at;
  }

  return item.remind_at;
}

function getWorkItemTypeLabel(workItem) {
  if (workItem?.commercial_action_type_display) {
    return workItem.commercial_action_type_display;
  }

  if (workItem?.type === "event") {
    return (
      getCRMActivityTypeLabel(workItem.item?.event_type)
      || "Evento"
    );
  }

  if (workItem?.type === "task") {
    return "Tarea";
  }

  return "Recordatorio";
}

function isPendingWorkItem(workItem) {
  const item = workItem?.item || {};

  if (workItem?.type === "task") {
    return !["completed", "cancelled"].includes(item.status);
  }

  if (workItem?.type === "reminder") {
    return !["completed", "dismissed"].includes(item.status);
  }

  if (workItem?.type === "event") {
    if (!item.start_at) {
      return true;
    }

    const startAt = new Date(item.start_at);

    return Number.isNaN(startAt.getTime()) || startAt >= new Date();
  }

  return true;
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <div className="h-28 animate-pulse rounded-3xl bg-gray-200" />
      <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-20 animate-pulse rounded-2xl bg-gray-200"
          />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-3xl bg-gray-200" />
    </div>
  );
}

export default function CRMSchoolDetailPage() {
  const { id } = useParams();
  const location = useLocation();

  const [school, setSchool] = useState(null);
  const [activities, setActivities] = useState([]);
  const [workItems, setWorkItems] = useState([]);
  const [schoolOpportunities, setSchoolOpportunities] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [opportunityDetail, setOpportunityDetail] = useState(null);
  const [creatingOpportunity, setCreatingOpportunity] = useState(false);
  const [opportunityError, setOpportunityError] = useState("");
  const [activityFilter, setActivityFilter] = useState("all");
  const [activeInfoTab, setActiveInfoTab] = useState("activity");
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [showAllContacts, setShowAllContacts] = useState(false);
  const [showAllWorkItems, setShowAllWorkItems] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [supportingWarning, setSupportingWarning] = useState("");
  const [editingCommercialSignals, setEditingCommercialSignals] =
    useState(false);
  const [commercialSignalForm, setCommercialSignalForm] = useState({
    monthlyTuition: "",
    textbookUsage: "unknown",
    commercialAffinity: "unknown",
  });
  const [savingCommercialSignals, setSavingCommercialSignals] =
    useState(false);
  const [commercialSignalError, setCommercialSignalError] = useState("");
  const [commercialSignalSuccess, setCommercialSignalSuccess] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadSchoolWorkspace() {
      try {
        setLoading(true);
        setErrorMessage("");
        setSupportingWarning("");

        const schoolData = await getCRMSchool(id);

        if (ignore) {
          return;
        }

        setSchool(schoolData);

        const [
          activitiesResult,
          workItemsResult,
          opportunitiesResult,
          campaignsResult,
        ] = await Promise.allSettled([
          getCRMSchoolActivities(id),
          getCRMSchoolWorkItems(id),
          getCRMOpportunities({
            school: id,
            page: 1,
            page_size: 100,
          }),
          getCRMCampaigns(),
        ]);

        if (ignore) {
          return;
        }

        if (activitiesResult.status === "fulfilled") {
          setActivities(normalizeResults(activitiesResult.value));
        } else {
          setActivities([]);
          setSupportingWarning(
            "La ficha cargó, pero no se pudo mostrar el historial comercial.",
          );
        }

        if (workItemsResult.status === "fulfilled") {
          setWorkItems(normalizeResults(workItemsResult.value));
        } else {
          setWorkItems([]);
          setSupportingWarning((currentWarning) =>
            currentWarning
              ? `${currentWarning} Tampoco se pudieron cargar las próximas acciones.`
              : "La ficha cargó, pero no se pudieron mostrar las próximas acciones.",
          );
        }

        if (opportunitiesResult.status === "fulfilled") {
          setSchoolOpportunities(
            normalizeResults(opportunitiesResult.value),
          );
        } else {
          setSchoolOpportunities([]);
          setSupportingWarning((currentWarning) =>
            currentWarning
              ? `${currentWarning} Tampoco se pudo cargar la oportunidad comercial.`
              : "La ficha cargó, pero no se pudo mostrar la oportunidad comercial.",
          );
        }

        if (campaignsResult.status === "fulfilled") {
          setCampaigns(
            Array.isArray(campaignsResult.value)
              ? campaignsResult.value
              : [],
          );
        } else {
          setCampaigns([]);
          setSupportingWarning((currentWarning) =>
            currentWarning
              ? `${currentWarning} Tampoco se pudo identificar la campaña activa.`
              : "La ficha cargó, pero no se pudo identificar la campaña activa.",
          );
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(
            getErrorMessage(
              error,
              "No se pudo cargar la ficha comercial del colegio.",
            ),
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadSchoolWorkspace();

    return () => {
      ignore = true;
    };
  }, [id]);

  const hasAdditionalData =
    school &&
    (hasValue(school.ruc) ||
      hasValue(school.book_express_code) ||
      hasValue(school.institution_code) ||
      hasValue(school.dependency) ||
      hasValue(school.reference));

  const returnContext = resolveReturnContext(
    location.state,
    {
      fallbackPath: "/admin/crm/colegios",
      fallbackLabel: "colegios",
    },
  );

  const visibleContacts = useMemo(() => {
    const contacts = Array.isArray(school?.contacts)
      ? [...school.contacts]
      : [];

    return contacts
      .filter((contact) => contact.is_active)
      .sort((contactA, contactB) => {
        if (contactA.is_primary !== contactB.is_primary) {
          return contactA.is_primary ? -1 : 1;
        }

        return contactA.full_name.localeCompare(contactB.full_name, "es");
      });
  }, [school]);

  const primaryContact = useMemo(
    () => visibleContacts.find((contact) => contact.is_primary) || null,
    [visibleContacts],
  );

  const activityCounts = useMemo(() => {
    const counts = Object.fromEntries(
      ACTIVITY_FILTERS.map((filter) => [filter.value, 0]),
    );

    counts.all = activities.length;

    activities.forEach((activity) => {
      if (
        Object.prototype.hasOwnProperty.call(
          counts,
          activity.activity_type,
        )
      ) {
        counts[activity.activity_type] += 1;
      }
    });

    return counts;
  }, [activities]);

  const filteredActivities = useMemo(() => {
    if (activityFilter === "all") {
      return activities;
    }

    return activities.filter(
      (activity) => activity.activity_type === activityFilter,
    );
  }, [activities, activityFilter]);

  const displayedActivities = showAllActivities
    ? filteredActivities
    : filteredActivities.slice(0, 12);

  const displayedContacts = showAllContacts
    ? visibleContacts
    : visibleContacts.slice(0, 4);

  const pendingWorkItems = useMemo(
    () => workItems.filter(isPendingWorkItem),
    [workItems],
  );

  const displayedWorkItems = showAllWorkItems
    ? pendingWorkItems
    : pendingWorkItems.slice(0, 5);

  const latestSchoolActivity = useMemo(
    () =>
      [...activities]
        .filter((activity) => activity?.occurred_at)
        .sort(
          (activityA, activityB) =>
            new Date(activityB.occurred_at).getTime()
            - new Date(activityA.occurred_at).getTime(),
        )[0] || null,
    [activities],
  );

  const nextSchoolWorkItem = useMemo(
    () =>
      [...pendingWorkItems]
        .filter((workItem) => getWorkItemDate(workItem))
        .sort(
          (itemA, itemB) =>
            new Date(getWorkItemDate(itemA)).getTime()
            - new Date(getWorkItemDate(itemB)).getTime(),
        )[0] || null,
    [pendingWorkItems],
  );

  const activeSchoolCampaigns = useMemo(
    () =>
      campaigns.filter(
        (campaign) =>
          campaign.campaign_type === "school"
          && campaign.status === "active",
      ),
    [campaigns],
  );

  const activeSchoolCampaign =
    activeSchoolCampaigns.length === 1
      ? activeSchoolCampaigns[0]
      : null;

  const currentOpportunity = useMemo(() => {
    const openOpportunities = schoolOpportunities.filter(
      (opportunity) => !opportunity.is_closed,
    );

    if (activeSchoolCampaign) {
      const campaignOpportunity = openOpportunities.find(
        (opportunity) =>
          opportunity.campaign?.id === activeSchoolCampaign.id,
      );

      if (campaignOpportunity) {
        return campaignOpportunity;
      }
    }

    return openOpportunities[0] || null;
  }, [activeSchoolCampaign, schoolOpportunities]);

  const currentOpportunityId = currentOpportunity?.id || null;

  function startEditingCommercialSignals() {
    setCommercialSignalForm({
      monthlyTuition:
        school?.commercial_profile?.monthly_tuition ?? "",
      textbookUsage:
        school?.commercial_profile?.textbook_usage ?? "unknown",
      commercialAffinity:
        school?.commercial_profile?.commercial_affinity ?? "unknown",
    });
    setCommercialSignalError("");
    setCommercialSignalSuccess("");
    setEditingCommercialSignals(true);
  }

  function cancelEditingCommercialSignals() {
    setCommercialSignalError("");
    setEditingCommercialSignals(false);
  }

  async function saveCommercialSignals() {
    if (!school || savingCommercialSignals) {
      return;
    }

    if (!activeSchoolCampaign) {
      setCommercialSignalError(
        "Debe existir una única campaña escolar activa para guardar estas señales.",
      );
      return;
    }

    const monthlyTuition = String(
      commercialSignalForm.monthlyTuition ?? "",
    ).trim();

    try {
      setSavingCommercialSignals(true);
      setCommercialSignalError("");
      setCommercialSignalSuccess("");

      const updatedProfile = await updateCRMSchoolCommercialProfile(
        school.id,
        {
          campaign: activeSchoolCampaign.id,
          monthly_tuition: monthlyTuition === "" ? null : monthlyTuition,
          textbook_usage: commercialSignalForm.textbookUsage,
          commercial_affinity:
            commercialSignalForm.commercialAffinity,
        },
      );

      setSchool((currentSchool) => ({
        ...currentSchool,
        commercial_profile: updatedProfile,
      }));
      setEditingCommercialSignals(false);
      setCommercialSignalSuccess(
        "Las señales comerciales se actualizaron correctamente.",
      );
    } catch (error) {
      setCommercialSignalError(
        getErrorMessage(
          error,
          "No se pudieron actualizar las señales comerciales.",
        ),
      );
    } finally {
      setSavingCommercialSignals(false);
    }
  }

  async function refreshCommercialActivityData() {
    const [activitiesResult, workItemsResult] = await Promise.allSettled([
      getCRMSchoolActivities(id),
      getCRMSchoolWorkItems(id),
    ]);

    if (activitiesResult.status === "fulfilled") {
      setActivities(normalizeResults(activitiesResult.value));
    }

    if (workItemsResult.status === "fulfilled") {
      setWorkItems(normalizeResults(workItemsResult.value));
    }

    if (currentOpportunityId) {
      try {
        const detail = await getCRMOpportunity(currentOpportunityId);
        setOpportunityDetail(detail);
      } catch {
        // La actividad ya se guardó; el detalle se refrescará en la próxima carga.
      }
    }
  }

  useEffect(() => {
    let ignore = false;

    async function loadOpportunityDetail() {
      if (!currentOpportunityId) {
        setOpportunityDetail(null);
        return;
      }

      try {
        const detail = await getCRMOpportunity(currentOpportunityId);

        if (!ignore) {
          setOpportunityDetail(detail);
        }
      } catch {
        if (!ignore) {
          setOpportunityDetail(null);
        }
      }
    }

    loadOpportunityDetail();

    return () => {
      ignore = true;
    };
  }, [currentOpportunityId]);

  const displayedOpportunity =
    opportunityDetail?.id === currentOpportunity?.id
      ? opportunityDetail
      : currentOpportunity;

  const opportunityBoardState = displayedOpportunity
    ? buildNavigationState({
        from: `/admin/crm/colegios/${school.id}`,
        fromLabel: school.name,
        fromType: "school",
        currentState: location.state,
        extra: {
          opportunityFilters: {
            pipeline: String(displayedOpportunity.pipeline?.id || ""),
            campaign: String(displayedOpportunity.campaign?.id || ""),
            search: school?.name || "",
          },
        },
      })
    : undefined;

  async function handleSchoolAssignmentCompleted() {
    try {
      const updatedSchool = await getCRMSchool(id);
      setSchool(updatedSchool);
    } catch {
      setSupportingWarning(
        "La asignación se guardó, pero la ficha no pudo actualizarse automáticamente.",
      );
    }
  }

  async function handleCreateOpportunity() {
    if (!school || creatingOpportunity) {
      return;
    }

    try {
      setCreatingOpportunity(true);
      setOpportunityError("");

      const created = await createCRMOpportunity({
        school: school.id,
      });

      setSchoolOpportunities((currentItems) => [
        created,
        ...currentItems.filter((item) => item.id !== created.id),
      ]);
      setOpportunityDetail(created);
    } catch (error) {
      setOpportunityError(
        getErrorMessage(
          error,
          "No se pudo crear la oportunidad comercial.",
        ),
      );
    } finally {
      setCreatingOpportunity(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-3">
        <Link
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-black text-gray-700 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
          to={returnContext.path}
          state={returnContext.state}
        >
          <FaArrowLeft />
          Volver a {returnContext.label || "colegios"}
        </Link>
      </div>

      {loading ? <LoadingState /> : null}

      {!loading && errorMessage ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5">
          <div className="flex items-start gap-3">
            <FaExclamationTriangle className="mt-1 shrink-0 text-red-700" />

            <div>
              <p className="font-black text-red-900">
                No pudimos abrir la ficha
              </p>

              <p className="mt-1 text-sm leading-6 text-red-800">
                {errorMessage}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {!loading && !errorMessage && school ? (
        <div className="space-y-4">
          <section className="rounded-3xl bg-gray-950 px-5 py-5 text-white shadow-sm sm:px-7">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-black uppercase tracking-wide text-red-300">
                      CRM Comercial · Colegio
                    </p>

                    <StatusBadge isActive={school.is_active} />
                  </div>

                  <div className="mt-3">
                    <h1 className="wrap-break-word text-2xl font-black sm:text-3xl">
                      {school.name}
                    </h1>

                    <p className="mt-1 text-sm text-gray-300">
                      Información institucional, relaciones y seguimiento comercial
                      en un mismo lugar.
                    </p>
                  </div>
                </div>

                <CRMSchoolAssignmentPanel
                  schools={[school]}
                  onAssigned={handleSchoolAssignmentCompleted}
                  buttonLabel={
                    school.owner || school.team
                      ? "Cambiar asignación"
                      : "Asignar responsable"
                  }
                  buttonClassName="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-800"
                />
              </div>

              <div className="border-t border-white/10 pt-4">
                <p className="text-xs font-black uppercase tracking-wide text-red-300">
                  Valor comercial del colegio
                </p>

                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-2xl bg-white/5 px-4 py-4 ring-1 ring-white/10">
                    <p className="text-xs font-black uppercase tracking-wide text-gray-400">
                      Segmento
                    </p>
                    <p className="mt-1 text-2xl font-black text-white sm:text-3xl">
                      {formatSegment(school.segment)}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-gray-400">
                      Potencial estructural por población
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/5 px-4 py-4 ring-1 ring-white/10">
                    <p className="text-xs font-black uppercase tracking-wide text-gray-400">
                      Score comercial
                    </p>
                    <p className="mt-1 text-2xl font-black text-white sm:text-3xl">
                      {formatCommercialScore(school.commercial_profile)}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-gray-400">
                      Valoración comercial de 0 a 100
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/5 px-4 py-4 ring-1 ring-white/10">
                    <p className="text-xs font-black uppercase tracking-wide text-gray-400">
                      Prioridad
                    </p>
                    <p className="mt-1 text-2xl font-black text-white sm:text-3xl">
                      {formatCommercialPriority(school.commercial_profile)}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-gray-400">
                      Nivel de atención comercial sugerido
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
            <SummaryItem
              icon={FaUserTie}
              label="Asesor responsable"
              value={formatOwner(school.owner)}
            />

            <SummaryItem
              icon={FaUsers}
              label="Equipo comercial"
              value={formatTeam(school.team)}
            />

            <SummaryItem
              icon={FaMapMarkerAlt}
              label="Sede principal"
              value={formatLocation(school) || "Sin ubicación registrada"}
            />

            <SummaryItem
              icon={FaBuilding}
              label="Población"
              value={formatPopulation(school)}
            />
          </section>

          {supportingWarning ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              {supportingWarning}
            </div>
          ) : null}

          <div className="grid min-w-0 gap-4 xl:grid-cols-12">
            <aside className="order-3 min-w-0 space-y-4 xl:order-0 xl:col-span-3 xl:max-h-[68vh] xl:overflow-y-scroll xl:overscroll-contain xl:pr-2">
              <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-black uppercase tracking-wide text-red-700">
                  Colegio
                </p>

                <h2 className="mt-1 text-xl font-black text-gray-950">
                  Datos principales
                </h2>

                <div className="mt-4 grid grid-cols-2 gap-2 xl:grid-cols-1 xl:gap-3">
                  <InfoItem
                    icon={FaPhoneAlt}
                    label="Teléfono"
                    value={school.phone}
                  />

                  <InfoItem
                    icon={FaWhatsapp}
                    label="WhatsApp"
                    value={school.whatsapp}
                  />

                  <InfoItem
                    icon={FaEnvelope}
                    label="Correo"
                    value={school.email}
                  />

                  <InfoItem
                    icon={FaMapMarkerAlt}
                    label="Dirección"
                    value={school.address}
                  />
                </div>

                {hasAdditionalData ? (
                  <div className="mt-4 space-y-2 border-t border-gray-200 pt-4 text-sm text-gray-600">
                    {hasValue(school.book_express_code) ? (
                      <p>
                        <span className="font-black text-gray-900">
                          Código Book Express:
                        </span>{" "}
                        {school.book_express_code}
                      </p>
                    ) : null}

                    {hasValue(school.ruc) ? (
                      <p>
                        <span className="font-black text-gray-900">RUC:</span>{" "}
                        {school.ruc}
                      </p>
                    ) : null}

                    {hasValue(school.institution_code) ? (
                      <p>
                        <span className="font-black text-gray-900">
                          Código de institución:
                        </span>{" "}
                        {school.institution_code}
                      </p>
                    ) : null}

                    {hasValue(school.dependency) ? (
                      <p>
                        <span className="font-black text-gray-900">
                          Dependencia:
                        </span>{" "}
                        {school.dependency}
                      </p>
                    ) : null}

                    {hasValue(school.reference) ? (
                      <p>
                        <span className="font-black text-gray-900">
                          Referencia:
                        </span>{" "}
                        {school.reference}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {Array.isArray(school.campuses) &&
                school.campuses.length > 0 ? (
                  <div className="mt-4 border-t border-gray-200 pt-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                        Sedes registradas
                      </p>
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-black text-gray-600">
                        {school.campuses.length}
                      </span>
                    </div>

                    <div className="mt-3 space-y-2">
                      {[...school.campuses]
                        .sort(
                          (a, b) =>
                            Number(a.sequence || 0) -
                            Number(b.sequence || 0),
                        )
                        .map((campus) => (
                          <div
                            key={campus.id}
                            className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-200"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-black text-gray-950">
                                {campus.name}
                              </p>
                              {campus.is_main ? (
                                <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-black text-red-700">
                                  Principal
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-1 text-xs font-semibold text-gray-500">
                              {campus.book_express_code}
                            </p>
                            <p className="mt-2 text-sm font-semibold text-gray-700">
                              {campus.address || "Dirección pendiente"}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              {[campus.district, campus.province, campus.department]
                                .filter(Boolean)
                                .join(", ") || "Ubicación pendiente"}
                            </p>
                          </div>
                        ))}
                    </div>
                  </div>
                ) : null}
              </section>

              <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-700">
                      <FaChartLine />
                    </div>

                    <div>
                      <p className="text-xs font-black uppercase tracking-wide text-red-700">
                        Perfil comercial
                      </p>

                      <h2 className="mt-1 text-lg font-black text-gray-950">
                        Señales comerciales
                      </h2>
                    </div>
                  </div>

                  {!editingCommercialSignals ? (
                    <button
                      type="button"
                      onClick={startEditingCommercialSignals}
                      disabled={!activeSchoolCampaign}
                      className="rounded-xl bg-red-700 px-3 py-2 text-xs font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Editar señales
                    </button>
                  ) : null}
                </div>

                {commercialSignalSuccess ? (
                  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
                    {commercialSignalSuccess}
                  </div>
                ) : null}

                {commercialSignalError ? (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">
                    {commercialSignalError}
                  </div>
                ) : null}

                {editingCommercialSignals ? (
                  <div className="mt-4 space-y-4">
                    <label className="block">
                      <span className="text-xs font-black uppercase tracking-wide text-gray-500">
                        Pensión mensual referencial
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={commercialSignalForm.monthlyTuition}
                        onChange={(event) =>
                          setCommercialSignalForm((current) => ({
                            ...current,
                            monthlyTuition: event.target.value,
                          }))
                        }
                        placeholder="Sin información"
                        disabled={savingCommercialSignals}
                        className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-semibold text-gray-900 outline-none transition focus:border-red-500 disabled:bg-gray-100"
                      />
                      <span className="mt-1 block text-xs leading-5 text-gray-500">
                        Déjalo vacío si el dato todavía no fue confirmado.
                      </span>
                    </label>

                    <label className="block">
                      <span className="text-xs font-black uppercase tracking-wide text-gray-500">
                        Uso de textos
                      </span>
                      <select
                        value={commercialSignalForm.textbookUsage}
                        onChange={(event) =>
                          setCommercialSignalForm((current) => ({
                            ...current,
                            textbookUsage: event.target.value,
                          }))
                        }
                        disabled={savingCommercialSignals}
                        className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-semibold text-gray-900 outline-none transition focus:border-red-500 disabled:bg-gray-100"
                      >
                        <option value="unknown">Sin información</option>
                        <option value="core">Utiliza textos principales</option>
                        <option value="complementary">
                          Solo áreas complementarias
                        </option>
                        <option value="none">No utiliza textos escolares</option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-xs font-black uppercase tracking-wide text-gray-500">
                        Afinidad pedagógica / comercial
                      </span>
                      <select
                        value={commercialSignalForm.commercialAffinity}
                        onChange={(event) =>
                          setCommercialSignalForm((current) => ({
                            ...current,
                            commercialAffinity: event.target.value,
                          }))
                        }
                        disabled={savingCommercialSignals}
                        className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-semibold text-gray-900 outline-none transition focus:border-red-500 disabled:bg-gray-100"
                      >
                        <option value="unknown">Sin evaluar</option>
                        <option value="pedagogical">Pedagógica</option>
                        <option value="mixed">Mixta</option>
                        <option value="commercial">Comercial</option>
                      </select>
                      <span className="mt-1 block text-xs leading-5 text-gray-500">
                        Se evalúa a nivel del colegio según lo observado por el
                        asesor durante la gestión.
                      </span>
                    </label>

                    <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-200">
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                        Relacionamiento principal
                      </p>
                      <p className="mt-1 font-black text-gray-950">
                        {primaryContact
                          ? formatRelationshipLevel(
                              primaryContact.relationship_level,
                            )
                          : "Sin contacto principal"}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-gray-500">
                        El relacionamiento se edita en la ficha del contacto,
                        porque pertenece a la relación con esa persona.
                      </p>
                      {primaryContact ? (
                        <Link
                          to={`/admin/crm/contactos/${primaryContact.id}`}
                          state={buildNavigationState({
                            from: `/admin/crm/colegios/${school.id}`,
                            fromLabel: school.name,
                            fromType: "school",
                            currentState: location.state,
                          })}
                          className="mt-2 inline-flex text-xs font-black text-red-700 hover:text-red-900"
                        >
                          Editar contacto principal
                        </Link>
                      ) : null}
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={cancelEditingCommercialSignals}
                        disabled={savingCommercialSignals}
                        className="flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-black text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={saveCommercialSignals}
                        disabled={savingCommercialSignals}
                        className="flex-1 rounded-xl bg-red-700 px-3 py-2.5 text-sm font-black text-white transition hover:bg-red-800 disabled:opacity-50"
                      >
                        {savingCommercialSignals ? "Guardando..." : "Guardar"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-200">
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                        Pensión mensual referencial
                      </p>
                      <p className="mt-1 font-black text-gray-950">
                        {formatMonthlyTuition(
                          school.commercial_profile?.monthly_tuition,
                        )}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-200">
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                        Uso de textos
                      </p>

                      <p className="mt-1 font-black text-gray-950">
                        {school.commercial_profile?.textbook_usage_display ||
                          "Sin información"}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-200">
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                        Afinidad pedagógica / comercial
                      </p>
                      <p className="mt-1 font-black text-gray-950">
                        {school.commercial_profile
                          ?.commercial_affinity_display || "Sin evaluar"}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-200">
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                        Relacionamiento principal
                      </p>

                      <p className="mt-1 font-black text-gray-950">
                        {primaryContact
                          ? formatRelationshipLevel(
                              primaryContact.relationship_level,
                            )
                          : "Sin contacto principal"}
                      </p>

                      <p className="mt-1 text-xs leading-5 text-gray-500">
                        {primaryContact
                          ? `${primaryContact.full_name} · ${
                              primaryContact.decision_role_display ||
                              "Rol sin clasificar"
                            }`
                          : "Define un contacto principal para evaluar esta señal."}
                      </p>
                    </div>
                  </div>
                )}

                {school.commercial_profile?.score_reasons?.status ===
                "pending" ? (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-xs font-black uppercase tracking-wide text-amber-800">
                      Score pendiente
                    </p>
                    <p className="mt-1 text-xs leading-5 text-amber-800">
                      Falta completar:{" "}
                      {school.commercial_profile.score_reasons.missing.join(
                        ", ",
                      )}
                      .
                    </p>
                  </div>
                ) : null}

                {school.commercial_profile?.score_reasons?.status ===
                "scored" ? (
                  <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                      Composición del score
                    </p>
                    <div className="mt-3 space-y-2">
                      {school.commercial_profile.score_reasons.components.map(
                        (component) => (
                          <div
                            key={component.key}
                            className="flex items-start justify-between gap-3 text-xs"
                          >
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-700">
                                {component.label}
                              </p>
                              <p className="mt-0.5 text-gray-500">
                                {component.detail}
                              </p>
                            </div>
                            <span className="shrink-0 font-black text-gray-950">
                              {component.points} / {component.max_points}
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                ) : null}
              </section>
            </aside>

            <main className="order-1 min-w-0 xl:order-0 xl:col-span-6 xl:max-h-[68vh] xl:overflow-y-scroll xl:overscroll-contain xl:pr-2">
              <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-200 px-4 pt-4 sm:px-5 sm:pt-5">
                  <p className="text-xs font-black uppercase tracking-wide text-red-700">
                    Espacio de trabajo
                  </p>

                  <h2 className="mt-1 text-xl font-black text-gray-950">
                    Gestión comercial del colegio
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-gray-500">
                    Consulta el historial, la población y las editoriales sin salir de la ficha.
                  </p>

                  <div
                    className="mt-4 flex gap-2 overflow-x-auto pb-3"
                    role="tablist"
                    aria-label="Gestión comercial del colegio"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={activeInfoTab === "activity"}
                      onClick={() => setActiveInfoTab("activity")}
                      className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-black transition ${
                        activeInfoTab === "activity"
                          ? "bg-gray-950 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-700"
                      }`}
                    >
                      Actividad
                      <span className="ml-2 rounded-full bg-white/15 px-2 py-0.5 text-xs">
                        {activities.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      role="tab"
                      aria-selected={activeInfoTab === "population"}
                      onClick={() => setActiveInfoTab("population")}
                      className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-black transition ${
                        activeInfoTab === "population"
                          ? "bg-gray-950 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-700"
                      }`}
                    >
                      Población
                      <span className="ml-2 rounded-full bg-white/15 px-2 py-0.5 text-xs">
                        {school.current_population_total ?? 0}
                      </span>
                    </button>

                    <button
                      type="button"
                      role="tab"
                      aria-selected={activeInfoTab === "editorials"}
                      onClick={() => setActiveInfoTab("editorials")}
                      className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-black transition ${
                        activeInfoTab === "editorials"
                          ? "bg-gray-950 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-700"
                      }`}
                    >
                      Editoriales
                      <span className="ml-2 rounded-full bg-white/15 px-2 py-0.5 text-xs">
                        {Array.isArray(school.editorial_usages)
                          ? school.editorial_usages.length
                          : 0}
                      </span>
                    </button>
                  </div>
                </div>

                {activeInfoTab === "activity" ? (
                  <>
                    <div className="border-b border-gray-200 px-4 py-3 sm:px-5 sm:py-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                          Historial de actividad
                        </p>

                        <div className="shrink-0">
                          <CRMSchoolActivityDrawer
                            school={school}
                            contacts={visibleContacts}
                            opportunities={schoolOpportunities}
                            onChanged={refreshCommercialActivityData}
                          />
                        </div>
                      </div>

                      <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1">
                        {ACTIVITY_FILTERS.map((filter) => {
                          const isActive = activityFilter === filter.value;

                          return (
                            <button
                              key={filter.value}
                              type="button"
                              onClick={() => {
                                setActivityFilter(filter.value);
                                setShowAllActivities(false);
                              }}
                              className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-black transition ${
                                isActive
                                  ? "border-gray-950 bg-gray-950 text-white"
                                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-950"
                              }`}
                            >
                              <span>{filter.label}</span>
                              <span
                                className={`min-w-6 rounded-md px-1.5 py-0.5 text-center text-xs ${
                                  isActive
                                    ? "bg-white/15 text-white"
                                    : "bg-gray-100 text-gray-500"
                                }`}
                              >
                                {activityCounts[filter.value] ?? 0}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="p-4 sm:p-5">
                      {filteredActivities.length > 0 ? (
                        <div className="space-y-3">
                          {displayedActivities.map((activity) => (
                            <article
                              key={activity.id}
                              className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
                            >
                              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-gray-700 ring-1 ring-gray-200">
                                      {activity.activity_type_display || "Actividad"}
                                    </span>

                                    {activity.is_important ? (
                                      <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-black text-red-700 ring-1 ring-red-200">
                                        Importante
                                      </span>
                                    ) : null}
                                  </div>

                                  <h3 className="mt-3 font-black text-gray-950">
                                    {activity.summary}
                                  </h3>
                                </div>

                                <p className="text-xs font-semibold text-gray-400">
                                  {formatDateTime(activity.occurred_at)}
                                </p>
                              </div>

                              {activity.result ? (
                                <p className="mt-3 text-sm leading-6 text-gray-600">
                                  {activity.result}
                                </p>
                              ) : null}

                              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 pt-3 text-xs text-gray-500">
                                <p>
                                  Registrado por{" "}
                                  <span className="font-black text-gray-700">
                                    {activity.performed_by?.full_name ||
                                      activity.performed_by?.username ||
                                      "Usuario CRM"}
                                  </span>
                                </p>

                                {activity.contact ? (
                                  <Link
                                    to={`/admin/crm/contactos/${activity.contact.id}`}
                                    state={buildNavigationState({
                                      from: `/admin/crm/colegios/${school.id}`,
                                      fromLabel: school.name,
                                      fromType: "school",
                                      currentState: location.state,
                                    })}
                                    className="font-black text-red-700 transition hover:text-red-900"
                                  >
                                    {activity.contact.full_name}
                                  </Link>
                                ) : (
                                  <span className="font-semibold text-gray-400">
                                    Actividad general del colegio
                                  </span>
                                )}
                              </div>
                            </article>
                          ))}

                          {filteredActivities.length > 12 ? (
                            <button
                              type="button"
                              onClick={() =>
                                setShowAllActivities((current) => !current)
                              }
                              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-black text-gray-700 transition hover:bg-gray-50 hover:text-red-700"
                            >
                              {showAllActivities
                                ? "Mostrar menos"
                                : `Ver más (${filteredActivities.length - 12})`}
                            </button>
                          ) : null}
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-5 py-10 text-center">
                          <p className="font-black text-gray-950">
                            Sin actividades para mostrar
                          </p>

                          <p className="mt-1 text-sm leading-6 text-gray-500">
                            Las gestiones del colegio aparecerán aquí aunque todavía
                            no exista contacto u oportunidad comercial.
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                ) : null}

                {activeInfoTab === "population" ? (
                  <SchoolInstitutionalPopulationSection
                    school={school}
                    onSchoolUpdated={setSchool}
                    embedded
                  />
                ) : null}

                {activeInfoTab === "editorials" ? (
                  <SchoolEditorialUsagesSection
                    school={school}
                    onSchoolUpdated={setSchool}
                    embedded
                  />
                ) : null}
              </section>
            </main>

            <aside className="order-2 min-w-0 space-y-4 xl:order-0 xl:col-span-3 xl:max-h-[68vh] xl:overflow-y-scroll xl:overscroll-contain xl:pr-2">
              <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-700">
                    <FaBriefcase />
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-wide text-red-700">
                      Oportunidad comercial
                    </p>
                    <h2 className="mt-1 text-xl font-black text-gray-950">
                      {displayedOpportunity
                        ? displayedOpportunity.campaign?.name
                        : activeSchoolCampaign?.name || "Campaña escolar"}
                    </h2>
                  </div>
                </div>

                {opportunityError ? (
                  <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800">
                    {opportunityError}
                  </div>
                ) : null}

                {displayedOpportunity ? (
                  <div className="mt-4 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-2xl bg-gray-50 p-3 ring-1 ring-gray-200">
                        <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                          Etapa
                        </p>
                        <p className="mt-1 text-sm font-black text-gray-950">
                          {displayedOpportunity.stage?.name || "En curso"}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-gray-50 p-3 ring-1 ring-gray-200">
                        <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                          Asesor
                        </p>
                        <p className="mt-1 text-sm font-black text-gray-950">
                          {formatOwner(displayedOpportunity.owner)}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-gray-50 p-3 ring-1 ring-gray-200">
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                        Contacto principal
                      </p>
                      <p className="mt-1 text-sm font-black text-gray-950">
                        {displayedOpportunity.primary_contact?.full_name
                          || "Sin contacto principal"}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-gray-50 p-3 ring-1 ring-gray-200">
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                        Última actividad del colegio
                      </p>
                      {latestSchoolActivity ? (
                        <>
                          <p className="mt-1 text-sm font-black text-gray-950">
                            {formatDateTime(latestSchoolActivity.occurred_at)}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-gray-600">
                            {latestSchoolActivity.activity_type_display
                              || "Actividad comercial"}
                            {latestSchoolActivity.contact?.full_name ? (
                              <>
                                {" · "}
                                {latestSchoolActivity.contact.full_name}
                              </>
                            ) : null}
                          </p>
                        </>
                      ) : (
                        <p className="mt-1 text-sm font-black text-gray-400">
                          Sin actividad
                        </p>
                      )}
                    </div>

                    <div className="rounded-2xl bg-gray-50 p-3 ring-1 ring-gray-200">
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                        Próxima actividad del colegio
                      </p>

                      {nextSchoolWorkItem ? (
                        <>
                          <p className="mt-1 text-sm font-black text-gray-950">
                            {formatDateTime(
                              getWorkItemDate(nextSchoolWorkItem),
                            )}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-gray-600">
                            {getWorkItemTypeLabel(nextSchoolWorkItem)}
                            {" · "}
                            {nextSchoolWorkItem.item?.title
                              || "Acción programada"}
                          </p>
                        </>
                      ) : (
                        <p className="mt-1 text-sm font-black text-gray-400">
                          Sin próxima actividad
                        </p>
                      )}
                    </div>

                    <Link
                      to={`/admin/crm/oportunidades/${displayedOpportunity.id}`}
                      state={opportunityBoardState}
                      className="inline-flex w-full items-center justify-center rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-gray-800"
                    >
                      Abrir oportunidad
                    </Link>
                  </div>
                ) : (
                  <div className="mt-4">
                    <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm leading-6 text-gray-600">
                      {activeSchoolCampaigns.length === 0
                        ? "No existe una campaña escolar activa para crear una oportunidad."
                        : activeSchoolCampaigns.length > 1
                          ? "Hay más de una campaña escolar activa. Regulariza las campañas antes de crear una oportunidad."
                          : `No existe una oportunidad abierta para ${activeSchoolCampaign.name}.`}
                    </div>

                    {activeSchoolCampaigns.length === 1 ? (
                      <button
                        type="button"
                        disabled={creatingOpportunity}
                        onClick={handleCreateOpportunity}
                        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <FaPlus className="text-xs" />
                        {creatingOpportunity
                          ? "Creando..."
                          : "Crear oportunidad"}
                      </button>
                    ) : null}
                  </div>
                )}
              </section>

              <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-red-700">
                      Relaciones
                    </p>

                    <h2 className="mt-1 text-xl font-black text-gray-950">
                      Contactos vinculados
                    </h2>
                  </div>

                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-black text-gray-600">
                    {visibleContacts.length}
                  </span>
                </div>

                {visibleContacts.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {displayedContacts.map((contact) => (
                      <Link
                        key={contact.id}
                        to={`/admin/crm/contactos/${contact.id}`}
                        state={buildNavigationState({
                          from: `/admin/crm/colegios/${school.id}`,
                          fromLabel: school.name,
                          fromType: "school",
                          currentState: location.state,
                        })}
                        className="block rounded-2xl bg-gray-50 p-3 ring-1 ring-gray-200 transition hover:bg-red-50 hover:ring-red-200"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-950 text-white">
                            <FaUserTie />
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="wrap-break-word text-sm font-black text-gray-950">
                                {contact.full_name}
                              </p>

                              {contact.is_primary ? (
                                <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-black text-red-700 ring-1 ring-red-200">
                                  Principal
                                </span>
                              ) : null}
                            </div>

                            <p className="mt-1 text-xs text-gray-500">
                              {contact.position || "Cargo no registrado"}
                            </p>

                            <p className="mt-1 text-xs font-semibold text-gray-600">
                              {contact.decision_role_display || "Sin clasificar"}
                            </p>

                            <p className="mt-1 text-xs text-gray-500">
                              Relación:{" "}
                              {formatRelationshipLevel(
                                contact.relationship_level,
                              )}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}

                    {visibleContacts.length > 4 ? (
                      <button
                        type="button"
                        onClick={() =>
                          setShowAllContacts((current) => !current)
                        }
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-black text-gray-700 transition hover:bg-gray-50 hover:text-red-700"
                      >
                        {showAllContacts
                          ? "Mostrar menos"
                          : `Ver todos (${visibleContacts.length})`}
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center">
                    <FaSchool className="mx-auto text-gray-400" />
                    <p className="mt-2 text-sm font-black text-gray-900">
                      Sin contactos vigentes
                    </p>
                  </div>
                )}
              </section>

              <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-red-700">
                      Próximas acciones
                    </p>

                    <h2 className="mt-1 text-xl font-black text-gray-950">
                      ToDo / Agenda
                    </h2>
                  </div>

                  <Link
                    to="/admin/workspace/calendar"
                    state={buildNavigationState({
                      from: `/admin/crm/colegios/${school.id}`,
                      fromLabel: school.name,
                      fromType: "school",
                      currentState: location.state,
                    })}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-black text-gray-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                  >
                    <FaCalendarAlt />
                    Calendario
                  </Link>
                </div>

                {pendingWorkItems.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {displayedWorkItems.map((workItem) => {
                      const isTask = workItem.type === "task";
                      const target = isTask
                        ? `/admin/workspace/tasks?task=${workItem.item?.id}&tab=info`
                        : "/admin/workspace/calendar";

                      return (
                        <Link
                          key={workItem.id}
                          to={target}
                          state={buildNavigationState({
                            from: `/admin/crm/colegios/${school.id}`,
                            fromLabel: school.name,
                            fromType: "school",
                            currentState: location.state,
                          })}
                          className="block rounded-2xl bg-gray-50 p-3 ring-1 ring-gray-200 transition hover:bg-red-50 hover:ring-red-200"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-gray-700 ring-1 ring-gray-200">
                              <WorkItemIcon type={workItem.type} />
                            </div>

                            <div className="min-w-0">
                              <span className="inline-flex rounded-full bg-white px-2.5 py-1 text-xs font-black text-gray-700 ring-1 ring-gray-200">
                                {getWorkItemTypeLabel(workItem)}
                              </span>

                              <p className="mt-2 wrap-break-word text-sm font-black text-gray-950">
                                {workItem.item?.title || "Acción programada"}
                              </p>

                              <p className="mt-1 text-xs text-gray-500">
                                {formatDateTime(getWorkItemDate(workItem))}
                              </p>

                              <p className="mt-1 text-xs font-bold text-red-700">
                                {isTask ? "Abrir tarea" : "Abrir en calendario"}
                              </p>
                            </div>
                          </div>
                        </Link>
                      );
                    })}

                    {pendingWorkItems.length > 5 ? (
                      <button
                        type="button"
                        onClick={() =>
                          setShowAllWorkItems((current) => !current)
                        }
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-black text-gray-700 transition hover:bg-gray-50 hover:text-red-700"
                      >
                        {showAllWorkItems
                          ? "Mostrar menos"
                          : `Ver todas (${pendingWorkItems.length})`}
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center">
                    <p className="text-sm font-black text-gray-900">
                      Sin próximas acciones
                    </p>

                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      Las tareas, reuniones y recordatorios vinculados al
                      colegio aparecerán aquí.
                    </p>
                  </div>
                )}
              </section>
            </aside>
          </div>


        </div>
      ) : null}
    </div>
  );
}