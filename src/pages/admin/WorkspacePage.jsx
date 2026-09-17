import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/react/daygrid";
import timeGridPlugin from "@fullcalendar/react/timegrid";
import interactionPlugin from "@fullcalendar/react/interaction";
import classicThemePlugin from "@fullcalendar/react/themes/classic";
import "@fullcalendar/react/skeleton.css";
import "@fullcalendar/react/themes/classic/theme.css";
import "@fullcalendar/react/themes/classic/palette.css";
import {
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaFolderOpen,
  FaPlus,
  FaRegBell,
  FaRegCalendarCheck,
  FaSpinner,
  FaSyncAlt,
  FaTasks,
  FaUserCheck,
  FaUsers,
} from "react-icons/fa";
import { useNavigate } from "react-router";
import {
  addWorkspaceTaskComment,
  changeWorkspaceTaskStatus,
  createWorkspaceEvent,
  createWorkspaceGroup,
  createWorkspaceTask,
  getAdminUsers,
  getWorkspaceCalendar,
  getWorkspaceGroups,
  getWorkspaceReminders,
  getWorkspaceSummary,
  getWorkspaceTaskById,
  getWorkspaceTasks,
} from "../../api/adminApi";
import { getResults } from "../../utils/formatters";

const INITIAL_TASK_FORM = {
  title: "",
  description: "",
  task_type: "general",
  priority: "medium",
  group: "",
  assigned_to: "",
  due_at: "",
  reminder_at: "",
  is_important: false,
};

const INITIAL_EVENT_FORM = {
  title: "",
  description: "",
  event_type: "meeting",
  group: "",
  assigned_to: "",
  start_at: "",
  end_at: "",
  location: "",
};

const INITIAL_GROUP_FORM = {
  name: "",
  description: "",
  color: "#dc2626",
  is_active: true,
};

const PAGE_COPY = {
  summary: {
    title: "Gestión interna de trabajo",
    description:
      "Resumen operativo de tareas, reuniones, recordatorios y grupos de trabajo de Book Express.",
  },
  tasks: {
    title: "Tareas",
    description:
      "Organiza pendientes, responsables, fechas límite, recordatorios y avances del trabajo diario.",
  },
  calendar: {
    title: "Calendario",
    description:
      "Visualiza eventos, reuniones, tareas con fecha y recordatorios internos en una agenda centralizada.",
  },
  groups: {
    title: "Grupos de trabajo",
    description:
      "Organiza actividades por campaña, área o proyecto sin obligar a que todas las tareas pertenezcan a un grupo.",
  },
};

const STATUS_OPTIONS = [
  { value: "pending", label: "Pendiente" },
  { value: "in_progress", label: "En proceso" },
  { value: "waiting", label: "En espera" },
  { value: "completed", label: "Completada" },
  { value: "cancelled", label: "Cancelada" },
];

const TASK_TYPE_OPTIONS = [
  { value: "general", label: "General" },
  { value: "customer_request", label: "Solicitud de cliente" },
  { value: "catalog", label: "Catálogo" },
  { value: "price", label: "Precio" },
  { value: "publisher", label: "Editorial / Proveedor" },
  { value: "reading_plan", label: "Plan lector" },
  { value: "school", label: "Colegio" },
  { value: "delivery", label: "Entrega" },
  { value: "meeting", label: "Reunión" },
  { value: "call", label: "Llamada" },
  { value: "school_campaign", label: "Campaña escolar" },
  { value: "administration", label: "Administración" },
  { value: "warehouse", label: "Almacén" },
  { value: "other", label: "Otro" },
];

const EVENT_TYPE_OPTIONS = [
  { value: "meeting", label: "Reunión" },
  { value: "call", label: "Llamada" },
  { value: "delivery", label: "Entrega" },
  { value: "training", label: "Capacitación" },
  { value: "visit", label: "Visita" },
  { value: "other", label: "Otro" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Baja" },
  { value: "medium", label: "Media" },
  { value: "high", label: "Alta" },
  { value: "urgent", label: "Urgente" },
];

const STATUS_ORDER = {
  pending: 1,
  in_progress: 2,
  waiting: 3,
  completed: 4,
  cancelled: 5,
};

const PRIORITY_ORDER = {
  urgent: 1,
  high: 2,
  medium: 3,
  low: 4,
};

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  return getResults(data);
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

function getDateTimeValue(value) {
  if (!value) return Number.MAX_SAFE_INTEGER;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return Number.MAX_SAFE_INTEGER;

  return date.getTime();
}

function getStatusLabel(status) {
  return STATUS_OPTIONS.find((option) => option.value === status)?.label || status || "Sin estado";
}

function getPriorityLabel(priority) {
  return PRIORITY_OPTIONS.find((option) => option.value === priority)?.label || priority || "Sin prioridad";
}

function getTaskTypeLabel(type) {
  return TASK_TYPE_OPTIONS.find((option) => option.value === type)?.label || type || "General";
}

function getStatusBadgeClass(status) {
  if (status === "completed") return "border-green-200 bg-green-50 text-green-700";
  if (status === "in_progress") return "border-blue-200 bg-blue-50 text-blue-700";
  if (status === "waiting") return "border-yellow-200 bg-yellow-50 text-yellow-700";
  if (status === "cancelled") return "border-gray-200 bg-gray-100 text-gray-600";

  return "border-red-100 bg-red-50 text-red-700";
}

function getPriorityBadgeClass(priority) {
  if (priority === "urgent") return "border-red-200 bg-red-50 text-red-700";
  if (priority === "high") return "border-orange-200 bg-orange-50 text-orange-700";
  if (priority === "low") return "border-gray-200 bg-gray-50 text-gray-600";

  return "border-blue-200 bg-blue-50 text-blue-700";
}

function getCalendarItemDate(item) {
  return item.start || item.due_at || item.remind_at || item.end || "";
}

function getUserLabel(user) {
  return user.full_name || user.username || user.email || `Usuario ${user.id}`;
}

function buildTaskPayload(form) {
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    task_type: form.task_type,
    priority: form.priority,
    group: form.group ? Number(form.group) : null,
    assigned_to: form.assigned_to ? Number(form.assigned_to) : null,
    due_at: form.due_at || null,
    reminder_at: form.reminder_at || null,
    is_important: form.is_important,
  };
}

function buildEventPayload(form) {
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    event_type: form.event_type,
    group: form.group ? Number(form.group) : null,
    assigned_to: form.assigned_to ? Number(form.assigned_to) : null,
    start_at: form.start_at || null,
    end_at: form.end_at || null,
    location: form.location.trim(),
  };
}

function buildGroupPayload(form) {
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    color: form.color || "#dc2626",
    is_active: true,
  };
}

function getTaskValidationMessage(form) {
  if (!form.title.trim()) return "Ingresa el título de la tarea.";

  if (form.due_at && form.reminder_at) {
    const dueDate = new Date(form.due_at);
    const reminderDate = new Date(form.reminder_at);

    if (Number.isNaN(dueDate.getTime()) || Number.isNaN(reminderDate.getTime())) {
      return "Revisa la fecha límite y el recordatorio. Una de las fechas no es válida.";
    }

    if (reminderDate > dueDate) {
      return "El recordatorio no puede ser después de la fecha límite.";
    }
  }

  return "";
}

