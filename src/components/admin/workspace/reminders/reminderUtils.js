export function getUserLabel(user) {
  return user.full_name || user.username || user.email || `Usuario ${user.id}`;
}

export function getReminderDate(reminder) {
  return reminder.remind_at || reminder.reminder_at || reminder.due_at || reminder.start_at || "";
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

export function formatShortDate(value) {
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

export function formatDateTimeLocal(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);

  return offsetDate.toISOString().slice(0, 16);
}

export function getDateTimeValue(value) {
  if (!value) return Number.MAX_SAFE_INTEGER;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return Number.MAX_SAFE_INTEGER;

  return date.getTime();
}

export function reminderIsCompleted(reminder) {
  return Boolean(reminder.is_completed || reminder.completed_at || reminder.status === "completed");
}

export function reminderIsOverdue(reminder) {
  if (reminderIsCompleted(reminder)) return false;

  const reminderDate = new Date(getReminderDate(reminder));

  if (Number.isNaN(reminderDate.getTime())) return false;

  return reminderDate < new Date();
}

export function reminderCanEditDetails(reminder) {
  return Boolean(reminder.can_edit_details);
}

export function reminderCanComplete(reminder) {
  return Boolean(reminder.can_complete);
}

export function reminderCanReopen(reminder) {
  return typeof reminder.can_reopen === "boolean"
    ? reminder.can_reopen
    : reminderCanComplete(reminder);
}

export function reminderIsReadOnly(reminder) {
  if (typeof reminder.is_read_only === "boolean") return reminder.is_read_only;

  return !reminderCanEditDetails(reminder) && !reminderCanComplete(reminder);
}

export function getTodayAt(hour, minute = 0) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);

  return formatDateTimeLocal(date);
}

export function getTomorrowAt(hour, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(hour, minute, 0, 0);

  return formatDateTimeLocal(date);
}

export function getMinutesFromNow(minutes) {
  const date = new Date();
  date.setMinutes(date.getMinutes() + minutes);
  date.setSeconds(0, 0);

  return formatDateTimeLocal(date);
}

export function sortReminders(reminders) {
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

export function getReminderSections(reminders) {
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
