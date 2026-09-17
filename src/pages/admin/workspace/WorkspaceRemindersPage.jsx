import { useEffect, useMemo, useState } from "react";
import {
  FaBell,
  FaCheckCircle,
  FaChevronDown,
  FaClock,
  FaEdit,
  FaFolderOpen,
  FaPlus,
  FaRegCalendarAlt,
  FaSpinner,
  FaTimes,
  FaUserCheck,
} from "react-icons/fa";
import {
  createWorkspaceReminder,
  getWorkspaceAssignableUsers,
  getWorkspaceGroups,
  getWorkspaceReminderById,
  getWorkspaceReminders,
  updateWorkspaceReminder,
} from "../../../api/adminApi";
import { useAuth } from "../../../hooks/useAuth";
import { userHasPermission } from "../../../utils/adminAccess";
import { getResults } from "../../../utils/formatters";

const INITIAL_REMINDER_FORM = {
  title: "",
  description: "",
  remind_at: "",
  group: "",
  assigned_to: "",
  is_completed: false,
};

const SECTION_INITIAL_STATE = {
  overdue: false,
  today: false,
  upcoming: false,
  later: false,
  completed: false,
};

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  return getResults(data);
}


function getUserLabel(user) {
  return user.full_name || user.username || user.email || `Usuario ${user.id}`;
}

function getFallbackCurrentUser(user) {
  if (!user) return [];

  return [
    {
      id: user.id,
      username: user.username,
      email: user.email || "",
      full_name: user.full_name || user.username || "Usuario actual",
    },
  ];
}

async function loadVisibleUsers(user, canAssignToOthers) {
  if (!canAssignToOthers) {
    return getFallbackCurrentUser(user);
  }

  try {
    const usersData = await getWorkspaceAssignableUsers();
    const normalizedUsers = normalizeList(usersData);

    if (normalizedUsers.length > 0) return normalizedUsers;

    return getFallbackCurrentUser(user);
  } catch (requestError) {
    console.error("No se pudo cargar usuarios.", requestError);
    return getFallbackCurrentUser(user);
  }
}

async function loadVisibleGroups() {
  try {
    const groupsData = await getWorkspaceGroups();
    return normalizeList(groupsData);
  } catch (requestError) {
    console.error("No se pudo cargar grupos.", requestError);
    return [];
  }
}

function getReminderDate(reminder) {
  return reminder.remind_at || reminder.reminder_at || reminder.due_at || reminder.start_at || "";
}

function formatDateTime(value) {
  if (!value) return "Sin fecha";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Fecha no válida";

  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatShortDate(value) {
  if (!value) return "Sin fecha";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Fecha no válida";

  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDateTimeLocal(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);

  return offsetDate.toISOString().slice(0, 16);
}

function getDateTimeValue(value) {
  if (!value) return Number.MAX_SAFE_INTEGER;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return Number.MAX_SAFE_INTEGER;

  return date.getTime();
}

function reminderIsCompleted(reminder) {
  return Boolean(reminder.is_completed || reminder.completed_at || reminder.status === "completed");
}

function reminderIsOverdue(reminder) {
  if (reminderIsCompleted(reminder)) return false;

  const reminderDate = new Date(getReminderDate(reminder));

  if (Number.isNaN(reminderDate.getTime())) return false;

  return reminderDate < new Date();
}

function reminderCanEditDetails(reminder) {
  return Boolean(reminder.can_edit_details);
}

function reminderCanComplete(reminder) {
  return Boolean(reminder.can_complete);
}

function reminderIsReadOnly(reminder) {
  if (typeof reminder.is_read_only === "boolean") return reminder.is_read_only;

  return !reminderCanEditDetails(reminder) && !reminderCanComplete(reminder);
}

function buildReminderPayload(form, canAssignToOthers = false) {
  const payload = {
    title: form.title.trim(),
    description: form.description.trim(),
    remind_at: form.remind_at || null,
    group: form.group ? Number(form.group) : null,
  };

  if (canAssignToOthers && form.assigned_to) {
    payload.assigned_to = Number(form.assigned_to);
  }

  return payload;
}

function buildReminderForm(reminder) {
  return {
    title: reminder.title || "",
    description: reminder.description || reminder.message || "",
    remind_at: formatDateTimeLocal(getReminderDate(reminder)),
    group: reminder.group ? String(reminder.group) : "",
    assigned_to: reminder.assigned_to ? String(reminder.assigned_to) : "",
    is_completed: reminderIsCompleted(reminder),
  };
}

function getValidationMessage(form) {
  if (!form.title.trim()) return "Ingresa el título del recordatorio.";
  if (!form.remind_at) return "Selecciona fecha y hora del recordatorio.";

  const reminderDate = new Date(form.remind_at);

  if (Number.isNaN(reminderDate.getTime())) {
    return "La fecha del recordatorio no es válida.";
  }

  return "";
}

function getApiErrorMessage(error, fallbackMessage) {
  const responseData = error.response?.data;

  if (!responseData) return fallbackMessage;
  if (typeof responseData === "string") return responseData;
  if (Array.isArray(responseData)) return responseData.join(" ");

  if (typeof responseData === "object") {
    const messages = Object.entries(responseData)
      .map(([field, value]) => {
        const message = Array.isArray(value) ? value.join(" ") : String(value);

        if (field === "non_field_errors" || field === "detail") return message;
        if (field === "title") return `Título: ${message}`;
        if (field === "remind_at") return `Fecha y hora: ${message}`;
        if (field === "reminder_at") return `Fecha y hora: ${message}`;
        if (field === "completed_at") return `Completado: ${message}`;
        if (field === "assigned_to") return `Responsable: ${message}`;
        if (field === "group") return `Grupo: ${message}`;

        return `${field}: ${message}`;
      })
      .filter(Boolean);

    return messages.join(" ") || fallbackMessage;
  }

  return fallbackMessage;
}

function getTodayAt(hour, minute = 0) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);

  return formatDateTimeLocal(date);
}

