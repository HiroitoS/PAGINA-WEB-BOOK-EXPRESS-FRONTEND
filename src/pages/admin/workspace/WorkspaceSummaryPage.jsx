import { useEffect, useMemo, useState } from "react";
import {
  FaCalendarAlt,
  FaExclamationTriangle,
  FaFolderOpen,
  FaRegBell,
  FaRegCalendarCheck,
  FaSpinner,
  FaTasks,
  FaUserCheck,
  FaClock,
  FaSyncAlt,
} from "react-icons/fa";
import { useNavigate } from "react-router";
import {
  getWorkspaceGroups,
  getWorkspaceReminders,
  getWorkspaceSummary,
  getWorkspaceTasks,
} from "../../../api/adminApi";
import {
  EmptyState,
  PanelCard,
  SummaryCard,
} from "../../../components/admin/workspace/WorkspaceCards";
import { getResults } from "../../../utils/formatters";
import {
  formatDateTime,
  getPriorityBadgeClass,
  getPriorityLabel,
  getStatusBadgeClass,
  getStatusLabel,
} from "../../../utils/workspaceUtils";

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  return getResults(data);
}

function getDateTimeValue(value) {
  if (!value) return Number.MAX_SAFE_INTEGER;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return Number.MAX_SAFE_INTEGER;

  return date.getTime();
}

function taskIsClosed(task) {
  return task.status === "completed" || task.status === "cancelled";
}

function sortTasks(tasks) {
  return [...tasks].sort((firstTask, secondTask) => {
    const firstClosed = taskIsClosed(firstTask);
    const secondClosed = taskIsClosed(secondTask);

    if (firstClosed !== secondClosed) return firstClosed ? 1 : -1;

    const firstOverdue = Boolean(firstTask.is_overdue);
    const secondOverdue = Boolean(secondTask.is_overdue);

    if (firstOverdue !== secondOverdue) return firstOverdue ? -1 : 1;

    return getDateTimeValue(firstTask.due_at) - getDateTimeValue(secondTask.due_at);
  });
}

function getReminderTaskId(reminder) {
  if (reminder.task) return Number(reminder.task);
  if (reminder.task_id) return Number(reminder.task_id);

  return null;
}

function buildDisplayReminders(reminders, tasks) {
  const reminderTaskIds = new Set(
    reminders
      .map((reminder) => getReminderTaskId(reminder))
      .filter((taskId) => taskId !== null)
  );

  const remindersFromTasks = tasks
    .filter((task) => task.reminder_at && !taskIsClosed(task))
    .filter((task) => !reminderTaskIds.has(Number(task.id)))
    .map((task) => ({
      id: `task-${task.id}`,
      title: `Recordatorio: ${task.title}`,
      remind_at: task.reminder_at,
      task_title: task.title,
    }));

  return [...reminders, ...remindersFromTasks].sort(
    (firstReminder, secondReminder) =>
      getDateTimeValue(firstReminder.remind_at) - getDateTimeValue(secondReminder.remind_at)
  );
}

function getFallbackSummary(tasks, reminders) {
  const activeTasks = tasks.filter((task) => !taskIsClosed(task));
  const overdueTasks = activeTasks.filter((task) => task.is_overdue);
  const upcomingEvents = 0;

  return {
    my_pending_tasks: activeTasks.length,
    my_overdue: overdueTasks.length,
    my_upcoming_events: upcomingEvents,
    my_reminders: reminders.length,
  };
}

async function loadSummarySafely() {
  try {
    return await getWorkspaceSummary();
  } catch (requestError) {
    console.error("No se pudo cargar el resumen general de ToDo.", requestError);
    return null;
  }
}

async function loadGroupsSafely() {
  try {
    const groupsData = await getWorkspaceGroups();
    return normalizeList(groupsData);
  } catch (requestError) {
    console.error("No se pudo cargar grupos en resumen.", requestError);
    return [];
  }
}

