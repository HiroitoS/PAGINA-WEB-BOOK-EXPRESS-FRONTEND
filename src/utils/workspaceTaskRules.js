/**
 * Reglas de dominio de ToDo. Sin dependencias de React ni acceso a la API.
 * Extraídas del gestor para mantener una única fuente de validación,
 * permisos y ordenamiento sin cambiar los contratos del backend.
 */

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

export function formatDateTimeLocal(value) {
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

export function taskIsClosed(task) {
  return task.status === "completed" || task.status === "cancelled";
}

export function taskCanEditDetails(task) {
  return task?.can_edit_details === true;
}

export function taskCanFollowUp(task) {
  return task?.can_follow_up === true;
}

export function taskCanComplete(task) {
  return task?.can_complete === true;
}

export function taskCanReopen(task) {
  return task?.can_reopen === true;
}

export function taskIsReadOnly(task) {
  return task?.is_read_only === true || (!taskCanEditDetails(task) && !taskCanFollowUp(task));
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

export function buildTaskPayload(form, canAssignToOthers = false) {
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

export function buildEditFormFromTask(task) {
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

export function getTaskValidationMessage(form) {
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
