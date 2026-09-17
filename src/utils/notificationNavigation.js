export function getNotificationDestination(notification) {
  if (!notification) return "/admin/notificaciones";

  const metadata = notification.metadata || {};
  const taskId = metadata.task_id;

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
