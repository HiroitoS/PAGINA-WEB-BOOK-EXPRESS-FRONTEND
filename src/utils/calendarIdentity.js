/**
 * A calendar item has its own ID and can also reference a related task/event.
 * The entity's ID must take precedence over those foreign keys: editing a
 * Reminder using task_id risks updating an unrelated reminder or returning 404.
 */
export function getCalendarRealId(item) {
  const candidateId =
    item?.real_id ||
    item?.reminder_id ||
    item?.event_id ||
    item?.task_id ||
    item?.id ||
    item?.task ||
    item?.event;

  if (typeof candidateId === "string" && candidateId.includes("-")) {
    const parts = candidateId.split("-");
    return parts[parts.length - 1];
  }

  return candidateId;
}
