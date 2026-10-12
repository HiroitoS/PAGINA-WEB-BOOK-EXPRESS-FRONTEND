import {
  FaPlus,
  FaRegCalendarAlt,
  FaSpinner,
  FaTimes,
} from "react-icons/fa";
import {
  createWorkspaceReminder,
  getWorkspaceAssignableUsers,
  getWorkspaceGroups,
  getWorkspaceReminderById,
  getAllWorkspaceReminders,
  updateWorkspaceReminder,
} from "../../../api/adminApi";
import { useAuth } from "../../../hooks/useAuth";
import { userHasPermission } from "../../../utils/adminAccess";
import { getResults } from "../../../utils/formatters";
import {
  getReminderDate,
  formatDateTimeLocal,
  reminderIsCompleted,
  reminderIsOverdue,
  reminderCanEditDetails,
  reminderCanComplete,
  sortReminders,
  getReminderSections,
} from "../../../components/admin/workspace/reminders/reminderUtils";
import ReminderForm from "../../../components/admin/workspace/reminders/ReminderForm";
import ReminderDrawer from "../../../components/admin/workspace/reminders/ReminderDrawer";
import { MobileReminderAccordion, ReminderCard, ReminderMetricCard, EmptyState } from "../../../components/admin/workspace/reminders/ReminderList";

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


function buildReminderPayload(form, canAssignToOthers = false, isTaskReminder = false) {
  // La tarea es propietaria del título, grupo y responsable del aviso principal.
  if (isTaskReminder) {
    return { remind_at: form.remind_at || null };
  }

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
        getAllWorkspaceReminders({ ordering: "remind_at" }),
        loadVisibleGroups(),
        loadVisibleUsers(user, canAssignToOthers),
      ]);

      setReminders(normalizeList(remindersData));
      setGroups(groupsData);
      setUsers(visibleUsers);
    } catch (requestError) {
      setError("No se pudieron cargar los recordatorios. Verifica tu conexión e inténtalo nuevamente.");
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
          getAllWorkspaceReminders({ ordering: "remind_at" }),
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
          setError("No se pudieron cargar los recordatorios. Verifica tu conexión e inténtalo nuevamente.");
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
        buildReminderPayload(
          editForm,
          canAssignToOthers,
          selectedReminder.source === "task",
        )
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
        <section className="rounded-3xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
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
              <div className="grid gap-2">
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