function getTomorrowAt(hour, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(hour, minute, 0, 0);

  return formatDateTimeLocal(date);
}

function getMinutesFromNow(minutes) {
  const date = new Date();
  date.setMinutes(date.getMinutes() + minutes);
  date.setSeconds(0, 0);

  return formatDateTimeLocal(date);
}

function sortReminders(reminders) {
  return [...reminders].sort((firstReminder, secondReminder) => {
    const firstCompleted = reminderIsCompleted(firstReminder);
    const secondCompleted = reminderIsCompleted(secondReminder);

    if (firstCompleted !== secondCompleted) return firstCompleted ? 1 : -1;

    const firstOverdue = reminderIsOverdue(firstReminder);
    const secondOverdue = reminderIsOverdue(secondReminder);

    if (firstOverdue !== secondOverdue) return firstOverdue ? -1 : 1;

    return (
      getDateTimeValue(getReminderDate(firstReminder)) -
      getDateTimeValue(getReminderDate(secondReminder))
    );
  });
}

function getReminderSections(reminders) {
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const tomorrowStart = new Date(todayStart);
  const nextWeekEnd = new Date(todayStart);

  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  nextWeekEnd.setDate(nextWeekEnd.getDate() + 7);

  const overdue = [];
  const todayItems = [];
  const upcoming = [];
  const later = [];
  const completed = [];

  reminders.forEach((reminder) => {
    if (reminderIsCompleted(reminder)) {
      completed.push(reminder);
      return;
    }

    const reminderDate = new Date(getReminderDate(reminder));

    if (Number.isNaN(reminderDate.getTime())) {
      later.push(reminder);
      return;
    }

    if (reminderDate < todayStart) {
      overdue.push(reminder);
      return;
    }

    if (reminderDate >= todayStart && reminderDate < tomorrowStart) {
      todayItems.push(reminder);
      return;
    }

    if (reminderDate <= nextWeekEnd) {
      upcoming.push(reminder);
      return;
    }

    later.push(reminder);
  });

  return [
    {
      key: "overdue",
      title: "Vencidos",
      description: "Recordatorios que ya pasaron y siguen pendientes.",
      items: overdue,
      variant: "danger",
    },
    {
      key: "today",
      title: "Hoy",
      description: "Avisos programados para el día.",
      items: todayItems,
      variant: "default",
    },
    {
      key: "upcoming",
      title: "Próximos",
      description: "Recordatorios dentro de los siguientes 7 días.",
      items: upcoming,
      variant: "default",
    },
    {
      key: "later",
      title: "Más adelante",
      description: "Recordatorios con fecha posterior.",
      items: later,
      variant: "default",
    },
    {
      key: "completed",
      title: "Completados",
      description: "Recordatorios cerrados.",
      items: completed,
      variant: "success",
    },
  ];
}

