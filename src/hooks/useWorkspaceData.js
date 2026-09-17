import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getAdminUsers,
  getWorkspaceCalendar,
  getWorkspaceGroups,
  getWorkspaceReminders,
  getWorkspaceSummary,
  getWorkspaceTasks,
} from "../api/adminApi";
import {
  buildDisplayReminders,
  getActiveTasks,
  getCompletedTasks,
  getOverdueTasks,
  normalizeList,
  sortTasks,
} from "../utils/workspaceUtils";

export function useWorkspaceData() {
  const [summary, setSummary] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [calendarItems, setCalendarItems] = useState([]);
  const [groups, setGroups] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [users, setUsers] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const activeTasks = useMemo(() => getActiveTasks(tasks), [tasks]);
  const completedTasks = useMemo(() => getCompletedTasks(tasks), [tasks]);
  const overdueTasks = useMemo(() => getOverdueTasks(tasks), [tasks]);

  const loadWorkspaceData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setIsLoading(true);
    }

    setError("");

    try {
      const [summaryData, tasksData, calendarData, groupsData, remindersData, usersData] =
        await Promise.all([
          getWorkspaceSummary(),
          getWorkspaceTasks({ ordering: "due_at" }),
          getWorkspaceCalendar({
            start: "2026-08-01",
            end: "2026-12-31",
          }),
          getWorkspaceGroups(),
          getWorkspaceReminders({ scope: "upcoming" }),
          getAdminUsers(),
        ]);

      const normalizedTasks = sortTasks(normalizeList(tasksData));
      const normalizedReminders = normalizeList(remindersData);

      setSummary(summaryData);
      setTasks(normalizedTasks);
      setCalendarItems(Array.isArray(calendarData) ? calendarData : []);
      setGroups(normalizeList(groupsData));
      setReminders(buildDisplayReminders(normalizedReminders, normalizedTasks));
      setUsers(normalizeList(usersData));
    } catch (requestError) {
      setError("No se pudo cargar ToDo. Revisa el backend o la sesión del usuario.");
      console.error(requestError);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadInitialData() {
      setIsLoading(true);
      setError("");

      try {
        const [summaryData, tasksData, calendarData, groupsData, remindersData, usersData] =
          await Promise.all([
            getWorkspaceSummary(),
            getWorkspaceTasks({ ordering: "due_at" }),
            getWorkspaceCalendar({
              start: "2026-08-01",
              end: "2026-12-31",
            }),
            getWorkspaceGroups(),
            getWorkspaceReminders({ scope: "upcoming" }),
            getAdminUsers(),
          ]);

        const normalizedTasks = sortTasks(normalizeList(tasksData));
        const normalizedReminders = normalizeList(remindersData);

        if (!ignore) {
          setSummary(summaryData);
          setTasks(normalizedTasks);
          setCalendarItems(Array.isArray(calendarData) ? calendarData : []);
          setGroups(normalizeList(groupsData));
          setReminders(buildDisplayReminders(normalizedReminders, normalizedTasks));
          setUsers(normalizeList(usersData));
        }
      } catch (requestError) {
        if (!ignore) {
          setError("No se pudo cargar ToDo. Revisa el backend o la sesión del usuario.");
        }

        console.error(requestError);
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadInitialData();

    return () => {
      ignore = true;
    };
  }, []);

  return {
    activeTasks,
    calendarItems,
    completedTasks,
    error,
    groups,
    isLoading,
    loadWorkspaceData,
    overdueTasks,
    reminders,
    summary,
    tasks,
    users,
  };
}