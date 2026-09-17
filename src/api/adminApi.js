import axiosClient from "./axiosClient";

export async function getAdminContactRequests(params = {}) {
  const response = await axiosClient.get("/admin/contact-requests/", {
    params,
  });

  return response.data;
}

export async function updateAdminContactRequest(id, payload) {
  const response = await axiosClient.patch(
    `/admin/contact-requests/${id}/`,
    payload
  );

  return response.data;
}

export async function getAdminContactRequestById(id) {
  const response = await axiosClient.get(`/admin/contact-requests/${id}/`);
  return response.data;
}

export async function changeAdminContactRequestStatus(id, payload) {
  const response = await axiosClient.post(
    `/admin/contact-requests/${id}/change-status/`,
    payload
  );

  return response.data;
}

export async function addAdminContactRequestComment(id, payload) {
  const response = await axiosClient.post(
    `/admin/contact-requests/${id}/add-comment/`,
    payload
  );

  return response.data;
}

export async function registerAdminContactRequestAttention(id, payload) {
  const response = await axiosClient.post(
    `/admin/contact-requests/${id}/register-attention/`,
    payload
  );

  return response.data;
}

export async function reopenAdminContactRequest(id, payload) {
  const response = await axiosClient.post(
    `/admin/contact-requests/${id}/reopen/`,
    payload
  );

  return response.data;
}

export async function assignAdminContactRequest(id, payload) {
  const response = await axiosClient.post(
    `/admin/contact-requests/${id}/assign/`,
    payload
  );

  return response.data;
}

export async function getAdminProducts(params = {}) {
  const response = await axiosClient.get("/admin/products/", {
    params,
  });

  return response.data;
}

export async function getAdminProductById(id) {
  const response = await axiosClient.get(`/admin/products/${id}/`);
  return response.data;
}

function isFormData(payload) {
  return payload instanceof FormData;
}