export default function WorkspaceRemindersPage() {
  const { user } = useAuth();
  const canAssignToOthers = userHasPermission(
    user,
    ["workspaces.assign_work"]
  );

  const [reminders, setReminders] = useState([]);
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [reminderForm, setReminderForm] = useState(INITIAL_REMINDER_FORM);
  const [editForm, setEditForm] = useState(INITIAL_REMINDER_FORM);
  const [selectedReminder, setSelectedReminder] = useState(null);
  const [activeFilter, setActiveFilter] = useState("active");
  const [openSections, setOpenSections] = useState(SECTION_INITIAL_STATE);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingCreate, setIsSavingCreate] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [openingReminderId, setOpeningReminderId] = useState(null);
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");

  const sortedReminders = useMemo(() => sortReminders(reminders), [reminders]);

  const activeReminders = useMemo(
    () => sortedReminders.filter((reminder) => !reminderIsCompleted(reminder)),
    [sortedReminders]
  );

  const completedReminders = useMemo(
    () => sortedReminders.filter((reminder) => reminderIsCompleted(reminder)),
    [sortedReminders]
  );

  const overdueReminders = useMemo(
    () => activeReminders.filter((reminder) => reminderIsOverdue(reminder)),
    [activeReminders]
  );

  const todayReminders = useMemo(() => {
    const today = new Date();

    return activeReminders.filter((reminder) => {
      const reminderDate = new Date(getReminderDate(reminder));

      if (Number.isNaN(reminderDate.getTime())) return false;

      return (
        reminderDate.getFullYear() === today.getFullYear() &&
        reminderDate.getMonth() === today.getMonth() &&
        reminderDate.getDate() === today.getDate()
      );
    });
  }, [activeReminders]);

  const visibleReminders = useMemo(() => {
    if (activeFilter === "overdue") return overdueReminders;
    if (activeFilter === "today") return todayReminders;
    if (activeFilter === "completed") return completedReminders;
    if (activeFilter === "all") return sortedReminders;

    return activeReminders;
  }, [
    activeFilter,
    activeReminders,
    completedReminders,
    overdueReminders,
    sortedReminders,
    todayReminders,
  ]);

  const sections = useMemo(() => getReminderSections(sortedReminders), [sortedReminders]);

  const stats = {
    active: activeReminders.length,
    overdue: overdueReminders.length,
    today: todayReminders.length,
    completed: completedReminders.length,
  };

  const filterOptions = [
    { value: "active", label: "Activos", count: activeReminders.length },
    { value: "overdue", label: "Vencidos", count: overdueReminders.length },
    { value: "today", label: "Hoy", count: todayReminders.length },
    { value: "completed", label: "Completados", count: completedReminders.length },
    { value: "all", label: "Todos", count: sortedReminders.length },
  ];

  async function loadRemindersData() {
    setError("");
    setIsLoading(true);

    try {
      const [remindersData, groupsData, visibleUsers] = await Promise.all([
        getWorkspaceReminders({
          ordering: "remind_at",
          page_size: 500,
        }),
        loadVisibleGroups(),
        loadVisibleUsers(user, canAssignToOthers),
      ]);

      setReminders(normalizeList(remindersData));
      setGroups(groupsData);
      setUsers(visibleUsers);
    } catch (requestError) {
      setError("No se pudo cargar el módulo de recordatorios. Revisa el backend o la sesión.");
      console.error(requestError);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let ignore = false;

    async function loadInitialData() {
      setError("");
      setIsLoading(true);

      try {
        const [remindersData, groupsData, visibleUsers] = await Promise.all([
          getWorkspaceReminders({
            ordering: "remind_at",
            page_size: 500,
          }),
          loadVisibleGroups(),
          loadVisibleUsers(user, canAssignToOthers),
        ]);

        if (!ignore) {
          setReminders(normalizeList(remindersData));
          setGroups(groupsData);
          setUsers(visibleUsers);
        }
      } catch (requestError) {
        if (!ignore) {
          setError("No se pudo cargar el módulo de recordatorios. Revisa el backend o la sesión.");
        }

        console.error(requestError);
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadInitialData();

    return () => {
      ignore = true;
    };
  }, [canAssignToOthers, user]);

  function setReminderField(name, value) {
    setReminderForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));

    if (error) setError("");
  }

  function handleReminderChange(event) {
    const { name, value } = event.target;

    setReminderField(name, value);
  }

  function handleEditChange(event) {
    const { name, value } = event.target;

    setEditForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));

    if (detailError) setDetailError("");
  }

  function toggleSection(sectionKey) {
    setOpenSections((currentSections) => ({
      ...currentSections,
      [sectionKey]: !currentSections[sectionKey],
    }));
  }

  async function handleCreateReminder(event) {
    event.preventDefault();

    const validationMessage = getValidationMessage(reminderForm);

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setError("");
    setIsSavingCreate(true);

    try {
      await createWorkspaceReminder(buildReminderPayload(reminderForm, canAssignToOthers));
      setReminderForm(INITIAL_REMINDER_FORM);
      setShowCreateForm(false);
      await loadRemindersData();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "No se pudo crear el recordatorio."));
      console.error(requestError);
    } finally {
      setIsSavingCreate(false);
    }
  }

  async function openReminderDetail(reminder) {
    setOpeningReminderId(reminder.id);
    setSelectedReminder(null);
    setDetailError("");

    try {
      const reminderDetail = await getWorkspaceReminderById(reminder.id);

      setSelectedReminder(reminderDetail);
      setEditForm(buildReminderForm(reminderDetail));
    } catch (requestError) {
      setSelectedReminder(reminder);
      setEditForm(buildReminderForm(reminder));
      console.error(requestError);
    } finally {
      setOpeningReminderId(null);
    }
  }

  function closeReminderDetail() {
    setSelectedReminder(null);
    setEditForm(INITIAL_REMINDER_FORM);
    setDetailError("");
  }

  async function handleUpdateReminder(event) {
    event.preventDefault();

    if (!selectedReminder) return;

    if (!reminderCanEditDetails(selectedReminder)) {
      setDetailError("No tienes permiso para modificar este recordatorio.");
      return;
    }

    const validationMessage = getValidationMessage(editForm);

    if (validationMessage) {
      setDetailError(validationMessage);
      return;
    }

    setDetailError("");
    setIsSavingEdit(true);

    try {
      await updateWorkspaceReminder(
        selectedReminder.id,
        buildReminderPayload(editForm, canAssignToOthers)
      );
      closeReminderDetail();
      await loadRemindersData();
    } catch (requestError) {
      setDetailError(getApiErrorMessage(requestError, "No se pudo actualizar el recordatorio."));
      console.error(requestError);
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function updateReminderCompletion(reminder, completed) {
    const payload = completed
      ? {
          completed_at: new Date().toISOString(),
          is_completed: true,
          status: "completed",
        }
      : {
          completed_at: null,
          is_completed: false,
          status: "pending",
        };

    return updateWorkspaceReminder(reminder.id, payload);
  }

  async function handleCompleteReminder(reminder) {
    if (!reminderCanComplete(reminder)) {
      setError("No tienes permiso para completar este recordatorio.");
      return;
    }

    setError("");
    setDetailError("");
    setIsSavingEdit(true);

    try {
      await updateReminderCompletion(reminder, true);

      if (selectedReminder?.id === reminder.id) {
        closeReminderDetail();
      }

      await loadRemindersData();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "No se pudo completar el recordatorio."));
      console.error(requestError);
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleReopenReminder(reminder) {
    if (!reminderCanComplete(reminder)) {
      setError("No tienes permiso para reabrir este recordatorio.");
      return;
    }

    setError("");
    setDetailError("");
    setIsSavingEdit(true);

    try {
      await updateReminderCompletion(reminder, false);

      if (selectedReminder?.id === reminder.id) {
        closeReminderDetail();
      }

      await loadRemindersData();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "No se pudo reabrir el recordatorio."));
      console.error(requestError);
    } finally {
      setIsSavingEdit(false);
    }
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="bg-gray-950 px-4 py-4 text-white sm:px-6 sm:py-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wide text-red-300">ToDo</p>
              <h1 className="mt-1 text-2xl font-black leading-tight sm:text-3xl">
                Recordatorios
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-5 text-gray-300 sm:leading-6">
                Programa avisos internos para llamadas, seguimientos, entregas o pendientes rápidos.
              </p>
            </div>

            <div className="grid gap-2 sm:flex sm:flex-wrap">
              <button
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white px-4 py-2.5 text-sm font-black text-gray-950 transition hover:bg-gray-100 sm:py-3"
                type="button"
                onClick={loadRemindersData}
              >
                {isLoading ? <FaSpinner className="animate-spin" /> : <FaRegCalendarAlt />}
                Actualizar
              </button>

              <button
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-800 sm:py-3"
                type="button"
                onClick={() => setShowCreateForm((currentValue) => !currentValue)}
              >
                {showCreateForm ? <FaTimes /> : <FaPlus />}
                {showCreateForm ? "Cerrar" : "Nuevo recordatorio"}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-0 xl:grid-cols-4">
          <ReminderMetricCard label="Activos" value={stats.active} />
          <ReminderMetricCard label="Vencidos" value={stats.overdue} variant="danger" />
          <ReminderMetricCard label="Hoy" value={stats.today} />
          <ReminderMetricCard label="Completados" value={stats.completed} variant="success" />
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 sm:px-5 sm:py-4">
          {error}
        </div>
      ) : null}

      {showCreateForm ? (
        <ReminderForm
          canAssignToOthers={canAssignToOthers}
          form={reminderForm}
          groups={groups}
          isSaving={isSavingCreate}
          submitLabel="Crear recordatorio"
          users={users}
          onCancel={() => setShowCreateForm(false)}
          onChange={handleReminderChange}
          onSetField={setReminderField}
          onSubmit={handleCreateReminder}
        />
      ) : null}

      {isLoading ? (
        <div className="flex min-h-52 items-center justify-center rounded-3xl border border-gray-200 bg-white p-6 text-sm font-bold text-gray-500 shadow-sm sm:p-10">
          <FaSpinner className="mr-3 animate-spin" />
          Cargando recordatorios...
        </div>
      ) : (
        <section className="rounded-3xl border border-gray-200 bg-white p-3 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wide text-red-700">
                Agenda personal
              </p>
              <h2 className="mt-1 text-xl font-black text-gray-950 sm:text-2xl">
                Mis recordatorios
              </h2>
              <p className="mt-1 text-sm leading-5 text-gray-500">
                Avisos rápidos para pendientes simples. No reemplazan tareas ni eventos.
              </p>
            </div>

            {overdueReminders.length > 0 ? (
              <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
                <p className="text-xs font-black uppercase tracking-wide text-red-700">Atención</p>
                <p className="mt-1 text-sm font-black text-red-700">
                  {overdueReminders.length} recordatorio(s) vencido(s)
                </p>
              </div>
            ) : null}
          </div>

          <div className="block lg:hidden">
            <MobileReminderAccordion
              isSaving={isSavingEdit}
              openingReminderId={openingReminderId}
              openSections={openSections}
              sections={sections}
              onComplete={handleCompleteReminder}
              onDetail={openReminderDetail}
              onReopen={handleReopenReminder}
              onToggleSection={toggleSection}
            />
          </div>

          <div className="hidden lg:block">
            <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-black transition ${
                    activeFilter === option.value
                      ? "bg-red-700 text-white shadow-sm"
                      : option.value === "overdue" && option.count > 0
                        ? "bg-red-50 text-red-700 hover:bg-red-100"
                        : "bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-700"
                  }`}
                  type="button"
                  onClick={() => setActiveFilter(option.value)}
                >
                  <span>{option.label}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      activeFilter === option.value
                        ? "bg-white/20 text-white"
                        : "bg-white text-gray-600"
                    }`}
                  >
                    {option.count}
                  </span>
                </button>
              ))}
            </div>

            {visibleReminders.length === 0 ? (
              <EmptyState text="No hay recordatorios para este filtro." />
            ) : (
              <div className="grid gap-3 xl:grid-cols-2">
                {visibleReminders.map((reminder) => (
                  <ReminderCard
                    key={reminder.id}
                    isSaving={isSavingEdit}
                    openingReminderId={openingReminderId}
                    reminder={reminder}
                    onComplete={() => handleCompleteReminder(reminder)}
                    onDetail={() => openReminderDetail(reminder)}
                    onReopen={() => handleReopenReminder(reminder)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {selectedReminder ? (
        <ReminderDrawer
          canAssignToOthers={canAssignToOthers}
          detailError={detailError}
          form={editForm}
          groups={groups}
          isSaving={isSavingEdit}
          reminder={selectedReminder}
          users={users}
          onChange={handleEditChange}
          onClose={closeReminderDetail}
          onComplete={() => handleCompleteReminder(selectedReminder)}
          onReopen={() => handleReopenReminder(selectedReminder)}
          onSubmit={handleUpdateReminder}
        />
      ) : null}
    </div>
  );
}

function ReminderForm({
  canAssignToOthers,
  form,
  groups,
  isSaving,
  submitLabel,
  users,
  onCancel,
  onChange,
  onSetField,
  onSubmit,
}) {
  const [showMore, setShowMore] = useState(false);

  return (
    <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
      <form onSubmit={onSubmit}>
        <div className="border-b border-gray-100 bg-gray-950 px-4 py-4 text-white sm:px-5">
          <p className="text-xs font-black uppercase tracking-wide text-red-300">
            Nuevo recordatorio
          </p>
          <h2 className="mt-1 text-xl font-black">Crear aviso rápido</h2>
          <p className="mt-1 text-sm leading-5 text-gray-300">
            Registra un pendiente simple para no olvidarlo. No es una tarea ni un evento.
          </p>
        </div>

        <div className="grid gap-0 xl:grid-cols-12">
          <div className="space-y-4 p-4 sm:p-5 xl:col-span-7 xl:border-r xl:border-gray-100">
            <div>
              <label
                className="mb-1.5 block text-xs font-black uppercase tracking-wide text-gray-500"
                htmlFor="reminder_title"
              >
                ¿Qué quieres recordar?
              </label>

              <input
                className="input-admin"
                id="reminder_title"
                name="title"
                placeholder="Ejemplo: Llamar al colegio para confirmar entrega"
                type="text"
                value={form.title}
                onChange={onChange}
              />
            </div>

            <DateTimeField
              helper="Día y hora en que debe aparecer el aviso."
              id="reminder_remind_at"
              label="Fecha y hora"
              name="remind_at"
              value={form.remind_at}
              onChange={onChange}
            />

            <div className="rounded-2xl border border-yellow-100 bg-yellow-50 p-3">
              <p className="mb-2 text-xs font-black uppercase tracking-wide text-yellow-800">
                Recordatorio rápido
              </p>

              <div className="flex flex-wrap gap-2">
                <QuickDateButton
                  label="En 1 hora"
                  onClick={() => onSetField("remind_at", getMinutesFromNow(60))}
                />

                <QuickDateButton
                  label="Hoy 6 p. m."
                  onClick={() => onSetField("remind_at", getTodayAt(18))}
                />

                <QuickDateButton
                  label="Mañana 9 a. m."
                  onClick={() => onSetField("remind_at", getTomorrowAt(9))}
                />

                <QuickDateButton label="Limpiar" onClick={() => onSetField("remind_at", "")} />
              </div>
            </div>

            <button
              className="flex w-full items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left text-sm font-black text-gray-800 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 xl:hidden"
              type="button"
              onClick={() => setShowMore((currentValue) => !currentValue)}
            >
              <span>Más detalles opcionales</span>
              <FaChevronDown
                className={`text-xs transition ${showMore ? "rotate-180" : "rotate-0"}`}
              />
            </button>
          </div>

          <div
            className={`space-y-4 bg-gray-50 p-4 sm:p-5 xl:col-span-5 xl:block ${
              showMore ? "block" : "hidden"
            }`}
          >
            <div className="rounded-2xl border border-gray-100 bg-white p-4">
              <p className="text-xs font-black uppercase tracking-wide text-gray-500">Opcional</p>
              <h3 className="mt-1 text-base font-black text-gray-950">Contexto opcional</h3>
              <p className="mt-1 text-sm leading-5 text-gray-500">
                Usa esta sección solo si el aviso pertenece a un grupo interno.
                {canAssignToOthers
                  ? " Como administrador también puedes enviarlo a otro responsable."
                  : " Este recordatorio quedará asignado a ti."}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <SelectField
                id="reminder_group"
                label="Grupo"
                name="group"
                options={groups.map((group) => ({
                  value: String(group.id),
                  label: group.name,
                }))}
                placeholder="Sin grupo"
                value={form.group}
                onChange={onChange}
              />

              {canAssignToOthers ? (
                <SelectField
                  id="reminder_assigned_to"
                  label="Responsable"
                  name="assigned_to"
                  options={users.map((userItem) => ({
                    value: String(userItem.id),
                    label: getUserLabel(userItem),
                  }))}
                  placeholder="Para mí"
                  value={form.assigned_to}
                  onChange={onChange}
                />
              ) : (
                <div className="rounded-2xl border border-gray-100 bg-white p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                    Responsable
                  </p>
                  <p className="mt-1 text-sm font-black text-gray-950">Para mí</p>
                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    Los recordatorios que crees quedarán en tu propia agenda.
                  </p>
                </div>
              )}
            </div>

            <div>
              <label
                className="mb-1.5 block text-xs font-black uppercase tracking-wide text-gray-500"
                htmlFor="reminder_description"
              >
                Nota breve
              </label>

              <textarea
                className="input-admin min-h-24 resize-none"
                id="reminder_description"
                name="description"
                placeholder="Agrega una indicación corta si hace falta."
                value={form.description}
                onChange={onChange}
              />
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 bg-white px-4 py-4 sm:px-5">
          <div className="grid gap-2 sm:flex sm:justify-end">
            <button
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-black text-gray-700 transition hover:bg-gray-50"
              type="button"
              onClick={onCancel}
            >
              Cancelar
            </button>

            <button
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-5 py-3 text-sm font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? <FaSpinner className="animate-spin" /> : <FaPlus />}
              {isSaving ? "Guardando..." : submitLabel}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}

function MobileReminderAccordion({
  isSaving,
  openingReminderId,
  openSections,
  sections,
  onComplete,
  onDetail,
  onReopen,
  onToggleSection,
}) {
  return (
    <div className="space-y-3">
      {sections.map((section) => {
        const isOpen = Boolean(openSections[section.key]);

        return (
          <section
            key={section.key}
            className={`overflow-hidden rounded-3xl border bg-white shadow-sm transition ${
              isOpen ? "border-red-100" : "border-gray-200"
            }`}
          >
            <button
              className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
              type="button"
              onClick={() => onToggleSection(section.key)}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-gray-950">{section.title}</h3>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-black ${
                      section.variant === "danger"
                        ? "bg-red-50 text-red-700"
                        : section.variant === "success"
                          ? "bg-green-50 text-green-700"
                          : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {section.items.length}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-gray-500">{section.description}</p>
              </div>

              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition ${
                  isOpen ? "bg-red-50 text-red-700" : "bg-gray-50 text-gray-500"
                }`}
              >
                <FaChevronDown
                  className={`text-xs transition ${isOpen ? "rotate-180" : "rotate-0"}`}
                />
              </span>
            </button>

            {isOpen ? (
              <div className="border-t border-gray-100 bg-gray-50 p-3">
                {section.items.length === 0 ? (
                  <EmptyState text="No hay recordatorios en esta sección." />
                ) : (
                  <div className="space-y-2">
                    {section.items.map((reminder) => (
                      <ReminderCard
                        key={reminder.id}
                        compact
                        isSaving={isSaving}
                        openingReminderId={openingReminderId}
                        reminder={reminder}
                        onComplete={() => onComplete(reminder)}
                        onDetail={() => onDetail(reminder)}
                        onReopen={() => onReopen(reminder)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

function ReminderCard({
  compact = false,
  isSaving,
  openingReminderId,
  reminder,
  onComplete,
  onDetail,
  onReopen,
}) {
  const isCompleted = reminderIsCompleted(reminder);
  const isOverdue = reminderIsOverdue(reminder);
  const isOpening = openingReminderId === reminder.id;
  const canComplete = reminderCanComplete(reminder);
  const readOnly = reminderIsReadOnly(reminder);

  return (
    <article
      className={`rounded-3xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        isOverdue ? "border-red-100" : isCompleted ? "border-green-100" : "border-gray-100"
      } ${compact ? "p-3" : "p-4"}`}
    >
      <div className="flex items-start gap-3">
        <button
          aria-label={isCompleted ? "Reabrir recordatorio" : "Completar recordatorio"}
          className={`mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs transition ${
            isCompleted
              ? "border-green-200 bg-green-50 text-green-700"
              : canComplete
                ? "border-gray-300 bg-white text-transparent hover:border-green-300 hover:bg-green-50 hover:text-green-700"
                : "border-gray-200 bg-gray-50 text-gray-300"
          }`}
          disabled={isSaving || !canComplete}
          title={canComplete ? "" : "Solo lectura"}
          type="button"
          onClick={isCompleted ? onReopen : onComplete}
        >
          <FaCheckCircle />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`rounded-full border px-2 py-0.5 text-xs font-black ${
                isCompleted
                  ? "border-green-100 bg-green-50 text-green-700"
                  : isOverdue
                    ? "border-red-100 bg-red-50 text-red-700"
                    : "border-yellow-100 bg-yellow-50 text-yellow-800"
              }`}
            >
              {isCompleted ? "Completado" : isOverdue ? "Vencido" : "Activo"}
            </span>

            <span className="rounded-full border border-gray-100 bg-gray-50 px-2 py-0.5 text-xs font-black text-gray-600">
              Recordatorio
            </span>

            {readOnly ? (
              <span className="rounded-full border border-gray-100 bg-gray-50 px-2 py-0.5 text-xs font-black text-gray-500">
                Solo lectura
              </span>
            ) : null}
          </div>

          <h3
            className={`mt-2 line-clamp-2 text-sm font-black ${
              isCompleted ? "text-gray-400 line-through" : "text-gray-950"
            }`}
          >
            {reminder.title}
          </h3>

          {reminder.description && !compact ? (
            <p className="mt-1 line-clamp-2 text-sm leading-5 text-gray-600">
              {reminder.description}
            </p>
          ) : null}

          <div className="mt-3 grid gap-1.5 text-xs font-bold text-gray-500">
            <span className="inline-flex items-center gap-2 text-yellow-700">
              <FaClock />
              {formatShortDate(getReminderDate(reminder))}
            </span>

            <span className="inline-flex items-center gap-2">
              <FaFolderOpen />
              {reminder.group_name || "Sin grupo"}
            </span>

            <span className="inline-flex items-center gap-2">
              <FaUserCheck />
              {reminder.assigned_to_name || reminder.user_name || "Sin asignar"}
            </span>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-black text-gray-700 transition hover:border-red-200 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isOpening}
              type="button"
              onClick={onDetail}
            >
              {isOpening ? "Abriendo..." : "Ver detalle"}
            </button>

            {canComplete ? (
              isCompleted ? (
                <button
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-black text-gray-700 transition hover:border-red-200 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSaving}
                  type="button"
                  onClick={onReopen}
                >
                  Reabrir
                </button>
              ) : (
                <button
                  className="rounded-xl bg-green-600 px-4 py-2.5 text-xs font-black text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSaving}
                  type="button"
                  onClick={onComplete}
                >
                  Completar
                </button>
              )
            ) : (
              <span className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-2.5 text-center text-xs font-black text-gray-400">
                Solo lectura
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function ReminderDrawer({
  canAssignToOthers,
  detailError,
  form,
  groups,
  isSaving,
  reminder,
  users,
  onChange,
  onClose,
  onComplete,
  onReopen,
  onSubmit,
}) {
  const isCompleted = reminderIsCompleted(reminder);
  const isOverdue = reminderIsOverdue(reminder);
  const canEditDetails = reminderCanEditDetails(reminder);
  const canComplete = reminderCanComplete(reminder);
  const readOnly = reminderIsReadOnly(reminder);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/50"
      role="presentation"
      onClick={onClose}
    >
      <aside
        aria-modal="true"
        className="flex h-screen w-full flex-col overflow-hidden bg-white shadow-2xl sm:max-w-xl"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="border-b border-gray-200 bg-gray-950 px-4 py-4 text-white sm:px-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-red-300">
                Recordatorio
              </p>
              <h2 className="mt-1 line-clamp-2 text-xl font-black sm:text-2xl">
                {reminder.title}
              </h2>
              <p className="mt-1 text-sm leading-5 text-gray-300">
                {canEditDetails
                  ? "Edita la fecha del aviso o marca el recordatorio como completado."
                  : "Consulta el aviso y complétalo si está asignado a ti."}
              </p>
            </div>

            <button
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20"
              type="button"
              onClick={onClose}
            >
              <FaTimes />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-5">
          {detailError ? (
            <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {detailError}
            </div>
          ) : null}

          {readOnly ? (
            <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">
              Puedes ver este recordatorio porque pertenece a un grupo donde participas, pero no
              está asignado a ti.
            </div>
          ) : null}

          {!canEditDetails && canComplete ? (
            <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">
              Recordatorio asignado. Puedes marcarlo como completado, pero no modificar sus datos.
            </div>
          ) : null}

          <section className="mb-4 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap gap-2">
              <span
                className={`rounded-full border px-2.5 py-1 text-xs font-black ${
                  isCompleted
                    ? "border-green-100 bg-green-50 text-green-700"
                    : isOverdue
                      ? "border-red-100 bg-red-50 text-red-700"
                      : "border-yellow-100 bg-yellow-50 text-yellow-800"
                }`}
              >
                {isCompleted ? "Completado" : isOverdue ? "Vencido" : "Activo"}
              </span>

              <span className="rounded-full border border-gray-100 bg-gray-50 px-2.5 py-1 text-xs font-black text-gray-600">
                {formatDateTime(getReminderDate(reminder))}
              </span>

              {readOnly ? (
                <span className="rounded-full border border-gray-100 bg-gray-50 px-2.5 py-1 text-xs font-black text-gray-500">
                  Solo lectura
                </span>
              ) : null}
            </div>

            <div className="mt-3 grid gap-2 text-xs font-bold text-gray-500">
              <span className="inline-flex items-center gap-2">
                <FaFolderOpen />
                {reminder.group_name || "Sin grupo"}
              </span>

              <span className="inline-flex items-center gap-2">
                <FaUserCheck />
                {reminder.assigned_to_name || reminder.user_name || "Sin asignar"}
              </span>
            </div>

            <p className="mt-3 text-sm leading-6 text-gray-700">
              {reminder.description || reminder.message || "Sin descripción registrada."}
            </p>
          </section>

          {canEditDetails ? (
            <form
              className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm"
              onSubmit={onSubmit}
            >
              <div className="mb-4">
                <p className="text-xs font-black uppercase tracking-wide text-red-700">Editar</p>
                <h3 className="mt-1 text-xl font-black text-gray-950">Datos del recordatorio</h3>
              </div>

              <div className="space-y-3">
                <div>
                  <label
                    className="mb-1.5 block text-xs font-black uppercase tracking-wide text-gray-500"
                    htmlFor="edit_reminder_title"
                  >
                    Título
                  </label>

                  <input
                    className="input-admin"
                    id="edit_reminder_title"
                    name="title"
                    type="text"
                    value={form.title}
                    onChange={onChange}
                  />
                </div>

                <DateTimeField
                  helper="Día y hora del aviso."
                  id="edit_reminder_remind_at"
                  label="Fecha y hora"
                  name="remind_at"
                  value={form.remind_at}
                  onChange={onChange}
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <SelectField
                    id="edit_reminder_group"
                    label="Grupo"
                    name="group"
                    options={groups.map((group) => ({
                      value: String(group.id),
                      label: group.name,
                    }))}
                    placeholder="Sin grupo"
                    value={form.group}
                    onChange={onChange}
                  />

                  {canAssignToOthers ? (
                    <SelectField
                      id="edit_reminder_assigned_to"
                      label="Responsable"
                      name="assigned_to"
                      options={users.map((userItem) => ({
                        value: String(userItem.id),
                        label: getUserLabel(userItem),
                      }))}
                      placeholder="Para mí"
                      value={form.assigned_to}
                      onChange={onChange}
                    />
                  ) : (
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                      <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                        Responsable
                      </p>
                      <p className="mt-1 text-sm font-black text-gray-950">
                        {reminder.user_name || reminder.assigned_to_name || "Para mí"}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-gray-500">
                        Este campo no se cambia desde tu perfil.
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label
                    className="mb-1.5 block text-xs font-black uppercase tracking-wide text-gray-500"
                    htmlFor="edit_reminder_description"
                  >
                    Nota breve
                  </label>

                  <textarea
                    className="input-admin min-h-24 resize-none"
                    id="edit_reminder_description"
                    name="description"
                    value={form.description}
                    onChange={onChange}
                  />
                </div>

                <div className="flex flex-col gap-2 border-t border-gray-100 pt-4">
                  <ReminderCompletionButton
                    canComplete={canComplete}
                    isCompleted={isCompleted}
                    isSaving={isSaving}
                    onComplete={onComplete}
                    onReopen={onReopen}
                  />

                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                      className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-black text-gray-700 transition hover:bg-gray-50"
                      type="button"
                      onClick={onClose}
                    >
                      Cancelar
                    </button>

                    <button
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-3 text-sm font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isSaving}
                      type="submit"
                    >
                      {isSaving ? <FaSpinner className="animate-spin" /> : <FaEdit />}
                      {isSaving ? "Guardando..." : "Guardar cambios"}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            <section className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-4">
                <p className="text-xs font-black uppercase tracking-wide text-red-700">Detalle</p>
                <h3 className="mt-1 text-xl font-black text-gray-950">Vista del recordatorio</h3>
                <p className="mt-1 text-sm leading-5 text-gray-500">
                  La planificación de este aviso no se puede modificar desde este usuario.
                </p>
              </div>

              <ReminderCompletionButton
                canComplete={canComplete}
                isCompleted={isCompleted}
                isSaving={isSaving}
                onComplete={onComplete}
                onReopen={onReopen}
              />
            </section>
          )}
        </div>
      </aside>
    </div>
  );
}

function ReminderCompletionButton({ canComplete, isCompleted, isSaving, onComplete, onReopen }) {
  if (!canComplete) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-500">
        Solo lectura. No puedes completar este recordatorio.
      </div>
    );
  }

  if (isCompleted) {
    return (
      <button
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-black text-gray-700 transition hover:border-red-200 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSaving}
        type="button"
        onClick={onReopen}
      >
        Reabrir recordatorio
      </button>
    );
  }

  return (
    <button
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-black text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={isSaving}
      type="button"
      onClick={onComplete}
    >
      <FaCheckCircle />
      Marcar como completado
    </button>
  );
}

function ReminderMetricCard({ label, value, variant = "default" }) {
  const iconClass =
    variant === "danger"
      ? "bg-red-50 text-red-700"
      : variant === "success"
        ? "bg-green-50 text-green-700"
        : "bg-yellow-50 text-yellow-800";

  return (
    <div className="border-b border-gray-100 p-3 sm:p-4 xl:border-b-0 xl:border-r">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black text-gray-700 sm:text-sm">{label}</p>
          <p className="mt-1 text-2xl font-black text-gray-950 sm:text-3xl">{value}</p>
        </div>

        <div className={`flex h-9 w-9 items-center justify-center rounded-2xl ${iconClass}`}>
          <FaBell />
        </div>
      </div>
    </div>
  );
}

function SelectField({ id, label, name, options, placeholder, value, onChange }) {
  return (
    <div>
      <label
        className="mb-1.5 block text-xs font-black uppercase tracking-wide text-gray-500"
        htmlFor={id}
      >
        {label}
      </label>

      <select className="input-admin" id={id} name={name} value={value} onChange={onChange}>
        {placeholder ? <option value="">{placeholder}</option> : null}

        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function DateTimeField({ helper, id, label, name, value, onChange }) {
  return (
    <div>
      <label
        className="mb-1.5 block text-xs font-black uppercase tracking-wide text-gray-500"
        htmlFor={id}
      >
        {label}
      </label>

      <input
        className="input-admin"
        id={id}
        name={name}
        type="datetime-local"
        value={value}
        onChange={onChange}
      />

      {helper ? <p className="mt-1 text-xs font-semibold text-gray-500">{helper}</p> : null}
    </div>
  );
}

function QuickDateButton({ label, onClick }) {
  return (
    <button
      className="rounded-full border border-yellow-200 bg-white px-3 py-1.5 text-xs font-black text-yellow-800 transition hover:border-yellow-300 hover:bg-yellow-100"
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm font-semibold text-gray-500 sm:p-5">
      {text}
    </div>
  );
}