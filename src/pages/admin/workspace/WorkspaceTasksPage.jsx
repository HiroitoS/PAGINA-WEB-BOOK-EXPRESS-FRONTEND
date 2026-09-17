import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import {
  FaCheckCircle,
  FaChevronDown,
  FaClock,
  FaCommentDots,
  FaEdit,
  FaFolderOpen,
  FaHistory,
  FaPlus,
  FaRegCalendarAlt,
  FaSpinner,
  FaTasks,
  FaTimes,
  FaUndo,
  FaUserCheck,
} from "react-icons/fa";
import {
  createWorkspaceTask,
  getWorkspaceAssignableUsers,
  getWorkspaceGroups,
  getWorkspaceTaskById,
  getWorkspaceTasks,
  registerWorkspaceTaskManagement,
  reopenWorkspaceTask,
  updateWorkspaceTask,
} from "../../../api/adminApi";
import { useAuth } from "../../../hooks/useAuth";
import { userHasPermission } from "../../../utils/adminAccess";
import { getResults } from "../../../utils/formatters";

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

const STATUS_OPTIONS = [
  { value: "pending", label: "Pendiente" },
  { value: "in_progress", label: "En proceso" },
  { value: "waiting", label: "En espera" },
  { value: "completed", label: "Completada" },
  { value: "cancelled", label: "Cancelada" },
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

const ACTION_TYPE_OPTIONS = [
  { value: "comment", label: "Comentario" },
  { value: "call", label: "Llamada" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "meeting", label: "Reunión" },
  { value: "visit", label: "Visita" },
  { value: "sample_delivery", label: "Entrega de muestra" },
  { value: "presentation", label: "Presentación" },
  { value: "evidence", label: "Evidencia" },
  { value: "other", label: "Otro" },
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

async function loadVisibleUsers(user, canAssignToOthers = false) {
  if (!canAssignToOthers) {
    return getFallbackCurrentUser(user);
  }

  try {
    const usersData = await getWorkspaceAssignableUsers();
    const normalizedUsers = normalizeList(usersData);

    if (normalizedUsers.length > 0) {
      return normalizedUsers;
    }

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
    console.error("No se pudo cargar grupos de trabajo.", requestError);
    return [];
  }
}

function getStatusLabel(status) {
  return STATUS_OPTIONS.find((option) => option.value === status)?.label || status || "Sin estado";
}

function getPriorityLabel(priority) {
  return PRIORITY_OPTIONS.find((option) => option.value === priority)?.label || priority || "Media";
}

function getTaskCategoryLabel(type) {
  return TASK_CATEGORY_OPTIONS.find((option) => option.value === type)?.label || type || "General";
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

function taskIsClosed(task) {
  return task.status === "completed" || task.status === "cancelled";
}

function taskCanEditDetails(task) {
  return task?.can_edit_details === true;
}

function taskCanFollowUp(task) {
  return task?.can_follow_up === true;
}

function taskCanComplete(task) {
  return task?.can_complete === true;
}

function taskCanReopen(task) {
  return task?.can_reopen === true;
}

function taskIsReadOnly(task) {
  return task?.is_read_only === true || (!taskCanEditDetails(task) && !taskCanFollowUp(task));
}

function sortTasks(tasks) {
  return [...tasks].sort((firstTask, secondTask) => {
    const firstClosed = taskIsClosed(firstTask);
    const secondClosed = taskIsClosed(secondTask);

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

function buildTaskTimeline(task) {
  const managementItems = (task.comments || []).map((comment) => ({
    id: `management-${comment.id}`,
    sourceId: String(comment.id),
    kind: "management",
    title: comment.action_type_display || "Gestión",
    detail: comment.comment || "",
    actor: comment.user_name || "Usuario",
    createdAt: comment.created_at,
  }));

  const statusItems = (task.status_history || task.history || []).map((historyItem) => ({
    id: `status-${historyItem.id}`,
    sourceId: String(historyItem.id),
    kind: "status",
    title: `${historyItem.old_status_display || "Sin estado"} → ${
      historyItem.new_status_display || "Nuevo estado"
    }`,
    detail: historyItem.note || "",
    actor: historyItem.changed_by_name || "Usuario",
    createdAt: historyItem.created_at,
  }));

  return [...managementItems, ...statusItems].sort(
    (firstItem, secondItem) =>
      new Date(secondItem.createdAt).getTime() -
      new Date(firstItem.createdAt).getTime()
  );
}

function buildTaskPayload(form, canAssignToOthers = false) {
  const payload = {
    title: form.title.trim(),
    description: form.description.trim(),
    task_type: form.task_type,
    priority: form.priority,
    group: form.group ? Number(form.group) : null,
    due_at: form.due_at || null,
    reminder_at: form.reminder_at || null,
    is_important: false,
  };

  if (canAssignToOthers && form.assigned_to) {
    payload.assigned_to = Number(form.assigned_to);
  }

  return payload;
}

function buildEditFormFromTask(task) {
  return {
    title: task.title || "",
    description: task.description || "",
    task_type: task.task_type || "general",
    priority: task.priority || "medium",
    group: task.group ? String(task.group) : "",
    assigned_to: task.assigned_to ? String(task.assigned_to) : "",
    due_at: formatDateTimeLocal(task.due_at),
    reminder_at: formatDateTimeLocal(task.reminder_at),
    is_important: false,
  };
}

function getTaskValidationMessage(form) {
  if (!form.title.trim()) return "Ingresa el título de la tarea.";

  if (form.reminder_at) {
    const reminderDate = new Date(form.reminder_at);

    if (Number.isNaN(reminderDate.getTime())) {
      return "Revisa el recordatorio. La fecha no es válida.";
    }
  }

  if (form.due_at) {
    const dueDate = new Date(form.due_at);

    if (Number.isNaN(dueDate.getTime())) {
      return "Revisa la fecha límite. La fecha no es válida.";
    }
  }

  if (form.due_at && form.reminder_at) {
    const dueDate = new Date(form.due_at);
    const reminderDate = new Date(form.reminder_at);

    if (reminderDate > dueDate) {
      return "El recordatorio no puede ser después de la fecha límite.";
    }
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
        if (field === "task_type") return `Categoría: ${message}`;
        if (field === "reminder_at") return `Recordatorio: ${message}`;
        if (field === "due_at") return `Fecha límite: ${message}`;
        if (field === "title") return `Título: ${message}`;
        if (field === "assigned_to") return `Asignado a: ${message}`;
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

function getReminderBeforeDue(dueAt, minutesBefore) {
  if (!dueAt) return "";

  const dueDate = new Date(dueAt);

  if (Number.isNaN(dueDate.getTime())) return "";

  dueDate.setMinutes(dueDate.getMinutes() - minutesBefore);

  return formatDateTimeLocal(dueDate);
}

function getTodayReminderAt(minutesFromNow = 60) {
  const date = new Date();
  date.setMinutes(date.getMinutes() + minutesFromNow);
  date.setSeconds(0, 0);

  return formatDateTimeLocal(date);
}

function getMobileTaskSections({
  activeTasks,
  completedTasks,
  inProgressTasks,
  overdueTasks,
  pendingTasks,
}) {
  const today = new Date();
  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

  const todayTasks = activeTasks.filter((task) => {
    const dueDate = new Date(task.due_at);

    if (Number.isNaN(dueDate.getTime())) return false;

    return dueDate <= todayEnd && !task.is_overdue;
  });

  const upcomingTasks = activeTasks.filter((task) => {
    if (task.is_overdue) return false;

    const dueDate = new Date(task.due_at);

    if (Number.isNaN(dueDate.getTime())) return !task.due_at;

    return dueDate > todayEnd;
  });

  return [
    {
      key: "overdue",
      title: "Vencidas",
      description: "Pendientes que requieren atención inmediata.",
      items: overdueTasks,
      variant: "danger",
    },
    {
      key: "today",
      title: "Para hoy",
      description: "Tareas que vencen durante el día.",
      items: todayTasks,
      variant: "default",
    },
    {
      key: "pending",
      title: "Pendientes",
      description: "Tareas activas todavía no iniciadas.",
      items: pendingTasks,
      variant: "default",
    },
    {
      key: "in_progress",
      title: "En proceso",
      description: "Actividades que ya están siendo atendidas.",
      items: inProgressTasks,
      variant: "default",
    },
    {
      key: "upcoming",
      title: "Próximas",
      description: "Pendientes con fecha posterior.",
      items: upcomingTasks,
      variant: "default",
    },
    {
      key: "completed",
      title: "Cerradas",
      description: "Tareas completadas o canceladas que conservan su historial.",
      items: completedTasks,
      variant: "success",
    },
  ];
}

export default function WorkspaceTasksPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const linkedTaskId = searchParams.get("task");
  const linkedTab = searchParams.get("tab");
  const linkedCommentId = searchParams.get("comment");
  const canAssignToOthers = userHasPermission(
    user,
    ["workspaces.assign_work"]
  );
  const canSuperviseTasks =
    canAssignToOthers ||
    userHasPermission(user, ["workspaces.supervise_workspace"]);

  const [tasks, setTasks] = useState([]);
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);

  const [taskForm, setTaskForm] = useState(INITIAL_TASK_FORM);
  const [editTaskForm, setEditTaskForm] = useState(INITIAL_TASK_FORM);
  const [selectedTask, setSelectedTask] = useState(null);
  const [openingTaskId, setOpeningTaskId] = useState(null);
  const [taskScope, setTaskScope] = useState("delegated");
  const [taskFilter, setTaskFilter] = useState("active");
  const [detailTab, setDetailTab] = useState("info");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [openMobileSections, setOpenMobileSections] = useState({
    overdue: false,
    today: false,
    pending: false,
    in_progress: false,
    upcoming: false,
    completed: false,
  });

  const [managementForm, setManagementForm] = useState({
    action_type: "comment",
    comment: "",
    status: "",
  });
  const [reopenReason, setReopenReason] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isSavingDetail, setIsSavingDetail] = useState(false);

  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [detailSuccess, setDetailSuccess] = useState("");

  const scopedTasks = useMemo(() => {
    if (!canSuperviseTasks || taskScope === "mine") {
      return tasks.filter((task) => task.assigned_to === user?.id);
    }

    if (taskScope === "delegated") {
      return tasks.filter(
        (task) =>
          task.created_by === user?.id &&
          task.assigned_to !== user?.id
      );
    }

    return tasks;
  }, [canSuperviseTasks, taskScope, tasks, user?.id]);

  const activeTasks = useMemo(
    () => scopedTasks.filter((task) => !taskIsClosed(task)),
    [scopedTasks]
  );

  const completedTasks = useMemo(
    () => scopedTasks.filter((task) => taskIsClosed(task)),
    [scopedTasks]
  );

  const overdueTasks = useMemo(() => activeTasks.filter((task) => task.is_overdue), [activeTasks]);

  const pendingTasks = useMemo(
    () => activeTasks.filter((task) => task.status === "pending"),
    [activeTasks]
  );

  const inProgressTasks = useMemo(
    () => activeTasks.filter((task) => task.status === "in_progress"),
    [activeTasks]
  );

  const visibleTasks = useMemo(() => {
    if (taskFilter === "overdue") return overdueTasks;
    if (taskFilter === "pending") return pendingTasks;
    if (taskFilter === "in_progress") return inProgressTasks;
    if (taskFilter === "completed") return completedTasks;
    if (taskFilter === "all") return [...activeTasks, ...completedTasks];

    return activeTasks;
  }, [activeTasks, completedTasks, inProgressTasks, overdueTasks, pendingTasks, taskFilter]);

  const mobileTaskSections = useMemo(
    () =>
      getMobileTaskSections({
        activeTasks,
        completedTasks,
        inProgressTasks,
        overdueTasks,
        pendingTasks,
      }),
    [activeTasks, completedTasks, inProgressTasks, overdueTasks, pendingTasks]
  );

  const scopeOptions = canSuperviseTasks
    ? [
        { value: "delegated", label: "Asignadas por mí" },
        { value: "mine", label: "Asignadas a mí" },
        { value: "all", label: "Todas visibles" },
      ]
    : [];

  const filterOptions = [
    { value: "active", label: "Activas", count: activeTasks.length },
    { value: "overdue", label: "Vencidas", count: overdueTasks.length },
    { value: "pending", label: "Pendientes", count: pendingTasks.length },
    { value: "in_progress", label: "En proceso", count: inProgressTasks.length },
    { value: "completed", label: "Cerradas", count: completedTasks.length },
    { value: "all", label: "Todas", count: activeTasks.length + completedTasks.length },
  ];

  async function loadTasksData() {
    setError("");
    setIsLoading(true);

    try {
      const [tasksData, groupsData, visibleUsers] = await Promise.all([
        getWorkspaceTasks({ ordering: "due_at" }),
        loadVisibleGroups(),
        loadVisibleUsers(user, canAssignToOthers),
      ]);

      setTasks(sortTasks(normalizeList(tasksData)));
      setGroups(groupsData);
      setUsers(visibleUsers);
    } catch (requestError) {
      setError("No se pudo cargar el módulo de tareas. Revisa el backend o la sesión.");
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
        const [tasksData, groupsData, visibleUsers] = await Promise.all([
          getWorkspaceTasks({ ordering: "due_at" }),
          loadVisibleGroups(),
          loadVisibleUsers(user, canAssignToOthers),
        ]);

        if (!ignore) {
          setTasks(sortTasks(normalizeList(tasksData)));
          setGroups(groupsData);
          setUsers(visibleUsers);
        }
      } catch (requestError) {
        if (!ignore) {
          setError("No se pudo cargar el módulo de tareas. Revisa el backend o la sesión.");
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

  useEffect(() => {
    if (!linkedTaskId) return undefined;

    let ignore = false;

    async function openLinkedTask() {
      setOpeningTaskId(linkedTaskId);
      setDetailError("");
      setDetailSuccess("");
      setDetailTab(linkedTab === "history" ? "history" : "info");

      try {
        const taskDetail = await getWorkspaceTaskById(linkedTaskId);

        if (ignore) return;

        setSelectedTask(taskDetail);
        setEditTaskForm(buildEditFormFromTask(taskDetail));
        setManagementForm({
          action_type: "comment",
          comment: "",
          status: "",
        });
        setReopenReason("");
      } catch (requestError) {
        if (!ignore) {
          setError(
            "No se pudo abrir la tarea vinculada desde la notificación."
          );
        }
        console.error(requestError);
      } finally {
        if (!ignore) {
          setOpeningTaskId(null);
        }
      }
    }

    openLinkedTask();

    return () => {
      ignore = true;
    };
  }, [linkedCommentId, linkedTab, linkedTaskId]);

  function setTaskField(name, value) {
    setTaskForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));

    if (error) setError("");
  }

  function setEditTaskField(name, value) {
    setEditTaskForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));

    if (detailError) setDetailError("");
    if (detailSuccess) setDetailSuccess("");
  }

  function handleTaskFormChange(event) {
    const { name, value, type, checked } = event.target;

    setTaskField(name, type === "checkbox" ? checked : value);
  }

  function handleEditTaskFormChange(event) {
    const { name, value, type, checked } = event.target;

    setEditTaskField(name, type === "checkbox" ? checked : value);
  }

  function resetTaskForm() {
    setTaskForm(INITIAL_TASK_FORM);
    setError("");
  }

  function toggleMobileSection(sectionKey) {
    setOpenMobileSections((currentSections) => ({
      ...currentSections,
      [sectionKey]: !currentSections[sectionKey],
    }));
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
      const createdTask = await createWorkspaceTask(
        buildTaskPayload(taskForm, canAssignToOthers)
      );

      setTaskForm(INITIAL_TASK_FORM);
      setShowCreateForm(false);
      setTaskFilter("active");

      if (canSuperviseTasks && createdTask.assigned_to !== user?.id) {
        setTaskScope("delegated");
      } else {
        setTaskScope("mine");
      }

      await loadTasksData();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "No se pudo crear la tarea."));
      console.error(requestError);
    } finally {
      setIsSavingTask(false);
    }
  }

  async function handleUpdateTask(event) {
    event.preventDefault();

    if (!selectedTask) return;

    if (!taskCanEditDetails(selectedTask)) {
      setDetailError("No tienes permiso para editar los datos de planificación de esta tarea.");
      setDetailSuccess("");
      return;
    }

    const validationMessage = getTaskValidationMessage(editTaskForm);

    if (validationMessage) {
      setDetailError(validationMessage);
      setDetailSuccess("");
      return;
    }

    setDetailError("");
    setDetailSuccess("");
    setIsSavingEdit(true);

    try {
      await updateWorkspaceTask(
        selectedTask.id,
        buildTaskPayload(editTaskForm, canAssignToOthers)
      );
      await loadTasksData();
      closeTaskDetail();
    } catch (requestError) {
      setDetailError(getApiErrorMessage(requestError, "No se pudo actualizar la tarea."));
      console.error(requestError);
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function refreshSelectedTask(taskId) {
    const taskDetail = await getWorkspaceTaskById(taskId);
    setSelectedTask(taskDetail);

    return taskDetail;
  }

  async function openTaskDetail(
    task,
    initialTab = "info",
    initialStatus = ""
  ) {
    setError("");
    setDetailError("");
    setDetailSuccess("");
    setOpeningTaskId(task.id);
    setDetailTab(initialTab);

    try {
      const taskDetail = await getWorkspaceTaskById(task.id);

      setSelectedTask(taskDetail);
      setEditTaskForm(buildEditFormFromTask(taskDetail));
      setManagementForm({
        action_type: "comment",
        comment: "",
        status: initialStatus,
      });
      setReopenReason("");
    } catch (requestError) {
      setError("No se pudo cargar el detalle de la tarea.");
      console.error(requestError);
    } finally {
      setOpeningTaskId(null);
    }
  }

  async function handleQuickComplete(task) {
    if (
      taskIsClosed(task) ||
      !taskCanFollowUp(task) ||
      !taskCanComplete(task)
    ) {
      setError("Solo el responsable puede completar una tarea activa.");
      return;
    }

    await openTaskDetail(
      task,
      "management",
      "completed"
    );
  }

  function closeTaskDetail() {
    if (linkedTaskId) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("task");
      nextParams.delete("tab");
      nextParams.delete("comment");
      nextParams.delete("event");
      nextParams.delete("at");
      setSearchParams(nextParams, { replace: true });
    }

    setSelectedTask(null);
    setEditTaskForm(INITIAL_TASK_FORM);
    setDetailTab("info");
    setDetailError("");
    setDetailSuccess("");
    setManagementForm({
      action_type: "comment",
      comment: "",
      status: "",
    });
    setReopenReason("");
  }

  async function handleRegisterManagement(event) {
    event.preventDefault();

    if (!selectedTask) return;

    if (!taskCanFollowUp(selectedTask)) {
      setDetailError("No tienes permiso para registrar gestión en esta tarea.");
      setDetailSuccess("");
      return;
    }

    if (!managementForm.comment.trim()) {
      setDetailError("Ingresa el detalle o resultado de la gestión.");
      setDetailSuccess("");
      return;
    }

    setDetailError("");
    setDetailSuccess("");
    setIsSavingDetail(true);

    try {
      const response = await registerWorkspaceTaskManagement(
        selectedTask.id,
        {
          action_type: managementForm.action_type,
          comment: managementForm.comment.trim(),
          status: managementForm.status || null,
        }
      );

      await loadTasksData();

      const taskDetail = response?.task
        ? response.task
        : await refreshSelectedTask(selectedTask.id);

      setSelectedTask(taskDetail);
      setEditTaskForm(buildEditFormFromTask(taskDetail));
      setManagementForm({
        action_type: "comment",
        comment: "",
        status: "",
      });
      setDetailTab("history");

      setDetailSuccess(
        response?.status_changed
          ? "Gestión registrada y estado actualizado correctamente."
          : "Gestión registrada correctamente. El estado se mantuvo sin cambios."
      );
    } catch (requestError) {
      setDetailError(
        getApiErrorMessage(
          requestError,
          "No se pudo registrar la gestión."
        )
      );
      console.error(requestError);
    } finally {
      setIsSavingDetail(false);
    }
  }

  async function handleReopenTask(event) {
    event.preventDefault();

    if (!selectedTask) return;

    if (!taskCanReopen(selectedTask)) {
      setDetailError("No tienes permiso para reabrir esta tarea.");
      setDetailSuccess("");
      return;
    }

    if (!reopenReason.trim()) {
      setDetailError("Ingresa el motivo de la reapertura.");
      setDetailSuccess("");
      return;
    }

    setDetailError("");
    setDetailSuccess("");
    setIsSavingDetail(true);

    try {
      const taskDetail = await reopenWorkspaceTask(
        selectedTask.id,
        {
          reason: reopenReason.trim(),
        }
      );

      await loadTasksData();
      setSelectedTask(taskDetail);
      setEditTaskForm(buildEditFormFromTask(taskDetail));
      setReopenReason("");
      setManagementForm({
        action_type: "comment",
        comment: "",
        status: "",
      });
      setDetailTab("history");
      setDetailSuccess(
        "Tarea reabierta correctamente. El motivo quedó registrado en el historial."
      );
    } catch (requestError) {
      setDetailError(
        getApiErrorMessage(
          requestError,
          "No se pudo reabrir la tarea."
        )
      );
      console.error(requestError);
    } finally {
      setIsSavingDetail(false);
    }
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="bg-gray-950 px-4 py-4 text-white sm:px-6 sm:py-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wide text-red-300">ToDo</p>
              <h1 className="mt-1 text-2xl font-black leading-tight sm:text-3xl">Tareas</h1>
              <p className="mt-2 max-w-3xl text-sm leading-5 text-gray-300 sm:leading-6">
                Organiza pendientes, fechas límite y avances del trabajo diario.
              </p>
            </div>

            <div className="grid gap-2 sm:flex sm:flex-wrap">
              <button
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white px-4 py-2.5 text-sm font-black text-gray-950 transition hover:bg-gray-100 sm:py-3"
                type="button"
                onClick={loadTasksData}
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
                {showCreateForm ? "Cerrar" : "Nueva tarea"}
              </button>
            </div>
          </div>
        </div>

        {!isLoading ? (
          <div className="grid grid-cols-2 gap-0 xl:grid-cols-4">
            <TaskMetricCard label="Activas" value={activeTasks.length} />
            <TaskMetricCard label="Vencidas" value={overdueTasks.length} variant="danger" />
            <TaskMetricCard label="En proceso" value={inProgressTasks.length} />
            <TaskMetricCard label="Cerradas" value={completedTasks.length} />
          </div>
        ) : null}
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 sm:px-5 sm:py-4">
          {error}
        </div>
      ) : null}

      {showCreateForm ? (
        <QuickTaskForm
          canAssignToOthers={canAssignToOthers}
          groups={groups}
          isSaving={isSavingTask}
          taskForm={taskForm}
          users={users}
          onChange={handleTaskFormChange}
          onReset={resetTaskForm}
          onSetField={setTaskField}
          onSubmit={handleCreateTask}
        />
      ) : null}

      {isLoading ? (
        <div className="flex min-h-52 items-center justify-center rounded-3xl border border-gray-200 bg-white p-6 text-sm font-bold text-gray-500 shadow-sm sm:p-10">
          <FaSpinner className="mr-3 animate-spin" />
          Cargando tareas...
        </div>
      ) : (
        <section className="rounded-3xl border border-gray-200 bg-white p-3 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wide text-red-700">
                {canSuperviseTasks ? "Supervisión" : "Trabajo diario"}
              </p>
              <h2 className="mt-1 text-xl font-black text-gray-950 sm:text-2xl">
                {canSuperviseTasks ? "Tareas del equipo" : "Mis tareas"}
              </h2>
              <p className="mt-1 text-sm leading-5 text-gray-500">
                {canSuperviseTasks
                  ? "Consulta lo que delegaste, tus propias tareas y el trabajo visible del equipo."
                  : "Revisa las tareas que tienes asignadas y registra el avance de tu trabajo."}
              </p>
            </div>

            {overdueTasks.length > 0 ? (
              <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
                <p className="text-xs font-black uppercase tracking-wide text-red-700">Atención</p>
                <p className="mt-1 text-sm font-black text-red-700">
                  {overdueTasks.length} tarea(s) vencida(s) en esta vista
                </p>
              </div>
            ) : null}
          </div>

          {canSuperviseTasks ? (
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {scopeOptions.map((option) => (
                <button
                  key={option.value}
                  className={`shrink-0 rounded-xl border px-4 py-2.5 text-xs font-black transition ${
                    taskScope === option.value
                      ? "border-gray-950 bg-gray-950 text-white"
                      : "border-gray-200 bg-white text-gray-700 hover:border-red-200 hover:text-red-700"
                  }`}
                  type="button"
                  onClick={() => {
                    setTaskScope(option.value);
                    setTaskFilter("active");
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}

          <div className="mb-4 hidden gap-2 overflow-x-auto pb-1 lg:flex">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-black transition ${
                  taskFilter === option.value
                    ? "bg-red-700 text-white shadow-sm"
                    : option.value === "overdue" && option.count > 0
                      ? "bg-red-50 text-red-700 hover:bg-red-100"
                      : "bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-700"
                }`}
                type="button"
                onClick={() => setTaskFilter(option.value)}
              >
                <span>{option.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    taskFilter === option.value ? "bg-white/20 text-white" : "bg-white text-gray-600"
                  }`}
                >
                  {option.count}
                </span>
              </button>
            ))}
          </div>

          <div className="block lg:hidden">
            <MobileTaskAccordion
              openingTaskId={openingTaskId}
              openSections={openMobileSections}
              sections={mobileTaskSections}
              onDetail={openTaskDetail}
              onQuickComplete={handleQuickComplete}
              onToggleSection={toggleMobileSection}
            />
          </div>

          <div className="hidden lg:block">
            {visibleTasks.length === 0 ? (
              <EmptyState text="No hay tareas para este filtro." />
            ) : (
              <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white">
                {visibleTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    openingTaskId={openingTaskId}
                    task={task}
                    onDetail={() => openTaskDetail(task)}
                    onQuickComplete={() => handleQuickComplete(task)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {selectedTask ? (
        <TaskDetailPanel
          canAssignToOthers={canAssignToOthers}
          managementForm={managementForm}
          detailError={detailError}
          detailSuccess={detailSuccess}
          detailTab={detailTab}
          editTaskForm={editTaskForm}
          groups={groups}
          isSavingDetail={isSavingDetail}
          isSavingEdit={isSavingEdit}
          selectedTask={selectedTask}
          focusCommentId={linkedCommentId}
          reopenReason={reopenReason}
          users={users}
          onRegisterManagement={handleRegisterManagement}
          onReopenTask={handleReopenTask}
          onClose={closeTaskDetail}
          onManagementChange={setManagementForm}
          onEditTaskChange={handleEditTaskFormChange}
          onSetDetailTab={setDetailTab}
          onSetEditField={setEditTaskField}
          onReopenReasonChange={setReopenReason}
          onUpdateTask={handleUpdateTask}
        />
      ) : null}
    </div>
  );
}

function QuickTaskForm({
  canAssignToOthers,
  groups,
  isSaving,
  taskForm,
  users,
  onChange,
  onReset,
  onSetField,
  onSubmit,
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
      <form onSubmit={onSubmit}>
        <div className="border-b border-gray-100 bg-gray-50 px-4 py-4 sm:px-5">
          <p className="text-xs font-black uppercase tracking-wide text-red-700">Nueva tarea</p>
          <h2 className="mt-1 text-xl font-black text-gray-950">Registrar pendiente</h2>
          <p className="mt-1 text-sm leading-5 text-gray-500">
            Ingresa la actividad, define una fecha y agrega detalles solo si corresponde.
          </p>
        </div>

        <div className="grid gap-0 lg:grid-cols-12">
          <div className="space-y-4 p-4 sm:p-5 lg:col-span-7 lg:border-r lg:border-gray-100 xl:col-span-8">
            <div>
              <label
                className="mb-1.5 block text-xs font-black uppercase tracking-wide text-gray-500"
                htmlFor="task_title"
              >
                ¿Qué se debe hacer?
              </label>

              <input
                className="input-admin"
                id="task_title"
                name="title"
                placeholder="Ejemplo: Confirmar atención de solicitud"
                type="text"
                value={taskForm.title}
                onChange={onChange}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <DateTimeField
                helper="Fecha en la que debe estar terminado."
                id="task_due_at"
                label="Fecha límite"
                name="due_at"
                value={taskForm.due_at}
                onChange={onChange}
              />

              <DateTimeField
                helper="Día y hora del aviso."
                id="task_reminder_at"
                label="Recordatorio"
                name="reminder_at"
                value={taskForm.reminder_at}
                onChange={onChange}
              />
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
              <p className="mb-2 text-xs font-black uppercase tracking-wide text-gray-500">
                Accesos rápidos
              </p>

              <div className="flex flex-wrap gap-2">
                <QuickDateButton
                  label="Vence hoy 6 p. m."
                  onClick={() => onSetField("due_at", getTodayAt(18))}
                />

                <QuickDateButton
                  label="Vence mañana 9 a. m."
                  onClick={() => onSetField("due_at", getTomorrowAt(9))}
                />

                <QuickDateButton
                  label="Recordar en 1 hora"
                  onClick={() => onSetField("reminder_at", getTodayReminderAt(60))}
                />

                <QuickDateButton
                  label="1 h antes"
                  onClick={() =>
                    onSetField("reminder_at", getReminderBeforeDue(taskForm.due_at, 60))
                  }
                />
              </div>
            </div>

            <div className="hidden lg:block">
              <label
                className="mb-1.5 block text-xs font-black uppercase tracking-wide text-gray-500"
                htmlFor="task_description_desktop"
              >
                Descripción
              </label>

              <textarea
                className="input-admin min-h-24 resize-none"
                id="task_description_desktop"
                name="description"
                placeholder="Detalle breve del pendiente, indicación o resultado esperado."
                value={taskForm.description}
                onChange={onChange}
              />
            </div>

            <button
              className="flex w-full items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left text-sm font-black text-gray-800 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 lg:hidden"
              type="button"
              onClick={() => setShowAdvanced((currentValue) => !currentValue)}
            >
              <span>Más detalles opcionales</span>
              <FaChevronDown
                className={`text-xs transition ${showAdvanced ? "rotate-180" : "rotate-0"}`}
              />
            </button>
          </div>

          <div
            className={`space-y-4 bg-gray-50 p-4 sm:p-5 lg:col-span-5 lg:block xl:col-span-4 ${
              showAdvanced ? "block" : "hidden"
            }`}
          >
            <div className="rounded-2xl border border-gray-100 bg-white p-4">
              <p className="text-xs font-black uppercase tracking-wide text-gray-500">Opcional</p>
              <h3 className="mt-1 text-base font-black text-gray-950">Detalles de la tarea</h3>
              <p className="mt-1 text-sm leading-5 text-gray-500">
                Completa estos datos cuando el pendiente tenga grupo, responsable, prioridad o
                clasificación interna.
                {canAssignToOthers
                  ? " Como administrador puedes asignarla a otro usuario."
                  : " Esta tarea quedará asignada a ti."}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
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

              {canAssignToOthers ? (
                <SelectField
                  helper="Por defecto queda para ti."
                  id="task_assigned_to"
                  label="Asignado a"
                  name="assigned_to"
                  options={users.map((user) => ({
                    value: String(user.id),
                    label: getUserLabel(user),
                  }))}
                  placeholder="Para mí"
                  value={taskForm.assigned_to}
                  onChange={onChange}
                />
              ) : (
                <div className="rounded-2xl border border-gray-100 bg-white p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                    Asignado a
                  </p>
                  <p className="mt-1 text-sm font-black text-gray-950">Para mí</p>
                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    Los usuarios de atención o catálogo crean tareas propias.
                  </p>
                </div>
              )}

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

            <div className="lg:hidden">
              <label
                className="mb-1.5 block text-xs font-black uppercase tracking-wide text-gray-500"
                htmlFor="task_description_mobile"
              >
                Descripción
              </label>

              <textarea
                className="input-admin min-h-20 resize-none"
                id="task_description_mobile"
                name="description"
                placeholder="Detalle breve del pendiente."
                value={taskForm.description}
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
              onClick={onReset}
            >
              Limpiar
            </button>

            <button
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-5 py-3 text-sm font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? <FaSpinner className="animate-spin" /> : <FaPlus />}
              {isSaving ? "Guardando..." : "Crear tarea"}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}

function MobileTaskAccordion({
  openingTaskId,
  openSections,
  sections,
  onDetail,
  onQuickComplete,
  onToggleSection,
}) {
  return (
    <div className="space-y-3">
      {sections.map((section) => {
        const isOpen = Boolean(openSections[section.key]);
        const hasItems = section.items.length > 0;

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
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-black text-gray-950">{section.title}</h3>

                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-black ${
                      section.variant === "danger" && hasItems
                        ? "bg-red-50 text-red-700"
                        : section.variant === "success"
                          ? "bg-green-50 text-green-700"
                          : hasItems
                            ? "bg-gray-100 text-gray-700"
                            : "bg-gray-50 text-gray-400"
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
                  <EmptyState text="No hay tareas en esta sección." />
                ) : (
                  <div className="space-y-2">
                    {section.items.map((task) => (
                      <CompactTaskItem
                        key={task.id}
                        openingTaskId={openingTaskId}
                        task={task}
                        onDetail={() => onDetail(task)}
                        onQuickComplete={() => onQuickComplete(task)}
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

function CompactTaskItem({
  openingTaskId,
  task,
  onDetail,
  onQuickComplete,
}) {
  const isOpening = openingTaskId === task.id;
  const isClosed = taskIsClosed(task);
  const isCompleted = task.status === "completed";
  const showReadOnly = !isClosed && taskIsReadOnly(task);
  const canQuickComplete =
    !isClosed &&
    taskCanFollowUp(task) &&
    taskCanComplete(task);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
      <div className="flex items-start gap-3">
        {canQuickComplete ? (
          <button
            aria-label={`Completar tarea: ${task.title}`}
            className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white text-xs text-transparent transition hover:border-green-300 hover:bg-green-50 hover:text-green-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isOpening}
            title="Completar con sustento"
            type="button"
            onClick={onQuickComplete}
          >
            <FaCheckCircle />
          </button>
        ) : (
          <span
            aria-hidden="true"
            className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs ${
              isCompleted
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-gray-200 bg-gray-50 text-gray-400"
            }`}
          >
            {isCompleted ? <FaCheckCircle /> : null}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`rounded-full border px-2 py-0.5 text-xs font-black ${getStatusBadgeClass(
                task.status
              )}`}
            >
              {getStatusLabel(task.status)}
            </span>

            <span
              className={`rounded-full border px-2 py-0.5 text-xs font-black ${getPriorityBadgeClass(
                task.priority
              )}`}
            >
              {getPriorityLabel(task.priority)}
            </span>

            {task.is_overdue && !isClosed ? (
              <span className="rounded-full border border-red-100 bg-red-50 px-2 py-0.5 text-xs font-black text-red-700">
                Vencida
              </span>
            ) : null}

            {showReadOnly ? (
              <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-black text-gray-600">
                Consulta
              </span>
            ) : null}
          </div>

          <h4
            className={`mt-2 line-clamp-2 text-sm font-black ${
              isCompleted ? "text-gray-400 line-through" : "text-gray-950"
            }`}
          >
            {task.title}
          </h4>

          <div className="mt-2 grid gap-1.5 text-xs font-bold text-gray-500">
            <span className="inline-flex items-center gap-2">
              <FaRegCalendarAlt />
              {formatShortDate(task.due_at)}
            </span>

            {task.reminder_at ? (
              <span className="inline-flex items-center gap-2 text-yellow-700">
                <FaClock />
                Recordatorio: {formatShortDate(task.reminder_at)}
              </span>
            ) : null}

            <span className="inline-flex items-center gap-2">
              <FaUserCheck />
              {task.assigned_to_name || "Sin asignar"}
            </span>
          </div>

          <button
            className="mt-3 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-black text-gray-700 transition hover:border-red-200 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isOpening}
            type="button"
            onClick={onDetail}
          >
            {isOpening ? "Abriendo..." : "Ver detalle"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SelectField({ helper, id, label, name, options, placeholder, value, onChange }) {
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

      {helper ? <p className="mt-1 text-xs font-semibold text-gray-500">{helper}</p> : null}
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
      className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-black text-gray-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function TaskMetricCard({ label, value, variant = "default" }) {
  const valueClass = variant === "danger" ? "text-red-700" : "text-gray-950";
  const iconClass =
    variant === "danger" ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-700";

  return (
    <div className="border-b border-gray-100 p-3 sm:p-4 xl:border-b-0 xl:border-r">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black text-gray-700 sm:text-sm">{label}</p>
          <p className={`mt-1 text-2xl font-black sm:text-3xl ${valueClass}`}>{value}</p>
        </div>

        <div className={`flex h-9 w-9 items-center justify-center rounded-2xl ${iconClass}`}>
          <FaTasks />
        </div>
      </div>
    </div>
  );
}

function TaskItem({
  openingTaskId,
  task,
  onDetail,
  onQuickComplete,
}) {
  const isOpening = openingTaskId === task.id;
  const isClosed = taskIsClosed(task);
  const isCompleted = task.status === "completed";
  const showReadOnly = !isClosed && taskIsReadOnly(task);
  const canQuickComplete =
    !isClosed &&
    taskCanFollowUp(task) &&
    taskCanComplete(task);

  return (
    <div className="border-b border-gray-100 bg-white p-4 transition last:border-b-0 hover:bg-gray-50">
      <div className="flex items-start gap-3">
        {canQuickComplete ? (
          <button
            aria-label={`Completar tarea: ${task.title}`}
            className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white text-xs text-transparent transition hover:border-green-300 hover:bg-green-50 hover:text-green-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isOpening}
            title="Completar con sustento"
            type="button"
            onClick={onQuickComplete}
          >
            <FaCheckCircle />
          </button>
        ) : (
          <span
            aria-hidden="true"
            className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs ${
              isCompleted
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-gray-200 bg-gray-50 text-gray-400"
            }`}
          >
            {isCompleted ? <FaCheckCircle /> : null}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-black ${getStatusBadgeClass(
                task.status
              )}`}
            >
              {getStatusLabel(task.status)}
            </span>

            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-black ${getPriorityBadgeClass(
                task.priority
              )}`}
            >
              {getPriorityLabel(task.priority)}
            </span>

            {task.is_overdue && !isClosed ? (
              <span className="rounded-full border border-red-100 bg-red-50 px-2.5 py-1 text-xs font-black text-red-700">
                Vencida
              </span>
            ) : null}

            {showReadOnly ? (
              <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-black text-gray-600">
                Consulta
              </span>
            ) : null}
          </div>

          <h3
            className={`mt-2 wrap-break-words text-base font-black ${
              isCompleted ? "text-gray-400 line-through" : "text-gray-950"
            }`}
          >
            {task.title}
          </h3>

          {task.description ? (
            <p
              className={`mt-1 line-clamp-2 text-sm ${
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
              {task.assigned_to_name || "Sin asignar"}
            </span>

            <span className="inline-flex items-center gap-2">
              <FaRegCalendarAlt />
              {formatShortDate(task.due_at)}
            </span>

            {task.reminder_at ? (
              <span className="inline-flex items-center gap-2 text-yellow-700">
                <FaClock />
                Recordatorio: {formatShortDate(task.reminder_at)}
              </span>
            ) : null}
          </div>

          <div className="mt-4">
            <button
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-black text-gray-700 transition hover:border-red-200 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isOpening}
              type="button"
              onClick={onDetail}
            >
              {isOpening ? "Abriendo..." : "Ver detalle"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskDetailPanel({
  canAssignToOthers,
  managementForm,
  detailError,
  detailSuccess,
  detailTab,
  editTaskForm,
  groups,
  isSavingDetail,
  isSavingEdit,
  selectedTask,
  focusCommentId,
  reopenReason,
  users,
  onRegisterManagement,
  onReopenTask,
  onClose,
  onManagementChange,
  onEditTaskChange,
  onSetDetailTab,
  onSetEditField,
  onReopenReasonChange,
  onUpdateTask,
}) {
  const canEditDetails = taskCanEditDetails(selectedTask);
  const canFollowUp = taskCanFollowUp(selectedTask);
  const canReopen = taskCanReopen(selectedTask);
  const isClosed = taskIsClosed(selectedTask);
  const isReadOnly = taskIsReadOnly(selectedTask);
  const timelineItems = buildTaskTimeline(selectedTask);
  const focusedActivityRef = useRef(null);

  const tabs = [
    { value: "info", label: "Info", icon: <FaTasks />, enabled: true },
    {
      value: "edit",
      label: "Editar",
      icon: <FaEdit />,
      enabled: canEditDetails && !isClosed,
    },
    {
      value: "management",
      label: "Gestión",
      icon: <FaCommentDots />,
      enabled: canFollowUp && !isClosed,
    },
    {
      value: "history",
      label: "Historial",
      icon: <FaHistory />,
      enabled: true,
    },
  ].filter((tab) => tab.enabled);

  const activeDetailTab = tabs.some((tab) => tab.value === detailTab)
    ? detailTab
    : "info";

  useEffect(() => {
    if (
      activeDetailTab !== "history" ||
      !focusCommentId ||
      !focusedActivityRef.current
    ) {
      return;
    }

    focusedActivityRef.current.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [activeDetailTab, focusCommentId, selectedTask.id]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }
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
        className="flex h-screen w-full flex-col overflow-hidden bg-white shadow-2xl lg:max-w-3xl"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="border-b border-gray-200 bg-white px-4 py-4 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wide text-red-700">
                Detalle de tarea
              </p>

              <h2 className="mt-1 line-clamp-2 text-lg font-black text-gray-950 sm:text-2xl">
                {selectedTask.title}
              </h2>

              <div className="mt-3 flex flex-wrap gap-2">
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-black ${getStatusBadgeClass(
                    selectedTask.status
                  )}`}
                >
                  {getStatusLabel(selectedTask.status)}
                </span>

                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-black ${getPriorityBadgeClass(
                    selectedTask.priority
                  )}`}
                >
                  {getPriorityLabel(selectedTask.priority)}
                </span>
              </div>
            </div>

            <button
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 transition hover:bg-gray-50"
              type="button"
              onClick={onClose}
            >
              <FaTimes />
            </button>
          </div>

          <nav className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition ${
                  activeDetailTab === tab.value
                    ? "bg-red-700 text-white shadow-sm"
                    : "bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-700"
                }`}
                type="button"
                onClick={() => onSetDetailTab(tab.value)}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </header>

        <div className="flex-1 overflow-y-auto bg-gray-50 px-4 py-4 sm:px-5 sm:py-5">
          {isClosed ? (
            <PermissionNotice
              title="Tarea cerrada"
              text="La tarea está protegida para conservar su trazabilidad. Puedes revisar el historial y, si corresponde retomarla, reabrirla con un motivo."
            />
          ) : canFollowUp ? (
            <PermissionNotice
              title="Tu responsabilidad"
              text="Esta tarea está asignada a ti. Registra aquí lo realizado y cambia el estado únicamente cuando corresponda."
            />
          ) : canEditDetails ? (
            <PermissionNotice
              title="Supervisión"
              text={`Puedes ajustar la planificación y revisar el historial. La gestión operativa corresponde a ${
                selectedTask.assigned_to_name || "la persona asignada"
              }.`}
            />
          ) : isReadOnly ? (
            <PermissionNotice
              title="Consulta"
              text="Puedes revisar la información y el historial, pero no modificar la tarea ni registrar gestión."
            />
          ) : null}

          {detailError ? (
            <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {detailError}
            </div>
          ) : null}

          {detailSuccess ? (
            <div className="mb-4 rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-sm font-bold text-green-700">
              {detailSuccess}
            </div>
          ) : null}

          {activeDetailTab === "info" ? (
            <section className="space-y-4">
              <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-lg font-black text-gray-950">Información actual</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Datos principales registrados para esta tarea.
                    </p>
                  </div>

                  {canEditDetails ? (
                    <button
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-xs font-black text-white transition hover:bg-red-800"
                      type="button"
                      onClick={() => onSetDetailTab("edit")}
                    >
                      <FaEdit />
                      Editar
                    </button>
                  ) : null}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoItem label="Estado" value={getStatusLabel(selectedTask.status)} />
                  <InfoItem label="Prioridad" value={getPriorityLabel(selectedTask.priority)} />
                  <InfoItem label="Categoría" value={getTaskCategoryLabel(selectedTask.task_type)} />
                  <InfoItem label="Grupo" value={selectedTask.group_name || "Sin grupo"} />
                  <InfoItem
                    label="Asignado a"
                    value={selectedTask.assigned_to_name || "Sin asignar"}
                  />
                  <InfoItem
                    label="Asignada por"
                    value={selectedTask.created_by_name || "Sistema"}
                  />
                  <InfoItem label="Fecha límite" value={formatDateTime(selectedTask.due_at)} />
                </div>

                <div className="mt-3 rounded-2xl border border-yellow-100 bg-yellow-50 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-yellow-800">
                    Recordatorio
                  </p>
                  <p className="mt-2 text-sm font-black text-gray-900">
                    {formatDateTime(selectedTask.reminder_at)}
                  </p>
                </div>

                <div className="mt-3 rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                    Descripción
                  </p>
                  <p className="mt-2 text-sm leading-6 text-gray-700">
                    {selectedTask.description || "Sin descripción registrada."}
                  </p>
                </div>
              </div>

              {isClosed && canReopen ? (
                <form
                  className="rounded-3xl border border-amber-200 bg-amber-50 p-4 shadow-sm sm:p-5"
                  onSubmit={onReopenTask}
                >
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-amber-800">
                      Retomar trabajo
                    </p>
                    <h3 className="mt-1 text-lg font-black text-gray-950">
                      Reabrir tarea
                    </h3>
                    <p className="mt-1 text-sm leading-5 text-gray-600">
                      La tarea volverá a Pendiente. El motivo quedará registrado en el historial.
                    </p>
                  </div>

                  <div className="mt-4">
                    <label
                      className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-600"
                      htmlFor="reopen_reason"
                    >
                      Motivo de reapertura *
                    </label>
                    <textarea
                      className="input-admin min-h-24 resize-none"
                      id="reopen_reason"
                      placeholder="Ejemplo: El colegio solicitó una nueva coordinación."
                      value={reopenReason}
                      onChange={(event) => onReopenReasonChange(event.target.value)}
                    />
                  </div>

                  <button
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gray-950 px-5 py-3 text-sm font-black text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    disabled={isSavingDetail}
                    type="submit"
                  >
                    {isSavingDetail ? <FaSpinner className="animate-spin" /> : <FaUndo />}
                    {isSavingDetail ? "Reabriendo..." : "Reabrir tarea"}
                  </button>
                </form>
              ) : null}
            </section>
          ) : null}

          {activeDetailTab === "edit" && canEditDetails ? (
            <form className="flex min-h-full flex-col" onSubmit={onUpdateTask}>
              <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-4">
                  <h3 className="text-lg font-black text-gray-950">Editar datos</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Actualiza la tarea. Al guardar, la lista se refrescará.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label
                      className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-500"
                      htmlFor="edit_title"
                    >
                      Actividad
                    </label>
                    <input
                      className="input-admin"
                      id="edit_title"
                      name="title"
                      type="text"
                      value={editTaskForm.title}
                      onChange={onEditTaskChange}
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <DateTimeField
                      helper="Fecha en la que debe estar terminada."
                      id="edit_due_at"
                      label="Fecha límite"
                      name="due_at"
                      value={editTaskForm.due_at}
                      onChange={onEditTaskChange}
                    />

                    <DateTimeField
                      helper="Día y hora del aviso."
                      id="edit_reminder_at"
                      label="Recordatorio"
                      name="reminder_at"
                      value={editTaskForm.reminder_at}
                      onChange={onEditTaskChange}
                    />

                    <SelectField
                      id="edit_group"
                      label="Grupo"
                      name="group"
                      options={groups.map((group) => ({
                        value: String(group.id),
                        label: group.name,
                      }))}
                      placeholder="Sin grupo"
                      value={editTaskForm.group}
                      onChange={onEditTaskChange}
                    />

                    {canAssignToOthers ? (
                      <SelectField
                        helper="Selecciona otro usuario solo si esta tarea no será para ti."
                        id="edit_assigned_to"
                        label="Asignado a"
                        name="assigned_to"
                        options={users.map((user) => ({
                          value: String(user.id),
                          label: getUserLabel(user),
                        }))}
                        placeholder="Para mí"
                        value={editTaskForm.assigned_to}
                        onChange={onEditTaskChange}
                      />
                    ) : (
                      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                        <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                          Asignado a
                        </p>
                        <p className="mt-1 text-sm font-black text-gray-950">
                          {selectedTask.assigned_to_name || "Para mí"}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-gray-500">
                          Este campo no se cambia desde tu perfil.
                        </p>
                      </div>
                    )}

                    <SelectField
                      id="edit_task_type"
                      label="Categoría"
                      name="task_type"
                      options={TASK_CATEGORY_OPTIONS}
                      value={editTaskForm.task_type}
                      onChange={onEditTaskChange}
                    />

                    <SelectField
                      id="edit_priority"
                      label="Prioridad"
                      name="priority"
                      options={PRIORITY_OPTIONS}
                      value={editTaskForm.priority}
                      onChange={onEditTaskChange}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <QuickDateButton
                      label="Hoy 6 p. m."
                      onClick={() => onSetEditField("due_at", getTodayAt(18))}
                    />
                    <QuickDateButton
                      label="Mañana 9 a. m."
                      onClick={() => onSetEditField("due_at", getTomorrowAt(9))}
                    />
                    <QuickDateButton
                      label="Recordar en 1 hora"
                      onClick={() => onSetEditField("reminder_at", getTodayReminderAt(60))}
                    />
                    <QuickDateButton
                      label="Recordar 1 h antes"
                      onClick={() =>
                        onSetEditField(
                          "reminder_at",
                          getReminderBeforeDue(editTaskForm.due_at, 60)
                        )
                      }
                    />
                    <QuickDateButton
                      label="Limpiar fechas"
                      onClick={() => {
                        onSetEditField("due_at", "");
                        onSetEditField("reminder_at", "");
                      }}
                    />
                  </div>

                  <div>
                    <label
                      className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-500"
                      htmlFor="edit_description"
                    >
                      Descripción
                    </label>
                    <textarea
                      className="input-admin min-h-24 resize-none"
                      id="edit_description"
                      name="description"
                      value={editTaskForm.description}
                      onChange={onEditTaskChange}
                    />
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 mt-4 border-t border-gray-200 bg-white px-4 py-4 sm:px-5">
                <div className="grid gap-2 sm:flex sm:justify-end">
                  <button
                    className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-black text-gray-700 transition hover:bg-gray-50"
                    type="button"
                    onClick={() => onSetDetailTab("info")}
                  >
                    Cancelar
                  </button>

                  <button
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-5 py-3 text-sm font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isSavingEdit}
                    type="submit"
                  >
                    {isSavingEdit ? <FaSpinner className="animate-spin" /> : <FaCheckCircle />}
                    {isSavingEdit ? "Guardando..." : "Guardar cambios"}
                  </button>
                </div>
              </div>
            </form>
          ) : null}

          {activeDetailTab === "management" && canFollowUp && !isClosed ? (
            <section className="space-y-4">
              <form
                className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5"
                onSubmit={onRegisterManagement}
              >
                <div className="mb-4">
                  <p className="text-xs font-black uppercase tracking-wide text-red-700">
                    Gestión de la tarea
                  </p>
                  <h3 className="mt-1 text-lg font-black text-gray-950">
                    Registrar lo realizado
                  </h3>
                  <p className="mt-1 text-sm leading-5 text-gray-500">
                    Registra una sola vez la actividad realizada. El cambio de estado es opcional.
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <SelectField
                    id="management_action_type"
                    label="Tipo de gestión"
                    name="action_type"
                    options={ACTION_TYPE_OPTIONS}
                    value={managementForm.action_type}
                    onChange={(event) =>
                      onManagementChange((currentForm) => ({
                        ...currentForm,
                        action_type: event.target.value,
                      }))
                    }
                  />

                  <SelectField
                    helper="Opcional. Déjalo sin cambio si solo estás registrando una llamada, visita o coordinación."
                    id="management_status"
                    label="Estado de la tarea"
                    name="status"
                    options={STATUS_OPTIONS.filter(
                      (option) => option.value !== selectedTask.status
                    )}
                    placeholder={`Mantener ${getStatusLabel(selectedTask.status)}`}
                    value={managementForm.status}
                    onChange={(event) =>
                      onManagementChange((currentForm) => ({
                        ...currentForm,
                        status: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="mt-3">
                  <label
                    className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-500"
                    htmlFor="management_comment"
                  >
                    Detalle / resultado *
                  </label>
                  <textarea
                    className="input-admin min-h-28 resize-none"
                    id="management_comment"
                    placeholder="Ejemplo: Se llamó al colegio, se conversó con la directora y se acordó enviar la propuesta mañana."
                    value={managementForm.comment}
                    onChange={(event) =>
                      onManagementChange((currentForm) => ({
                        ...currentForm,
                        comment: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-700 px-5 py-3 text-sm font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    disabled={isSavingDetail}
                    type="submit"
                  >
                    {isSavingDetail ? <FaSpinner className="animate-spin" /> : <FaCheckCircle />}
                    {isSavingDetail ? "Guardando..." : "Guardar gestión"}
                  </button>
                </div>
              </form>
            </section>
          ) : null}

          {activeDetailTab === "history" ? (
            <section className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4">
                <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                  Trazabilidad
                </p>
                <h3 className="mt-1 text-lg font-black text-gray-950">
                  Historial de la tarea
                </h3>
                <p className="mt-1 text-sm leading-5 text-gray-500">
                  Aquí se muestran juntas las gestiones realizadas y los cambios de estado.
                </p>
              </div>

              {timelineItems.length ? (
                <div className="space-y-3">
                  {timelineItems.map((timelineItem) => {
                    const isFocusedComment =
                      timelineItem.kind === "management" &&
                      focusCommentId &&
                      timelineItem.sourceId === String(focusCommentId);

                    return (
                      <article
                        key={timelineItem.id}
                        ref={isFocusedComment ? focusedActivityRef : undefined}
                        className={`rounded-2xl border p-4 transition ${
                          isFocusedComment
                            ? "border-red-200 bg-red-50 ring-2 ring-red-100"
                            : "border-gray-100 bg-gray-50"
                        }`}
                      >
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                                timelineItem.kind === "management"
                                  ? "bg-red-50 text-red-700"
                                  : "bg-gray-200 text-gray-700"
                              }`}
                            >
                              {timelineItem.kind === "management" ? (
                                <FaCommentDots />
                              ) : (
                                <FaHistory />
                              )}
                            </span>

                            <div>
                              <p className="text-sm font-black text-gray-950">
                                {timelineItem.title}
                              </p>
                              <p className="mt-0.5 text-xs font-bold text-gray-500">
                                {timelineItem.actor}
                              </p>
                            </div>
                          </div>

                          <p className="text-xs font-bold text-gray-500">
                            {formatDateTime(timelineItem.createdAt)}
                          </p>
                        </div>

                        {timelineItem.detail ? (
                          <p className="mt-3 text-sm leading-6 text-gray-700">
                            {timelineItem.detail}
                          </p>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <EmptyState text="Todavía no hay gestiones ni cambios de estado registrados." />
              )}
            </section>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

function PermissionNotice({ title, text }) {
  return (
    <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
      <p className="font-black uppercase tracking-wide">{title}</p>
      <p className="mt-1 font-semibold leading-5">{text}</p>
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
    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm font-semibold text-gray-500 sm:p-5">
      {text}
    </div>
  );
}