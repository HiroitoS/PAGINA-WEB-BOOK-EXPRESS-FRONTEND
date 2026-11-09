import { useEffect, useState } from "react";
import { Link } from "react-router";
import { FiArrowLeft, FiCalendar, FiCheckCircle, FiPlus } from "react-icons/fi";

import {
  createCRMCampaign,
  getCRMCampaigns,
  getCRMPipelines,
  setupInitialCRMPipeline,
  updateCRMCampaign,
} from "../../../api/crmApi";

const types = {
  school: "Campaña escolar",
  reading_plan: "Plan lector",
  general: "Campaña general",
};

const statusNames = {
  planning: "En planificación",
  active: "Activa",
  closed: "Cerrada",
};

const fieldClass = "mt-1 min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-red-600 focus:outline-none";
const buttonBase = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50";

function messageFor(error) {
  if (!error?.response) {
    return "No pudimos conectarnos. Comprueba tu conexión e inténtalo nuevamente.";
  }
  const status = error.response.status;
  if (status === 403) return "No tienes autorización para gestionar las campañas.";
  if (status >= 500) return "No pudimos completar la operación. Inténtalo nuevamente.";
  const data = error.response.data;
  const known = ["status", "year", "ends_on", "starts_on", "name"];
  for (const key of known) {
    const value = data?.[key];
    const text = Array.isArray(value) ? value[0] : value;
    if (typeof text === "string" && text.length < 200) return text;
  }
  if (typeof data?.detail === "string" && data.detail.length < 200) {
    return data.detail;
  }
  return "Revisa los datos y vuelve a intentarlo.";
}

function nextStatus(campaign) {
  return campaign.status === "active" ? "closed" : "active";
}

