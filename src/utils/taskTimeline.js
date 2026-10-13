/**
 * Presenta las gestiones, cambios de estado y modificaciones de planificación
 * en una sola cronología, sin alterar sus registros originales del backend.
 */
export function buildTaskTimeline(task) {
  const managementItems = (task?.comments || []).map((comment) => ({
    id: `management-${comment.id}`,
    sourceId: String(comment.id),
    kind: "management",
    title: comment.action_type_display || "Gestión",
    detail: comment.comment || "",
    actor: comment.user_name || "Usuario",
    createdAt: comment.created_at,
  }));

  const statusItems = (task?.status_history || task?.history || []).map(
    (historyItem) => ({
      id: `status-${historyItem.id}`,
      sourceId: String(historyItem.id),
      kind: "status",
      title: `${historyItem.old_status_display || "Sin estado"} → ${
        historyItem.new_status_display || "Nuevo estado"
      }`,
      detail: historyItem.note || "",
      actor: historyItem.changed_by_name || "Usuario",
      createdAt: historyItem.created_at,
    })
  );

  const planningItems = (task?.change_history || []).map((entry) => ({
    id: `planning-${entry.id}`,
    sourceId: String(entry.id),
    kind: "planning",
    title: "Planificación actualizada",
    detail: (entry.changes || [])
      .map((change) => `${change.label || change.field}: ${change.old} → ${change.new}`)
      .join("; "),
    actor: entry.changed_by_name || "Usuario",
    createdAt: entry.created_at,
  }));

  return [...managementItems, ...statusItems, ...planningItems].sort(
    (firstItem, secondItem) =>
      new Date(secondItem.createdAt).getTime() -
      new Date(firstItem.createdAt).getTime()
  );
}
