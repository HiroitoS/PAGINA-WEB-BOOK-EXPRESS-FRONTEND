import { useEffect, useMemo, useState } from "react";
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
import { useNavigate } from "react-router";

import {
  createWorkspaceTask,
  getWorkspaceTasks,
} from "../../../api/adminApi";
import TodoQuickTaskInput from "../../../components/admin/workspace/todo/TodoQuickTaskInput";
import TodoTaskRow from "../../../components/admin/workspace/todo/TodoTaskRow";
import { useAuth } from "../../../hooks/useAuth";
import { getResults } from "../../../utils/formatters";

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
      "Todas las tareas activas visibles según tus permisos.",
    icon: FaTasks,
  },
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

function getDueTimestamp(task) {
  if (!task?.due_at) {
    return Number.MAX_SAFE_INTEGER;
  }

  const date = new Date(task.due_at);

  return Number.isNaN(date.getTime())
    ? Number.MAX_SAFE_INTEGER
    : date.getTime();
}

function sortTasks(tasks) {
  const now = Date.now();

  return [...tasks].sort((first, second) => {
    const firstOverdue = getDueTimestamp(first) < now;
    const secondOverdue = getDueTimestamp(second) < now;

    if (firstOverdue !== secondOverdue) {
      return firstOverdue ? -1 : 1;
    }

    if (
      Boolean(first.is_important)
      !== Boolean(second.is_important)
    ) {
      return first.is_important ? -1 : 1;
    }

    return getDueTimestamp(first) - getDueTimestamp(second);
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

function getTodayEndTimestamp() {
  const date = new Date();

  date.setHours(23, 59, 59, 999);

  return date.getTime();
}

function taskMatchesView(task, view, currentUserId) {
  if (view === "important") {
    return Boolean(task.is_important);
  }

  if (view === "planned") {
    return Boolean(task.due_at);
  }

  if (view === "assigned") {
    return Number(task.assigned_to) === Number(currentUserId);
  }

  if (view === "today") {
    if (!task.due_at) {
      return false;
    }

    return getDueTimestamp(task) <= getTodayEndTimestamp();
  }

  return true;
}

function getApiErrorMessage(error) {
  const data = error?.response?.data;

  if (typeof data?.detail === "string") {
    return data.detail;
  }

  if (Array.isArray(data?.title) && data.title.length > 0) {
    return data.title[0];
  }

  return "No se pudo guardar la tarea. Intenta nuevamente.";
}

export default function WorkspaceTodoPage({ view = "today" }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const config = VIEW_CONFIG[view] || VIEW_CONFIG.today;
  const ViewIcon = config.icon;

  useEffect(() => {
    let ignore = false;

    async function loadTasks() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const data = await getWorkspaceTasks({
          ordering: "due_at",
        });

        if (!ignore) {
          setTasks(normalizeList(data));
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

  const activeTasks = useMemo(
    () =>
      sortTasks(
        tasks.filter(
          (task) =>
            !taskIsClosed(task)
            && taskMatchesView(task, view, user?.id),
        ),
      ),
    [tasks, user?.id, view],
  );

  const completedTasks = useMemo(
    () =>
      tasks
        .filter(
          (task) =>
            taskIsClosed(task)
            && taskMatchesView(task, view, user?.id),
        )
        .sort(
          (first, second) =>
            new Date(second.completed_at || second.updated_at).getTime()
            - new Date(first.completed_at || first.updated_at).getTime(),
        ),
    [tasks, user?.id, view],
  );

  const visibleActiveTasks = useMemo(
    () => tasks.filter((task) => !taskIsClosed(task)),
    [tasks],
  );

  const summary = useMemo(() => {
    const now = Date.now();

    return {
      pending: visibleActiveTasks.length,
      overdue: visibleActiveTasks.filter(
        (task) =>
          task.due_at
          && getDueTimestamp(task) < now,
      ).length,
      completed: tasks.filter(
        (task) => task.status === "completed",
      ).length,
    };
  }, [tasks, visibleActiveTasks]);

  async function handleCreateTask({ title, dueDate }) {
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

      const createdTask = await createWorkspaceTask(payload);

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

  function openTask(task) {
    navigate(
      "/admin/workspace/tasks?task=" + task.id,
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
            onClick={() => navigate("/admin/workspace/tasks")}
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
            {Array.from({ length: 5 }, (_, index) => (
              <div
                key={index}
                className="h-14 animate-pulse rounded-xl bg-gray-100"
              />
            ))}
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
    </div>
  );
}
