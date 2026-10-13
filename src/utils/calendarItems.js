export function getCalendarItemDate(item) {
  return item.start || item.start_at || item.due_at || item.remind_at || item.reminder_at || "";
}

export function getCalendarItemEndDate(item) {
  return item.end || item.end_at || "";
}

export function getCalendarType(item) {
  if (item.type === "reminder") return "reminder";
  if (item.type === "event") return "event";

  return "task";
}

export function calendarItemIsClosed(item) {
  const type = getCalendarType(item);

  if (type === "event") return false;

  return item.status === "completed" || item.status === "cancelled";
}

export function buildFullCalendarEvents(items) {
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