function getEventValidationMessage(form) {
  if (!form.title.trim()) return "Ingresa el título del evento.";
  if (!form.start_at) return "Selecciona la fecha y hora de inicio del evento.";
  if (!form.end_at) return "Selecciona la fecha y hora de fin del evento.";

  const startDate = new Date(form.start_at);
  const endDate = new Date(form.end_at);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return "Revisa las fechas del evento. Una de las fechas no es válida.";
  }

  if (endDate < startDate) {
    return "La fecha de fin no puede ser anterior a la fecha de inicio.";
  }

  return "";
}

function getGroupValidationMessage(form) {
  if (!form.name.trim()) return "Ingresa el nombre del grupo de trabajo.";

  if (form.name.trim().length < 3) {
    return "El nombre del grupo debe tener al menos 3 caracteres.";
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
        if (field === "task_type") return `Tipo de tarea: ${message}`;
        if (field === "event_type") return `Tipo de evento: ${message}`;
        if (field === "reminder_at") return `Recordatorio: ${message}`;
        if (field === "due_at") return `Fecha límite: ${message}`;
        if (field === "start_at") return `Inicio: ${message}`;
        if (field === "end_at") return `Fin: ${message}`;
        if (field === "name") return `Nombre: ${message}`;

        return `${field}: ${message}`;
      })
      .filter(Boolean);

    return messages.join(" ") || fallbackMessage;
  }

  return fallbackMessage;
}

function sortTasks(tasks) {
  return [...tasks].sort((firstTask, secondTask) => {
    const firstClosed = firstTask.status === "completed" || firstTask.status === "cancelled";
    const secondClosed = secondTask.status === "completed" || secondTask.status === "cancelled";

    if (firstClosed !== secondClosed) return firstClosed ? 1 : -1;

    const firstOverdue = Boolean(firstTask.is_overdue);
    const secondOverdue = Boolean(secondTask.is_overdue);

    if (firstOverdue !== secondOverdue) return firstOverdue ? -1 : 1;

    const firstPriority = PRIORITY_ORDER[firstTask.priority] || 99;
    const secondPriority = PRIORITY_ORDER[secondTask.priority] || 99;

    if (firstPriority !== secondPriority) return firstPriority - secondPriority;

    const firstStatus = STATUS_ORDER[firstTask.status] || 99;
    const secondStatus = STATUS_ORDER[secondTask.status] || 99;

    if (firstStatus !== secondStatus) return firstStatus - secondStatus;

    return getDateTimeValue(firstTask.due_at) - getDateTimeValue(secondTask.due_at);
  });
}

function getReminderTaskId(reminder) {
  if (reminder.task) return Number(reminder.task);
  if (reminder.task_id) return Number(reminder.task_id);

  return null;
}

function buildDisplayReminders(reminders, tasks) {
  const reminderTaskIds = new Set(
    reminders
      .map((reminder) => getReminderTaskId(reminder))
      .filter((taskId) => taskId !== null)
  );

  const remindersFromTasks = tasks
    .filter((task) => task.reminder_at && task.status !== "completed" && task.status !== "cancelled")
    .filter((task) => !reminderTaskIds.has(Number(task.id)))
    .map((task) => ({
      id: `task-${task.id}`,
      title: `Recordatorio: ${task.title}`,
      remind_at: task.reminder_at,
      task_title: task.title,
    }));

  return [...reminders, ...remindersFromTasks].sort(
    (firstReminder, secondReminder) =>
      getDateTimeValue(firstReminder.remind_at) - getDateTimeValue(secondReminder.remind_at)
  );
}

function buildCalendarItems(calendarItems, tasks) {
  const taskReminderItems = tasks
    .filter((task) => task.reminder_at && task.status !== "completed" && task.status !== "cancelled")
    .map((task) => ({
      id: `task-reminder-${task.id}`,
      type: "task_reminder",
      title: `Recordatorio: ${task.title}`,
      start: task.reminder_at,
      remind_at: task.reminder_at,
      group_name: task.group_name,
    }));

  return [...calendarItems, ...taskReminderItems].sort(
    (firstItem, secondItem) =>
      getDateTimeValue(getCalendarItemDate(firstItem)) -
      getDateTimeValue(getCalendarItemDate(secondItem))
  );
}

function buildFullCalendarEvents(calendarItems) {
  return calendarItems.map((item) => {
    const isTask = item.type === "task";
    const isReminder = item.type === "reminder" || item.type === "task_reminder";
    const isEvent = item.type === "event";

    return {
      id: `${item.type}-${item.id}`,
      title: item.title,
      start: getCalendarItemDate(item),
      end: item.end || undefined,
      classNames: [
        isTask ? "todo-calendar-task" : "",
        isReminder ? "todo-calendar-reminder" : "",
        isEvent ? "todo-calendar-event" : "",
      ].filter(Boolean),
      extendedProps: {
        type: item.type,
        groupName: item.group_name || "",
      },
    };
  });
}

function getActiveTasks(tasks) {
  return tasks.filter((task) => task.status !== "completed" && task.status !== "cancelled");
}

function getCompletedTasks(tasks) {
  return tasks.filter((task) => task.status === "completed" || task.status === "cancelled");
}

function getOverdueTasks(tasks) {
  return tasks.filter(
    (task) => task.is_overdue && task.status !== "completed" && task.status !== "cancelled"
  );
}

