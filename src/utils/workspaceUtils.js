import { getResults } from "./formatters";

export const STATUS_OPTIONS = [
  { value: "pending", label: "Pendiente" },
  { value: "in_progress", label: "En proceso" },
  { value: "waiting", label: "En espera" },
  { value: "completed", label: "Completada" },
  { value: "cancelled", label: "Cancelada" },
];

export const PRIORITY_OPTIONS = [
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

export function normalizeList(data) {
  if (Array.isArray(data)) return data;
  return getResults(data);
}

export function formatDateTime(value) {
  if (!value) return "Sin fecha";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Fecha no válida";

  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function getDateTimeValue(value) {
  if (!value) return Number.MAX_SAFE_INTEGER;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return Number.MAX_SAFE_INTEGER;

  return date.getTime();
}

export function getStatusLabel(status) {
  return STATUS_OPTIONS.find((option) => option.value === status)?.label || status || "Sin estado";
}

export function getPriorityLabel(priority) {
  return (
    PRIORITY_OPTIONS.find((option) => option.value === priority)?.label ||
    priority ||
    "Sin prioridad"
  );
}

export function getStatusBadgeClass(status) {
  if (status === "completed") return "border-green-200 bg-green-50 text-green-700";
  if (status === "in_progress") return "border-blue-200 bg-blue-50 text-blue-700";
  if (status === "waiting") return "border-yellow-200 bg-yellow-50 text-yellow-700";
  if (status === "cancelled") return "border-gray-200 bg-gray-100 text-gray-600";

  return "border-red-100 bg-red-50 text-red-700";
}

export function getPriorityBadgeClass(priority) {
  if (priority === "urgent") return "border-red-200 bg-red-50 text-red-700";
  if (priority === "high") return "border-orange-200 bg-orange-50 text-orange-700";
  if (priority === "low") return "border-gray-200 bg-gray-50 text-gray-600";

  return "border-blue-200 bg-blue-50 text-blue-700";
}

export function taskIsClosed(task) {
  return task.status === "completed" || task.status === "cancelled";
}

export function sortTasks(tasks) {
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

export function getActiveTasks(tasks) {
  return tasks.filter((task) => !taskIsClosed(task));
}

export function getCompletedTasks(tasks) {
  return tasks.filter((task) => task.status === "completed");
}

export function getOverdueTasks(tasks) {
  return tasks.filter((task) => task.is_overdue && !taskIsClosed(task));
}

function getReminderTaskId(reminder) {
  if (reminder.task) return Number(reminder.task);
  if (reminder.task_id) return Number(reminder.task_id);

  return null;
}

export function buildDisplayReminders(reminders, tasks) {
  const reminderTaskIds = new Set(
    reminders
      .map((reminder) => getReminderTaskId(reminder))
      .filter((taskId) => taskId !== null)
  );

  const remindersFromTasks = tasks
    .filter((task) => task.reminder_at && !taskIsClosed(task))
    .filter((task) => !reminderTaskIds.has(Number(task.id)))
    .map((task) => ({
      id: `task-${task.id}`,
      title: `Recordatorio: ${task.title}`,
      remind_at: task.reminder_at,
      task_title: task.title,
      source: "task",
    }));

  return [...reminders, ...remindersFromTasks].sort(
    (firstReminder, secondReminder) =>
      getDateTimeValue(firstReminder.remind_at) - getDateTimeValue(secondReminder.remind_at)
  );
}