async function loadRemindersSafely() {
  try {
    const remindersData = await getWorkspaceReminders({ scope: "upcoming" });
    return normalizeList(remindersData);
  } catch (requestError) {
    console.error("No se pudo cargar recordatorios en resumen.", requestError);
    return [];
  }
}

export default function WorkspaceSummaryPage() {
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [groups, setGroups] = useState([]);
  const [reminders, setReminders] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const activeTasks = useMemo(() => tasks.filter((task) => !taskIsClosed(task)), [tasks]);

  const overdueTasks = useMemo(() => activeTasks.filter((task) => task.is_overdue), [activeTasks]);

  const priorityTasks = useMemo(() => {
    return [
      ...overdueTasks,
      ...activeTasks.filter(
        (task) =>
          task.is_important &&
          !overdueTasks.some((overdueTask) => Number(overdueTask.id) === Number(task.id))
      ),
      ...activeTasks.filter(
        (task) =>
          !task.is_important &&
          !overdueTasks.some((overdueTask) => Number(overdueTask.id) === Number(task.id))
      ),
    ].slice(0, 4);
  }, [activeTasks, overdueTasks]);

  async function loadWorkspaceData() {
    setError("");
    setIsLoading(true);

    try {
      const [summaryData, tasksData, groupsData, remindersData] = await Promise.all([
        loadSummarySafely(),
        getWorkspaceTasks({ ordering: "due_at" }),
        loadGroupsSafely(),
        loadRemindersSafely(),
      ]);

      const normalizedTasks = sortTasks(normalizeList(tasksData));
      const displayReminders = buildDisplayReminders(remindersData, normalizedTasks);

      setTasks(normalizedTasks);
      setGroups(groupsData);
      setReminders(displayReminders);
      setSummary(summaryData || getFallbackSummary(normalizedTasks, displayReminders));
    } catch (requestError) {
      setError("No se pudo cargar el resumen de ToDo. Revisa el backend o la sesión del usuario.");
      console.error(requestError);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let ignore = false;

    async function loadInitialData() {
      setError("");
      setIsLoading(true);

      try {
        const [summaryData, tasksData, groupsData, remindersData] = await Promise.all([
          loadSummarySafely(),
          getWorkspaceTasks({ ordering: "due_at" }),
          loadGroupsSafely(),
          loadRemindersSafely(),
        ]);

        const normalizedTasks = sortTasks(normalizeList(tasksData));
        const displayReminders = buildDisplayReminders(remindersData, normalizedTasks);

        if (!ignore) {
          setTasks(normalizedTasks);
          setGroups(groupsData);
          setReminders(displayReminders);
          setSummary(summaryData || getFallbackSummary(normalizedTasks, displayReminders));
        }
      } catch (requestError) {
        if (!ignore) {
          setError(
            "No se pudo cargar el resumen de ToDo. Revisa el backend o la sesión del usuario."
          );
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

  function goToWorkspaceView(viewName) {
    const routes = {
      tasks: "/admin/workspace/tasks",
      calendar: "/admin/workspace/calendar",
      groups: "/admin/workspace/groups",
    };

    navigate(routes[viewName] || "/admin/workspace");
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="bg-gray-950 px-4 py-5 text-white sm:px-6 sm:py-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wide text-red-300">ToDo</p>
              <h1 className="mt-1 text-2xl font-black leading-tight sm:text-3xl">
                Gestión interna de trabajo
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-300">
                Resumen operativo de tareas, reuniones, recordatorios y grupos de trabajo de Book
                Express.
              </p>
            </div>

            <div className="grid gap-2 sm:flex sm:flex-wrap">
              <button
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white px-4 py-3 text-sm font-black text-gray-950 transition hover:bg-gray-100"
                type="button"
                onClick={loadWorkspaceData}
              >
                {isLoading ? <FaSpinner className="animate-spin" /> : <FaSyncAlt />}
                Actualizar
              </button>

              <button
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-3 text-sm font-black text-white transition hover:bg-red-800"
                type="button"
                onClick={() => goToWorkspaceView("tasks")}
              >
                <FaTasks />
                Ver tareas
              </button>

              <button
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:bg-white/20"
                type="button"
                onClick={() => goToWorkspaceView("calendar")}
              >
                <FaCalendarAlt />
                Ver calendario
              </button>
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 sm:px-5 sm:py-4">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex min-h-52 items-center justify-center rounded-3xl border border-gray-200 bg-white p-6 text-sm font-bold text-gray-500 shadow-sm sm:p-10">
          <FaSpinner className="mr-3 animate-spin" />
          Cargando resumen de ToDo...
        </div>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              helper="Tareas por atender"
              icon={<FaTasks />}
              label="Pendientes"
              value={summary?.my_pending_tasks ?? 0}
            />

            <SummaryCard
              helper="Requieren prioridad"
              icon={<FaExclamationTriangle />}
              label="Vencidas"
              value={summary?.my_overdue ?? 0}
              variant="danger"
            />

            <SummaryCard
              helper="Reuniones o actividades"
              icon={<FaRegCalendarCheck />}
              label="Eventos"
              value={summary?.my_upcoming_events ?? 0}
            />

            <SummaryCard
              helper="Alertas próximas"
              icon={<FaRegBell />}
              label="Recordatorios"
              value={reminders.length}
              variant="warning"
            />
          </section>

          <section className="grid gap-4 xl:grid-cols-3">
            <div className="space-y-4 xl:col-span-2">
              <PanelCard
                icon={<FaTasks />}
                subtitle="Prioridad del día"
                title="Pendientes que requieren atención"
              >
                {overdueTasks.length > 0 ? (
                  <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
                    <p className="text-sm font-black text-red-700">
                      Hay {overdueTasks.length} tarea(s) vencida(s). Atiende primero estos
                      pendientes.
                    </p>
                  </div>
                ) : null}

                {priorityTasks.length === 0 ? (
                  <EmptyState text="No hay tareas activas por el momento. Revisa el módulo de tareas para ver completadas o crear nuevos pendientes." />
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
                    {priorityTasks.map((task) => (
                      <SummaryTaskRow
                        key={task.id}
                        task={task}
                        onManage={() => goToWorkspaceView("tasks")}
                      />
                    ))}
                  </div>
                )}

                <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
                  <button
                    className="rounded-xl bg-red-700 px-4 py-3 text-xs font-black text-white transition hover:bg-red-800"
                    type="button"
                    onClick={() => goToWorkspaceView("tasks")}
                  >
                    Ir a tareas
                  </button>

                  <button
                    className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs font-black text-gray-700 transition hover:border-red-200 hover:text-red-700"
                    type="button"
                    onClick={() => goToWorkspaceView("calendar")}
                  >
                    Ver calendario
                  </button>
                </div>
              </PanelCard>

              <div className="grid gap-3 sm:grid-cols-3">
                <QuickActionCard
                  description="Crear, completar y revisar pendientes diarios."
                  icon={<FaTasks />}
                  label="Tareas"
                  onClick={() => goToWorkspaceView("tasks")}
                />

                <QuickActionCard
                  description="Ver reuniones, fechas límite y recordatorios."
                  icon={<FaCalendarAlt />}
                  label="Calendario"
                  onClick={() => goToWorkspaceView("calendar")}
                />

                <QuickActionCard
                  description="Organizar trabajo por campaña, área o proyecto."
                  icon={<FaFolderOpen />}
                  label="Grupos"
                  onClick={() => goToWorkspaceView("groups")}
                />
              </div>
            </div>

            <div className="space-y-4">
              <PanelCard
                icon={<FaRegBell />}
                subtitle="Alertas internas"
                title="Recordatorios próximos"
              >
                {reminders.length === 0 ? (
                  <EmptyState text="No hay recordatorios próximos." />
                ) : (
                  <CompactReminderList reminders={reminders.slice(0, 5)} />
                )}

                {reminders.length > 0 ? (
                  <button
                    className="mt-4 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs font-black text-gray-700 transition hover:border-red-200 hover:text-red-700 sm:w-auto"
                    type="button"
                    onClick={() => goToWorkspaceView("calendar")}
                  >
                    Ver en calendario
                  </button>
                ) : null}
              </PanelCard>

              <PanelCard icon={<FaFolderOpen />} subtitle="Trabajo por áreas" title="Grupos activos">
                {groups.length === 0 ? (
                  <EmptyState text="No hay grupos registrados." />
                ) : (
                  <SummaryGroupGrid groups={groups.slice(0, 4)} />
                )}

                {groups.length > 0 ? (
                  <button
                    className="mt-4 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs font-black text-gray-700 transition hover:border-red-200 hover:text-red-700 sm:w-auto"
                    type="button"
                    onClick={() => goToWorkspaceView("groups")}
                  >
                    Ver grupos de trabajo
                  </button>
                ) : null}
              </PanelCard>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function SummaryTaskRow({ task, onManage }) {
  return (
    <div className="flex flex-col gap-3 border-b border-gray-100 bg-white px-4 py-4 transition last:border-b-0 hover:bg-gray-50 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full border px-3 py-1 text-xs font-black ${getStatusBadgeClass(
              task.status
            )}`}
          >
            {getStatusLabel(task.status)}
          </span>

          <span
            className={`rounded-full border px-3 py-1 text-xs font-black ${getPriorityBadgeClass(
              task.priority
            )}`}
          >
            {getPriorityLabel(task.priority)}
          </span>

          {task.is_overdue ? (
            <span className="rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-black text-red-700">
              Vencida
            </span>
          ) : null}

          {task.is_important ? (
            <span className="rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-black text-red-700">
              Importante
            </span>
          ) : null}
        </div>

        <h3 className="mt-2 line-clamp-2 text-base font-black text-gray-950">{task.title}</h3>

        <div className="mt-2 flex flex-wrap gap-3 text-xs font-bold text-gray-500">
          <span className="inline-flex items-center gap-2">
            <FaFolderOpen />
            {task.group_name || "Sin grupo"}
          </span>

          <span className="inline-flex items-center gap-2">
            <FaUserCheck />
            {task.assigned_to_name || "Sin responsable"}
          </span>

          <span className="inline-flex items-center gap-2">
            <FaClock />
            {formatDateTime(task.due_at)}
          </span>
        </div>
      </div>

      <button
        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-black text-gray-700 transition hover:border-red-200 hover:text-red-700 sm:w-auto"
        type="button"
        onClick={onManage}
      >
        Gestionar
      </button>
    </div>
  );
}

function CompactReminderList({ reminders }) {
  return (
    <div className="space-y-3">
      {reminders.map((reminder) => (
        <div
          key={reminder.id}
          className="rounded-2xl border border-yellow-100 bg-yellow-50 px-4 py-3"
        >
          <p className="line-clamp-2 text-sm font-black text-gray-950">{reminder.title}</p>

          <p className="mt-1 text-xs font-bold text-yellow-800">
            {formatDateTime(reminder.remind_at)}
          </p>

          {reminder.task_title ? (
            <p className="mt-1 line-clamp-2 text-xs font-semibold text-gray-600">
              Tarea: {reminder.task_title}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function SummaryGroupGrid({ groups }) {
  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <div
          key={group.id}
          className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="line-clamp-1 text-sm font-black text-gray-950">{group.name}</p>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">
                {group.description || "Espacio de trabajo sin descripción."}
              </p>
            </div>

            <span
              className="mt-1 h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: group.color || "#dc2626" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function QuickActionCard({ description, icon, label, onClick }) {
  return (
    <button
      className="rounded-3xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-1 hover:border-red-100 hover:shadow-md sm:p-5"
      type="button"
      onClick={onClick}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-red-700">
        {icon}
      </div>

      <p className="mt-4 text-sm font-black text-gray-950">{label}</p>
      <p className="mt-2 text-xs leading-5 text-gray-500">{description}</p>
    </button>
  );
}