import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  FaBriefcase,
  FaExclamationTriangle,
  FaGripVertical,
  FaPlus,
  FaSchool,
  FaSyncAlt,
  FaTimes,
} from "react-icons/fa";
import { Link } from "react-router";

import {
  changeCRMOpportunityStage,
  createCRMOpportunity,
  getCRMCampaigns,
  getCRMOpportunities,
  getCRMPipelines,
  getCRMSchools,
} from "../../../api/crmApi";

const PAGE_SIZE = 100;

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

function formatOwner(owner) {
  if (!owner) {
    return "Sin asesor asignado";
  }

  return owner.full_name || owner.username || "Asesor asignado";
}

function formatDate(value) {
  if (!value) {
    return "Sin actividad";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Sin actividad";
  }

  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function categoryLabel(category) {
  if (category === "won") return "Ganada";
  if (category === "lost") return "Perdida";
  return "En curso";
}

function categoryBadgeClass(category) {
  if (category === "won") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (category === "lost") {
    return "bg-gray-100 text-gray-600 ring-gray-200";
  }

  return "bg-red-50 text-red-700 ring-red-200";
}

function NewOpportunityPanel({
  campaigns,
  pipelines,
  schools,
  selectedPipelineId,
  onCreated,
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    school: "",
    campaign: "",
    pipeline: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const availableCampaigns = useMemo(
    () =>
      campaigns.filter(
        (campaign) => campaign.status !== "closed",
      ),
    [campaigns],
  );

  const availablePipelines = useMemo(
    () =>
      pipelines.filter(
        (pipeline) => pipeline.is_active,
      ),
    [pipelines],
  );

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  function openPanel() {
    const defaultPipeline =
      String(selectedPipelineId || "")
      || String(
        availablePipelines.find((pipeline) => pipeline.is_default)?.id
          || availablePipelines[0]?.id
          || "",
      );

    const defaultCampaign = String(
      availableCampaigns[0]?.id || "",
    );

    setForm((currentForm) => ({
      ...currentForm,
      pipeline: currentForm.pipeline || defaultPipeline,
      campaign: currentForm.campaign || defaultCampaign,
    }));
    setErrorMessage("");
    setOpen(true);
  }

  function closePanel() {
    if (saving) return;

    setOpen(false);
    setErrorMessage("");
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.title.trim() || !form.school || !form.campaign || !form.pipeline) {
      setErrorMessage(
        "Completa el nombre, colegio, campaña y pipeline de la oportunidad.",
      );
      return;
    }

    try {
      setSaving(true);
      setErrorMessage("");

      const created = await createCRMOpportunity({
        title: form.title.trim(),
        school: Number(form.school),
        campaign: Number(form.campaign),
        pipeline: Number(form.pipeline),
        notes: form.notes.trim(),
      });

      setForm({
        title: "",
        school: "",
        campaign: "",
        pipeline: "",
        notes: "",
      });
      setOpen(false);
      onCreated(created);
    } catch (error) {
      setErrorMessage(
        getErrorMessage(
          error,
          "No se pudo registrar la oportunidad comercial.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-800"
        type="button"
        onClick={openPanel}
      >
        <FaPlus className="text-xs" />
        Nueva oportunidad
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            aria-label="Cerrar formulario"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            type="button"
            onClick={closePanel}
          />

          <section className="relative z-10 h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl">
            <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-5 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-red-700">
                    CRM Comercial
                  </p>
                  <h2 className="mt-1 text-xl font-black text-gray-950">
                    Nueva oportunidad
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-gray-500">
                    Registra el colegio y la campaña que ingresarán al pipeline.
                  </p>
                </div>

                <button
                  aria-label="Cerrar"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition hover:bg-gray-50"
                  type="button"
                  onClick={closePanel}
                >
                  <FaTimes />
                </button>
              </div>
            </div>

            <form className="space-y-5 p-5 sm:p-6" onSubmit={handleSubmit}>
              {errorMessage ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
                  {errorMessage}
                </div>
              ) : null}

              <label className="block">
                <span className="text-xs font-black uppercase tracking-wide text-gray-600">
                  Nombre de la oportunidad
                </span>
                <input
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
                  name="title"
                  placeholder="Ej. Campaña escolar 2027 - Colegio..."
                  value={form.title}
                  onChange={handleChange}
                />
              </label>

              <label className="block">
                <span className="text-xs font-black uppercase tracking-wide text-gray-600">
                  Colegio
                </span>
                <select
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
                  name="school"
                  value={form.school}
                  onChange={handleChange}
                >
                  <option value="">Seleccionar colegio</option>
                  {schools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-black uppercase tracking-wide text-gray-600">
                    Campaña
                  </span>
                  <select
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
                    name="campaign"
                    value={form.campaign}
                    onChange={handleChange}
                  >
                    <option value="">Seleccionar campaña</option>
                    {availableCampaigns.map((campaign) => (
                      <option key={campaign.id} value={campaign.id}>
                        {campaign.name} - {campaign.year}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs font-black uppercase tracking-wide text-gray-600">
                    Pipeline
                  </span>
                  <select
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
                    name="pipeline"
                    value={form.pipeline}
                    onChange={handleChange}
                  >
                    <option value="">Seleccionar pipeline</option>
                    {availablePipelines.map((pipeline) => (
                      <option key={pipeline.id} value={pipeline.id}>
                        {pipeline.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="text-xs font-black uppercase tracking-wide text-gray-600">
                  Observaciones iniciales
                </span>
                <textarea
                  className="mt-2 min-h-28 w-full resize-y rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
                  name="notes"
                  placeholder="Información útil para iniciar la gestión comercial."
                  value={form.notes}
                  onChange={handleChange}
                />
              </label>

              {availableCampaigns.length === 0 ? (
                <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                  No existe una campaña disponible para registrar nuevas oportunidades.
                </p>
              ) : null}

              <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-black text-gray-700 transition hover:bg-gray-50"
                  disabled={saving}
                  type="button"
                  onClick={closePanel}
                >
                  Cancelar
                </button>
                <button
                  className="rounded-xl bg-red-700 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={saving || availableCampaigns.length === 0}
                  type="submit"
                >
                  {saving ? "Guardando..." : "Crear oportunidad"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}

function OpportunityCard({
  opportunity,
  openStages,
  moving,
  onMove,
  onDragStart,
  onDragEnd,
}) {
  const isClosed = Boolean(opportunity.is_closed);

  return (
    <article
      draggable={!isClosed && !moving}
      className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-gray-300 hover:shadow-md"
      onDragStart={(event) => onDragStart(event, opportunity)}
      onDragEnd={onDragEnd}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-black leading-5 text-gray-950">
            {opportunity.school?.name || "Colegio sin nombre"}
          </p>
          <p className="mt-1 text-xs leading-5 text-gray-500">
            {opportunity.title}
          </p>
        </div>

        {!isClosed ? (
          <FaGripVertical
            className="mt-1 shrink-0 text-gray-300"
            title="Arrastrar"
          />
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ring-1 ${categoryBadgeClass(
            opportunity.stage?.category,
          )}`}
        >
          {categoryLabel(opportunity.stage?.category)}
        </span>

        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600">
          {opportunity.campaign?.year || "Sin campaña"}
        </span>
      </div>

      <div className="mt-4 space-y-2 border-t border-gray-100 pt-3 text-xs text-gray-500">
        <p>
          <span className="font-black text-gray-700">Asesor:</span>{" "}
          {formatOwner(opportunity.owner)}
        </p>
        <p>
          <span className="font-black text-gray-700">Última actividad:</span>{" "}
          {formatDate(opportunity.last_activity_at)}
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <Link
          className="inline-flex justify-center rounded-xl border border-gray-200 px-3 py-2 text-xs font-black text-gray-700 transition hover:bg-gray-50"
          to={`/admin/crm/colegios/${opportunity.school?.id}`}
        >
          Abrir colegio
        </Link>

        {!isClosed ? (
          <select
            aria-label="Mover oportunidad"
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100 disabled:opacity-50"
            disabled={moving}
            value={opportunity.stage?.id || ""}
            onChange={(event) =>
              onMove(opportunity, Number(event.target.value))
            }
          >
            {openStages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </select>
        ) : null}
      </div>
    </article>
  );
}

export default function CRMOpportunitiesPage() {
  const [pipelines, setPipelines] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [schools, setSchools] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState("");
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [search, setSearch] = useState("");
  const [loadingReferences, setLoadingReferences] = useState(true);
  const [loadingBoard, setLoadingBoard] = useState(true);
  const [movingId, setMovingId] = useState(null);
  const [draggedOpportunityId, setDraggedOpportunityId] = useState(null);
  const [dragOverStageId, setDragOverStageId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function loadReferences() {
      try {
        setLoadingReferences(true);
        setErrorMessage("");

        const [pipelineData, campaignData, schoolData] = await Promise.all([
          getCRMPipelines(),
          getCRMCampaigns(),
          getCRMSchools({
            page: 1,
            page_size: PAGE_SIZE,
            is_active: "true",
          }),
        ]);

        if (ignore) return;

        const schoolResults = Array.isArray(schoolData?.results)
          ? schoolData.results
          : Array.isArray(schoolData)
            ? schoolData
            : [];

        setPipelines(pipelineData);
        setCampaigns(campaignData);
        setSchools(schoolResults);

        setSelectedPipelineId((currentValue) => {
          if (currentValue) return currentValue;

          const defaultPipeline =
            pipelineData.find((pipeline) => pipeline.is_default)
            || pipelineData[0];

          return defaultPipeline ? String(defaultPipeline.id) : "";
        });
      } catch (error) {
        if (!ignore) {
          setErrorMessage(
            getErrorMessage(
              error,
              "No se pudo cargar la configuración del pipeline comercial.",
            ),
          );
        }
      } finally {
        if (!ignore) {
          setLoadingReferences(false);
        }
      }
    }

    loadReferences();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    const timeoutId = setTimeout(async () => {
      try {
        setLoadingBoard(true);
        setErrorMessage("");

        const params = {
          page: 1,
          page_size: PAGE_SIZE,
        };

        if (selectedPipelineId) {
          params.pipeline = selectedPipelineId;
        }

        if (selectedCampaignId) {
          params.campaign = selectedCampaignId;
        }

        if (search.trim()) {
          params.search = search.trim();
        }

        const data = await getCRMOpportunities(params);

        if (!ignore) {
          setOpportunities(
            Array.isArray(data?.results)
              ? data.results
              : Array.isArray(data)
                ? data
                : [],
          );
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(
            getErrorMessage(
              error,
              "No se pudieron cargar las oportunidades comerciales.",
            ),
          );
        }
      } finally {
        if (!ignore) {
          setLoadingBoard(false);
        }
      }
    }, 250);

    return () => {
      ignore = true;
      clearTimeout(timeoutId);
    };
  }, [reloadKey, search, selectedCampaignId, selectedPipelineId]);

  const activePipeline = useMemo(
    () =>
      pipelines.find(
        (pipeline) => String(pipeline.id) === String(selectedPipelineId),
      ) || null,
    [pipelines, selectedPipelineId],
  );

  const stages = useMemo(
    () =>
      [...(activePipeline?.stages || [])]
        .filter((stage) => stage.is_active)
        .sort((left, right) => left.order - right.order),
    [activePipeline],
  );

  const openStages = useMemo(
    () => stages.filter((stage) => stage.category === "open"),
    [stages],
  );

  const opportunitiesByStage = useMemo(() => {
    const grouped = new Map();

    stages.forEach((stage) => {
      grouped.set(stage.id, []);
    });

    opportunities.forEach((opportunity) => {
      const stageId = opportunity.stage?.id;

      if (!grouped.has(stageId)) {
        grouped.set(stageId, []);
      }

      grouped.get(stageId).push(opportunity);
    });

    return grouped;
  }, [opportunities, stages]);

  async function handleMove(opportunity, targetStageId) {
    const targetStage = stages.find((stage) => stage.id === targetStageId);

    if (
      !targetStage
      || targetStage.category !== "open"
      || targetStage.id === opportunity.stage?.id
      || movingId
    ) {
      return;
    }

    try {
      setMovingId(opportunity.id);
      setErrorMessage("");

      const updated = await changeCRMOpportunityStage(
        opportunity.id,
        {
          stage: targetStage.id,
          note: "Movimiento realizado desde el tablero comercial.",
        },
      );

      setOpportunities((currentOpportunities) =>
        currentOpportunities.map((currentOpportunity) =>
          currentOpportunity.id === opportunity.id
            ? updated
            : currentOpportunity,
        ),
      );
    } catch (error) {
      setErrorMessage(
        getErrorMessage(
          error,
          "No se pudo mover la oportunidad a la etapa seleccionada.",
        ),
      );
    } finally {
      setMovingId(null);
      setDraggedOpportunityId(null);
      setDragOverStageId(null);
    }
  }

  function handleDragStart(event, opportunity) {
    setDraggedOpportunityId(opportunity.id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(
      "text/plain",
      String(opportunity.id),
    );
  }

  function handleDragEnd() {
    setDraggedOpportunityId(null);
    setDragOverStageId(null);
  }

  function handleDrop(event, stage) {
    event.preventDefault();
    setDragOverStageId(null);

    if (stage.category !== "open") {
      return;
    }

    const opportunityId = Number(
      event.dataTransfer.getData("text/plain") || draggedOpportunityId,
    );

    const opportunity = opportunities.find(
      (item) => item.id === opportunityId,
    );

    if (opportunity) {
      handleMove(opportunity, stage.id);
    }
  }

  function handleCreated() {
    setReloadKey((currentKey) => currentKey + 1);
  }

  const totalVisible = opportunities.length;
  const hasMoreThanPage = totalVisible >= PAGE_SIZE;

  return (
    <div className="mx-auto w-full max-w-full">
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl bg-gray-950 px-5 py-5 text-white shadow-sm sm:px-7"
      >
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-red-300">
              <FaBriefcase />
              CRM Comercial
            </div>
            <h1 className="mt-2 text-2xl font-black sm:text-3xl">
              Oportunidades
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-300">
              Visualiza cada colegio dentro de la etapa comercial que le corresponde
              y mueve las oportunidades conforme avanza la gestión.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-black text-white ring-1 ring-white/10 transition hover:bg-white/20"
              type="button"
              onClick={() => setReloadKey((currentKey) => currentKey + 1)}
            >
              <FaSyncAlt className="text-xs" />
              Actualizar
            </button>

            <NewOpportunityPanel
              campaigns={campaigns}
              pipelines={pipelines}
              schools={schools}
              selectedPipelineId={selectedPipelineId}
              onCreated={handleCreated}
            />
          </div>
        </div>
      </motion.section>

      <section className="mt-4 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-3 lg:grid-cols-3">
          <label className="block">
            <span className="text-xs font-black uppercase tracking-wide text-gray-500">
              Pipeline
            </span>
            <select
              className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
              value={selectedPipelineId}
              onChange={(event) => setSelectedPipelineId(event.target.value)}
            >
              {pipelines.map((pipeline) => (
                <option key={pipeline.id} value={pipeline.id}>
                  {pipeline.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-black uppercase tracking-wide text-gray-500">
              Campaña
            </span>
            <select
              className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
              value={selectedCampaignId}
              onChange={(event) => setSelectedCampaignId(event.target.value)}
            >
              <option value="">Todas las campañas</option>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name} - {campaign.year}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-black uppercase tracking-wide text-gray-500">
              Buscar
            </span>
            <input
              className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
              placeholder="Colegio, oportunidad o asesor..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4 text-xs text-gray-500">
          <span className="rounded-full bg-gray-950 px-3 py-1.5 font-black text-white">
            {totalVisible} oportunidad(es) visibles
          </span>
          <span>
            Arrastra las tarjetas entre etapas abiertas o utiliza el selector de cada tarjeta.
          </span>
        </div>
      </section>

      {errorMessage ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <FaExclamationTriangle className="mt-0.5 shrink-0 text-red-700" />
            <p className="text-sm leading-6 text-red-800">
              {errorMessage}
            </p>
          </div>
        </div>
      ) : null}

      {hasMoreThanPage ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
          El tablero muestra hasta {PAGE_SIZE} oportunidades por consulta.
          Si la cartera supera ese volumen, agregaremos carga progresiva por etapa.
        </div>
      ) : null}

      <section className="mt-4 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-4 py-4 sm:px-5">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-red-700">
              Pipeline
            </p>
            <h2 className="mt-1 text-lg font-black text-gray-950">
              {activePipeline?.name || "Pipeline comercial"}
            </h2>
          </div>

          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-950 text-white">
            <FaSchool />
          </div>
        </div>

        {loadingReferences || loadingBoard ? (
          <div className="flex gap-4 overflow-hidden p-4 sm:p-5">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="h-80 w-72 shrink-0 animate-pulse rounded-2xl bg-gray-100 sm:w-80"
              />
            ))}
          </div>
        ) : stages.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-base font-black text-gray-950">
              No hay etapas configuradas.
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Ejecuta la sincronización del pipeline en el backend.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto p-4 sm:p-5">
            <div className="flex min-w-max items-start gap-4">
              {stages.map((stage) => {
                const stageOpportunities =
                  opportunitiesByStage.get(stage.id) || [];
                const isDragTarget =
                  dragOverStageId === stage.id
                  && stage.category === "open";

                return (
                  <section
                    key={stage.id}
                    className={`w-72 shrink-0 rounded-2xl border p-3 transition sm:w-80 ${
                      isDragTarget
                        ? "border-red-300 bg-red-50"
                        : "border-gray-200 bg-gray-50"
                    }`}
                    onDragOver={(event) => {
                      if (stage.category !== "open") return;
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                      setDragOverStageId(stage.id);
                    }}
                    onDragLeave={() => {
                      if (dragOverStageId === stage.id) {
                        setDragOverStageId(null);
                      }
                    }}
                    onDrop={(event) => handleDrop(event, stage)}
                  >
                    <div className="flex items-center justify-between gap-3 border-b border-gray-200 pb-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-gray-950">
                          {stage.name}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {categoryLabel(stage.category)}
                        </p>
                      </div>

                      <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-gray-700 ring-1 ring-gray-200">
                        {stageOpportunities.length}
                      </span>
                    </div>

                    <div className="mt-3 space-y-3">
                      {stageOpportunities.length > 0 ? (
                        stageOpportunities.map((opportunity) => (
                          <OpportunityCard
                            key={opportunity.id}
                            moving={movingId === opportunity.id}
                            openStages={openStages}
                            opportunity={opportunity}
                            onDragEnd={handleDragEnd}
                            onDragStart={handleDragStart}
                            onMove={handleMove}
                          />
                        ))
                      ) : (
                        <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-8 text-center">
                          <p className="text-xs font-black text-gray-600">
                            Sin oportunidades
                          </p>
                        </div>
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 text-sm leading-6 text-gray-600 shadow-sm">
        <span className="font-black text-gray-950">Importante:</span>{" "}
        las etapas de cierre no se mueven libremente desde el tablero.
        El cierre ganado se realizará mediante el flujo de adopción y el cierre
        perdido solicitará su motivo, para conservar trazabilidad comercial.
      </div>
    </div>
  );
}
