/**
 * La próxima acción comercial genera una tarea pendiente.
 * Calendario muestra esta misma tarea desde su fecha límite.
 */
export function buildCRMNextActionTaskPayload({
  title,
  actionType,
  dueAt,
  originActivityId,
  opportunityId,
  contactId,
}) {
  return {
    title: title.trim(),
    origin_activity: originActivityId,
    opportunity: opportunityId,
    commercial_action_type: actionType,
    due_at: dueAt.toISOString(),
    ...(contactId ? { contact: contactId } : {}),
  };
}
