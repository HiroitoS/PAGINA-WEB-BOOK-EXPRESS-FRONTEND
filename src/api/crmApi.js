import axiosClient from "./axiosClient";

const CRM_ADMIN_BASE = "/admin/crm";

export async function getCRMSummary(params = {}) {
  const response = await axiosClient.get(`${CRM_ADMIN_BASE}/summary/`, {
    params,
  });

  return response.data;
}
