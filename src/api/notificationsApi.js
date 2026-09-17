import axiosClient from "./axiosClient";

export async function getAdminNotifications(params = {}) {
  const response = await axiosClient.get("/admin/notifications/", {
    params,
  });

  return response.data;
}

export async function getUnreadNotificationCount() {
  const response = await axiosClient.get(
    "/admin/notifications/unread-count/"
  );

  return response.data;
}

export async function markNotificationRead(id) {
  const response = await axiosClient.post(
    `/admin/notifications/${id}/mark-read/`
  );

  return response.data;
}

export async function markAllNotificationsRead() {
  const response = await axiosClient.post(
    "/admin/notifications/mark-all-read/"
  );

  return response.data;
}
