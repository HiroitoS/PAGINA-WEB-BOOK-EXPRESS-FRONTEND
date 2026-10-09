import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FaArrowRight,
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaStar,
  FaTasks,
  FaUserCheck,
} from "react-icons/fa";
import {
  useLocation,
  useNavigate,
} from "react-router";

import {
  createWorkspaceTask,
  getWorkspaceTaskById,
  getWorkspaceTasks,
} from "../../../api/adminApi";
import TodoQuickTaskInput from "../../../components/admin/workspace/todo/TodoQuickTaskInput";
import TodoTaskDetailDrawer from "../../../components/admin/workspace/todo/TodoTaskDetailDrawer";
import TodoTaskRow from "../../../components/admin/workspace/todo/TodoTaskRow";
import { useAuth } from "../../../hooks/useAuth";
import { getResults } from "../../../utils/formatters";
import { buildNavigationState } from "../../../utils/navigationContext";

const VIEW_CONFIG = {
  today: {
    eyebrow: "Enfoque diario",
    title: "Mi día",
    description:
      "Tareas vencidas y tareas con fecha para hoy dentro de tu alcance.",
    icon: FaClock,
  },
  important: {
    eyebrow: "Prioridad",
    title: "Importantes",
    description:
      "Tareas marcadas como importantes que todavía requieren atención.",
    icon: FaStar,
  },
  planned: {
    eyebrow: "Planificación",
    title: "Planificadas",
    description:
      "Tareas activas con una fecha límite definida.",
    icon: FaCalendarAlt,
  },
  assigned: {
    eyebrow: "Responsabilidad",
    title: "Asignadas a mí",
    description:
      "Trabajo del que eres responsable dentro de Book Express.",
    icon: FaUserCheck,
  },
  all: {
    eyebrow: "Trabajo pendiente",
    title: "Todas las tareas",
    description:
      "Todas las tareas visibles según tus permisos.",
    icon: FaTasks,
  },
};

const PRIORITY_RANK = {
  urgent: 0,
  high: 2,
  medium: 3,
  low: 4,
};

function normalizeList(data) {
  if (Array.isArray(data)) {
    return data;
  }

  return getResults(data);
}

function taskIsClosed(task) {
  return (
    task.status === "completed"
    || task.status === "cancelled"
  );
}

function getDateTimestamp(value, fallback) {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? fallback
    : date.getTime();
}

