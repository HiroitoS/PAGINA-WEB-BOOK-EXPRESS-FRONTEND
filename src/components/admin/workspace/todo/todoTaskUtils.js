const PRIORITY_RANK = {
  urgent: 0,
  high: 2,
  medium: 3,
  low: 4,
};

export function normalizeTodoTasks(data) {
  if (Array.isArray(data)) {
    return data;
  }

  return Array.isArray(data?.results) ? data.results : [];
}

export function taskIsClosed(task) {
  return (
    task.status === "completed"
    || task.status === "cancelled"
  );
}

function getDateTimestamp(value, fallback) {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? fallback
    : date.getTime();
}

export function getLocalDateKey(value) {
  if (!value) {
    return "";
  }

  const date = value instanceof Date
    ? value
    : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getOperationalBucket(task, todayKey) {
  if (task.is_overdue) {
    return 0;
  }

  if (!task.due_at) {
    return 3;
  }

  if (
    todayKey
    && getLocalDateKey(task.due_at) === todayKey
  ) {
    return 1;
  }

  return 2;
}

function getPriorityRank(task) {
  if (task.priority === "urgent") {
    return 0;
  }

  if (task.is_important) {
    return 1;
  }

  return PRIORITY_RANK[task.priority] ?? 3;
}

export function sortTodoTasks(tasks, todayKey) {
  return [...tasks].sort((first, second) => {
    const firstBucket = getOperationalBucket(
      first,
      todayKey,
    );
    const secondBucket = getOperationalBucket(
      second,
      todayKey,
    );

    if (firstBucket !== secondBucket) {
      return firstBucket - secondBucket;
    }

    const firstPriority = getPriorityRank(first);
    const secondPriority = getPriorityRank(second);

    if (firstPriority !== secondPriority) {
      return firstPriority - secondPriority;
    }

    const firstDue = getDateTimestamp(
      first.due_at,
      Number.MAX_SAFE_INTEGER,
    );
    const secondDue = getDateTimestamp(
      second.due_at,
      Number.MAX_SAFE_INTEGER,
    );

    if (firstDue !== secondDue) {
      return firstDue - secondDue;
    }

    const firstCreated = getDateTimestamp(
      first.created_at,
      0,
    );
    const secondCreated = getDateTimestamp(
      second.created_at,
      0,
    );

    return secondCreated - firstCreated;
  });
}

export function sortCompletedTodoTasks(tasks) {
  return [...tasks].sort((first, second) => {
    const firstCompleted = getDateTimestamp(
      first.completed_at || first.updated_at,
      0,
    );
    const secondCompleted = getDateTimestamp(
      second.completed_at || second.updated_at,
      0,
    );

    return secondCompleted - firstCompleted;
  });
}

/**
 * Group visible tasks without changing Task.status or creating duplicate rows.
 * Overdue takes precedence over waiting so delayed work stays noticeable.
 */
export function groupTodoTasksByStatus(tasks, todayKey) {
  const groups = {
    overdueTasks: [],
    activeTasks: [],
    waitingTasks: [],
    completedTasks: [],
    cancelledTasks: [],
  };

  for (const task of tasks) {
    if (task.status === "completed") {
      groups.completedTasks.push(task);
    } else if (task.status === "cancelled") {
      groups.cancelledTasks.push(task);
    } else if (task.is_overdue) {
      groups.overdueTasks.push(task);
    } else if (task.status === "waiting") {
      groups.waitingTasks.push(task);
    } else {
      groups.activeTasks.push(task);
    }
  }

  return {
    overdueTasks: sortTodoTasks(groups.overdueTasks, todayKey),
    activeTasks: sortTodoTasks(groups.activeTasks, todayKey),
    waitingTasks: sortTodoTasks(groups.waitingTasks, todayKey),
    completedTasks: sortCompletedTodoTasks(groups.completedTasks),
    cancelledTasks: sortCompletedTodoTasks(groups.cancelledTasks),
  };
}

export function getEndOfLocalDayIso(dateValue) {
  if (!dateValue) {
    return null;
  }

  const date = new Date(dateValue + "T23:59:00");

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

export function taskMatchesTodoView(
  task,
  view,
  currentUserId,
) {
  if (view === "important") {
    return Boolean(task.is_important);
  }

  if (view === "planned") {
    return Boolean(task.due_at);
  }

  if (view === "assigned") {
    return Number(task.assigned_to)
      === Number(currentUserId);
  }

  if (view === "today") {
    if (taskIsClosed(task)) return false;
    if (task.in_my_day) return true;

    return (
      Number(task.assigned_to) === Number(currentUserId)
      && currentUserId != null
      && Boolean(task.due_at)
      && getLocalDateKey(task.due_at) === getLocalDateKey(new Date())
    );
  }

  return true;
}

export function getTodoApiErrorMessage(error) {
  const data = error?.response?.data;

  if (typeof data?.detail === "string") {
    return data.detail;
  }

  if (
    Array.isArray(data?.title)
    && data.title.length > 0
  ) {
    return data.title[0];
  }

  return "No se pudo guardar la tarea. Intenta nuevamente.";
}