export default function WorkspacePage({ initialView = "summary" }) {
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [calendarItems, setCalendarItems] = useState([]);
  const [groups, setGroups] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [users, setUsers] = useState([]);

  const [activeForm, setActiveForm] = useState(null);
  const [taskForm, setTaskForm] = useState(INITIAL_TASK_FORM);
  const [eventForm, setEventForm] = useState(INITIAL_EVENT_FORM);
  const [groupForm, setGroupForm] = useState(INITIAL_GROUP_FORM);

  const [selectedTask, setSelectedTask] = useState(null);
  const [openingTaskId, setOpeningTaskId] = useState(null);

  const [statusForm, setStatusForm] = useState({
    status: "in_progress",
    note: "",
  });

  const [commentForm, setCommentForm] = useState({
    action_type: "comment",
    comment: "",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const [isSavingGroup, setIsSavingGroup] = useState(false);
  const [isSavingDetail, setIsSavingDetail] = useState(false);

  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [detailSuccess, setDetailSuccess] = useState("");

  const activeView = PAGE_COPY[initialView] ? initialView : "summary";
  const pageCopy = PAGE_COPY[activeView];

  const calendarEvents = useMemo(() => buildFullCalendarEvents(calendarItems), [calendarItems]);
  const activeTasks = useMemo(() => getActiveTasks(tasks), [tasks]);
  const completedTasks = useMemo(() => getCompletedTasks(tasks), [tasks]);
  const overdueTasks = useMemo(() => getOverdueTasks(tasks), [tasks]);

  async function loadWorkspaceData() {
    setError("");
    setIsLoading(true);

    try {
      const [summaryData, tasksData, calendarData, groupsData, remindersData, usersData] =
        await Promise.all([
          getWorkspaceSummary(),
          getWorkspaceTasks({ ordering: "due_at" }),
          getWorkspaceCalendar({
            start: "2026-08-01",
            end: "2026-12-31",
          }),
          getWorkspaceGroups(),
          getWorkspaceReminders({ scope: "upcoming" }),
          getAdminUsers(),
        ]);

      const normalizedTasks = sortTasks(normalizeList(tasksData));
      const normalizedReminders = normalizeList(remindersData);
      const apiCalendarItems = Array.isArray(calendarData) ? calendarData : [];

      setSummary(summaryData);
      setTasks(normalizedTasks);
      setCalendarItems(buildCalendarItems(apiCalendarItems, normalizedTasks));
      setGroups(normalizeList(groupsData));
      setReminders(buildDisplayReminders(normalizedReminders, normalizedTasks));
      setUsers(normalizeList(usersData));
    } catch (requestError) {
      setError("No se pudo cargar ToDo. Revisa el backend o la sesión del usuario.");
      console.error(requestError);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      setError("");
      setIsLoading(true);

      try {
        const [summaryData, tasksData, calendarData, groupsData, remindersData, usersData] =
          await Promise.all([
            getWorkspaceSummary(),
            getWorkspaceTasks({ ordering: "due_at" }),
            getWorkspaceCalendar({
              start: "2026-08-01",
              end: "2026-12-31",
            }),
            getWorkspaceGroups(),
            getWorkspaceReminders({ scope: "upcoming" }),
            getAdminUsers(),
          ]);

        const normalizedTasks = sortTasks(normalizeList(tasksData));
        const normalizedReminders = normalizeList(remindersData);
        const apiCalendarItems = Array.isArray(calendarData) ? calendarData : [];

        if (!ignore) {
          setSummary(summaryData);
          setTasks(normalizedTasks);
          setCalendarItems(buildCalendarItems(apiCalendarItems, normalizedTasks));
          setGroups(normalizeList(groupsData));
          setReminders(buildDisplayReminders(normalizedReminders, normalizedTasks));
          setUsers(normalizeList(usersData));
        }
      } catch (requestError) {
        if (!ignore) {
          setError("No se pudo cargar ToDo. Revisa el backend o la sesión del usuario.");
        }

        console.error(requestError);
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      ignore = true;
    };
  }, []);

  function goToWorkspaceView(viewName) {
    const routes = {
      summary: "/admin/workspace",
      tasks: "/admin/workspace/tasks",
      calendar: "/admin/workspace/calendar",
      groups: "/admin/workspace/groups",
    };

    navigate(routes[viewName] || "/admin/workspace");
  }

  function toggleForm(formName) {
    setActiveForm((currentForm) => (currentForm === formName ? null : formName));
    setError("");
  }

  function handleTaskFormChange(event) {
    const { name, value, type, checked } = event.target;

    setTaskForm((currentForm) => ({
      ...currentForm,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (error) setError("");
  }

  function handleEventFormChange(event) {
    const { name, value } = event.target;

    setEventForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));

    if (error) setError("");
  }

  function handleGroupFormChange(event) {
    const { name, value } = event.target;

    setGroupForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));

    if (error) setError("");
  }

  async function handleCreateTask(event) {
    event.preventDefault();

    const validationMessage = getTaskValidationMessage(taskForm);

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setError("");
    setIsSavingTask(true);

    try {
      await createWorkspaceTask(buildTaskPayload(taskForm));

      setTaskForm(INITIAL_TASK_FORM);
      setActiveForm(null);
      await loadWorkspaceData();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "No se pudo crear la tarea."));
      console.error(requestError);
    } finally {
      setIsSavingTask(false);
    }
  }

  async function handleCreateEvent(event) {
    event.preventDefault();

    const validationMessage = getEventValidationMessage(eventForm);

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setError("");
    setIsSavingEvent(true);

    try {
      await createWorkspaceEvent(buildEventPayload(eventForm));

      setEventForm(INITIAL_EVENT_FORM);
      setActiveForm(null);
      await loadWorkspaceData();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "No se pudo crear el evento."));
      console.error(requestError);
    } finally {
      setIsSavingEvent(false);
    }
  }

  async function handleCreateGroup(event) {
    event.preventDefault();

    const validationMessage = getGroupValidationMessage(groupForm);

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setError("");
    setIsSavingGroup(true);

    try {
      await createWorkspaceGroup(buildGroupPayload(groupForm));

      setGroupForm(INITIAL_GROUP_FORM);
      setActiveForm(null);
      await loadWorkspaceData();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "No se pudo crear el grupo de trabajo."));
      console.error(requestError);
    } finally {
      setIsSavingGroup(false);
    }
  }

  async function handleQuickStatusChange(task, status) {
    setError("");

    try {
      await changeWorkspaceTaskStatus(task.id, {
        status,
        note:
          status === "completed"
            ? "La tarea fue marcada como completada desde ToDo."
            : "La tarea fue actualizada desde ToDo.",
      });

      await loadWorkspaceData();
    } catch (requestError) {
      setError("No se pudo actualizar el estado de la tarea.");
      console.error(requestError);
    }
  }

  async function refreshSelectedTask(taskId) {
    const taskDetail = await getWorkspaceTaskById(taskId);
    setSelectedTask(taskDetail);

    return taskDetail;
  }

  async function openTaskDetail(task) {
    setError("");
    setDetailError("");
    setDetailSuccess("");
    setOpeningTaskId(task.id);

    try {
      const taskDetail = await getWorkspaceTaskById(task.id);

      setSelectedTask(taskDetail);
      setStatusForm({
        status: taskDetail.status || "pending",
        note: "",
      });
      setCommentForm({
        action_type: "comment",
        comment: "",
      });
    } catch (requestError) {
      setError("No se pudo cargar el detalle de la tarea.");
      console.error(requestError);
    } finally {
      setOpeningTaskId(null);
    }
  }

  function closeTaskDetail() {
    setSelectedTask(null);
    setDetailError("");
    setDetailSuccess("");
    setStatusForm({
      status: "in_progress",
      note: "",
    });
    setCommentForm({
      action_type: "comment",
      comment: "",
    });
  }

  async function handleDetailStatusChange(event) {
    event.preventDefault();

    if (!selectedTask) return;

    if (!statusForm.note.trim()) {
      setDetailError("Ingresa una nota para registrar el cambio de estado.");
      setDetailSuccess("");
      return;
    }

    setDetailError("");
    setDetailSuccess("");
    setIsSavingDetail(true);

    try {
      await changeWorkspaceTaskStatus(selectedTask.id, {
        status: statusForm.status,
        note: statusForm.note.trim(),
      });

      await loadWorkspaceData();
      const taskDetail = await refreshSelectedTask(selectedTask.id);

      setStatusForm({
        status: taskDetail.status || "pending",
        note: "",
      });

      setDetailSuccess("Estado actualizado correctamente. El historial ya fue registrado.");
    } catch (requestError) {
      setDetailError(getApiErrorMessage(requestError, "No se pudo cambiar el estado de la tarea."));
      console.error(requestError);
    } finally {
      setIsSavingDetail(false);
    }
  }

  async function handleAddComment(event) {
    event.preventDefault();

    if (!selectedTask) return;

    if (!commentForm.comment.trim()) {
      setDetailError("Ingresa el comentario o evidencia.");
      setDetailSuccess("");
      return;
    }

    setDetailError("");
    setDetailSuccess("");
    setIsSavingDetail(true);

    try {
      await addWorkspaceTaskComment(selectedTask.id, {
        action_type: commentForm.action_type,
        comment: commentForm.comment.trim(),
      });

      await loadWorkspaceData();
      await refreshSelectedTask(selectedTask.id);

      setCommentForm({
        action_type: "comment",
        comment: "",
      });

      setDetailSuccess("Evidencia registrada correctamente.");
    } catch (requestError) {
      setDetailError(
        getApiErrorMessage(requestError, "No se pudo registrar el comentario o evidencia.")
      );
      console.error(requestError);
    } finally {
      setIsSavingDetail(false);
    }
  }

  return (
    <div className="space-y-6">
      <motion.section
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm"
        initial={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.25 }}
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-red-700">ToDo</p>
            <h1 className="mt-2 text-3xl font-black text-gray-950">{pageCopy.title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
              {pageCopy.description}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 transition hover:border-red-200 hover:text-red-700"
              type="button"
              onClick={loadWorkspaceData}
            >
              <FaSyncAlt />
              Actualizar
            </button>

            {activeView === "summary" ? (
              <>
                <button
                  className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-red-800"
                  type="button"
                  onClick={() => goToWorkspaceView("tasks")}
                >
                  <FaTasks />
                  Ver tareas
                </button>

                <button
                  className="inline-flex items-center gap-2 rounded-xl bg-gray-950 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-black"
                  type="button"
                  onClick={() => goToWorkspaceView("calendar")}
                >
                  <FaCalendarAlt />
                  Ver calendario
                </button>
              </>
            ) : null}

            {activeView === "tasks" ? (
              <button
                className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-red-800"
                type="button"
                onClick={() => toggleForm("task")}
              >
                <FaPlus />
                Nueva tarea
              </button>
            ) : null}

            {activeView === "calendar" ? (
              <button
                className="inline-flex items-center gap-2 rounded-xl bg-gray-950 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-black"
                type="button"
                onClick={() => toggleForm("event")}
              >
                <FaCalendarAlt />
                Nuevo evento
              </button>
            ) : null}

            {activeView === "groups" ? (
              <button
                className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-red-800"
                type="button"
                onClick={() => toggleForm("group")}
              >
                <FaUsers />
                Nuevo grupo
              </button>
            ) : null}
          </div>
        </div>
      </motion.section>

      {error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      {activeForm === "task" ? (
        <TaskForm
          groups={groups}
          isSaving={isSavingTask}
          taskForm={taskForm}
          users={users}
          onCancel={() => {
            setTaskForm(INITIAL_TASK_FORM);
            setActiveForm(null);
            setError("");
          }}
          onChange={handleTaskFormChange}
          onSubmit={handleCreateTask}
        />
      ) : null}

      {activeForm === "event" ? (
        <EventForm
          eventForm={eventForm}
          groups={groups}
          isSaving={isSavingEvent}
          users={users}
          onCancel={() => {
            setEventForm(INITIAL_EVENT_FORM);
            setActiveForm(null);
            setError("");
          }}
          onChange={handleEventFormChange}
          onSubmit={handleCreateEvent}
        />
      ) : null}

      {activeForm === "group" ? (
        <GroupForm
          groupForm={groupForm}
          isSaving={isSavingGroup}
          onCancel={() => {
            setGroupForm(INITIAL_GROUP_FORM);
            setActiveForm(null);
            setError("");
          }}
          onChange={handleGroupFormChange}
          onSubmit={handleCreateGroup}
        />
      ) : null}

      {isLoading ? (
        <div className="flex items-center justify-center rounded-3xl border border-gray-200 bg-white p-10 text-gray-500">
          <FaSpinner className="mr-3 animate-spin" />
          Cargando ToDo...
        </div>
      ) : (
        <>
          {activeView === "summary" ? (
            <SummaryView
              activeTasks={activeTasks}
              groups={groups}
              openingTaskId={openingTaskId}
              overdueTasks={overdueTasks}
              reminders={reminders}
              summary={summary}
              onDetail={openTaskDetail}
              onViewChange={goToWorkspaceView}
            />
          ) : null}

          {activeView === "tasks" ? (
            <TasksView
              activeTasks={activeTasks}
              completedTasks={completedTasks}
              openingTaskId={openingTaskId}
              overdueTasks={overdueTasks}
              onComplete={handleQuickStatusChange}
              onDetail={openTaskDetail}
              onProgress={handleQuickStatusChange}
            />
          ) : null}

          {activeView === "calendar" ? <CalendarView calendarEvents={calendarEvents} /> : null}

          {activeView === "groups" ? <GroupsView groups={groups} /> : null}
        </>
      )}

      {selectedTask ? (
        <TaskDetailModal
          commentForm={commentForm}
          detailError={detailError}
          detailSuccess={detailSuccess}
          isSaving={isSavingDetail}
          selectedTask={selectedTask}
          statusForm={statusForm}
          onAddComment={handleAddComment}
          onClose={closeTaskDetail}
          onCommentChange={setCommentForm}
          onStatusChange={setStatusForm}
          onSubmitStatus={handleDetailStatusChange}
        />
      ) : null}
    </div>
  );
}

