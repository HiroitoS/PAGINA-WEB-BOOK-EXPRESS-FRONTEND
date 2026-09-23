import axiosClient from "./axiosClient";

const CRM_ADMIN_BASE = "/admin/crm";
const PUBLIC_CATALOG_BASE = "/public";

function normalizeList(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  return [];
}

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

export async function updateCRMSchool(schoolId, payload) {
  const response = await axiosClient.patch(
    `${CRM_ADMIN_BASE}/schools/${schoolId}/`,
    payload,
  );

  return response.data;
}

export async function getCRMSchoolEducationalServices(schoolId) {
  const response = await axiosClient.get(
    `${CRM_ADMIN_BASE}/schools/${schoolId}/educational-services/`,
  );

  return response.data;
}

export async function createCRMSchoolEducationalService(
  schoolId,
  payload,
) {
  const response = await axiosClient.post(
    `${CRM_ADMIN_BASE}/schools/${schoolId}/educational-services/`,
    payload,
  );

  return response.data;
}

export async function updateCRMSchoolEducationalService(
  schoolId,
  serviceId,
  payload,
) {
  const response = await axiosClient.patch(
    `${CRM_ADMIN_BASE}/schools/${schoolId}/educational-services/${serviceId}/`,
    payload,
  );

  return response.data;
}

export async function getCRMSchoolPopulation(
  schoolId,
  serviceId,
) {
  const response = await axiosClient.get(
    `${CRM_ADMIN_BASE}/schools/${schoolId}/educational-services/${serviceId}/population/`,
  );

  return response.data;
}

export async function createCRMSchoolPopulation(
  schoolId,
  serviceId,
  payload,
) {
  const response = await axiosClient.post(
    `${CRM_ADMIN_BASE}/schools/${schoolId}/educational-services/${serviceId}/population/`,
    payload,
  );

  return response.data;
}

export async function getCRMSchoolContacts(schoolId) {
  const response = await axiosClient.get(
    `${CRM_ADMIN_BASE}/schools/${schoolId}/contacts/`,
  );

  return response.data;
}

export async function createCRMSchoolContact(
  schoolId,
  payload,
) {
  const response = await axiosClient.post(
    `${CRM_ADMIN_BASE}/schools/${schoolId}/contacts/`,
    payload,
  );

  return response.data;
}

export async function updateCRMSchoolContact(
  schoolId,
  contactId,
  payload,
) {
  const response = await axiosClient.patch(
    `${CRM_ADMIN_BASE}/schools/${schoolId}/contacts/${contactId}/`,
    payload,
  );

  return response.data;
}

export async function getCRMMarketEditorials(params = {}) {
  const response = await axiosClient.get(
    `${CRM_ADMIN_BASE}/editorials/`,
    {
      params,
    },
  );

  return normalizeList(response.data);
}

export async function createCRMMarketEditorial(payload) {
  const response = await axiosClient.post(
    `${CRM_ADMIN_BASE}/editorials/`,
    payload,
  );

  return response.data;
}


export async function getCRMSchoolEditorialUsages(schoolId) {
  const response = await axiosClient.get(
    `${CRM_ADMIN_BASE}/schools/${schoolId}/editorial-usages/`,
  );

  return response.data;
}

export async function createCRMSchoolEditorialUsage(
  schoolId,
  payload,
) {
  const response = await axiosClient.post(
    `${CRM_ADMIN_BASE}/schools/${schoolId}/editorial-usages/`,
    payload,
  );

  return response.data;
}

export async function updateCRMSchoolEditorialUsage(
  schoolId,
  usageId,
  payload,
) {
  const response = await axiosClient.patch(
    `${CRM_ADMIN_BASE}/schools/${schoolId}/editorial-usages/${usageId}/`,
    payload,
  );

  return response.data;
}

export async function getCRMReferenceLevels() {
  const response = await axiosClient.get(
    `${PUBLIC_CATALOG_BASE}/levels/`,
  );

  return normalizeList(response.data);
}

export async function getCRMReferenceAreas() {
  const response = await axiosClient.get(
    `${PUBLIC_CATALOG_BASE}/areas/`,
  );

  return normalizeList(response.data);
}

export async function getCRMReferenceProviders() {
  const response = await axiosClient.get(
    `${PUBLIC_CATALOG_BASE}/providers/`,
  );

  return normalizeList(response.data);
}

export async function getCRMSchoolActivities(
  schoolId,
  params = {},
) {
  const response = await axiosClient.get(
    `${CRM_ADMIN_BASE}/schools/${schoolId}/activities/`,
    {
      params,
    },
  );

  return response.data;
}

export async function createCRMSchoolActivity(
  schoolId,
  payload,
) {
  const response = await axiosClient.post(
    `${CRM_ADMIN_BASE}/schools/${schoolId}/activities/`,
    payload,
  );

  return response.data;
}

export async function createCRMSchoolTask(
  schoolId,
  payload,
) {
  const response = await axiosClient.post(
    `${CRM_ADMIN_BASE}/schools/${schoolId}/tasks/`,
    payload,
  );

  return response.data;
}

export async function createCRMSchoolEvent(
  schoolId,
  payload,
) {
  const response = await axiosClient.post(
    `${CRM_ADMIN_BASE}/schools/${schoolId}/events/`,
    payload,
  );

  return response.data;
}

export async function createCRMSchoolReminder(
  schoolId,
  payload,
) {
  const response = await axiosClient.post(
    `${CRM_ADMIN_BASE}/schools/${schoolId}/reminders/`,
    payload,
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

export async function getCRMContacts(params = {}) {
  const response = await axiosClient.get(
    `${CRM_ADMIN_BASE}/contacts/`,
    {
      params,
    },
  );

  return response.data;
}

export async function getCRMContact(contactId) {
  const response = await axiosClient.get(
    `${CRM_ADMIN_BASE}/contacts/${contactId}/`,
  );

  return response.data;
}

export async function updateCRMContact(contactId, payload) {
  const response = await axiosClient.patch(
    `${CRM_ADMIN_BASE}/contacts/${contactId}/`,
    payload,
  );

  return response.data;
}

export async function getCRMContactActivities(
  contactId,
  params = {},
) {
  const response = await axiosClient.get(
    `${CRM_ADMIN_BASE}/contacts/${contactId}/activities/`,
    {
      params,
    },
  );

  return response.data;
}

export async function getCRMContactWorkItems(
  contactId,
  params = {},
) {
  const response = await axiosClient.get(
    `${CRM_ADMIN_BASE}/contacts/${contactId}/work-items/`,
    {
      params,
    },
  );

  return response.data;
}
