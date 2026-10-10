export function normalizeTaskLists(data) {
  if (Array.isArray(data)) {
    return data;
  }

  return Array.isArray(data?.results) ? data.results : [];
}

export function getTaskListScopeLabel(taskList) {
  if (taskList?.workspace_group_name) {
    return `Equipo: ${taskList.workspace_group_name}`;
  }

  return "Lista personal";
}
