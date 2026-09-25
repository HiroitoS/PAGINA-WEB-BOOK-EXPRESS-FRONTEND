import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/react/daygrid";
import timeGridPlugin from "@fullcalendar/react/timegrid";
import interactionPlugin from "@fullcalendar/react/interaction";
import classicThemePlugin from "@fullcalendar/react/themes/classic";
import "@fullcalendar/react/skeleton.css";
import "@fullcalendar/react/themes/classic/theme.css";
import "@fullcalendar/react/themes/classic/palette.css";
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaCheckCircle,
  FaChevronDown,
  FaClock,
  FaEdit,
  FaEye,
  FaFilter,
  FaFolderOpen,
  FaPlus,
  FaRegCalendarCheck,
  FaSpinner,
  FaTimes,
  FaUserCheck,
} from "react-icons/fa";
import {
  changeWorkspaceTaskStatus,
  createWorkspaceEvent,
  getWorkspaceAssignableUsers,
  getWorkspaceCalendar,
  getWorkspaceEventById,
  getWorkspaceGroups,
  getWorkspaceTaskById,
  getWorkspaceTasks,
  updateWorkspaceEvent,
  updateWorkspaceReminder,
  updateWorkspaceTask,
} from "../../../api/adminApi";
import { useAuth } from "../../../hooks/useAuth";
import { userHasPermission } from "../../../utils/adminAccess";
import { getResults } from "../../../utils/formatters";
import {
  buildNavigationState,
  resolveReturnContext,
} from "../../../utils/navigationContext";

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

const EVENT_TYPE_OPTIONS = [
  { value: "meeting", label: "Reunión" },
  { value: "call", label: "Llamada" },
  { value: "delivery", label: "Entrega" },
  { value: "training", label: "Capacitación" },
  { value: "visit", label: "Visita" },
  { value: "other", label: "Otro" },
];

const TASK_CATEGORY_OPTIONS = [
  { value: "general", label: "General" },
  { value: "customer_request", label: "Atención a cliente" },
  { value: "catalog", label: "Catálogo" },
  { value: "reading_plan", label: "Plan lector" },
  { value: "school", label: "Colegio" },
  { value: "delivery", label: "Entrega" },
  { value: "administration", label: "Administración" },
  { value: "warehouse", label: "Almacén" },
  { value: "other", label: "Otro" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Baja" },
  { value: "medium", label: "Media" },
  { value: "high", label: "Alta" },
  { value: "urgent", label: "Urgente" },
];

const CALENDAR_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "task", label: "Tareas" },
  { value: "event", label: "Eventos" },
  { value: "reminder", label: "Recordatorios" },
];

const MOBILE_VIEW_MODES = [
  { value: "agenda", label: "Agenda" },
  { value: "day", label: "Día" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mes" },
];

const WEEK_DAYS = ["D", "L", "M", "M", "J", "V", "S"];

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  return getResults(data);
}

function formatDateOnly(value) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);

  return date.toISOString().slice(0, 10);
}

