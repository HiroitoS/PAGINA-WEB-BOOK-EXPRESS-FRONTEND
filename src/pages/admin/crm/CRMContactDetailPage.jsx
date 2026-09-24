import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router";
import { motion } from "motion/react";
import {
  FaArrowLeft,
  FaBriefcase,
  FaCalendarAlt,
  FaEdit,
  FaEnvelope,
  FaExclamationTriangle,
  FaPhoneAlt,
  FaSave,
  FaSchool,
  FaStar,
  FaTasks,
  FaTimes,
  FaUserTie,
} from "react-icons/fa";

import {
  createCRMSchoolActivity,
  createCRMSchoolEvent,
  createCRMSchoolReminder,
  createCRMSchoolTask,
  getCRMContact,
  getCRMContactActivities,
  getCRMContactWorkItems,
  updateCRMContact,
} from "../../../api/crmApi";

const ACTIVITY_FILTERS = [
  { value: "all", label: "Todas" },
  { value: "call", label: "Llamadas" },
  { value: "visit", label: "Visitas" },
  { value: "meeting", label: "Reuniones" },
  { value: "follow_up", label: "Seguimientos" },
];

const ACTIVITY_TYPES = [
  { value: "call", label: "Llamada" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Correo" },
  { value: "meeting", label: "Reunión" },
  { value: "visit", label: "Visita" },
  { value: "presentation", label: "Presentación" },
  { value: "sample_delivery", label: "Entrega de muestra" },
  { value: "sample_return", label: "Devolución de muestra" },
  { value: "follow_up", label: "Seguimiento" },
  { value: "other", label: "Otro" },
];

const RELATIONSHIP_LEVELS = [
  {
    value: "1",
    label: "Contacto inicial",
    description: "Existe comunicación, pero el vínculo todavía es limitado.",
  },
  {
    value: "2",
    label: "Relación en desarrollo",
    description: "Hay contacto recurrente y apertura para continuar conversando.",
  },
  {
    value: "3",
    label: "Buena relación",
    description: "Existe confianza y comunicación comercial activa.",
  },
  {
    value: "4",
    label: "Relación sólida",
    description: "El vínculo es estable y facilita el avance comercial.",
  },
  {
    value: "5",
    label: "Relación estratégica",
    description: "Existe alta confianza, acceso y colaboración con el contacto.",
  },
];

function getRelationshipLabel(value) {
  const normalizedValue = String(value ?? "");
  const option = RELATIONSHIP_LEVELS.find(
    (relationship) => relationship.value === normalizedValue,
  );

  return option?.label || "Sin evaluar";
}

function getRelationshipDescription(value) {
  const normalizedValue = String(value ?? "");
  const option = RELATIONSHIP_LEVELS.find(
    (relationship) => relationship.value === normalizedValue,
  );

  return (
    option?.description ||
    "Selecciona el nivel que mejor describa la relación actual con este contacto."
  );
}

function getCurrentLocalDateTimeValue() {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60_000;

  return new Date(now.getTime() - timezoneOffset)
    .toISOString()
    .slice(0, 16);
}

function createInitialActivityForm() {
  return {
    activity_type: "visit",
    summary: "",
    result: "",
    occurred_at: getCurrentLocalDateTimeValue(),
    is_important: false,
    schedule_next_action: false,
    next_action_type: "task",
    next_action_title: "",
    next_action_at: "",
  };
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
  const detail = error?.response?.data?.detail;

  if (Array.isArray(detail) && detail.length > 0) {
    return detail.join(" ");
  }

  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  return fallback;
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

function ContactStatusBadge({ active }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${
        active
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
          : "bg-gray-100 text-gray-600 ring-1 ring-gray-200"
      }`}
    >
      {active ? "Vigente" : "Inactivo"}
    </span>
  );
}

function InfoValue({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl bg-gray-50 p-3 ring-1 ring-gray-200">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-gray-700 ring-1 ring-gray-200">
          <Icon />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-gray-400">
            {label}
          </p>
          <p className="mt-1 break-words text-sm font-bold text-gray-900">
            {value || "No registrado"}
          </p>
        </div>
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

function WorkItemDate({ workItem }) {
  const item = workItem?.item || {};

  if (workItem?.type === "event") {
    return formatDateTime(item.start_at);
  }

  if (workItem?.type === "task") {
    return formatDateTime(item.due_at || item.reminder_at);
  }

  return formatDateTime(item.remind_at);
}

function contactToEditForm(contact) {
  const whatsapp = String(contact?.whatsapp || "").trim();
  const phone = String(contact?.phone || "").trim();

  return {
    full_name: contact?.full_name || "",
    position: contact?.position || "",
    contact_number: whatsapp || phone,
    alternate_phone:
      whatsapp && phone && whatsapp !== phone ? phone : "",
    email: contact?.email || "",
    decision_role: contact?.decision_role || "",
    relationship_level: contact?.relationship_level
      ? String(contact.relationship_level)
      : "",
    notes: contact?.notes || "",
    is_primary: Boolean(contact?.is_primary),
    is_active: Boolean(contact?.is_active),
  };
}

function getReturnContext(locationState) {
  const from = locationState?.from;

  if (
    typeof from === "string" &&
    from.startsWith("/admin/crm/colegios/")
  ) {
    return {
      path: from,
      label: "Volver al colegio",
    };
  }

  return {
    path: "/admin/crm/contactos",
    label: "Volver a contactos",
  };
}

export default function CRMContactDetailPage() {
  const { id } = useParams();
  const location = useLocation();

  const [contact, setContact] = useState(null);
  const [activities, setActivities] = useState([]);
  const [workItems, setWorkItems] = useState([]);
  const [activityFilter, setActivityFilter] = useState("all");
  const [registeringActivity, setRegisteringActivity] = useState(false);
  const [activityForm, setActivityForm] = useState(createInitialActivityForm);
  const [savingActivity, setSavingActivity] = useState(false);
  const [activityErrorMessage, setActivityErrorMessage] = useState("");
  const [activitySuccessMessage, setActivitySuccessMessage] = useState("");
  const [activityWarningMessage, setActivityWarningMessage] = useState("");
  const [editingContact, setEditingContact] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [savingContact, setSavingContact] = useState(false);
  const [editErrorMessage, setEditErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadContactWorkspace() {
      try {
        setLoading(true);
        setErrorMessage("");

        const [contactData, activitiesData, workItemsData] = await Promise.all([
          getCRMContact(id),
          getCRMContactActivities(id, { page_size: 50 }),
          getCRMContactWorkItems(id, { page_size: 50 }),
        ]);

        if (!ignore) {
          setContact(contactData);
          setActivities(normalizeResults(activitiesData));
          setWorkItems(normalizeResults(workItemsData));
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(
            getErrorMessage(
              error,
              "No se pudo cargar la ficha del contacto.",
            ),
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadContactWorkspace();

    return () => {
      ignore = true;
    };
  }, [id]);

  const filteredActivities = useMemo(() => {
    if (activityFilter === "all") {
      return activities;
    }

    return activities.filter(
      (activity) => activity.activity_type === activityFilter,
    );
  }, [activities, activityFilter]);

  const relatedOpportunityIds = useMemo(() => {
    const ids = new Set();

    activities.forEach((activity) => {
      if (activity.opportunity_id) {
        ids.add(activity.opportunity_id);
      }
    });

    workItems.forEach((workItem) => {
      if (workItem.opportunity_id) {
        ids.add(workItem.opportunity_id);
      }
    });

    return Array.from(ids);
  }, [activities, workItems]);

  const returnContext = getReturnContext(location.state);

  function startContactEdit() {
    setEditForm(contactToEditForm(contact));
    setEditErrorMessage("");
    setEditingContact(true);
  }

  function cancelContactEdit() {
    setEditingContact(false);
    setEditForm(null);
    setEditErrorMessage("");
  }

  function updateEditField(field, value) {
    setEditForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function startActivityRegistration() {
    setActivityForm(createInitialActivityForm());
    setActivityErrorMessage("");
    setActivitySuccessMessage("");
    setActivityWarningMessage("");
    setRegisteringActivity(true);
  }

  function cancelActivityRegistration() {
    setRegisteringActivity(false);
    setActivityErrorMessage("");
  }

  function updateActivityField(field, value) {
    setActivityForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  async function saveCommercialActivity() {
    if (!school?.id) {
      setActivityErrorMessage(
        "Este contacto no tiene un colegio vinculado para registrar la actividad.",
      );
      return;
    }

    if (!activityForm.summary.trim()) {
      setActivityErrorMessage("Ingresa un resumen de la actividad.");
      return;
    }

    if (!activityForm.result.trim()) {
      setActivityErrorMessage("Ingresa el resultado o detalle de la actividad.");
      return;
    }

    const occurredAt = new Date(activityForm.occurred_at);

    if (Number.isNaN(occurredAt.getTime())) {
      setActivityErrorMessage("Ingresa una fecha y hora válidas.");
      return;
    }

    let nextActionAt = null;

    if (activityForm.schedule_next_action) {
      if (!activityForm.next_action_title.trim()) {
        setActivityErrorMessage("Ingresa el título de la próxima acción.");
        return;
      }

      nextActionAt = new Date(activityForm.next_action_at);

      if (Number.isNaN(nextActionAt.getTime())) {
        setActivityErrorMessage(
          "Ingresa una fecha y hora válidas para la próxima acción.",
        );
        return;
      }
    }

    const payload = {
      activity_type: activityForm.activity_type,
      summary: activityForm.summary.trim(),
      result: activityForm.result.trim(),
      contact: Number(id),
      occurred_at: occurredAt.toISOString(),
      is_important: activityForm.is_important,
    };

    try {
      setSavingActivity(true);
      setActivityErrorMessage("");
      setActivitySuccessMessage("");
      setActivityWarningMessage("");

      const createdActivity = await createCRMSchoolActivity(
        school.id,
        payload,
      );

      let nextActionCreated = false;

      if (activityForm.schedule_next_action && nextActionAt) {
        const commonWorkItem = {
          title: activityForm.next_action_title.trim(),
          contact: Number(id),
          origin_activity: createdActivity.id,
        };

        try {
          if (activityForm.next_action_type === "event") {
            await createCRMSchoolEvent(school.id, {
              ...commonWorkItem,
              start_at: nextActionAt.toISOString(),
              event_type: "meeting",
            });
          } else if (activityForm.next_action_type === "reminder") {
            await createCRMSchoolReminder(school.id, {
              ...commonWorkItem,
              remind_at: nextActionAt.toISOString(),
            });
          } else {
            await createCRMSchoolTask(school.id, {
              ...commonWorkItem,
              due_at: nextActionAt.toISOString(),
            });
          }

          nextActionCreated = true;
        } catch (nextActionError) {
          setActivityWarningMessage(
            getErrorMessage(
              nextActionError,
              "La actividad se guardó, pero no se pudo programar la próxima acción.",
            ),
          );
        }
      }

      const [activitiesData, workItemsData] = await Promise.all([
        getCRMContactActivities(id, { page_size: 50 }),
        getCRMContactWorkItems(id, { page_size: 50 }),
      ]);

      setActivities(normalizeResults(activitiesData));
      setWorkItems(normalizeResults(workItemsData));
      setRegisteringActivity(false);
      setActivityForm(createInitialActivityForm());
      setActivityFilter("all");
      setActivitySuccessMessage(
        activityForm.schedule_next_action && nextActionCreated
          ? "La actividad y la próxima acción fueron registradas correctamente."
          : "La actividad fue registrada correctamente.",
      );
    } catch (error) {
      setActivityErrorMessage(
        getErrorMessage(
          error,
          "No se pudo registrar la actividad comercial.",
        ),
      );
    } finally {
      setSavingActivity(false);
    }
  }

  async function saveContactChanges() {
    if (!editForm?.full_name?.trim()) {
      setEditErrorMessage("Ingresa el nombre completo del contacto.");
      return;
    }

    if (!editForm.is_active && editForm.is_primary) {
      setEditErrorMessage(
        "Un contacto inactivo no puede ser el contacto principal.",
      );
      return;
    }

    const contactNumber = editForm.contact_number.trim();
    const alternatePhone = editForm.alternate_phone.trim();

    const payload = {
      full_name: editForm.full_name.trim(),
      position: editForm.position.trim(),
      whatsapp: contactNumber,
      phone: alternatePhone || contactNumber,
      email: editForm.email.trim(),
      decision_role: editForm.decision_role,
      relationship_level: editForm.relationship_level
        ? Number(editForm.relationship_level)
        : null,
      notes: editForm.notes.trim(),
      is_primary: editForm.is_primary,
      is_active: editForm.is_active,
    };

    try {
      setSavingContact(true);
      setEditErrorMessage("");

      const updatedContact = await updateCRMContact(id, payload);
      setContact(updatedContact);
      setEditingContact(false);
      setEditForm(null);
    } catch (error) {
      setEditErrorMessage(
        getErrorMessage(
          error,
          "No se pudo actualizar el contacto.",
        ),
      );
    } finally {
      setSavingContact(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-7xl">
        <div className="h-40 animate-pulse rounded-3xl bg-gray-200" />
        <div className="mt-4 grid gap-4 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-3xl bg-gray-200"
            />
          ))}
        </div>
      </div>
    );
  }

  if (errorMessage || !contact) {
    return (
      <div className="mx-auto w-full max-w-7xl">
        <Link
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-black text-gray-700 shadow-sm transition hover:bg-gray-50"
          to={returnContext.path}
        >
          <FaArrowLeft />
          {returnContext.label}
        </Link>

        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <FaExclamationTriangle className="mt-0.5 shrink-0 text-red-700" />
            <p className="text-sm leading-6 text-red-800">
              {errorMessage || "No se encontró el contacto solicitado."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const school = contact.school;
  const contactNumber = contact.whatsapp || contact.phone;
  const relationshipLevel = Number(contact.relationship_level);

  return (
    <div className="mx-auto w-full max-w-7xl">
      <Link
        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-black text-gray-700 shadow-sm transition hover:bg-gray-50"
        to={returnContext.path}
      >
        <FaArrowLeft />
        {returnContext.label}
      </Link>

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-3 rounded-3xl bg-gray-950 px-5 py-5 text-white shadow-sm sm:px-7"
      >
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wide text-red-300">
              CRM Comercial · Contacto
            </p>
            <h1 className="mt-1 break-words text-2xl font-black sm:text-3xl">
              {contact.full_name}
            </h1>
            <p className="mt-2 text-sm text-gray-300">
              {contact.position || "Cargo no registrado"}
              {school?.name ? ` · ${school.name}` : ""}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={startContactEdit}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm font-black text-white transition hover:border-red-300 hover:bg-red-700"
            >
              <FaEdit />
              Editar contacto
            </button>

            {contact.is_primary ? (
              <span className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-black text-white">
                Contacto principal
              </span>
            ) : null}
            <ContactStatusBadge active={contact.is_active} />
          </div>
        </div>
      </motion.section>

      {editingContact && editForm ? (
        <section className="mt-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-red-700">
                Edición del contacto
              </p>
              <h2 className="mt-1 text-xl font-black text-gray-950">
                Actualizar datos
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Los cambios se guardan en el mismo contacto vinculado al colegio.
              </p>
            </div>

            <button
              type="button"
              onClick={cancelContactEdit}
              disabled={savingContact}
              className="inline-flex items-center gap-2 self-start rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-black text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            >
              <FaTimes />
              Cerrar
            </button>
          </div>

          {editErrorMessage ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
              {editErrorMessage}
            </div>
          ) : null}

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label>
              <span className="text-xs font-black uppercase tracking-wide text-gray-500">
                Nombre completo
              </span>
              <input
                type="text"
                value={editForm.full_name}
                onChange={(event) =>
                  updateEditField("full_name", event.target.value)
                }
                disabled={savingContact}
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
              />
            </label>

            <label>
              <span className="text-xs font-black uppercase tracking-wide text-gray-500">
                Cargo / función
              </span>
              <input
                type="text"
                value={editForm.position}
                onChange={(event) =>
                  updateEditField("position", event.target.value)
                }
                disabled={savingContact}
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
              />
            </label>

            <label>
              <span className="text-xs font-black uppercase tracking-wide text-gray-500">
                Celular / WhatsApp
              </span>
              <input
                type="text"
                value={editForm.contact_number}
                onChange={(event) =>
                  updateEditField("contact_number", event.target.value)
                }
                disabled={savingContact}
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
              />
            </label>

            <label>
              <span className="text-xs font-black uppercase tracking-wide text-gray-500">
                Teléfono alternativo
              </span>
              <input
                type="text"
                value={editForm.alternate_phone}
                onChange={(event) =>
                  updateEditField("alternate_phone", event.target.value)
                }
                disabled={savingContact}
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
              />
            </label>

            <label>
              <span className="text-xs font-black uppercase tracking-wide text-gray-500">
                Correo
              </span>
              <input
                type="email"
                value={editForm.email}
                onChange={(event) =>
                  updateEditField("email", event.target.value)
                }
                disabled={savingContact}
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
              />
            </label>

            <label>
              <span className="text-xs font-black uppercase tracking-wide text-gray-500">
                Rol en la decisión
              </span>
              <select
                value={editForm.decision_role}
                onChange={(event) =>
                  updateEditField("decision_role", event.target.value)
                }
                disabled={savingContact}
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
              >
                <option value="">Sin clasificar</option>
                <option value="decision_maker">Decisor</option>
                <option value="influencer">Influenciador</option>
                <option value="other">Otro</option>
              </select>
            </label>

            <label>
              <span className="text-xs font-black uppercase tracking-wide text-gray-500">
                Relacionamiento
              </span>
              <select
                value={editForm.relationship_level}
                onChange={(event) =>
                  updateEditField("relationship_level", event.target.value)
                }
                disabled={savingContact}
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
              >
                <option value="">Sin evaluar</option>
                {RELATIONSHIP_LEVELS.map((relationship) => (
                  <option key={relationship.value} value={relationship.value}>
                    {relationship.label}
                  </option>
                ))}
              </select>
              <span className="mt-2 block text-xs leading-5 text-gray-500">
                {getRelationshipDescription(editForm.relationship_level)}
              </span>
            </label>

            <label>
              <span className="text-xs font-black uppercase tracking-wide text-gray-500">
                Estado
              </span>
              <select
                value={editForm.is_active ? "active" : "inactive"}
                onChange={(event) =>
                  updateEditField(
                    "is_active",
                    event.target.value === "active",
                  )
                }
                disabled={savingContact}
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
              >
                <option value="active">Vigente</option>
                <option value="inactive">Inactivo</option>
              </select>
            </label>

            <label className="flex items-center gap-3 self-end rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
              <input
                type="checkbox"
                checked={editForm.is_primary}
                onChange={(event) =>
                  updateEditField("is_primary", event.target.checked)
                }
                disabled={savingContact || !editForm.is_active}
                className="h-4 w-4 accent-red-700"
              />
              <span className="text-sm font-black text-gray-800">
                Contacto principal
              </span>
            </label>

            <label className="md:col-span-2 xl:col-span-3">
              <span className="text-xs font-black uppercase tracking-wide text-gray-500">
                Observaciones
              </span>
              <textarea
                rows="3"
                value={editForm.notes}
                onChange={(event) =>
                  updateEditField("notes", event.target.value)
                }
                disabled={savingContact}
                className="mt-2 w-full resize-y rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={cancelContactEdit}
              disabled={savingContact}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-black text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            >
              <FaTimes />
              Cancelar
            </button>
            <button
              type="button"
              onClick={saveContactChanges}
              disabled={savingContact}
              className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FaSave />
              {savingContact ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </section>
      ) : null}

      <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <InfoValue
          icon={FaSchool}
          label="Colegio"
          value={school?.name}
        />
        <InfoValue
          icon={FaUserTie}
          label="Rol en la decisión"
          value={contact.decision_role_display || "Sin clasificar"}
        />
        <InfoValue
          icon={FaBriefcase}
          label="Relacionamiento"
          value={getRelationshipLabel(
            Number.isInteger(relationshipLevel) && relationshipLevel > 0
              ? relationshipLevel
              : "",
          )}
        />
        <InfoValue
          icon={FaStar}
          label="Actividad registrada"
          value={`${activities.length} registro${activities.length === 1 ? "" : "s"}`}
        />
      </section>

      <div className="mt-4 grid gap-4 xl:grid-cols-4">
        <aside className="space-y-4">
          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-red-700">
              Contacto
            </p>
            <h2 className="mt-1 text-xl font-black text-gray-950">
              Datos principales
            </h2>

            <div className="mt-4 space-y-3">
              <InfoValue
                icon={FaPhoneAlt}
                label="Celular / WhatsApp"
                value={contactNumber}
              />
              <InfoValue
                icon={FaPhoneAlt}
                label="Teléfono alternativo"
                value={
                  contact.phone && contact.phone !== contactNumber
                    ? contact.phone
                    : ""
                }
              />
              <InfoValue
                icon={FaEnvelope}
                label="Correo"
                value={contact.email}
              />
            </div>

            {contact.notes ? (
              <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs font-black uppercase tracking-wide text-gray-400">
                  Observaciones
                </p>
                <p className="mt-1 text-sm leading-6 text-gray-700">
                  {contact.notes}
                </p>
              </div>
            ) : null}
          </section>
        </aside>

        <main className="xl:col-span-2">
          <section className="rounded-3xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-red-700">
                    Historial comercial
                  </p>
                  <h2 className="mt-1 text-xl font-black text-gray-950">
                    Actividades
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-gray-500">
                    Registra llamadas, visitas, reuniones y seguimientos. El
                    mismo historial queda relacionado con este contacto y su
                    colegio.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={startActivityRegistration}
                  disabled={registeringActivity || !school}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FaEdit />
                  Registrar actividad
                </button>
              </div>

              {activitySuccessMessage ? (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                  {activitySuccessMessage}
                </div>
              ) : null}

              {activityWarningMessage ? (
                <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                  {activityWarningMessage}
                </div>
              ) : null}

              {registeringActivity ? (
                <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-black text-gray-950">
                        Nueva actividad comercial
                      </p>
                      <p className="mt-1 text-xs leading-5 text-gray-500">
                        El contacto y el colegio ya están vinculados
                        automáticamente.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={cancelActivityRegistration}
                      disabled={savingActivity}
                      className="inline-flex items-center gap-2 self-start rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-black text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
                    >
                      <FaTimes />
                      Cerrar
                    </button>
                  </div>

                  {activityErrorMessage ? (
                    <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-800">
                      {activityErrorMessage}
                    </div>
                  ) : null}

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <label>
                      <span className="text-xs font-black uppercase tracking-wide text-gray-500">
                        Tipo de actividad
                      </span>
                      <select
                        value={activityForm.activity_type}
                        onChange={(event) =>
                          updateActivityField(
                            "activity_type",
                            event.target.value,
                          )
                        }
                        disabled={savingActivity}
                        className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
                      >
                        {ACTIVITY_TYPES.map((activityType) => (
                          <option
                            key={activityType.value}
                            value={activityType.value}
                          >
                            {activityType.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      <span className="text-xs font-black uppercase tracking-wide text-gray-500">
                        Fecha y hora
                      </span>
                      <input
                        type="datetime-local"
                        value={activityForm.occurred_at}
                        onChange={(event) =>
                          updateActivityField(
                            "occurred_at",
                            event.target.value,
                          )
                        }
                        disabled={savingActivity}
                        className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
                      />
                    </label>

                    <label className="md:col-span-2">
                      <span className="text-xs font-black uppercase tracking-wide text-gray-500">
                        Resumen
                      </span>
                      <input
                        type="text"
                        value={activityForm.summary}
                        onChange={(event) =>
                          updateActivityField("summary", event.target.value)
                        }
                        disabled={savingActivity}
                        placeholder="Ej. Reunión con el director para revisar propuesta 2027"
                        className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
                      />
                    </label>

                    <label className="md:col-span-2">
                      <span className="text-xs font-black uppercase tracking-wide text-gray-500">
                        Resultado / detalle
                      </span>
                      <textarea
                        rows="3"
                        value={activityForm.result}
                        onChange={(event) =>
                          updateActivityField("result", event.target.value)
                        }
                        disabled={savingActivity}
                        placeholder="Registra qué se conversó, acuerdos, respuesta del colegio y datos útiles para el siguiente paso."
                        className="mt-2 w-full resize-y rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
                      />
                    </label>

                    <div className="md:col-span-2 rounded-2xl border border-gray-200 bg-white p-4">
                      <label className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={activityForm.schedule_next_action}
                          onChange={(event) =>
                            updateActivityField(
                              "schedule_next_action",
                              event.target.checked,
                            )
                          }
                          disabled={savingActivity}
                          className="mt-0.5 h-4 w-4 accent-red-700"
                        />
                        <span>
                          <span className="block text-sm font-black text-gray-950">
                            Programar próxima acción
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-gray-500">
                            La acción quedará vinculada a este contacto y a su
                            colegio, y aparecerá también en ToDo / Agenda.
                          </span>
                        </span>
                      </label>

                      {activityForm.schedule_next_action ? (
                        <div className="mt-4 grid gap-3 md:grid-cols-3">
                          <label>
                            <span className="text-xs font-black uppercase tracking-wide text-gray-500">
                              Tipo
                            </span>
                            <select
                              value={activityForm.next_action_type}
                              onChange={(event) =>
                                updateActivityField(
                                  "next_action_type",
                                  event.target.value,
                                )
                              }
                              disabled={savingActivity}
                              className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
                            >
                              <option value="task">Tarea</option>
                              <option value="event">Reunión / cita</option>
                              <option value="reminder">Recordatorio</option>
                            </select>
                          </label>

                          <label className="md:col-span-2">
                            <span className="text-xs font-black uppercase tracking-wide text-gray-500">
                              Próxima acción
                            </span>
                            <input
                              type="text"
                              value={activityForm.next_action_title}
                              onChange={(event) =>
                                updateActivityField(
                                  "next_action_title",
                                  event.target.value,
                                )
                              }
                              disabled={savingActivity}
                              placeholder="Ej. Enviar propuesta y llamar al director"
                              className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
                            />
                          </label>

                          <label className="md:col-span-3">
                            <span className="text-xs font-black uppercase tracking-wide text-gray-500">
                              Fecha y hora programada
                            </span>
                            <input
                              type="datetime-local"
                              value={activityForm.next_action_at}
                              onChange={(event) =>
                                updateActivityField(
                                  "next_action_at",
                                  event.target.value,
                                )
                              }
                              disabled={savingActivity}
                              className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-gray-100"
                            />
                          </label>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-3 border-t border-gray-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <label className="inline-flex items-center gap-2 text-sm font-bold text-gray-700">
                      <input
                        type="checkbox"
                        checked={activityForm.is_important}
                        onChange={(event) =>
                          updateActivityField(
                            "is_important",
                            event.target.checked,
                          )
                        }
                        disabled={savingActivity}
                        className="h-4 w-4 accent-red-700"
                      />
                      Marcar como importante
                    </label>

                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={cancelActivityRegistration}
                        disabled={savingActivity}
                        className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-black text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
                      >
                        <FaTimes />
                        Cancelar
                      </button>

                      <button
                        type="button"
                        onClick={saveCommercialActivity}
                        disabled={savingActivity}
                        className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <FaSave />
                        {savingActivity
                          ? "Guardando..."
                          : "Guardar actividad"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                {ACTIVITY_FILTERS.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setActivityFilter(filter.value)}
                    className={`rounded-full px-3 py-1.5 text-xs font-black transition ${
                      activityFilter === filter.value
                        ? "bg-gray-950 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5">
              {filteredActivities.length > 0 ? (
                <div className="space-y-3">
                  {filteredActivities.map((activity) => (
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

                      <div className="mt-3 border-t border-gray-200 pt-3 text-xs text-gray-500">
                        Registrado por{" "}
                        <span className="font-black text-gray-700">
                          {activity.performed_by?.full_name ||
                            activity.performed_by?.username ||
                            "Usuario CRM"}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-5 py-10 text-center">
                  <p className="font-black text-gray-950">
                    Sin actividades para mostrar
                  </p>
                  <p className="mt-1 text-sm leading-6 text-gray-500">
                    Las llamadas, visitas, reuniones y seguimientos asociados a
                    este contacto aparecerán aquí.
                  </p>
                </div>
              )}
            </div>
          </section>
        </main>

        <aside className="space-y-4">
          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-red-700">
              Relaciones
            </p>
            <h2 className="mt-1 text-xl font-black text-gray-950">
              Colegio vinculado
            </h2>

            {school ? (
              <div className="mt-4 rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-200">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-950 text-white">
                    <FaSchool />
                  </div>
                  <div className="min-w-0">
                    <p className="break-words font-black text-gray-950">
                      {school.name}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Institución relacionada
                    </p>
                  </div>
                </div>

                <Link
                  className="mt-4 flex w-full items-center justify-center rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-black text-gray-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                  to={`/admin/crm/colegios/${school.id}`}
                  state={{
                    from: `/admin/crm/contactos/${id}`,
                    fromLabel: contact.full_name,
                    fromType: "contact",
                  }}
                >
                  Abrir colegio
                </Link>
              </div>
            ) : (
              <p className="mt-4 text-sm text-gray-500">
                No hay un colegio relacionado.
              </p>
            )}

            <div className="mt-4 rounded-2xl border border-gray-200 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-gray-400">
                Negocios relacionados
              </p>
              <p className="mt-1 text-2xl font-black text-gray-950">
                {relatedOpportunityIds.length}
              </p>
              <p className="mt-1 text-xs leading-5 text-gray-500">
                Oportunidades detectadas a partir de actividades o trabajo
                relacionado con este contacto.
              </p>
            </div>
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
                state={{
                  from: `/admin/crm/contactos/${contact.id}`,
                  fromLabel: contact.full_name,
                  fromType: "contact",
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-black text-gray-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
              >
                <FaCalendarAlt />
                Abrir calendario
              </Link>
            </div>

            {workItems.length > 0 ? (
              <div className="mt-4 space-y-3">
                {workItems.slice(0, 6).map((workItem) => (
                  <article
                    key={workItem.id}
                    className="rounded-2xl bg-gray-50 p-3 ring-1 ring-gray-200"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-gray-700 ring-1 ring-gray-200">
                        <WorkItemIcon type={workItem.type} />
                      </div>

                      <div className="min-w-0">
                        <p className="break-words text-sm font-black text-gray-950">
                          {workItem.item?.title || "Acción programada"}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {WorkItemDate({ workItem })}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}

                {workItems.length > 6 ? (
                  <p className="text-center text-xs font-semibold text-gray-500">
                    + {workItems.length - 6} acción(es) adicional(es)
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center">
                <p className="text-sm font-black text-gray-900">
                  Sin próximas acciones
                </p>
                <p className="mt-1 text-xs leading-5 text-gray-500">
                  Cuando una actividad genere una tarea, reunión o recordatorio,
                  aparecerá aquí y también en ToDo/Agenda.
                </p>
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
