export function getNotificationDestination(notification) {
  if (!notification) return "/admin/notificaciones";

  const metadata = notification.metadata || {};
  const taskId = metadata.task_id;

  // Notificaciones antiguas de Almacén solo tenían la ruta general.
  // Recuperar el registro exacto desde la referencia de negocio también
  // permite abrirlas si la lista de recepciones está paginada.
  const receiptId = String(notification.source_id ?? "");
  if (
    notification.source_app === "warehouse" &&
    notification.source_model === "GoodsReceipt" &&
    /^\d+$/.test(receiptId) &&
    notification.event_type?.startsWith("warehouse.receipt_")
  ) {
    return `/admin/erp/almacen/recepciones?recepcion=${encodeURIComponent(receiptId)}`;
  }

  if (taskId && notification.event_type === "workspace.task_comment_added") {
    const commentId = metadata.comment_id;
    const commentQuery = commentId ? `&comment=${encodeURIComponent(commentId)}` : "";

    return `/admin/workspace/tasks?task=${encodeURIComponent(taskId)}&tab=history${commentQuery}`;
  }

  if (taskId && notification.event_type === "workspace.task_reopened") {
    return `/admin/workspace/tasks?task=${encodeURIComponent(taskId)}&tab=history`;
  }

  if (taskId && notification.event_type === "workspace.task_assigned") {
    return `/admin/workspace/tasks?task=${encodeURIComponent(taskId)}&tab=info`;
  }

  return notification.link || "/admin/notificaciones";
}