function formatMonthTitle(value) {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) return "Mes actual";

  return new Intl.DateTimeFormat("es-PE", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatDateTitle(value) {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) return "Fecha";

  return new Intl.DateTimeFormat("es-PE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(date);
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

function formatShortTime(value) {
  if (!value) return "Sin hora";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Sin hora";

  return new Intl.DateTimeFormat("es-PE", {
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

function getInitialCalendarRange() {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  start.setDate(start.getDate() - 14);
  end.setDate(end.getDate() + 14);

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function getInitialCompactMode() {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 1024;
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
      first_name: user.first_name || "",
      last_name: user.last_name || "",
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
    console.error("No se pudo cargar la lista completa de usuarios.", requestError);
    return getFallbackCurrentUser(user);
  }
}

async function loadVisibleGroups() {
  try {
    const groupsData = await getWorkspaceGroups();
    return normalizeList(groupsData);
  } catch (requestError) {
    console.error("No se pudo cargar la lista de grupos.", requestError);
    return [];
  }
}

async function loadCalendarItemsFromApi(range) {
  try {
    const calendarData = await getWorkspaceCalendar({
      start: range.start,
      end: range.end,
    });

    return normalizeList(calendarData);
  } catch (requestError) {
    console.error("No se pudo cargar el endpoint de calendario.", requestError);
    return [];
  }
}

function getCalendarItemDate(item) {
  return item.start || item.start_at || item.due_at || item.remind_at || item.reminder_at || "";
}

function getCalendarItemEndDate(item) {
  return item.end || item.end_at || "";
}

function getCalendarType(item) {
  if (item.type === "task_reminder") return "reminder";
  if (item.type === "reminder") return "reminder";
  if (item.type === "event") return "event";

  return "task";
}

function getCalendarTypeLabel(type) {
  if (type === "event") return "Evento";
  if (type === "reminder" || type === "task_reminder") return "Recordatorio";

  return "Tarea";
}

function getCalendarTypeClass(type) {
  if (type === "event") return "border-blue-100 bg-blue-50 text-blue-700";

  if (type === "reminder" || type === "task_reminder") {
    return "border-yellow-100 bg-yellow-50 text-yellow-800";
  }

  return "border-red-100 bg-red-50 text-red-700";
}

function getCalendarDotClass(type) {
  if (type === "event") return "bg-blue-600";
  if (type === "reminder" || type === "task_reminder") return "bg-yellow-500";

  return "bg-red-700";
}

function getEventTypeLabel(type) {
  return EVENT_TYPE_OPTIONS.find((option) => option.value === type)?.label || type || "Evento";
}

function getPriorityLabel(priority) {
  return PRIORITY_OPTIONS.find((option) => option.value === priority)?.label || priority || "Media";
}

function getTaskCategoryLabel(type) {
  return TASK_CATEGORY_OPTIONS.find((option) => option.value === type)?.label || type || "General";
}

function taskIsClosed(task) {
  return task.status === "completed" || task.status === "cancelled";
}

function calendarItemIsClosed(item) {
  const type = getCalendarType(item);

  if (type === "event") return false;

  return item.status === "completed" || item.status === "cancelled";
}

function getCalendarRealId(item) {
  const candidateId =
    item?.real_id ||
    item?.task_id ||
    item?.event_id ||
    item?.reminder_id ||
    item?.task ||
    item?.event ||
    item?.id;

  if (typeof candidateId === "string" && candidateId.includes("-")) {
    const parts = candidateId.split("-");
    return parts[parts.length - 1];
  }

  return candidateId;
}

function getTaskReminderCalendarKey(task) {
  return `task_reminder-${task.id}`;
}

function getCalendarItemKey(item) {
  return `${item.type || getCalendarType(item)}-${getCalendarRealId(item)}`;
}

function canEditCalendarItem(item, itemDetail = null) {
  if (itemDetail?.can_edit_details !== undefined) return Boolean(itemDetail.can_edit_details);
  return Boolean(item?.can_edit_details);
}

function canFollowUpCalendarItem(item, itemDetail = null) {
  if (itemDetail?.can_follow_up !== undefined) return Boolean(itemDetail.can_follow_up);
  return Boolean(item?.can_follow_up);
}

function canCompleteCalendarItem(item, itemDetail = null) {
  if (itemDetail?.can_complete !== undefined) return Boolean(itemDetail.can_complete);
  return Boolean(item?.can_complete);
}

function isReadOnlyCalendarItem(item, itemDetail = null) {
  if (itemDetail?.is_read_only !== undefined) return Boolean(itemDetail.is_read_only);
  return !canEditCalendarItem(item, itemDetail) && !canFollowUpCalendarItem(item, itemDetail) && !canCompleteCalendarItem(item, itemDetail);
}

function getAgendaState(item) {
  const type = getCalendarType(item);
  const startValue = getCalendarItemDate(item);
  const endValue = getCalendarItemEndDate(item);
  const startDate = new Date(startValue);
  const endDate = endValue ? new Date(endValue) : null;
  const now = new Date();

  if (Number.isNaN(startDate.getTime())) {
    return {
      label: getCalendarTypeLabel(type),
      className: getCalendarTypeClass(type),
    };
  }

  if (type === "event" && endDate && !Number.isNaN(endDate.getTime())) {
    if (now >= startDate && now <= endDate) {
      return {
        label: "En curso",
        className: "border-blue-200 bg-blue-600 text-white",
      };
    }
  }

  const diffMinutes = Math.round((startDate.getTime() - now.getTime()) / 60000);

  if (type === "event" && diffMinutes >= 0 && diffMinutes <= 120) {
    return {
      label: "Evento próximo",
      className: "border-blue-200 bg-blue-50 text-blue-700",
    };
  }

  if (type === "reminder" && diffMinutes >= 0 && diffMinutes <= 120) {
    return {
      label: "Recordatorio próximo",
      className: "border-yellow-200 bg-yellow-50 text-yellow-800",
    };
  }

  return {
    label: getCalendarTypeLabel(type),
    className: getCalendarTypeClass(type),
  };
}

function buildCalendarItems(apiItems, tasks) {
  const normalizedApiItems = normalizeList(apiItems);

  const apiCalendarItems = normalizedApiItems
    .filter((item) => getCalendarItemDate(item))
    .map((item) => ({
      ...item,
      id: getCalendarRealId(item) || item.id,
      original_id: item.id,
      type: item.type || getCalendarType(item),
      start: getCalendarItemDate(item),
      end: getCalendarItemEndDate(item),
    }));

  const existingKeys = new Set(apiCalendarItems.map((item) => getCalendarItemKey(item)));

  const taskItems = tasks
    .filter((task) => task.due_at && !taskIsClosed(task))
    .map((task) => ({
      id: task.id,
      type: "task",
      title: task.title,
      start: task.due_at,
      due_at: task.due_at,
      group: task.group,
      group_name: task.group_name,
      assigned_to: task.assigned_to,
      assigned_to_name: task.assigned_to_name,
      priority: task.priority,
      status: task.status,
      task_type: task.task_type,
      description: task.description,
      can_edit_details: task.can_edit_details,
      can_follow_up: task.can_follow_up,
      can_complete: task.can_complete,
      is_read_only: task.is_read_only,
      source: "task",
    }))
    .filter((item) => !existingKeys.has(getCalendarItemKey(item)));

  const taskReminderItems = tasks
    .filter((task) => task.reminder_at && !taskIsClosed(task))
    .map((task) => ({
      id: task.id,
      type: "task_reminder",
      title: `Recordatorio: ${task.title}`,
      start: task.reminder_at,
      remind_at: task.reminder_at,
      reminder_at: task.reminder_at,
      group: task.group,
      group_name: task.group_name,
      assigned_to: task.assigned_to,
      assigned_to_name: task.assigned_to_name,
      task_id: task.id,
      priority: task.priority,
      status: task.status,
      task_type: task.task_type,
      description: task.description,
      can_edit_details: task.can_edit_details,
      can_follow_up: task.can_follow_up,
      can_complete: task.can_complete,
      is_read_only: task.is_read_only,
      source: "task_reminder",
    }))
    .filter((item) => !existingKeys.has(getTaskReminderCalendarKey(item)));

  return [...apiCalendarItems, ...taskItems, ...taskReminderItems]
    .filter((item) => getCalendarItemDate(item))
    .filter((item) => !calendarItemIsClosed(item))
    .sort(
      (firstItem, secondItem) =>
        getDateTimeValue(getCalendarItemDate(firstItem)) -
        getDateTimeValue(getCalendarItemDate(secondItem))
    );
}

function buildFullCalendarEvents(items) {
  return items.map((item) => {
    const type = getCalendarType(item);

    return {
      id: `${item.type || type}-${item.id}`,
      title: item.title,
      start: getCalendarItemDate(item),
      end: getCalendarItemEndDate(item) || undefined,
      display: "block",
      extendedProps: {
        item,
        type,
      },
    };
  });
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
    is_important: false,
  };
}

function buildEventFormFromDate(dateStr) {
  const startDate = new Date(`${dateStr}T09:00:00`);
  const endDate = new Date(`${dateStr}T10:00:00`);

  return {
    ...INITIAL_EVENT_FORM,
    start_at: formatDateTimeLocal(startDate),
    end_at: formatDateTimeLocal(endDate),
  };
}

function buildEventFormFromEvent(eventItem) {
  return {
    title: eventItem.title || "",
    description: eventItem.description || "",
    event_type: eventItem.event_type || "meeting",
    group: eventItem.group ? String(eventItem.group) : "",
    assigned_to: eventItem.assigned_to ? String(eventItem.assigned_to) : "",
    start_at: formatDateTimeLocal(eventItem.start_at || eventItem.start),
    end_at: formatDateTimeLocal(eventItem.end_at || eventItem.end),
    location: eventItem.location || "",
  };
}

function buildTaskFormFromTask(task) {
  return {
    title: task.title || "",
    description: task.description || "",
    task_type: task.task_type || "general",
    priority: task.priority || "medium",
    group: task.group ? String(task.group) : "",
    assigned_to: task.assigned_to ? String(task.assigned_to) : "",
    due_at: formatDateTimeLocal(task.due_at || task.start),
    reminder_at: formatDateTimeLocal(task.reminder_at || task.remind_at),
    is_important: false,
  };
}

function getEventValidationMessage(form) {
  if (!form.title.trim()) return "Ingresa el título del evento.";
  if (!form.start_at) return "Selecciona la fecha y hora de inicio.";
  if (!form.end_at) return "Selecciona la fecha y hora de fin.";

  const startDate = new Date(form.start_at);
  const endDate = new Date(form.end_at);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return "Revisa las fechas del evento. Una de las fechas no es válida.";
  }

  if (endDate < startDate) return "La fecha de fin no puede ser anterior al inicio.";

  return "";
}

function getTaskValidationMessage(form) {
  if (!form.title.trim()) return "Ingresa el título de la tarea.";

  if (form.due_at && form.reminder_at) {
    const dueDate = new Date(form.due_at);
    const reminderDate = new Date(form.reminder_at);

    if (Number.isNaN(dueDate.getTime()) || Number.isNaN(reminderDate.getTime())) {
      return "Revisa la fecha límite y el recordatorio. Una de las fechas no es válida.";
    }

    if (reminderDate > dueDate) return "El recordatorio no puede ser después de la fecha límite.";
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
        if (field === "event_type") return `Tipo de evento: ${message}`;
        if (field === "task_type") return `Categoría: ${message}`;
        if (field === "start_at") return `Inicio: ${message}`;
        if (field === "end_at") return `Fin: ${message}`;
        if (field === "due_at") return `Fecha límite: ${message}`;
        if (field === "reminder_at") return `Recordatorio: ${message}`;
        if (field === "title") return `Título: ${message}`;

        return `${field}: ${message}`;
      })
      .filter(Boolean);

    return messages.join(" ") || fallbackMessage;
  }

  return fallbackMessage;
}

function groupItemsByMobilePeriod(items) {
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const tomorrowStart = new Date(todayStart);
  const weekEnd = new Date(todayStart);

  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const overdueItems = [];
  const todayItems = [];
  const nextItems = [];
  const laterItems = [];

  items.forEach((item) => {
    const itemDate = new Date(getCalendarItemDate(item));

    if (Number.isNaN(itemDate.getTime())) return;

    if (itemDate < todayStart) {
      overdueItems.push(item);
      return;
    }

    if (itemDate >= todayStart && itemDate < tomorrowStart) {
      todayItems.push(item);
      return;
    }

    if (itemDate <= weekEnd) {
      nextItems.push(item);
      return;
    }

    laterItems.push(item);
  });

  return {
    overdueItems,
    todayItems,
    nextItems,
    laterItems,
  };
}

function getDateKey(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "sin-fecha";

  return date.toISOString().slice(0, 10);
}

function getItemsForDate(items, dateKey) {
  return items.filter((item) => getDateKey(getCalendarItemDate(item)) === dateKey);
}

function getMonthCalendarDays(monthDate) {
  const baseDate = new Date(monthDate);

  if (Number.isNaN(baseDate.getTime())) return [];

  const firstDay = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  const lastDay = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
  const days = [];

  for (let index = 0; index < firstDay.getDay(); index += 1) {
    days.push(null);
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    days.push(new Date(baseDate.getFullYear(), baseDate.getMonth(), day));
  }

  return days;
}

function moveMonth(value, amount) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return formatDateOnly(new Date());

  date.setMonth(date.getMonth() + amount);

  return formatDateOnly(date);
}

function getStartOfWeek(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
  }

  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay());
}

function getWeekCalendarDays(value) {
  const startDate = getStartOfWeek(value);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);

    return date;
  });
}

function moveWeek(value, amount) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return formatDateOnly(new Date());

  date.setDate(date.getDate() + amount * 7);

  return formatDateOnly(date);
}

function formatWeekRangeTitle(value) {
  const weekDays = getWeekCalendarDays(value);
  const firstDay = weekDays[0];
  const lastDay = weekDays[6];

  return `${new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
  }).format(firstDay)} - ${new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(lastDay)}`;
}

function formatWeekDayLabel(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Día";

  return new Intl.DateTimeFormat("es-PE", {
    weekday: "short",
  }).format(date);
}