function getLocalDateKey(value) {
  if (!value) {
    return "";
  }

  const date = value instanceof Date
    ? value
    : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getOperationalBucket(task, todayKey) {
  if (task.is_overdue) {
    return 0;
  }

  if (!task.due_at) {
    return 3;
  }

  if (
    todayKey
    && getLocalDateKey(task.due_at) === todayKey
  ) {
    return 1;
  }

  return 2;
}

function getPriorityRank(task) {
  if (task.priority === "urgent") {
    return 0;
  }

  if (task.is_important) {
    return 1;
  }

  return PRIORITY_RANK[task.priority] ?? 3;
}

function sortTasks(tasks, todayKey) {
  return [...tasks].sort((first, second) => {
    const firstBucket = getOperationalBucket(
      first,
      todayKey,
    );
    const secondBucket = getOperationalBucket(
      second,
      todayKey,
    );

    if (firstBucket !== secondBucket) {
      return firstBucket - secondBucket;
    }

    const firstPriority = getPriorityRank(first);
    const secondPriority = getPriorityRank(second);

    if (firstPriority !== secondPriority) {
      return firstPriority - secondPriority;
    }

    const firstDue = getDateTimestamp(
      first.due_at,
      Number.MAX_SAFE_INTEGER,
    );
    const secondDue = getDateTimestamp(
      second.due_at,
      Number.MAX_SAFE_INTEGER,
    );

    if (firstDue !== secondDue) {
      return firstDue - secondDue;
    }

    const firstCreated = getDateTimestamp(
      first.created_at,
      0,
    );
    const secondCreated = getDateTimestamp(
      second.created_at,
      0,
    );

    return secondCreated - firstCreated;
  });
}

function sortCompletedTasks(tasks) {
  return [...tasks].sort((first, second) => {
    const firstCompleted = getDateTimestamp(
      first.completed_at || first.updated_at,
      0,
    );
    const secondCompleted = getDateTimestamp(
      second.completed_at || second.updated_at,
      0,
    );

    return secondCompleted - firstCompleted;
  });
}

function getEndOfLocalDayIso(dateValue) {
  if (!dateValue) {
    return null;
  }

  const date = new Date(dateValue + "T23:59:00");

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function taskMatchesView(
  task,
  view,
  currentUserId,
  todayKey,
) {
  if (view === "important") {
    return Boolean(task.is_important);
  }

  if (view === "planned") {
    return Boolean(task.due_at);
  }

  if (view === "assigned") {
    return Number(task.assigned_to)
      === Number(currentUserId);
  }

  if (view === "today") {
    return Boolean(
      task.is_overdue
      || (
        task.due_at
        && todayKey
        && getLocalDateKey(task.due_at) === todayKey
      ),
    );
  }

  return true;
}

function getApiErrorMessage(error) {
  const data = error?.response?.data;

  if (typeof data?.detail === "string") {
    return data.detail;
  }

  if (
    Array.isArray(data?.title)
    && data.title.length > 0
  ) {
    return data.title[0];
  }

  return "No se pudo guardar la tarea. Intenta nuevamente.";
}

export default function WorkspaceTodoPage({
  view = "today",
}) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const detailRequestRef = useRef(0);

  const [tasks, setTasks] = useState([]);
  const [todayKey, setTodayKey] = useState("");
  const [selectedTask, setSelectedTask] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [detailError, setDetailError] = useState("");

  const config = VIEW_CONFIG[view] || VIEW_CONFIG.today;
  const ViewIcon = config.icon;

  useEffect(() => {
    let ignore = false;

    async function loadTasks() {
      try {
        const data = await getWorkspaceTasks({
          ordering: "due_at",
        });

        if (!ignore) {
          setTasks(normalizeList(data));
          setTodayKey(getLocalDateKey(new Date()));
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(
            "No se pudieron cargar las tareas de ToDo.",
          );
        }
        console.error(error);
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadTasks();

    return () => {
      ignore = true;
    };
  }, []);

  const viewTasks = useMemo(
    () =>
      tasks.filter((task) =>
        taskMatchesView(
          task,
          view,
          user?.id,
          todayKey,
        ),
      ),
    [tasks, todayKey, user?.id, view],
  );

  const activeTasks = useMemo(
    () =>
      sortTasks(
        viewTasks.filter(
          (task) => !taskIsClosed(task),
        ),
        todayKey,
      ),
    [todayKey, viewTasks],
  );

  const completedTasks = useMemo(
    () =>
      sortCompletedTasks(
        viewTasks.filter(
          (task) => task.status === "completed",
        ),
      ),
    [viewTasks],
  );

  const summary = useMemo(
    () => ({
      pending: activeTasks.length,
      overdue: activeTasks.filter(
        (task) => task.is_overdue,
      ).length,
      completed: completedTasks.length,
    }),
    [activeTasks, completedTasks],
  );

  async function handleCreateTask({
    title,
    dueDate,
  }) {
    try {
      setIsSaving(true);
      setErrorMessage("");

      const payload = {
        title,
      };

      const dueAt = getEndOfLocalDayIso(dueDate);

      if (dueAt) {
        payload.due_at = dueAt;
      }

      if (view === "important") {
        payload.is_important = true;
      }

      const createdTask = await createWorkspaceTask(
        payload,
      );

      setTasks((currentTasks) => [
        createdTask,
        ...currentTasks,
      ]);

      return true;
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
      console.error(error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function openTask(task) {
    const requestId = detailRequestRef.current + 1;

    detailRequestRef.current = requestId;
    setSelectedTask(task);
    setDetailError("");
    setIsLoadingDetail(true);

    try {
      const detail = await getWorkspaceTaskById(task.id);

      if (detailRequestRef.current === requestId) {
        setSelectedTask(detail);
      }
    } catch (error) {
      if (detailRequestRef.current === requestId) {
        setDetailError(
          "No se pudo cargar toda la información de la tarea.",
        );
      }
      console.error(error);
    } finally {
      if (detailRequestRef.current === requestId) {
        setIsLoadingDetail(false);
      }
    }
  }

  function closeTaskDetail() {
    detailRequestRef.current += 1;
    setSelectedTask(null);
    setDetailError("");
    setIsLoadingDetail(false);
  }

  function manageTask(task) {
    navigate(
      "/admin/workspace/tasks?task=" + task.id,
      {
        state: buildNavigationState({
          from: location.pathname,
          fromLabel: config.title,
          fromType: "workspace-smart-view",
          currentState: location.state,
        }),
      },
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl">
      <section className="overflow-hidden rounded-3xl bg-gray-950 text-white shadow-sm">
        <div className="flex flex-col gap-5 px-5 py-6 sm:px-7 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-700 text-xl">
              <ViewIcon />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wide text-red-300">
                {config.eyebrow}
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
                {config.title}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-300">
                {config.description}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              navigate("/admin/workspace/tasks")
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-black text-white transition hover:bg-white/15"
          >
            Gestor completo
            <FaArrowRight className="text-xs" />
          </button>
        </div>
      </section>

      <div className="mt-5 grid grid-cols-3 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-r border-gray-100 px-4 py-3 sm:px-5">
          <p className="text-xs font-black uppercase tracking-wide text-gray-500">
            Pendientes
          </p>
          <p className="mt-1 text-2xl font-black text-gray-950">
            {summary.pending}
          </p>
        </div>

        <div className="border-r border-gray-100 px-4 py-3 sm:px-5">
          <p className="text-xs font-black uppercase tracking-wide text-gray-500">
            Vencidas
          </p>
          <p className="mt-1 text-2xl font-black text-red-700">
            {summary.overdue}
          </p>
        </div>

        <div className="px-4 py-3 sm:px-5">
          <p className="text-xs font-black uppercase tracking-wide text-gray-500">
            Completadas
          </p>
          <p className="mt-1 text-2xl font-black text-gray-950">
            {summary.completed}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <TodoQuickTaskInput
          key={view}
          onCreate={handleCreateTask}
          isSaving={isSaving}
          defaultToday={view === "today"}
          requireDate={view === "planned"}
        />
      </div>

      {errorMessage ? (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
          <FaExclamationTriangle className="mt-0.5 shrink-0 text-red-700" />
          <p className="text-sm font-bold leading-6 text-red-800">
            {errorMessage}
          </p>
        </div>
      ) : null}

      <section className="mt-5 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-4 py-4 sm:px-5">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-red-700">
              Trabajo por hacer
            </p>
            <h2 className="mt-1 text-lg font-black text-gray-950">
              {config.title}
            </h2>
          </div>

          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-black text-gray-600">
            {activeTasks.length}
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-1 p-4 sm:p-5">
            {Array.from(
              { length: 5 },
              (_, index) => (
                <div
                  key={index}
                  className="h-14 animate-pulse rounded-xl bg-gray-100"
                />
              ),
            )}
          </div>
        ) : activeTasks.length > 0 ? (
          <div>
            {activeTasks.map((task) => (
              <TodoTaskRow
                key={task.id}
                task={task}
                onOpen={openTask}
              />
            ))}
          </div>
        ) : (
          <div className="px-5 py-12 text-center">
            <FaCheckCircle className="mx-auto text-3xl text-green-500" />
            <p className="mt-3 text-sm font-black text-gray-900">
              No hay tareas pendientes en esta vista.
            </p>
            <p className="mt-1 text-xs leading-5 text-gray-500">
              Puedes crear una nueva tarea desde la barra superior.
            </p>
          </div>
        )}
      </section>

      {completedTasks.length > 0 ? (
        <details className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <summary className="cursor-pointer px-4 py-4 text-sm font-black text-gray-700 sm:px-5">
            Completadas ({completedTasks.length})
          </summary>

          <div className="border-t border-gray-100">
            {completedTasks.map((task) => (
              <TodoTaskRow
                key={task.id}
                task={task}
                onOpen={openTask}
                completed
              />
            ))}
          </div>
        </details>
      ) : null}

      <TodoTaskDetailDrawer
        task={selectedTask}
        isLoading={isLoadingDetail}
        errorMessage={detailError}
        onClose={closeTaskDetail}
        onManage={manageTask}
      />
    </div>
  );
}
