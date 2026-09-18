import axiosClient from "./axiosClient";

const CRM_ADMIN_BASE = "/admin/crm";

export async function getCRMSummary(params = {}) {
  const response = await axiosClient.get(`${CRM_ADMIN_BASE}/summary/`, {
    params,
  });

  return response.data;
}

export async function getCRMSchools(params = {}) {
  const response = await axiosClient.get(`${CRM_ADMIN_BASE}/schools/`, {
    params,
  });

  return response.data;
}

export async function getCRMSchool(schoolId) {
  const response = await axiosClient.get(
    `${CRM_ADMIN_BASE}/schools/${schoolId}/`,
  );

  return response.data;
}
export async function getCRMOpportunities(params = {}) {
  const response = await axiosClient.get(
    `${CRM_ADMIN_BASE}/opportunities/`,
    {
      params,
    },
  );

  return response.data;
}

export async function getCRMOpportunity(opportunityId) {
  const response = await axiosClient.get(
    `${CRM_ADMIN_BASE}/opportunities/${opportunityId}/`,
  );

  return response.data;
}