export default function WorkspaceCalendarPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const returnContext = resolveReturnContext(location.state);

  const canAssignToOthers = userHasPermission(
    user,
    ["workspaces.assign_work"]
  );
  const calendarRef = useRef(null);

  const [calendarRange, setCalendarRange] = useState(getInitialCalendarRange);
  const [calendarItems, setCalendarItems] = useState([]);
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);

  const [typeFilter, setTypeFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("");
  const [mobileViewMode, setMobileViewMode] = useState("agenda");

  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [detailMode, setDetailMode] = useState("view");

  const [showEventForm, setShowEventForm] = useState(false);
  const [eventForm, setEventForm] = useState(INITIAL_EVENT_FORM);
  const [editEventForm, setEditEventForm] = useState(INITIAL_EVENT_FORM);
  const [editTaskForm, setEditTaskForm] = useState(INITIAL_TASK_FORM);

  const [calendarView, setCalendarView] = useState("dayGridMonth");
  const [calendarInitialDate, setCalendarInitialDate] = useState(formatDateOnly(new Date()));
  const [calendarRenderKey, setCalendarRenderKey] = useState(0);

  const [isCompactScreen, setIsCompactScreen] = useState(getInitialCompactMode);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isCompletingTask, setIsCompletingTask] = useState(false);
  const [isOpeningDetail, setIsOpeningDetail] = useState(false);
  const [error, setError] = useState("");

  const filteredCalendarItems = useMemo(() => {
    return calendarItems.filter((item) => {
      const itemType = getCalendarType(item);

      if (typeFilter !== "all" && itemType !== typeFilter) return false;

      if (groupFilter) {
        const selectedGroup = groups.find((group) => String(group.id) === groupFilter);
        const itemGroup = item.group || item.group_id;
        const itemGroupName = item.group_name || item.groupName || "";

        if (itemGroup && String(itemGroup) === groupFilter) return true;
        if (selectedGroup && itemGroupName === selectedGroup.name) return true;

        return false;
      }

      return true;
    });
  }, [calendarItems, groupFilter, groups, typeFilter]);

  const fullCalendarEvents = useMemo(
    () => buildFullCalendarEvents(filteredCalendarItems),
    [filteredCalendarItems]
  );

  const agendaItems = useMemo(() => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    return filteredCalendarItems
      .filter((item) => {
        const date = new Date(getCalendarItemDate(item));

        if (Number.isNaN(date.getTime())) return false;

        if (getCalendarType(item) === "event") {
          const endValue = getCalendarItemEndDate(item);
          const endDate = endValue ? new Date(endValue) : null;

          if (endDate && !Number.isNaN(endDate.getTime())) return endDate >= todayStart;
        }

        return date >= todayStart;
      })
      .slice(0, 8);
  }, [filteredCalendarItems]);

  const todayItems = useMemo(() => {
    const today = new Date();

    return filteredCalendarItems.filter((item) => {
      const itemDate = new Date(getCalendarItemDate(item));

      if (Number.isNaN(itemDate.getTime())) return false;

      return (
        itemDate.getFullYear() === today.getFullYear() &&
        itemDate.getMonth() === today.getMonth() &&
        itemDate.getDate() === today.getDate()
      );
    });
  }, [filteredCalendarItems]);

  const activeEventItems = useMemo(() => {
    const now = new Date();

    return filteredCalendarItems.filter((item) => {
      if (getCalendarType(item) !== "event") return false;

      const startDate = new Date(getCalendarItemDate(item));
      const endDate = new Date(getCalendarItemEndDate(item));

      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return false;

      return now >= startDate && now <= endDate;
    });
  }, [filteredCalendarItems]);

  const nextEventItems = useMemo(() => {
    const now = new Date();
    const twoHoursLater = new Date(now.getTime() + 120 * 60000);

    return filteredCalendarItems.filter((item) => {
      if (getCalendarType(item) !== "event") return false;

      const startDate = new Date(getCalendarItemDate(item));

      if (Number.isNaN(startDate.getTime())) return false;

      return startDate >= now && startDate <= twoHoursLater;
    });
  }, [filteredCalendarItems]);

  const stats = useMemo(() => {
    return {
      total: filteredCalendarItems.length,
      today: todayItems.length,
      tasks: filteredCalendarItems.filter((item) => getCalendarType(item) === "task").length,
      events: filteredCalendarItems.filter((item) => getCalendarType(item) === "event").length,
      reminders: filteredCalendarItems.filter((item) => getCalendarType(item) === "reminder")
        .length,
    };
  }, [filteredCalendarItems, todayItems.length]);

  useEffect(() => {
    function handleResize() {
      setIsCompactScreen(getInitialCompactMode());
    }

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  async function loadCalendarData(range = calendarRange) {
    setError("");
    setIsLoading(true);

    try {
      const [calendarData, tasksData, groupsData, visibleUsers] = await Promise.all([
        loadCalendarItemsFromApi(range),
        getWorkspaceTasks({
          ordering: "due_at",
          page_size: 500,
        }),
        loadVisibleGroups(),
        loadVisibleUsers(user, canAssignToOthers),
      ]);

      const normalizedTasks = normalizeList(tasksData);

      setCalendarItems(buildCalendarItems(calendarData, normalizedTasks));
      setGroups(groupsData);
      setUsers(visibleUsers);
    } catch (requestError) {
      setError("No se pudo cargar las tareas del calendario. Revisa el backend o la sesión.");
      console.error(requestError);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let ignore = false;

    async function loadInitialCalendarData() {
      setError("");
      setIsLoading(true);

      try {
        const [calendarData, tasksData, groupsData, visibleUsers] = await Promise.all([
          loadCalendarItemsFromApi(calendarRange),
          getWorkspaceTasks({
            ordering: "due_at",
            page_size: 500,
          }),
          loadVisibleGroups(),
          loadVisibleUsers(user, canAssignToOthers),
        ]);

        const normalizedTasks = normalizeList(tasksData);

        if (!ignore) {
          setCalendarItems(buildCalendarItems(calendarData, normalizedTasks));
          setGroups(groupsData);
          setUsers(visibleUsers);
        }
      } catch (requestError) {
        if (!ignore) {
          setError("No se pudo cargar las tareas del calendario. Revisa el backend o la sesión.");
        }

        console.error(requestError);
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadInitialCalendarData();

    return () => {
      ignore = true;
    };
  }, [calendarRange, canAssignToOthers, user]);

  function handleDatesSet(dateInfo) {
    const nextRange = {
      start: dateInfo.startStr.slice(0, 10),
      end: dateInfo.endStr.slice(0, 10),
    };

    setCalendarView(dateInfo.view.type);

    if (nextRange.start !== calendarRange.start || nextRange.end !== calendarRange.end) {
      setCalendarRange(nextRange);
    }
  }

  function handleEventFormChange(event) {
    const { name, value } = event.target;

    setEventForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));

    if (error) setError("");
  }

  function handleEditEventFormChange(event) {
    const { name, value } = event.target;

    setEditEventForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));

    if (error) setError("");
  }

  function handleEditTaskFormChange(event) {
    const { name, value } = event.target;

    setEditTaskForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));

    if (error) setError("");
  }

  function openEventForm() {
    const today = new Date().toISOString().slice(0, 10);

    setEventForm(buildEventFormFromDate(today));
    setShowEventForm(true);
    setSelectedItem(null);
    setSelectedDetail(null);
    setDetailMode("view");
    setError("");
  }

  function openEventFormFromDate(dateInfo) {
    setEventForm(buildEventFormFromDate(dateInfo.dateStr));
    setShowEventForm(true);
    setSelectedItem(null);
    setSelectedDetail(null);
    setDetailMode("view");
    setError("");
  }

  function closeEventForm() {
    setShowEventForm(false);
    setEventForm(INITIAL_EVENT_FORM);
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
      closeEventForm();
      await loadCalendarData(calendarRange);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "No se pudo crear el evento."));
      console.error(requestError);
    } finally {
      setIsSavingEvent(false);
    }
  }

  async function handleUpdateEvent(event) {
    event.preventDefault();

    if (!selectedItem) return;

    if (!canEditCalendarItem(selectedItem, selectedDetail)) {
      setError("No tienes permiso para editar este evento.");
      setDetailMode("view");
      return;
    }

    const validationMessage = getEventValidationMessage(editEventForm);

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setError("");
    setIsSavingEdit(true);

    try {
      await updateWorkspaceEvent(getCalendarRealId(selectedDetail || selectedItem), buildEventPayload(editEventForm));
      closeDetail();
      await loadCalendarData(calendarRange);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "No se pudo actualizar el evento."));
      console.error(requestError);
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleUpdateTask(event) {
    event.preventDefault();

    const taskId =
      selectedDetail?.id || selectedItem?.task_id || selectedItem?.task || getCalendarRealId(selectedItem);

    if (!taskId) return;

    if (!canEditCalendarItem(selectedItem, selectedDetail)) {
      setError("No tienes permiso para editar los datos de esta tarea.");
      setDetailMode("view");
      return;
    }

    const validationMessage = getTaskValidationMessage(editTaskForm);

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setError("");
    setIsSavingEdit(true);

    try {
      await updateWorkspaceTask(taskId, buildTaskPayload(editTaskForm));
      closeDetail();
      await loadCalendarData(calendarRange);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "No se pudo actualizar la tarea."));
      console.error(requestError);
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleCompleteTask() {
    if (!selectedItem) return;

    if (!canCompleteCalendarItem(selectedItem, selectedDetail)) {
      setError("No tienes permiso para completar esta actividad.");
      return;
    }

    const selectedType = getCalendarType(selectedItem);
    const realId = getCalendarRealId(selectedDetail || selectedItem);
    const taskId =
      selectedDetail?.id || selectedItem?.task_id || selectedItem?.task || getCalendarRealId(selectedItem);

    setError("");
    setIsCompletingTask(true);

    try {
      if (selectedType === "reminder" && selectedItem.type !== "task_reminder") {
        await updateWorkspaceReminder(realId, {
          completed_at: new Date().toISOString(),
          is_completed: true,
          status: "completed",
        });
      } else if (taskId) {
        await changeWorkspaceTaskStatus(taskId, {
          status: "completed",
          note: "La tarea fue marcada como completada desde el calendario.",
        });
      }

      closeDetail();
      await loadCalendarData(calendarRange);
    } catch (requestError) {
      setError("No se pudo completar la actividad desde el calendario.");
      console.error(requestError);
    } finally {
      setIsCompletingTask(false);
    }
  }

  async function handleCalendarEventClick(clickInfo) {
    const item = clickInfo.event.extendedProps.item;

    await openCalendarItemDetail(item);
  }

  async function openCalendarItemDetail(item) {
    const calendarItemType = item?.type;

    if (calendarItemType === "task" || calendarItemType === "task_reminder") {
      const taskId = item.task_id || item.task || getCalendarRealId(item);

      if (taskId) {
        navigate(
          `/admin/workspace/tasks?task=${taskId}&tab=info`,
          {
            state: buildNavigationState({
              from: "/admin/workspace/calendar",
              fromLabel: "Calendario",
              fromType: "calendar",
              currentState: location.state,
            }),
          },
        );
      }

      return;
    }

    setSelectedItem(item);
    setSelectedDetail(null);
    setShowEventForm(false);
    setDetailMode("view");
    setIsOpeningDetail(true);
    setError("");

    try {
      const itemType = getCalendarType(item);
      const realId = getCalendarRealId(item);

      if (itemType === "event") {
        const eventDetail = await getWorkspaceEventById(realId);

        setSelectedDetail(eventDetail);
        setEditEventForm(buildEventFormFromEvent(eventDetail));
        return;
      }

      if (itemType === "reminder" && item.type !== "task_reminder") {
        setSelectedDetail(item);
        setEditTaskForm(INITIAL_TASK_FORM);
        return;
      }

      const taskId = item.task_id || item.task || realId;

      if (taskId) {
        const taskDetail = await getWorkspaceTaskById(taskId);

        setSelectedDetail(taskDetail);
        setEditTaskForm(buildTaskFormFromTask(taskDetail));
      }
    } catch (requestError) {
      setSelectedDetail(item);

      if (getCalendarType(item) === "event") {
        setEditEventForm(buildEventFormFromEvent(item));
      } else {
        setEditTaskForm(buildTaskFormFromTask(item));
      }

      console.error(requestError);
    } finally {
      setIsOpeningDetail(false);
    }
  }

  function closeDetail() {
    setSelectedItem(null);
    setSelectedDetail(null);
    setDetailMode("view");
    setEditEventForm(INITIAL_EVENT_FORM);
    setEditTaskForm(INITIAL_TASK_FORM);
  }

  function forceCalendarRender(nextView, nextDate) {
    setCalendarView(nextView);
    setCalendarInitialDate(nextDate);
    setCalendarRenderKey((currentKey) => currentKey + 1);
  }

  function getCurrentCalendarDate() {
    const calendarApi = calendarRef.current?.getApi();
    return calendarApi ? formatDateOnly(calendarApi.getDate()) : calendarInitialDate;
  }

  function changeCalendarView(viewName) {
    forceCalendarRender(viewName, getCurrentCalendarDate());
  }

  function goToToday() {
    forceCalendarRender(
      "timeGridDay",
      formatDateOnly(new Date()),
    );
  }

  function renderEventContent(eventInfo) {
    const type = eventInfo.event.extendedProps.type;
    const dotClass = getCalendarDotClass(type);

    return (
      <div className="flex min-w-0 items-center gap-1.5 overflow-hidden rounded-md bg-white px-1.5 py-0.5 text-gray-900 shadow-sm ring-1 ring-gray-100">
        <span className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`} />
        {eventInfo.timeText ? (
          <span className="shrink-0 text-xs font-black text-gray-500">{eventInfo.timeText}</span>
        ) : null}
        <span className="truncate text-xs font-black">{eventInfo.event.title}</span>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 bg-gray-950 px-4 py-4 text-white sm:px-6 sm:py-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wide text-red-300">ToDo</p>
              <h1 className="mt-1 text-2xl font-black leading-tight sm:text-3xl">Calendario</h1>
              <p className="mt-2 max-w-3xl text-sm leading-5 text-gray-300 sm:leading-6">
                Visualiza tareas, eventos y recordatorios del equipo Book Express.
              </p>
            </div>

            <div className="grid gap-2 sm:flex sm:flex-wrap">
              {returnContext.path ? (
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-gray-900 px-4 py-2.5 text-sm font-black text-white transition hover:bg-gray-800 sm:py-3"
                  type="button"
                  onClick={() =>
                    navigate(
                      returnContext.path,
                      { state: returnContext.state },
                    )
                  }
                >
                  <FaArrowLeft />
                  Volver a {returnContext.label || "origen"}
                </button>
              ) : null}

              <button
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white px-4 py-2.5 text-sm font-black text-gray-950 transition hover:bg-gray-100 sm:py-3"
                type="button"
                onClick={() => loadCalendarData(calendarRange)}
              >
                {isLoading ? <FaSpinner className="animate-spin" /> : <FaRegCalendarCheck />}
                Actualizar
              </button>

              <button
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-800 sm:py-3"
                type="button"
                onClick={openEventForm}
              >
                <FaPlus />
                Nuevo evento
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-0 xl:grid-cols-5">
          <CalendarMetricCard label="Actividades" value={stats.total} />
          <CalendarMetricCard label="Hoy" value={stats.today} />
          <CalendarMetricCard label="Tareas" value={stats.tasks} variant="task" />
          <CalendarMetricCard label="Eventos" value={stats.events} variant="event" />
          <CalendarMetricCard
            className="col-span-2 xl:col-span-1"
            label="Recordatorios"
            value={stats.reminders}
            variant="reminder"
          />
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 sm:px-5 sm:py-4">
          {error}
        </div>
      ) : null}

      <section className="rounded-3xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-700 sm:h-10 sm:w-10">
              <FaFilter />
            </span>
            <div>
              <h2 className="text-base font-black text-gray-950 sm:text-lg">Filtros</h2>
              <p className="text-xs font-medium leading-5 text-gray-500 sm:text-sm">
                Ordena por tipo de actividad o grupo de trabajo.
              </p>
            </div>
          </div>

          <select
            className="input-admin text-sm"
            value={groupFilter}
            onChange={(event) => setGroupFilter(event.target.value)}
          >
            <option value="">Todos los grupos</option>

            {groups.map((group) => (
              <option key={group.id} value={String(group.id)}>
                {group.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {CALENDAR_FILTERS.map((filter) => (
            <button
              key={filter.value}
              className={`shrink-0 rounded-full px-3 py-2 text-xs font-black transition sm:px-4 ${
                typeFilter === filter.value
                  ? "bg-red-700 text-white shadow-sm"
                  : "bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-700"
              }`}
              type="button"
              onClick={() => setTypeFilter(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-8 2xl:col-span-9">
          <div className="rounded-3xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
            <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wide text-red-700">
                  Agenda visual
                </p>
                <h2 className="mt-1 text-xl font-black text-gray-950 sm:text-2xl">
                  Calendario interno
                </h2>
                <p className="mt-1 text-sm leading-5 text-gray-500">
                  En móvil usa agenda, día, semana o mes en formato compacto.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <LegendItem
                  className="border-red-100 bg-red-50 text-red-700"
                  dotClassName="bg-red-700"
                  label="Tareas"
                />
                <LegendItem
                  className="border-blue-100 bg-blue-50 text-blue-700"
                  dotClassName="bg-blue-600"
                  label="Eventos"
                />
                <LegendItem
                  className="border-yellow-100 bg-yellow-50 text-yellow-800"
                  dotClassName="bg-yellow-500"
                  label="Recordatorios"
                />
              </div>
            </div>

            <div className="mb-3 grid grid-cols-4 gap-2 border-t border-gray-100 pt-3 lg:hidden">
              {MOBILE_VIEW_MODES.map((mode) => (
                <MobileModeButton
                  key={mode.value}
                  active={mobileViewMode === mode.value}
                  label={mode.label}
                  onClick={() => setMobileViewMode(mode.value)}
                />
              ))}
            </div>

            <div className="mb-3 hidden flex-col gap-3 border-t border-gray-100 pt-3 lg:flex lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                <CalendarViewButton
                  active={calendarView === "timeGridDay"}
                  label="Hoy"
                  onClick={goToToday}
                />
                <CalendarViewButton
                  active={calendarView === "timeGridWeek"}
                  label="Semana"
                  onClick={() => changeCalendarView("timeGridWeek")}
                />
                <CalendarViewButton
                  active={calendarView === "dayGridMonth"}
                  label="Mes"
                  onClick={() => changeCalendarView("dayGridMonth")}
                />
              </div>

              <p className="text-xs font-bold text-gray-500">
                Usa las flechas del calendario para avanzar o retroceder el periodo.
              </p>
            </div>

            {(activeEventItems.length > 0 || nextEventItems.length > 0) && (
              <div className="mb-3 rounded-2xl border border-blue-100 bg-blue-50 p-3">
                <p className="text-xs font-black uppercase tracking-wide text-blue-700">
                  Aviso de eventos
                </p>
                <p className="mt-1 text-sm font-bold text-blue-900">
                  {activeEventItems.length > 0
                    ? `${activeEventItems.length} evento(s) en curso.`
                    : `${nextEventItems.length} evento(s) próximo(s) en las siguientes 2 horas.`}
                </p>
              </div>
            )}

            <div className="todo-calendar relative rounded-2xl border border-gray-100 bg-white p-2 sm:p-3">
              {isLoading ? (
                <div className="pointer-events-none absolute right-3 top-3 z-20 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/95 px-3 py-2 text-xs font-black text-gray-600 shadow-sm">
                  <FaSpinner className="animate-spin" />
                  Actualizando
                </div>
              ) : null}

              <>
                  <div className="block lg:hidden">
                    {mobileViewMode === "agenda" ? (
                      <MobileCalendarList
                        items={filteredCalendarItems}
                        onSelectItem={openCalendarItemDetail}
                      />
                    ) : null}

                    {mobileViewMode === "day" ? (
                      <MobileDayCalendar
                        events={fullCalendarEvents}
                        initialDate={calendarInitialDate}
                        onDateClick={openEventFormFromDate}
                        onEventClick={handleCalendarEventClick}
                        renderEventContent={renderEventContent}
                      />
                    ) : null}

                    {mobileViewMode === "week" ? (
                      <MobileWeekCalendar
                        items={filteredCalendarItems}
                        initialDate={calendarInitialDate}
                        onSelectItem={openCalendarItemDetail}
                      />
                    ) : null}

                    {mobileViewMode === "month" ? (
                      <MobileMonthCalendar
                        items={filteredCalendarItems}
                        initialDate={calendarInitialDate}
                        onSelectItem={openCalendarItemDetail}
                      />
                    ) : null}
                  </div>

                  <div className="hidden overflow-x-auto lg:block">
                    <FullCalendar
                      key={`${calendarView}-${calendarInitialDate}-${calendarRenderKey}`}
                      ref={calendarRef}
                      allDaySlot={false}
                      contentHeight={calendarView === "dayGridMonth" ? 520 : 560}
                      dateClick={openEventFormFromDate}
                      datesSet={handleDatesSet}
                      dayHeaderFormat={{
                        weekday: isCompactScreen ? "short" : "long",
                      }}
                      dayMaxEvents={isCompactScreen ? 2 : 3}
                      dayMaxEventRows={3}
                      eventClick={handleCalendarEventClick}
                      eventContent={renderEventContent}
                      eventDisplay="block"
                      eventMaxStack={3}
                      eventMinHeight={22}
                      eventShortHeight={22}
                      eventTimeFormat={{
                        hour: "2-digit",
                        minute: "2-digit",
                        meridiem: "short",
                      }}
                      events={fullCalendarEvents}
                      expandRows
                      headerToolbar={{
                        left: "prev,next",
                        center: "title",
                        right: "",
                      }}
                      height="auto"
                      initialDate={calendarInitialDate}
                      initialView={calendarView}
                      locale="es"
                      nowIndicator
                      plugins={[classicThemePlugin, dayGridPlugin, timeGridPlugin, interactionPlugin]}
                      slotDuration="00:30:00"
                      slotEventOverlap={false}
                      slotLabelFormat={{
                        hour: "2-digit",
                        minute: "2-digit",
                        meridiem: "short",
                      }}
                      slotLabelInterval="01:00:00"
                      slotMaxTime="21:00:00"
                      slotMinTime="07:00:00"
                      stickyHeaderDates
                    />
                  </div>
                </>
            </div>

            <p className="mt-3 text-xs font-semibold leading-5 text-gray-500">
              Las tareas completadas se retiran del calendario para mantener la vista enfocada en
              pendientes reales.
            </p>
          </div>
        </div>

        <aside className="hidden space-y-4 xl:col-span-4 xl:block 2xl:col-span-3">
          <AgendaPanel items={agendaItems} onSelectItem={openCalendarItemDetail} />
        </aside>
      </section>

      {showEventForm ? (
        <CalendarDrawer
          title="Registrar evento"
          subtitle="Programa reuniones, visitas, llamadas o entregas internas."
          onClose={closeEventForm}
        >
          <EventForm
            eventForm={eventForm}
            groups={groups}
            isSaving={isSavingEvent}
            users={users}
            onCancel={closeEventForm}
            onChange={handleEventFormChange}
            onSubmit={handleCreateEvent}
          />
        </CalendarDrawer>
      ) : null}

      {selectedItem ? (
        <CalendarDrawer
          title={detailMode === "edit" ? "Editar actividad" : "Detalle de actividad"}
          subtitle={
            detailMode === "edit"
              ? "Actualiza la información registrada."
              : "Consulta la información registrada en el calendario."
          }
          onClose={closeDetail}
        >
          {detailMode === "edit" && canEditCalendarItem(selectedItem, selectedDetail) ? (
            getCalendarType(selectedItem) === "event" ? (
              <EventForm
                eventForm={editEventForm}
                groups={groups}
                isSaving={isSavingEdit}
                users={users}
                onCancel={() => setDetailMode("view")}
                onChange={handleEditEventFormChange}
                onSubmit={handleUpdateEvent}
              />
            ) : getCalendarType(selectedItem) === "task" ? (
              <TaskEditForm
                groups={groups}
                isCompleting={isCompletingTask}
                isSaving={isSavingEdit}
                taskForm={editTaskForm}
                users={users}
                onCancel={() => setDetailMode("view")}
                onChange={handleEditTaskFormChange}
                onComplete={handleCompleteTask}
                onSubmit={handleUpdateTask}
              />
            ) : (
              <ReadOnlyNotice
                text="Este recordatorio se gestiona desde el módulo de Recordatorios. Desde calendario solo puedes consultarlo o completarlo si te corresponde."
              />
            )
          ) : (
            <CalendarDetailPanel
              canComplete={canCompleteCalendarItem(selectedItem, selectedDetail)}
              canEdit={canEditCalendarItem(selectedItem, selectedDetail)}
              isCompletingTask={isCompletingTask}
              isLoading={isOpeningDetail}
              isReadOnly={isReadOnlyCalendarItem(selectedItem, selectedDetail)}
              item={selectedItem}
              itemDetail={selectedDetail}
              onCompleteTask={handleCompleteTask}
              onEdit={() => {
                if (canEditCalendarItem(selectedItem, selectedDetail)) {
                  setDetailMode("edit");
                }
              }}
            />
          )}
        </CalendarDrawer>
      ) : null}
    </div>
  );
}

function CalendarMetricCard({ className = "", label, value, variant = "default" }) {
  const variantClass = {
    default: "bg-gray-100 text-gray-700",
    task: "bg-red-50 text-red-700",
    event: "bg-blue-50 text-blue-700",
    reminder: "bg-yellow-50 text-yellow-800",
  };

  return (
    <div className={`border-b border-gray-100 p-3 sm:p-4 xl:border-b-0 xl:border-r ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black text-gray-700 sm:text-sm">{label}</p>
          <p className="mt-1 text-2xl font-black text-gray-950 sm:mt-2 sm:text-3xl">{value}</p>
        </div>

        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl sm:h-10 sm:w-10 ${
            variantClass[variant] || variantClass.default
          }`}
        >
          <FaCalendarAlt />
        </div>
      </div>
    </div>
  );
}

function CalendarViewButton({ active, label, onClick }) {
  return (
    <button
      className={`shrink-0 rounded-xl px-4 py-2 text-xs font-black transition ${
        active ? "bg-red-700 text-white shadow-sm" : "bg-gray-950 text-white hover:bg-black"
      }`}
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function MobileModeButton({ active, label, onClick }) {
  return (
    <button
      className={`rounded-xl px-2 py-2.5 text-xs font-black transition ${
        active ? "bg-red-700 text-white shadow-sm" : "bg-gray-100 text-gray-700"
      }`}
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function MobileDayCalendar({ events, initialDate, onDateClick, onEventClick, renderEventContent }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-2">
      <FullCalendar
        key={`mobile-day-${initialDate}`}
        allDaySlot={false}
        contentHeight={520}
        dateClick={onDateClick}
        dayHeaderFormat={{
          weekday: "long",
          day: "2-digit",
          month: "short",
        }}
        eventClick={onEventClick}
        eventContent={renderEventContent}
        eventDisplay="block"
        eventMaxStack={2}
        eventMinHeight={22}
        eventShortHeight={22}
        eventTimeFormat={{
          hour: "2-digit",
          minute: "2-digit",
          meridiem: "short",
        }}
        events={events}
        expandRows
        headerToolbar={{
          left: "prev,next",
          center: "title",
          right: "",
        }}
        initialDate={initialDate}
        initialView="timeGridDay"
        locale="es"
        nowIndicator
        plugins={[classicThemePlugin, timeGridPlugin, interactionPlugin]}
        slotDuration="00:30:00"
        slotEventOverlap={false}
        slotLabelFormat={{
          hour: "2-digit",
          minute: "2-digit",
          meridiem: "short",
        }}
        slotLabelInterval="01:00:00"
        slotMaxTime="21:00:00"
        slotMinTime="07:00:00"
      />
    </div>
  );
}

function MobileWeekCalendar({ initialDate, items, onSelectItem }) {
  const [weekDate, setWeekDate] = useState(initialDate);
  const [selectedDate, setSelectedDate] = useState(formatDateOnly(new Date()));

  const weekDays = useMemo(() => getWeekCalendarDays(weekDate), [weekDate]);

  const selectedItems = useMemo(() => getItemsForDate(items, selectedDate), [items, selectedDate]);

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
        <p className="text-xs font-black uppercase tracking-wide text-red-700">Vista móvil</p>
        <h3 className="mt-1 text-base font-black text-gray-950">Semana</h3>
        <p className="mt-1 text-xs leading-5 text-gray-600">
          Revisa los 7 días y toca una fecha para ver sus actividades.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <button
            className="rounded-xl bg-gray-950 px-3 py-2 text-xs font-black text-white"
            type="button"
            onClick={() => setWeekDate((currentDate) => moveWeek(currentDate, -1))}
          >
            Anterior
          </button>

          <p className="text-center text-sm font-black capitalize text-gray-950">
            {formatWeekRangeTitle(weekDate)}
          </p>

          <button
            className="rounded-xl bg-gray-950 px-3 py-2 text-xs font-black text-white"
            type="button"
            onClick={() => setWeekDate((currentDate) => moveWeek(currentDate, 1))}
          >
            Siguiente
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day) => {
            const dateKey = formatDateOnly(day);
            const dayItems = getItemsForDate(items, dateKey);
            const isSelected = selectedDate === dateKey;
            const isToday = dateKey === formatDateOnly(new Date());

            return (
              <button
                key={dateKey}
                className={`min-h-20 rounded-2xl border p-1.5 text-center transition ${
                  isSelected
                    ? "border-red-700 bg-red-700 text-white shadow-sm"
                    : isToday
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-gray-100 bg-white text-gray-800 hover:border-red-200 hover:bg-red-50"
                }`}
                type="button"
                onClick={() => setSelectedDate(dateKey)}
              >
                <span
                  className={`block text-xs font-black uppercase ${
                    isSelected ? "text-white" : "text-gray-500"
                  }`}
                >
                  {formatWeekDayLabel(day)}
                </span>

                <span className="mt-1 block text-base font-black">{day.getDate()}</span>

                {dayItems.length > 0 ? (
                  <span
                    className={`mx-auto mt-1 inline-flex min-w-6 justify-center rounded-full px-1.5 py-0.5 text-xs font-black ${
                      isSelected ? "bg-white/20 text-white" : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {dayItems.length}
                  </span>
                ) : (
                  <span
                    className={`mx-auto mt-2 block h-1.5 w-1.5 rounded-full ${
                      isSelected ? "bg-white/40" : "bg-gray-200"
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-gray-100 bg-gray-50">
        <div className="border-b border-gray-100 bg-white px-3 py-3">
          <h4 className="text-sm font-black capitalize text-gray-950">
            {formatDateTitle(selectedDate)}
          </h4>
          <p className="mt-0.5 text-xs font-semibold text-gray-500">
            {selectedItems.length} actividad(es)
          </p>
        </div>

        <div className="p-3">
          {selectedItems.length === 0 ? (
            <EmptyState text="No hay actividades registradas para este día." />
          ) : (
            <div className="space-y-2">
              {selectedItems.map((item) => (
                <MobileActivityCard
                  key={`${item.type}-${item.id}-${getCalendarItemDate(item)}`}
                  item={item}
                  onSelectItem={onSelectItem}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function MobileMonthCalendar({ initialDate, items, onSelectItem }) {
  const [monthDate, setMonthDate] = useState(initialDate);
  const [selectedDate, setSelectedDate] = useState(formatDateOnly(new Date()));

  const monthDays = useMemo(() => getMonthCalendarDays(monthDate), [monthDate]);

  const selectedItems = useMemo(() => getItemsForDate(items, selectedDate), [items, selectedDate]);

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
        <p className="text-xs font-black uppercase tracking-wide text-red-700">Vista móvil</p>
        <h3 className="mt-1 text-base font-black capitalize text-gray-950">
          {formatMonthTitle(monthDate)}
        </h3>
        <p className="mt-1 text-xs leading-5 text-gray-600">
          Toca un día para ver sus actividades.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <button
            className="rounded-xl bg-gray-950 px-3 py-2 text-xs font-black text-white"
            type="button"
            onClick={() => setMonthDate((currentDate) => moveMonth(currentDate, -1))}
          >
            Anterior
          </button>

          <p className="text-center text-sm font-black capitalize text-gray-950">
            {formatMonthTitle(monthDate)}
          </p>

          <button
            className="rounded-xl bg-gray-950 px-3 py-2 text-xs font-black text-white"
            type="button"
            onClick={() => setMonthDate((currentDate) => moveMonth(currentDate, 1))}
          >
            Siguiente
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEK_DAYS.map((day, index) => (
            <div key={`${day}-${index}`} className="py-2 text-xs font-black text-gray-500">
              {day}
            </div>
          ))}

          {monthDays.map((day, index) => {
            if (!day) {
              return <div key={`empty-${index}`} className="min-h-12 rounded-xl bg-gray-50" />;
            }

            const dateKey = formatDateOnly(day);
            const dayItems = getItemsForDate(items, dateKey);
            const isSelected = selectedDate === dateKey;
            const isToday = dateKey === formatDateOnly(new Date());

            return (
              <button
                key={dateKey}
                className={`min-h-12 rounded-xl border p-1 text-left transition ${
                  isSelected
                    ? "border-red-700 bg-red-700 text-white shadow-sm"
                    : isToday
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-gray-100 bg-white text-gray-800 hover:border-red-200 hover:bg-red-50"
                }`}
                type="button"
                onClick={() => setSelectedDate(dateKey)}
              >
                <span className="block text-xs font-black">{day.getDate()}</span>

                {dayItems.length > 0 ? (
                  <span
                    className={`mt-1 inline-flex rounded-full px-1.5 py-0.5 text-xs font-black ${
                      isSelected ? "bg-white/20 text-white" : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {dayItems.length}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-gray-100 bg-gray-50">
        <div className="border-b border-gray-100 bg-white px-3 py-3">
          <h4 className="text-sm font-black capitalize text-gray-950">
            {formatDateTitle(selectedDate)}
          </h4>
          <p className="mt-0.5 text-xs font-semibold text-gray-500">
            {selectedItems.length} actividad(es)
          </p>
        </div>

        <div className="p-3">
          {selectedItems.length === 0 ? (
            <EmptyState text="No hay actividades registradas para este día." />
          ) : (
            <div className="space-y-2">
              {selectedItems.map((item) => (
                <MobileActivityCard
                  key={`${item.type}-${item.id}-${getCalendarItemDate(item)}`}
                  item={item}
                  onSelectItem={onSelectItem}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function MobileCalendarList({ items, onSelectItem }) {
  const { overdueItems, todayItems, nextItems, laterItems } = groupItemsByMobilePeriod(items);

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-red-100 bg-red-50 p-3">
        <p className="text-xs font-black uppercase tracking-wide text-red-700">Vista móvil</p>
        <h3 className="mt-1 text-base font-black text-gray-950">Agenda compacta</h3>
        <p className="mt-1 text-xs leading-5 text-gray-600">
          Revisa tareas, eventos y recordatorios en tarjetas.
        </p>
      </div>

      <MobileCalendarSection
        emptyText="No hay actividades vencidas."
        items={overdueItems}
        title="Vencidas"
        onSelectItem={onSelectItem}
      />

      <MobileCalendarSection
        emptyText="No hay actividades para hoy."
        items={todayItems}
        title="Hoy"
        onSelectItem={onSelectItem}
      />

      <MobileCalendarSection
        emptyText="No hay actividades próximas."
        items={nextItems}
        title="Próximos 7 días"
        onSelectItem={onSelectItem}
      />

      <MobileCalendarSection
        emptyText="No hay actividades posteriores."
        items={laterItems}
        title="Más adelante"
        onSelectItem={onSelectItem}
      />
    </div>
  );
}

function MobileCalendarSection({ emptyText, items, title, onSelectItem }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-100 bg-gray-50">
      <button
        className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left"
        type="button"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
      >
        <div className="min-w-0">
          <h3 className="text-sm font-black text-gray-950">{title}</h3>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-gray-600">
            {items.length}
          </span>
          <FaChevronDown
            className={`text-xs text-gray-500 transition ${isOpen ? "rotate-180" : "rotate-0"}`}
          />
        </div>
      </button>

      {isOpen ? (
        <div className="border-t border-gray-100 p-3">
          {items.length === 0 ? (
            <EmptyState text={emptyText} />
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <MobileActivityCard
                  key={`${item.type}-${item.id}-${getCalendarItemDate(item)}`}
                  item={item}
                  onSelectItem={onSelectItem}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

function MobileActivityCard({ item, onSelectItem }) {
  const type = getCalendarType(item);

  return (
    <button
      className="w-full rounded-2xl border border-gray-100 bg-white p-3 text-left shadow-sm transition hover:border-red-200 hover:bg-red-50"
      type="button"
      onClick={() => onSelectItem(item)}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-black ${getCalendarTypeClass(
            type
          )}`}
        >
          {getCalendarTypeLabel(type)}
        </span>

        <span className="shrink-0 text-xs font-black text-gray-500">
          {formatShortTime(getCalendarItemDate(item))}
        </span>
      </div>

      <h4 className="mt-2 line-clamp-2 text-sm font-black text-gray-950">{item.title}</h4>

      <div className="mt-2 grid gap-1.5 text-xs font-bold text-gray-500">
        <span className="inline-flex items-center gap-2">
          <FaClock />
          {formatShortDate(getCalendarItemDate(item))}
        </span>

        <span className="inline-flex items-center gap-2">
          <FaFolderOpen />
          {item.group_name || "Sin grupo"}
        </span>

        <span className="inline-flex items-center gap-2">
          <FaUserCheck />
          {item.assigned_to_name || "Sin asignar"}
        </span>

        {getCalendarItemEndDate(item) ? (
          <span className="inline-flex items-center gap-2">
            <FaClock />
            Fin: {formatShortDate(getCalendarItemEndDate(item))}
          </span>
        ) : null}
      </div>
    </button>
  );
}

function CalendarDrawer({ children, subtitle, title, onClose }) {
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
              <p className="text-xs font-black uppercase tracking-wide text-red-300">Calendario</p>
              <h2 className="mt-1 text-xl font-black sm:text-2xl">{title}</h2>
              {subtitle ? <p className="mt-1 text-sm leading-5 text-gray-300">{subtitle}</p> : null}
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

        <div className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-5">{children}</div>
      </aside>
    </div>
  );
}

function LegendItem({ className, dotClassName, label }) {
  return (
    <div
      className={`flex items-center justify-center gap-2 rounded-full border px-2 py-2 text-center text-xs font-black ${className}`}
    >
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${dotClassName}`}
        aria-hidden="true"
      />
      {label}
    </div>
  );
}

function AgendaPanel({ items, onSelectItem }) {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-4">
        <p className="text-xs font-black uppercase tracking-wide text-red-700">
          Próximas actividades
        </p>
        <h2 className="mt-1 text-xl font-black text-gray-950">Agenda</h2>
        <p className="mt-1 text-sm leading-5 text-gray-500">
          Vista rápida de eventos, tareas y recordatorios próximos.
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState text="No hay actividades próximas para este filtro." />
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const type = getCalendarType(item);
            const agendaState = getAgendaState(item);

            return (
              <button
                key={`${item.type}-${item.id}-${getCalendarItemDate(item)}`}
                className="w-full rounded-2xl border border-gray-100 bg-gray-50 p-3 text-left transition hover:border-red-200 hover:bg-red-50"
                type="button"
                onClick={() => onSelectItem(item)}
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-black ${agendaState.className}`}
                  >
                    {agendaState.label}
                  </span>

                  <span className="text-xs font-bold text-gray-500">
                    {formatShortDate(getCalendarItemDate(item))}
                  </span>
                </div>

                <p className="mt-2 line-clamp-2 text-sm font-black text-gray-950">{item.title}</p>

                <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-gray-500">
                  {item.group_name ? (
                    <span className="inline-flex items-center gap-1">
                      <FaFolderOpen />
                      {item.group_name}
                    </span>
                  ) : null}

                  {item.assigned_to_name ? (
                    <span className="inline-flex items-center gap-1">
                      <FaUserCheck />
                      {item.assigned_to_name}
                    </span>
                  ) : null}

                  {type === "event" && getCalendarItemEndDate(item) ? (
                    <span className="inline-flex items-center gap-1">
                      <FaClock />
                      Fin: {formatShortDate(getCalendarItemEndDate(item))}
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function EventForm({ eventForm, groups, isSaving, users, onCancel, onChange, onSubmit }) {
  return (
    <form className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm" onSubmit={onSubmit}>
      <div className="mb-4">
        <p className="text-xs font-black uppercase tracking-wide text-red-700">Evento</p>
        <h3 className="mt-1 text-xl font-black text-gray-950">Datos del evento</h3>
        <p className="mt-1 text-sm leading-5 text-gray-500">
          El sistema usará la hora de inicio para destacar eventos próximos o en curso.
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <label
            className="mb-1.5 block text-xs font-black uppercase tracking-wide text-gray-500"
            htmlFor="event_title"
          >
            Título
          </label>
          <input
            className="input-admin"
            id="event_title"
            name="title"
            placeholder="Ejemplo: Reunión con equipo comercial"
            type="text"
            value={eventForm.title}
            onChange={onChange}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            id="event_type"
            label="Tipo"
            name="event_type"
            options={EVENT_TYPE_OPTIONS}
            value={eventForm.event_type}
            onChange={onChange}
          />

          <SelectField
            id="event_group"
            label="Grupo"
            name="group"
            options={groups.map((group) => ({
              value: String(group.id),
              label: group.name,
            }))}
            placeholder="Sin grupo"
            value={eventForm.group}
            onChange={onChange}
          />

          <SelectField
            id="event_assigned_to"
            label="Responsable"
            name="assigned_to"
            options={users.map((userItem) => ({
              value: String(userItem.id),
              label: getUserLabel(userItem),
            }))}
            placeholder="Para mí"
            value={eventForm.assigned_to}
            onChange={onChange}
          />

          <div>
            <label
              className="mb-1.5 block text-xs font-black uppercase tracking-wide text-gray-500"
              htmlFor="event_location"
            >
              Lugar
            </label>
            <input
              className="input-admin"
              id="event_location"
              name="location"
              placeholder="Oficina, colegio o videollamada"
              type="text"
              value={eventForm.location}
              onChange={onChange}
            />
          </div>

          <DateTimeField
            id="event_start_at"
            label="Inicio"
            name="start_at"
            value={eventForm.start_at}
            onChange={onChange}
          />

          <DateTimeField
            id="event_end_at"
            label="Fin"
            name="end_at"
            value={eventForm.end_at}
            onChange={onChange}
          />
        </div>

        <div>
          <label
            className="mb-1.5 block text-xs font-black uppercase tracking-wide text-gray-500"
            htmlFor="event_description"
          >
            Descripción
          </label>
          <textarea
            className="input-admin min-h-20 resize-none"
            id="event_description"
            name="description"
            placeholder="Detalle interno del evento"
            value={eventForm.description}
            onChange={onChange}
          />
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
          <button
            className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-black text-gray-700 transition hover:bg-gray-50"
            type="button"
            onClick={onCancel}
          >
            Cancelar
          </button>

          <button
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-3 text-sm font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
            type="submit"
          >
            {isSaving ? <FaSpinner className="animate-spin" /> : <FaPlus />}
            {isSaving ? "Guardando..." : "Guardar evento"}
          </button>
        </div>
      </div>
    </form>
  );
}

function TaskEditForm({
  groups,
  isCompleting,
  isSaving,
  taskForm,
  users,
  onCancel,
  onChange,
  onComplete,
  onSubmit,
}) {
  return (
    <form className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm" onSubmit={onSubmit}>
      <div className="mb-4">
        <p className="text-xs font-black uppercase tracking-wide text-red-700">Tarea</p>
        <h3 className="mt-1 text-xl font-black text-gray-950">Editar tarea</h3>
        <p className="mt-1 text-sm leading-5 text-gray-500">
          Actualiza fecha, recordatorio, responsable o marca la tarea como completada.
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <label
            className="mb-1.5 block text-xs font-black uppercase tracking-wide text-gray-500"
            htmlFor="task_title"
          >
            Actividad
          </label>
          <input
            className="input-admin"
            id="task_title"
            name="title"
            type="text"
            value={taskForm.title}
            onChange={onChange}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            id="task_group"
            label="Grupo"
            name="group"
            options={groups.map((group) => ({
              value: String(group.id),
              label: group.name,
            }))}
            placeholder="Sin grupo"
            value={taskForm.group}
            onChange={onChange}
          />

          <SelectField
            id="task_assigned_to"
            label="Responsable"
            name="assigned_to"
            options={users.map((userItem) => ({
              value: String(userItem.id),
              label: getUserLabel(userItem),
            }))}
            placeholder="Para mí"
            value={taskForm.assigned_to}
            onChange={onChange}
          />

          <DateTimeField
            id="task_due_at"
            label="Fecha límite"
            name="due_at"
            value={taskForm.due_at}
            onChange={onChange}
          />

          <DateTimeField
            id="task_reminder_at"
            label="Recordatorio"
            name="reminder_at"
            value={taskForm.reminder_at}
            onChange={onChange}
          />

          <SelectField
            id="task_type"
            label="Categoría"
            name="task_type"
            options={TASK_CATEGORY_OPTIONS}
            value={taskForm.task_type}
            onChange={onChange}
          />

          <SelectField
            id="task_priority"
            label="Prioridad"
            name="priority"
            options={PRIORITY_OPTIONS}
            value={taskForm.priority}
            onChange={onChange}
          />
        </div>

        <div>
          <label
            className="mb-1.5 block text-xs font-black uppercase tracking-wide text-gray-500"
            htmlFor="task_description"
          >
            Descripción
          </label>
          <textarea
            className="input-admin min-h-20 resize-none"
            id="task_description"
            name="description"
            value={taskForm.description}
            onChange={onChange}
          />
        </div>

        <div className="flex flex-col gap-2 border-t border-gray-100 pt-4">
          <button
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-black text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isCompleting}
            type="button"
            onClick={onComplete}
          >
            {isCompleting ? <FaSpinner className="animate-spin" /> : <FaCheckCircle />}
            {isCompleting ? "Completando..." : "Marcar como completada"}
          </button>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-black text-gray-700 transition hover:bg-gray-50"
              type="button"
              onClick={onCancel}
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
  );
}

function CalendarDetailPanel({
  canComplete,
  canEdit,
  isCompletingTask,
  isLoading,
  isReadOnly,
  item,
  itemDetail,
  onCompleteTask,
  onEdit,
}) {
  const type = getCalendarType(item);
  const isEvent = type === "event";
  const isReminder = type === "reminder";
  const agendaState = getAgendaState(item);

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
      {isLoading ? (
        <div className="flex items-center gap-2 rounded-2xl bg-gray-50 p-4 text-sm font-bold text-gray-500">
          <FaSpinner className="animate-spin" />
          Cargando detalle...
        </div>
      ) : (
        <div className="space-y-3">
          <div className={`rounded-2xl border p-4 ${getCalendarTypeClass(type)}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wide">
                  {getCalendarTypeLabel(type)}
                </p>
                <h3 className="mt-2 text-base font-black">{item.title}</h3>
              </div>

              <span
                className={`rounded-full border px-3 py-1 text-xs font-black ${agendaState.className}`}
              >
                {agendaState.label}
              </span>
            </div>
          </div>

          <InfoRow
            icon={<FaClock />}
            label={isEvent ? "Inicio" : "Fecha"}
            value={formatDateTime(getCalendarItemDate(item))}
          />

          {getCalendarItemEndDate(item) ? (
            <InfoRow
              icon={<FaClock />}
              label="Fin"
              value={formatDateTime(getCalendarItemEndDate(item))}
            />
          ) : null}

          <InfoRow
            icon={<FaFolderOpen />}
            label="Grupo"
            value={itemDetail?.group_name || item.group_name || "Sin grupo"}
          />

          <InfoRow
            icon={<FaUserCheck />}
            label="Responsable"
            value={itemDetail?.assigned_to_name || item.assigned_to_name || "Sin asignar"}
          />

          {isEvent ? (
            <>
              <InfoRow
                icon={<FaRegCalendarCheck />}
                label="Tipo de evento"
                value={getEventTypeLabel(itemDetail?.event_type || item.event_type)}
              />

              <InfoRow
                icon={<FaEye />}
                label="Lugar"
                value={itemDetail?.location || item.location || "Sin lugar registrado"}
              />
            </>
          ) : isReminder ? (
            <InfoRow
              icon={<FaRegCalendarCheck />}
              label="Estado"
              value={itemDetail?.status_display || item.status_display || "Pendiente"}
            />
          ) : (
            <>
              <InfoRow
                icon={<FaRegCalendarCheck />}
                label="Categoría"
                value={getTaskCategoryLabel(itemDetail?.task_type || item.task_type)}
              />

              <InfoRow
                icon={<FaEye />}
                label="Prioridad"
                value={getPriorityLabel(itemDetail?.priority || item.priority)}
              />
            </>
          )}

          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-gray-500">Descripción</p>
            <p className="mt-2 text-sm leading-6 text-gray-700">
              {itemDetail?.description || item.description || "Sin descripción registrada."}
            </p>
          </div>

          {isReadOnly ? (
            <ReadOnlyNotice text="Puedes ver esta actividad porque pertenece a un grupo donde participas, pero no está asignada a ti." />
          ) : null}

          <div className="flex flex-col gap-2 border-t border-gray-100 pt-4">
            {canEdit ? (
              <button
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-3 text-sm font-black text-white transition hover:bg-red-800"
                type="button"
                onClick={onEdit}
              >
                <FaEdit />
                Editar
              </button>
            ) : null}

            {!isEvent && canComplete ? (
              <button
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-black text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isCompletingTask}
                type="button"
                onClick={onCompleteTask}
              >
                {isCompletingTask ? <FaSpinner className="animate-spin" /> : <FaCheckCircle />}
                {isCompletingTask ? "Completando..." : "Marcar como completada"}
              </button>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}

function ReadOnlyNotice({ text }) {
  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold leading-6 text-blue-700">
      {text}
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-4">
      <div className="mt-0.5 text-gray-500">{icon}</div>
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-gray-500">{label}</p>
        <p className="mt-1 text-sm font-black text-gray-900">{value}</p>
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

function DateTimeField({ id, label, name, value, onChange }) {
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
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm font-semibold text-gray-500 sm:p-5">
      {text}
    </div>
  );
}