export default function CRMCampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [pipelines, setPipelines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reload, setReload] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    year: new Date().getFullYear() + 1,
    campaign_type: "school",
    name: "",
    starts_on: "",
    ends_on: "",
  });
  const [confirmation, setConfirmation] = useState(null);

  useEffect(() => {
    let ignore = false;
    Promise.all([getCRMCampaigns(), getCRMPipelines()])
      .then(([campaignRows, pipelineRows]) => {
        if (ignore) return;
        setCampaigns(campaignRows);
        setPipelines(pipelineRows);
        setError("");
      })
      .catch((err) => {
        if (!ignore) setError(messageFor(err));
      })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [reload]);

  function refresh() {
    setLoading(true);
    setReload((current) => current + 1);
  }

  async function saveCampaign(event) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const created = await createCRMCampaign({
        year: Number(form.year),
        campaign_type: form.campaign_type,
        name: form.name.trim(),
        starts_on: form.starts_on || null,
        ends_on: form.ends_on || null,
        status: "planning",
      });
      setSuccess(`${created.name} registrada. Puedes activarla cuando corresponda.`);
      setCreating(false);
      setForm((previous) => ({ ...previous, name: "", starts_on: "", ends_on: "" }));
      refresh();
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setSaving(false);
    }
  }

  async function setCampaignStatus() {
    if (!confirmation || saving) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const updated = await updateCRMCampaign(confirmation.id, {
        status: nextStatus(confirmation),
      });
      setSuccess(`${updated.name}: ${statusNames[updated.status]}.`);
      setConfirmation(null);
      refresh();
    } catch (err) {
      setError(messageFor(err));
      setConfirmation(null);
    } finally {
      setSaving(false);
    }
  }

  async function setupPipeline() {
    if (saving) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await setupInitialCRMPipeline();
      setSuccess("El proceso comercial está listo para crear oportunidades.");
      refresh();
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setSaving(false);
    }
  }

  const activeSchool = campaigns.find(
    (row) => row.campaign_type === "school" && row.status === "active",
  );
  const defaultPipeline = pipelines.find((pipeline) =>
    pipeline.is_active && pipeline.is_default
    && pipeline.stages?.some((stage) => stage.is_active && stage.is_initial)
  );

  return (
    <main className="mx-auto w-full min-w-0 max-w-6xl space-y-4">
      <header className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-red-700">
          CRM / Configuración comercial
        </p>
        <div className="mt-2 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div className="min-w-0">
            <h1 className="text-2xl font-black tracking-tight text-gray-950">
              Campañas comerciales
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-600">
              Prepara cada campaña desde aquí, sin utilizar comandos.
              Los colegios, cotizaciones y adopciones conservarán el año de su campaña.
            </p>
          </div>
          <Link to="/admin/crm"
            className={`${buttonBase} border border-gray-300 text-gray-800 hover:bg-gray-50`}>
            <FiArrowLeft aria-hidden="true" /> Volver al CRM
          </Link>
        </div>
      </header>

      {error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm font-semibold text-gray-800">
          {success}
        </p>
      )}

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase text-gray-600">Campaña escolar vigente</p>
          <p className="mt-1 text-lg font-black text-gray-950">
            {loading ? "Consultando…" : activeSchool?.name ?? "Sin campaña activa"}
          </p>
          {!loading && !activeSchool && (
            <p className="mt-1 text-xs leading-5 text-gray-600">
              Crea la campaña escolar correspondiente y actívala para iniciar oportunidades.
            </p>
          )}
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase text-gray-600">Proceso comercial</p>
          <p className="mt-1 text-lg font-black text-gray-950">
            {loading ? "Consultando…" : defaultPipeline ? "Listo para trabajar" : "Pendiente de configurar"}
          </p>
          {!loading && !defaultPipeline && pipelines.length === 0 && (
            <button type="button" disabled={saving} onClick={setupPipeline}
              className={`${buttonBase} mt-2 border border-gray-300 text-gray-900 hover:bg-gray-50`}>
              Configurar proceso comercial
            </button>
          )}
          {!loading && !defaultPipeline && pipelines.length > 0 && (
            <p className="mt-1 text-xs text-gray-600">
              Existe un proceso comercial sin etapa inicial activa. Solicita una revisión de su configuración.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-gray-950">Campañas registradas</h2>
            <p className="mt-1 text-xs text-gray-600">
              No se eliminan campañas con historial. Cierra las que hayan finalizado.
            </p>
          </div>
          <button type="button" onClick={() => setCreating((current) => !current)}
            className={`${buttonBase} bg-red-700 text-white hover:bg-red-800`}>
            <FiPlus aria-hidden="true" />
            {creating ? "Ocultar formulario" : "Nueva campaña"}
          </button>
        </div>

        {creating && (
          <form onSubmit={saveCampaign} className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3 sm:p-4">
            <h3 className="text-sm font-black text-gray-950">Registrar campaña</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-bold text-gray-800">
                Año comercial
                <input type="number" min="2000" max="2100" required
                  className={fieldClass} value={form.year}
                  onChange={(event) => setForm((current) => ({ ...current, year: event.target.value }))} />
              </label>
              <label className="text-sm font-bold text-gray-800">
                Tipo de campaña
                <select className={fieldClass} value={form.campaign_type}
                  onChange={(event) => setForm((current) => ({ ...current, campaign_type: event.target.value }))}>
                  {Object.entries(types).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-bold text-gray-800 sm:col-span-2">
                Nombre (opcional)
                <input className={fieldClass} maxLength={150} value={form.name}
                  placeholder="Se genera según el tipo y el año"
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
              </label>
              <label className="text-sm font-bold text-gray-800">
                Inicio (opcional)
                <input type="date" className={fieldClass} value={form.starts_on}
                  onChange={(event) => setForm((current) => ({ ...current, starts_on: event.target.value }))} />
              </label>
              <label className="text-sm font-bold text-gray-800">
                Fin (opcional)
                <input type="date" className={fieldClass} min={form.starts_on || undefined}
                  value={form.ends_on}
                  onChange={(event) => setForm((current) => ({ ...current, ends_on: event.target.value }))} />
              </label>
            </div>
            <p className="mt-3 text-xs leading-5 text-gray-600">
              La campaña se registra en planificación. Puedes activarla cuando empiece el trabajo comercial.
            </p>
            <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" disabled={saving} onClick={() => setCreating(false)}
                className={`${buttonBase} border border-gray-300 text-gray-700`}>Cancelar</button>
              <button type="submit" disabled={saving}
                className={`${buttonBase} bg-red-700 text-white hover:bg-red-800`}>
                {saving ? "Guardando…" : "Guardar campaña"}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <p role="status" className="mt-4 text-sm text-gray-600">Consultando campañas…</p>
        ) : campaigns.length === 0 ? (
          <p className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
            Todavía no hay campañas registradas. Crea la primera para comenzar.
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {campaigns.map((campaign) => (
              <article key={campaign.id}
                className="flex flex-col gap-3 rounded-xl border border-gray-200 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 break-words text-sm font-black text-gray-950">
                    <FiCalendar aria-hidden="true" className="shrink-0 text-red-700" />
                    {campaign.name}
                  </p>
                  <p className="mt-1 text-xs text-gray-600">
                    {types[campaign.campaign_type]} · {campaign.year}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-gray-100 px-3 text-xs font-bold text-gray-800">
                    {campaign.status === "active" && <FiCheckCircle aria-hidden="true" />}
                    {statusNames[campaign.status]}
                  </span>
                  <button type="button" disabled={saving}
                    onClick={() => setConfirmation(campaign)}
                    className={`${buttonBase} border border-gray-300 text-gray-800 hover:bg-gray-50`}>
                    {campaign.status === "active" ? "Cerrar campaña" : "Activar"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {confirmation && (
        <div role="presentation" className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 p-3 sm:p-5">
          <div role="dialog" aria-modal="true" aria-labelledby="confirm-campaign"
            className="max-h-dvh w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl sm:p-5">
            <h2 id="confirm-campaign" className="text-lg font-black text-gray-950">
              {confirmation.status === "active" ? "Cerrar campaña" : "Activar campaña"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-700">
              {confirmation.status === "active"
                ? `¿Cerrar ${confirmation.name}? No se podrán crear nuevas oportunidades con esta campaña. Su historial se conservará.`
                : `¿Activar ${confirmation.name}? Si existe otra campaña escolar activa, ciérrala primero.`}
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" disabled={saving} onClick={() => setConfirmation(null)}
                className={`${buttonBase} border border-gray-300 text-gray-800`}>Cancelar</button>
              <button type="button" disabled={saving} onClick={setCampaignStatus}
                className={`${buttonBase} bg-red-700 text-white hover:bg-red-800`}>
                {saving ? "Guardando…" : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