export async function createAdminProduct(payload) {
  const config = isFormData(payload)
    ? {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    : {};

  const response = await axiosClient.post("/admin/products/", payload, config);
  return response.data;
}

export async function updateAdminProduct(id, payload) {
  const config = isFormData(payload)
    ? {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    : {};

  const response = await axiosClient.patch(
    `/admin/products/${id}/`,
    payload,
    config
  );

  return response.data;
}

export async function getAdminProviders(params = {}) {
  const response = await axiosClient.get("/admin/providers/", {
    params,
  });

  return response.data;
}

export async function createAdminProvider(payload) {
  const config =
    payload instanceof FormData
      ? {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      : {};

  const response = await axiosClient.post("/admin/providers/", payload, config);
  return response.data;
}

export async function updateAdminProvider(id, payload) {
  const config =
    payload instanceof FormData
      ? {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      : {};

  const response = await axiosClient.patch(
    `/admin/providers/${id}/`,
    payload,
    config
  );

  return response.data;
}

export async function getAdminLevels(params = {}) {
  const response = await axiosClient.get("/admin/levels/", {
    params,
  });

  return response.data;
}

export async function getAdminGrades(params = {}) {
  const response = await axiosClient.get("/admin/grades/", {
    params,
  });

  return response.data;
}

export async function getAdminAreas(params = {}) {
  const response = await axiosClient.get("/admin/areas/", {
    params,
  });

  return response.data;
}

export async function getAdminSeries(params = {}) {
  const response = await axiosClient.get("/admin/series/", {
    params,
  });

  return response.data;
}

export async function getAdminProductTypes(params = {}) {
  const response = await axiosClient.get("/admin/product-types/", {
    params,
  });

  return response.data;
}

export async function getAdminPrices(params = {}) {
  const response = await axiosClient.get("/admin/prices/", {
    params,
  });

  return response.data;
}

export async function createAdminPrice(payload) {
  const response = await axiosClient.post("/admin/prices/", payload);
  return response.data;
}

export async function updateAdminPrice(id, payload) {
  const response = await axiosClient.patch(`/admin/prices/${id}/`, payload);
  return response.data;
}

export async function createAdminLevel(payload) {
  const response = await axiosClient.post("/admin/levels/", payload);
  return response.data;
}

export async function updateAdminLevel(id, payload) {
  const response = await axiosClient.patch(`/admin/levels/${id}/`, payload);
  return response.data;
}

export async function createAdminGrade(payload) {
  const response = await axiosClient.post("/admin/grades/", payload);
  return response.data;
}

export async function updateAdminGrade(id, payload) {
  const response = await axiosClient.patch(`/admin/grades/${id}/`, payload);
  return response.data;
}

export async function createAdminArea(payload) {
  const response = await axiosClient.post("/admin/areas/", payload);
  return response.data;
}

export async function updateAdminArea(id, payload) {
  const response = await axiosClient.patch(`/admin/areas/${id}/`, payload);
  return response.data;
}

export async function createAdminSeries(payload) {
  const response = await axiosClient.post("/admin/series/", payload);
  return response.data;
}

export async function updateAdminSeries(id, payload) {
  const response = await axiosClient.patch(`/admin/series/${id}/`, payload);
  return response.data;
}

export async function createAdminProductType(payload) {
  const response = await axiosClient.post("/admin/product-types/", payload);
  return response.data;
}

export async function updateAdminProductType(id, payload) {
  const response = await axiosClient.patch(`/admin/product-types/${id}/`, payload);
  return response.data;
}

export async function getAdminImports(params = {}) {
  const response = await axiosClient.get("/admin/importaciones/", {
    params,
  });

  return response.data;
}

export async function previewProductImport(file, catalogYear) {
  const payload = new FormData();
  payload.append("archivo", file);
  payload.append("anio_catalogo", catalogYear);

  const response = await axiosClient.post(
    "/admin/importaciones/productos/preview/",
    payload,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data;
}

export async function confirmProductImport(importId) {
  const response = await axiosClient.post(
    `/admin/importaciones/productos/${importId}/confirmar/`
  );

  return response.data;
}

export async function getAdminDashboardSummary(params = {}) {
  const response = await axiosClient.get("/admin/dashboard/resumen/", {
    params,
  });

  return response.data;
}

export async function getAdminUsers(params = {}) {
  const response = await axiosClient.get("/admin/users/", {
    params,
  });

  return response.data;
}

export async function createAdminUser(payload) {
  const response = await axiosClient.post("/admin/users/", payload);
  return response.data;
}

export async function updateAdminUser(id, payload) {
  const response = await axiosClient.patch(`/admin/users/${id}/`, payload);
  return response.data;
}

export async function changeAdminUserPassword(id, payload) {
  const response = await axiosClient.post(
    `/admin/users/${id}/change-password/`,
    payload
  );

  return response.data;
}

export async function getAdminRoles(params = {}) {
  const response = await axiosClient.get("/admin/roles/", {
    params,
  });

  return response.data;
}

export async function getAdminFunctionalPermissions() {
  const response = await axiosClient.get("/admin/users/permissions/");
  return response.data;
}

export async function getAdminUserById(id) {
  const response = await axiosClient.get(`/admin/users/${id}/`);
  return response.data;
}

export async function getWorkspaceSummary() {
  const response = await axiosClient.get("/admin/workspace/summary/");
  return response.data;
}

export async function getWorkspaceAssignableUsers() {
  const response = await axiosClient.get(
    "/admin/workspace/assignable-users/"
  );

  return response.data;
}

export async function getWorkspaceCalendar(params = {}) {
  const response = await axiosClient.get("/admin/workspace/calendar/", {
    params,
  });

  return response.data;
}

export async function getWorkspaceGroups(params = {}) {
  const response = await axiosClient.get("/admin/workspace-groups/", {
    params,
  });

  return response.data;
}

export async function createWorkspaceGroup(payload) {
  const response = await axiosClient.post("/admin/workspace-groups/", payload);
  return response.data;
}

export async function updateWorkspaceGroup(id, payload) {
  const response = await axiosClient.patch(
    `/admin/workspace-groups/${id}/`,
    payload
  );

  return response.data;
}

export async function getWorkspaceTasks(params = {}) {
  const response = await axiosClient.get("/admin/tasks/", {
    params,
  });

  return response.data;
}

export async function getWorkspaceTaskById(id) {
  const response = await axiosClient.get(`/admin/tasks/${id}/`);
  return response.data;
}

export async function createWorkspaceTask(payload) {
  const response = await axiosClient.post("/admin/tasks/", payload);
  return response.data;
}

export async function updateWorkspaceTask(id, payload) {
  const response = await axiosClient.patch(`/admin/tasks/${id}/`, payload);
  return response.data;
}

export async function changeWorkspaceTaskStatus(id, payload) {
  const response = await axiosClient.post(
    `/admin/tasks/${id}/change-status/`,
    payload
  );

  return response.data;
}

export async function reopenWorkspaceTask(id, payload) {
  const response = await axiosClient.post(
    `/admin/tasks/${id}/reopen/`,
    payload
  );

  return response.data;
}

export async function registerWorkspaceTaskManagement(id, payload) {
  const response = await axiosClient.post(
    `/admin/tasks/${id}/register-management/`,
    payload
  );

  return response.data;
}

export async function addWorkspaceTaskComment(id, payload) {
  const response = await axiosClient.post(
    `/admin/tasks/${id}/add-comment/`,
    payload
  );

  return response.data;
}

export async function getWorkspaceEvents(params = {}) {
  const response = await axiosClient.get("/admin/calendar-events/", {
    params,
  });

  return response.data;
}

export async function createWorkspaceEvent(payload) {
  const response = await axiosClient.post("/admin/calendar-events/", payload);
  return response.data;
}

export async function getWorkspaceEventById(id) {
  const response = await axiosClient.get(`/admin/calendar-events/${id}/`);
  return response.data;
}

export async function updateWorkspaceEvent(id, payload) {
  const response = await axiosClient.patch(
    `/admin/calendar-events/${id}/`,
    payload
  );

  return response.data;
}

export async function getWorkspaceReminders(params = {}) {
  const response = await axiosClient.get("/admin/reminders/", {
    params,
  });

  return response.data;
}

export async function createWorkspaceReminder(payload) {
  const response = await axiosClient.post("/admin/reminders/", payload);
  return response.data;
}

export async function getWorkspaceReminderById(id) {
  const response = await axiosClient.get(`/admin/reminders/${id}/`);
  return response.data;
}

export async function updateWorkspaceReminder(id, payload) {
  const response = await axiosClient.patch(`/admin/reminders/${id}/`, payload);
  return response.data;
}
export async function getWorkspaceMemberships(params = {}) {
  const response = await axiosClient.get("/admin/workspace-memberships/", {
    params,
  });

  return response.data;
}

export async function createWorkspaceMembership(payload) {
  const response = await axiosClient.post("/admin/workspace-memberships/", payload);
  return response.data;
}

export async function updateWorkspaceMembership(id, payload) {
  const response = await axiosClient.patch(
    `/admin/workspace-memberships/${id}/`,
    payload
  );

  return response.data;
}

export async function deleteWorkspaceMembership(id) {
  const response = await axiosClient.delete(`/admin/workspace-memberships/${id}/`);
  return response.data;
}