function SummaryView({
  activeTasks,
  groups,
  openingTaskId,
  overdueTasks,
  reminders,
  summary,
  onDetail,
  onViewChange,
}) {
  const priorityTasks = [
    ...overdueTasks,
    ...activeTasks.filter(
      (task) =>
        task.is_important &&
        !overdueTasks.some((overdueTask) => Number(overdueTask.id) === Number(task.id))
    ),
    ...activeTasks.filter(
      (task) =>
        !task.is_important &&
        !overdueTasks.some((overdueTask) => Number(overdueTask.id) === Number(task.id))
    ),
  ].slice(0, 4);

  return (
    <section className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          helper="Tareas por atender"
          icon={<FaTasks />}
          label="Pendientes"
          value={summary?.my_pending_tasks ?? 0}
        />

        <SummaryCard
          helper="Requieren prioridad"
          icon={<FaExclamationTriangle />}
          label="Vencidas"
          value={summary?.my_overdue ?? 0}
          variant="danger"
        />

        <SummaryCard
          helper="Reuniones o actividades"
          icon={<FaRegCalendarCheck />}
          label="Eventos"
          value={summary?.my_upcoming_events ?? 0}
        />

        <SummaryCard
          helper="Alertas próximas"
          icon={<FaRegBell />}
          label="Recordatorios"
          value={reminders.length}
          variant="warning"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <PanelCard
            icon={<FaTasks />}
            subtitle="Prioridad del día"
            title="Pendientes que requieren atención"
          >
            {overdueTasks.length > 0 ? (
              <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
                <p className="text-sm font-black text-red-700">
                  Hay {overdueTasks.length} tarea(s) vencida(s). Atiende primero estos pendientes.
                </p>
              </div>
            ) : null}

            {priorityTasks.length === 0 ? (
              <EmptyState text="No hay tareas activas por el momento. Revisa el módulo de tareas para ver tareas completadas o crear nuevos pendientes." />
            ) : (
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
                {priorityTasks.map((task) => (
                  <SummaryTaskRow
                    key={task.id}
                    openingTaskId={openingTaskId}
                    task={task}
                    onDetail={() => onDetail(task)}
                  />
                ))}
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                className="rounded-xl bg-red-700 px-4 py-2.5 text-xs font-black text-white transition hover:bg-red-800"
                type="button"
                onClick={() => onViewChange("tasks")}
              >
                Ir a tareas
              </button>

              <button
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-black text-gray-700 transition hover:border-red-200 hover:text-red-700"
                type="button"
                onClick={() => onViewChange("calendar")}
              >
                Ver calendario
              </button>
            </div>
          </PanelCard>

          <div className="grid gap-4 md:grid-cols-3">
            <QuickActionCard
              description="Crear, completar y revisar pendientes diarios."
              icon={<FaTasks />}
              label="Tareas"
              onClick={() => onViewChange("tasks")}
            />

            <QuickActionCard
              description="Ver reuniones, fechas límite y recordatorios."
              icon={<FaCalendarAlt />}
              label="Calendario"
              onClick={() => onViewChange("calendar")}
            />

            <QuickActionCard
              description="Organizar trabajo por campaña, área o proyecto."
              icon={<FaFolderOpen />}
              label="Grupos"
              onClick={() => onViewChange("groups")}
            />
          </div>
        </div>

        <div className="space-y-5">
          <PanelCard icon={<FaRegBell />} subtitle="Alertas internas" title="Recordatorios próximos">
            {reminders.length === 0 ? (
              <EmptyState text="No hay recordatorios próximos." />
            ) : (
              <CompactReminderList reminders={reminders.slice(0, 5)} />
            )}

            {reminders.length > 0 ? (
              <button
                className="mt-4 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-black text-gray-700 transition hover:border-red-200 hover:text-red-700"
                type="button"
                onClick={() => onViewChange("calendar")}
              >
                Ver en calendario
              </button>
            ) : null}
          </PanelCard>

          <PanelCard icon={<FaFolderOpen />} subtitle="Trabajo por áreas" title="Grupos activos">
            {groups.length === 0 ? (
              <EmptyState text="No hay grupos registrados." />
            ) : (
              <SummaryGroupGrid groups={groups.slice(0, 4)} />
            )}

            {groups.length > 0 ? (
              <button
                className="mt-4 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-black text-gray-700 transition hover:border-red-200 hover:text-red-700"
                type="button"
                onClick={() => onViewChange("groups")}
              >
                Ver grupos de trabajo
              </button>
            ) : null}
          </PanelCard>
        </div>
      </div>
    </section>
  );
}

function SummaryTaskRow({ openingTaskId, task, onDetail }) {
  const isOpening = openingTaskId === task.id;

  return (
    <div className="flex flex-col gap-3 border-b border-gray-100 bg-white px-4 py-4 transition last:border-b-0 hover:bg-gray-50 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full border px-3 py-1 text-xs font-black ${getStatusBadgeClass(
              task.status
            )}`}
          >
            {getStatusLabel(task.status)}
          </span>

          <span
            className={`rounded-full border px-3 py-1 text-xs font-black ${getPriorityBadgeClass(
              task.priority
            )}`}
          >
            {getPriorityLabel(task.priority)}
          </span>

          {task.is_overdue ? (
            <span className="rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-black text-red-700">
              Vencida
            </span>
          ) : null}

          {task.is_important ? (
            <span className="rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-black text-red-700">
              Importante
            </span>
          ) : null}
        </div>

        <h3 className="mt-2 truncate text-base font-black text-gray-950">{task.title}</h3>

        <div className="mt-2 flex flex-wrap gap-3 text-xs font-bold text-gray-500">
          <span className="inline-flex items-center gap-2">
            <FaFolderOpen />
            {task.group_name || "Sin grupo"}
          </span>

          <span className="inline-flex items-center gap-2">
            <FaUserCheck />
            {task.assigned_to_name || "Sin responsable"}
          </span>

          <span className="inline-flex items-center gap-2">
            <FaClock />
            {formatDateTime(task.due_at)}
          </span>
        </div>
      </div>

      <button
        className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-black text-gray-700 transition hover:border-red-200 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isOpening}
        type="button"
        onClick={onDetail}
      >
        {isOpening ? "Abriendo..." : "Ver detalle"}
      </button>
    </div>
  );
}

function CompactReminderList({ reminders }) {
  return (
    <div className="space-y-3">
      {reminders.map((reminder) => (
        <div
          key={reminder.id}
          className="rounded-2xl border border-yellow-100 bg-yellow-50 px-4 py-3"
        >
          <p className="line-clamp-1 text-sm font-black text-gray-950">{reminder.title}</p>

          <p className="mt-1 text-xs font-bold text-yellow-800">
            {formatDateTime(reminder.remind_at)}
          </p>

          {reminder.task_title ? (
            <p className="mt-1 line-clamp-1 text-xs font-semibold text-gray-600">
              Tarea: {reminder.task_title}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function SummaryGroupGrid({ groups }) {
  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <div
          key={group.id}
          className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-gray-950">{group.name}</p>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">
                {group.description || "Espacio de trabajo sin descripción."}
              </p>
            </div>

            <span
              className="mt-1 h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: group.color || "#dc2626" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function QuickActionCard({ description, icon, label, onClick }) {
  return (
    <button
      className="rounded-3xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-red-100 hover:shadow-md"
      type="button"
      onClick={onClick}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-red-700">
        {icon}
      </div>

      <p className="mt-4 text-sm font-black text-gray-950">{label}</p>
      <p className="mt-2 text-xs leading-5 text-gray-500">{description}</p>
    </button>
  );
}

function TasksView({
  activeTasks,
  completedTasks,
  openingTaskId,
  overdueTasks,
  onComplete,
  onDetail,
  onProgress,
}) {
  return (
    <section className="space-y-6">
      <PanelCard icon={<FaTasks />} subtitle="Tareas" title="Tareas activas">
        {overdueTasks.length > 0 ? (
          <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-4">
            <p className="text-sm font-black text-red-700">
              Tienes {overdueTasks.length} tarea(s) vencida(s).
            </p>
          </div>
        ) : null}

        {activeTasks.length === 0 ? (
          <EmptyState text="No hay tareas activas registradas. Las tareas completadas aparecerán en la sección inferior." />
        ) : (
          <div className="space-y-3">
            {activeTasks.map((task) => (
              <TaskItem
                key={task.id}
                openingTaskId={openingTaskId}
                task={task}
                onComplete={() => onComplete(task, "completed")}
                onDetail={() => onDetail(task)}
                onProgress={() => onProgress(task, "in_progress")}
              />
            ))}
          </div>
        )}
      </PanelCard>

      <PanelCard icon={<FaCheckCircle />} subtitle="Cierre operativo" title="Tareas completadas">
        {completedTasks.length === 0 ? (
          <EmptyState text="Todavía no hay tareas completadas." />
        ) : (
          <div className="space-y-3">
            {completedTasks.map((task) => (
              <TaskItem
                key={task.id}
                openingTaskId={openingTaskId}
                task={task}
                onComplete={() => onComplete(task, "completed")}
                onDetail={() => onDetail(task)}
                onProgress={() => onProgress(task, "in_progress")}
              />
            ))}
          </div>
        )}
      </PanelCard>
    </section>
  );
}

function CalendarView({ calendarEvents }) {
  return (
    <PanelCard icon={<FaCalendarAlt />} subtitle="Calendario" title="Agenda interna">
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <LegendItem className="border-red-100 bg-red-50 text-red-700" label="Tareas con fecha" />
        <LegendItem className="border-blue-100 bg-blue-50 text-blue-700" label="Eventos" />
        <LegendItem
          className="border-yellow-100 bg-yellow-50 text-yellow-800"
          label="Recordatorios"
        />
      </div>

      <div className="todo-calendar rounded-2xl border border-gray-100 bg-white p-3">
        <FullCalendar
          buttonText={{
            today: "Hoy",
            month: "Mes",
            week: "Semana",
            day: "Día",
          }}
          dayMaxEvents={2}
          events={calendarEvents}
          eventTimeFormat={{
            hour: "2-digit",
            minute: "2-digit",
            meridiem: "short",
          }}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          height={620}
          initialView="dayGridMonth"
          locale="es"
          nowIndicator
          plugins={[classicThemePlugin, dayGridPlugin, timeGridPlugin, interactionPlugin]}
        />
      </div>
    </PanelCard>
  );
}

function GroupsView({ groups }) {
  return (
    <PanelCard icon={<FaFolderOpen />} subtitle="Espacios colaborativos" title="Grupos de trabajo">
      <div className="mb-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
        <p className="text-sm leading-6 text-gray-600">
          Los grupos de trabajo permiten organizar tareas y reuniones por campaña, área o proyecto.
          El grupo es opcional: una tarea puede ser personal o pertenecer a un grupo.
        </p>
      </div>

      {groups.length === 0 ? (
        <EmptyState text="No hay grupos registrados." />
      ) : (
        <GroupList groups={groups} />
      )}
    </PanelCard>
  );
}

function GroupForm({ groupForm, isSaving, onCancel, onChange, onSubmit }) {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-black text-gray-950">Nuevo grupo de trabajo</h2>
        <p className="mt-1 text-sm text-gray-600">
          Crea un espacio interno para organizar tareas, reuniones y seguimientos por área o campaña.
        </p>
      </div>

      <form className="grid gap-4 lg:grid-cols-2" onSubmit={onSubmit}>
        <div>
          <label className="text-sm font-bold text-gray-800" htmlFor="group_name">
            Nombre del grupo
          </label>
          <input
            className="input-admin mt-2"
            id="group_name"
            name="name"
            placeholder="Ejemplo: Campaña Escolar 2026"
            type="text"
            value={groupForm.name}
            onChange={onChange}
          />
        </div>

        <div>
          <label className="text-sm font-bold text-gray-800" htmlFor="group_color">
            Color del grupo
          </label>
          <input
            className="input-admin mt-2 h-12"
            id="group_color"
            name="color"
            type="color"
            value={groupForm.color}
            onChange={onChange}
          />
        </div>

        <div className="lg:col-span-2">
          <label className="text-sm font-bold text-gray-800" htmlFor="group_description">
            Descripción
          </label>
          <textarea
            className="input-admin mt-2 min-h-20 resize-none"
            id="group_description"
            name="description"
            placeholder="Ejemplo: Seguimiento de actividades comerciales, colegios y coordinación interna."
            value={groupForm.description}
            onChange={onChange}
          />
        </div>

        <FormActions
          cancelLabel="Cancelar"
          isSaving={isSaving}
          savingLabel="Guardando..."
          submitIcon={<FaUsers />}
          submitLabel="Guardar grupo"
          onCancel={onCancel}
        />
      </form>
    </section>
  );
}

function TaskForm({ groups, isSaving, taskForm, users, onCancel, onChange, onSubmit }) {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-black text-gray-950">Nueva tarea</h2>
        <p className="mt-1 text-sm text-gray-600">
          Registra una actividad interna, asígnale responsable y define fecha límite si corresponde.
        </p>
      </div>

      <form className="grid gap-4 lg:grid-cols-2" onSubmit={onSubmit}>
        <div className="lg:col-span-2">
          <label className="text-sm font-bold text-gray-800" htmlFor="title">
            Título
          </label>
          <input
            className="input-admin mt-2"
            id="title"
            name="title"
            placeholder="Ejemplo: Realizar inventario del almacén"
            type="text"
            value={taskForm.title}
            onChange={onChange}
          />
        </div>

        <SelectField
          id="task_type"
          label="Tipo"
          name="task_type"
          options={TASK_TYPE_OPTIONS}
          value={taskForm.task_type}
          onChange={onChange}
        />

        <SelectField
          id="priority"
          label="Prioridad"
          name="priority"
          options={PRIORITY_OPTIONS}
          value={taskForm.priority}
          onChange={onChange}
        />

        <UserGroupFields
          groups={groups}
          groupId="task_group"
          groupLabel="Grupo de trabajo"
          groupValue={taskForm.group}
          userId="task_assigned_to"
          userValue={taskForm.assigned_to}
          users={users}
          onChange={onChange}
        />

        <DateTimeField
          id="due_at"
          label="Fecha límite"
          name="due_at"
          value={taskForm.due_at}
          onChange={onChange}
        />

        <div>
          <DateTimeField
            id="reminder_at"
            label="Recordatorio"
            name="reminder_at"
            value={taskForm.reminder_at}
            onChange={onChange}
          />
          <p className="mt-2 text-xs font-semibold text-gray-500">
            El recordatorio debe ser antes de la fecha límite.
          </p>
        </div>

        <div className="lg:col-span-2">
          <label className="text-sm font-bold text-gray-800" htmlFor="description">
            Descripción
          </label>
          <textarea
            className="input-admin mt-2 min-h-24 resize-none"
            id="description"
            name="description"
            placeholder="Detalle interno de la tarea"
            value={taskForm.description}
            onChange={onChange}
          />
        </div>

        <label className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-800 lg:col-span-2">
          <input
            checked={taskForm.is_important}
            className="h-4 w-4 rounded border-gray-300 text-red-700 focus:ring-red-600"
            name="is_important"
            type="checkbox"
            onChange={onChange}
          />
          Marcar como importante
        </label>

        <FormActions
          cancelLabel="Cancelar"
          isSaving={isSaving}
          savingLabel="Guardando..."
          submitIcon={<FaCheckCircle />}
          submitLabel="Guardar tarea"
          onCancel={onCancel}
        />
      </form>
    </section>
  );
}

function EventForm({ eventForm, groups, isSaving, users, onCancel, onChange, onSubmit }) {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-black text-gray-950">Nuevo evento</h2>
        <p className="mt-1 text-sm text-gray-600">
          Agenda reuniones, visitas, llamadas, capacitaciones o entregas programadas.
        </p>
      </div>

      <form className="grid gap-4 lg:grid-cols-2" onSubmit={onSubmit}>
        <div className="lg:col-span-2">
          <label className="text-sm font-bold text-gray-800" htmlFor="event_title">
            Título
          </label>
          <input
            className="input-admin mt-2"
            id="event_title"
            name="title"
            placeholder="Ejemplo: Reunión con colegio Claretiano"
            type="text"
            value={eventForm.title}
            onChange={onChange}
          />
        </div>

        <SelectField
          id="event_type"
          label="Tipo de evento"
          name="event_type"
          options={EVENT_TYPE_OPTIONS}
          value={eventForm.event_type}
          onChange={onChange}
        />

        <div>
          <label className="text-sm font-bold text-gray-800" htmlFor="location">
            Lugar
          </label>
          <input
            className="input-admin mt-2"
            id="location"
            name="location"
            placeholder="Ejemplo: Oficina, colegio, videollamada"
            type="text"
            value={eventForm.location}
            onChange={onChange}
          />
        </div>

        <UserGroupFields
          groups={groups}
          groupId="event_group"
          groupLabel="Grupo relacionado"
          groupValue={eventForm.group}
          userId="event_assigned_to"
          userValue={eventForm.assigned_to}
          users={users}
          onChange={onChange}
        />

        <DateTimeField
          id="start_at"
          label="Inicio"
          name="start_at"
          value={eventForm.start_at}
          onChange={onChange}
        />

        <DateTimeField
          id="end_at"
          label="Fin"
          name="end_at"
          value={eventForm.end_at}
          onChange={onChange}
        />

        <div className="lg:col-span-2">
          <label className="text-sm font-bold text-gray-800" htmlFor="event_description">
            Descripción
          </label>
          <textarea
            className="input-admin mt-2 min-h-24 resize-none"
            id="event_description"
            name="description"
            placeholder="Detalle interno del evento"
            value={eventForm.description}
            onChange={onChange}
          />
        </div>

        <FormActions
          cancelLabel="Cancelar"
          isSaving={isSaving}
          savingLabel="Guardando..."
          submitIcon={<FaCalendarAlt />}
          submitLabel="Guardar evento"
          onCancel={onCancel}
        />
      </form>
    </section>
  );
}

function UserGroupFields({
  groups,
  groupId,
  groupLabel,
  groupValue,
  userId,
  userValue,
  users,
  onChange,
}) {
  return (
    <>
      <div>
        <label className="text-sm font-bold text-gray-800" htmlFor={groupId}>
          {groupLabel}
        </label>
        <select
          className="input-admin mt-2"
          id={groupId}
          name="group"
          value={groupValue}
          onChange={onChange}
        >
          <option value="">Sin grupo</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm font-bold text-gray-800" htmlFor={userId}>
          Responsable
        </label>
        <select
          className="input-admin mt-2"
          id={userId}
          name="assigned_to"
          value={userValue}
          onChange={onChange}
        >
          <option value="">Asignarme automáticamente</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {getUserLabel(user)}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}

function SelectField({ id, label, name, options, value, onChange }) {
  return (
    <div>
      <label className="text-sm font-bold text-gray-800" htmlFor={id}>
        {label}
      </label>
      <select
        className="input-admin mt-2"
        id={id}
        name={name}
        value={value}
        onChange={onChange}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function DateTimeField({ id, label, name, value, onChange }) {
  return (
    <div>
      <label className="text-sm font-bold text-gray-800" htmlFor={id}>
        {label}
      </label>
      <input
        className="input-admin mt-2"
        id={id}
        name={name}
        type="datetime-local"
        value={value}
        onChange={onChange}
      />
    </div>
  );
}

function FormActions({
  cancelLabel,
  isSaving,
  savingLabel,
  submitIcon,
  submitLabel,
  onCancel,
}) {
  return (
    <div className="flex flex-wrap gap-3 lg:col-span-2">
      <button
        className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSaving}
        type="submit"
      >
        {isSaving ? <FaSpinner className="animate-spin" /> : submitIcon}
        {isSaving ? savingLabel : submitLabel}
      </button>

      <button
        className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
        type="button"
        onClick={onCancel}
      >
        {cancelLabel}
      </button>
    </div>
  );
}

function SummaryCard({ helper, icon, label, value, variant = "default" }) {
  const iconClass =
    variant === "danger"
      ? "bg-red-50 text-red-700"
      : variant === "warning"
        ? "bg-yellow-50 text-yellow-700"
        : "bg-gray-100 text-gray-700";

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black text-gray-700">{label}</p>
          <p className="mt-1 text-xs font-semibold text-gray-500">{helper}</p>
          <p className="mt-4 text-3xl font-black text-gray-950">{value}</p>
        </div>

        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl text-lg ${iconClass}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function PanelCard({ children, icon, subtitle, title }) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-100 text-gray-700">
          {icon}
        </div>

        <div>
          <p className="text-xs font-black uppercase tracking-wide text-red-700">{subtitle}</p>
          <h2 className="mt-1 text-xl font-black text-gray-950">{title}</h2>
        </div>
      </div>

      {children}
    </div>
  );
}

function TaskItem({ openingTaskId, task, onComplete, onDetail, onProgress }) {
  const isOpening = openingTaskId === task.id;
  const isClosed = task.status === "completed" || task.status === "cancelled";
  const isCompleted = task.status === "completed";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-black ${getStatusBadgeClass(
                task.status
              )}`}
            >
              {getStatusLabel(task.status)}
            </span>

            <span
              className={`rounded-full border px-3 py-1 text-xs font-black ${getPriorityBadgeClass(
                task.priority
              )}`}
            >
              {getPriorityLabel(task.priority)}
            </span>

            {task.is_overdue && !isClosed ? (
              <span className="rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-black text-red-700">
                Vencida
              </span>
            ) : null}

            {task.is_important ? (
              <span className="rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-black text-red-700">
                Importante
              </span>
            ) : null}
          </div>

          <h3
            className={`mt-3 text-lg font-black ${
              isCompleted ? "text-gray-400 line-through" : "text-gray-950"
            }`}
          >
            {task.title}
          </h3>

          {task.description ? (
            <p
              className={`mt-1 text-sm leading-6 ${
                isCompleted ? "text-gray-400 line-through" : "text-gray-600"
              }`}
            >
              {task.description}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-3 text-xs font-bold text-gray-500">
            <span className="inline-flex items-center gap-2">
              <FaFolderOpen />
              {task.group_name || "Sin grupo"}
            </span>

            <span className="inline-flex items-center gap-2">
              <FaUserCheck />
              {task.assigned_to_name || "Sin responsable"}
            </span>

            <span className="inline-flex items-center gap-2">
              <FaClock />
              {formatDateTime(task.due_at)}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          <button
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-black text-gray-700 transition hover:border-red-200 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isOpening}
            type="button"
            onClick={onDetail}
          >
            {isOpening ? "Abriendo..." : "Ver detalle"}
          </button>

          {task.status !== "in_progress" && !isClosed ? (
            <button
              className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-black text-blue-700 transition hover:bg-blue-100"
              type="button"
              onClick={onProgress}
            >
              En proceso
            </button>
          ) : null}

          {!isClosed ? (
            <button
              className="rounded-xl border border-green-100 bg-green-50 px-4 py-2 text-xs font-black text-green-700 transition hover:bg-green-100"
              type="button"
              onClick={onComplete}
            >
              Completar
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function GroupList({ groups }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
      {groups.map((group) => (
        <div key={group.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-gray-900">{group.name}</p>
              <p className="mt-1 text-xs leading-5 text-gray-500">
                {group.description || "Sin descripción"}
              </p>
            </div>

            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: group.color || "#dc2626" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function LegendItem({ className, label }) {
  return (
    <div className={`rounded-2xl border px-4 py-3 text-xs font-black ${className}`}>
      {label}
    </div>
  );
}

function TaskDetailModal({
  commentForm,
  detailError,
  detailSuccess,
  isSaving,
  selectedTask,
  statusForm,
  onAddComment,
  onClose,
  onCommentChange,
  onStatusChange,
  onSubmitStatus,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
      <div className="max-h-screen w-full max-w-5xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-red-700">
                Detalle de tarea
              </p>
              <h2 className="mt-2 text-2xl font-black text-gray-950">{selectedTask.title}</h2>
              <p className="mt-2 text-sm text-gray-500">
                Revisa la actividad, registra avances y deja evidencia del seguimiento.
              </p>
            </div>

            <button
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-black text-gray-700 transition hover:bg-gray-50"
              type="button"
              onClick={onClose}
            >
              Cerrar
            </button>
          </div>
        </div>

        <div className="space-y-4 px-6 pt-5">
          {detailError ? (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
              {detailError}
            </div>
          ) : null}

          {detailSuccess ? (
            <div className="rounded-2xl border border-green-100 bg-green-50 px-5 py-4 text-sm font-bold text-green-700">
              {detailSuccess}
            </div>
          ) : null}
        </div>

        <div className="grid gap-6 p-6 xl:grid-cols-3">
          <div className="space-y-5 xl:col-span-2">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <h3 className="text-base font-black text-gray-950">Información general</h3>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <InfoItem label="Estado" value={getStatusLabel(selectedTask.status)} />
                <InfoItem label="Prioridad" value={getPriorityLabel(selectedTask.priority)} />
                <InfoItem label="Tipo" value={getTaskTypeLabel(selectedTask.task_type)} />
                <InfoItem label="Grupo" value={selectedTask.group_name || "Sin grupo"} />
                <InfoItem
                  label="Responsable"
                  value={selectedTask.assigned_to_name || "Sin responsable"}
                />
                <InfoItem label="Fecha límite" value={formatDateTime(selectedTask.due_at)} />
              </div>

              {selectedTask.description ? (
                <div className="mt-5">
                  <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                    Descripción
                  </p>
                  <p className="mt-2 text-sm leading-6 text-gray-700">{selectedTask.description}</p>
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h3 className="text-base font-black text-gray-950">Registrar evidencia</h3>
              <p className="mt-1 text-sm text-gray-500">
                Usa este espacio para dejar constancia de llamadas, coordinaciones o avances.
              </p>

              <form className="mt-4 space-y-4" onSubmit={onAddComment}>
                <SelectField
                  id="action_type"
                  label="Tipo de registro"
                  name="action_type"
                  options={[
                    { value: "comment", label: "Comentario" },
                    { value: "call", label: "Llamada" },
                    { value: "whatsapp", label: "WhatsApp" },
                    { value: "meeting", label: "Reunión" },
                    { value: "evidence", label: "Evidencia" },
                  ]}
                  value={commentForm.action_type}
                  onChange={(event) =>
                    onCommentChange((currentForm) => ({
                      ...currentForm,
                      action_type: event.target.value,
                    }))
                  }
                />

                <div>
                  <label className="text-sm font-bold text-gray-800" htmlFor="comment">
                    Comentario o evidencia
                  </label>
                  <textarea
                    className="input-admin mt-2 min-h-24 resize-none"
                    id="comment"
                    placeholder="Ejemplo: Se llamó al cliente y solicitó confirmar mañana por la tarde."
                    value={commentForm.comment}
                    onChange={(event) =>
                      onCommentChange((currentForm) => ({
                        ...currentForm,
                        comment: event.target.value,
                      }))
                    }
                  />
                </div>

                <button
                  className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-5 py-3 text-sm font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSaving}
                  type="submit"
                >
                  {isSaving ? <FaSpinner className="animate-spin" /> : <FaCheckCircle />}
                  {isSaving ? "Guardando..." : "Guardar evidencia"}
                </button>
              </form>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h3 className="text-base font-black text-gray-950">Comentarios registrados</h3>

              {selectedTask.comments?.length ? (
                <div className="mt-4 space-y-3">
                  {selectedTask.comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="rounded-2xl border border-gray-100 bg-gray-50 p-4"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm font-black text-gray-900">
                          {comment.action_type_display || "Comentario"}
                        </p>
                        <p className="text-xs font-bold text-gray-500">
                          {formatDateTime(comment.created_at)}
                        </p>
                      </div>

                      <p className="mt-2 text-sm leading-6 text-gray-700">{comment.comment}</p>

                      <p className="mt-2 text-xs font-bold text-gray-500">
                        Registrado por: {comment.user_name || "Usuario"}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState text="Todavía no hay comentarios registrados." />
              )}
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h3 className="text-base font-black text-gray-950">Cambiar estado</h3>
              <p className="mt-1 text-sm text-gray-500">
                Todo cambio debe tener una nota para mantener trazabilidad.
              </p>

              <form className="mt-4 space-y-4" onSubmit={onSubmitStatus}>
                <SelectField
                  id="status"
                  label="Nuevo estado"
                  name="status"
                  options={STATUS_OPTIONS}
                  value={statusForm.status}
                  onChange={(event) =>
                    onStatusChange((currentForm) => ({
                      ...currentForm,
                      status: event.target.value,
                    }))
                  }
                />

                <div>
                  <label className="text-sm font-bold text-gray-800" htmlFor="note">
                    Nota del cambio
                  </label>
                  <textarea
                    className="input-admin mt-2 min-h-24 resize-none"
                    id="note"
                    placeholder="Ejemplo: Se inició la gestión con el responsable asignado."
                    value={statusForm.note}
                    onChange={(event) =>
                      onStatusChange((currentForm) => ({
                        ...currentForm,
                        note: event.target.value,
                      }))
                    }
                  />
                </div>

                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gray-950 px-5 py-3 text-sm font-black text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSaving}
                  type="submit"
                >
                  {isSaving ? <FaSpinner className="animate-spin" /> : <FaCheckCircle />}
                  {isSaving ? "Actualizando..." : "Actualizar estado"}
                </button>
              </form>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h3 className="text-base font-black text-gray-950">Historial</h3>

              {selectedTask.history?.length ? (
                <div className="mt-4 space-y-3">
                  {selectedTask.history.map((historyItem) => (
                    <div
                      key={historyItem.id}
                      className="rounded-2xl border border-gray-100 bg-gray-50 p-4"
                    >
                      <p className="text-sm font-black text-gray-900">
                        {historyItem.old_status_display || "Sin estado"} →{" "}
                        {historyItem.new_status_display || "Nuevo estado"}
                      </p>

                      {historyItem.note ? (
                        <p className="mt-2 text-sm leading-6 text-gray-700">{historyItem.note}</p>
                      ) : null}

                      <p className="mt-2 text-xs font-bold text-gray-500">
                        {formatDateTime(historyItem.created_at)}
                      </p>

                      <p className="mt-1 text-xs font-bold text-gray-500">
                        Usuario: {historyItem.changed_by_name || "Usuario"}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState text="Todavía no hay historial registrado." />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4">
      <p className="text-xs font-black uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-sm font-black text-gray-900">{value}</p>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-5 text-sm font-semibold text-gray-500">
      {text}
    </div>
  );
}