import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FaExclamationTriangle } from "react-icons/fa";
import {
  useLocation,
  useNavigate,
  useParams,
} from "react-router";

import {
  addWorkspaceTaskToMyDay,
  createWorkspaceTask,
  getWorkspaceGroupById,
  getWorkspaceTaskById,
  getWorkspaceTaskListById,
  getWorkspaceTasks,
  removeWorkspaceTaskFromMyDay,
} from "../../../api/adminApi";
import TodoQuickTaskInput from "../../../components/admin/workspace/todo/TodoQuickTaskInput";
import TodoTaskDetailDrawer from "../../../components/admin/workspace/todo/TodoTaskDetailDrawer";
import TodoTaskSections from "../../../components/admin/workspace/todo/TodoTaskSections";
import TodoViewHeader from "../../../components/admin/workspace/todo/TodoViewHeader";
import {
  getEndOfLocalDayIso,
  getLocalDateKey,
  getTodoApiErrorMessage,
  normalizeTodoTasks,
  sortCompletedTodoTasks,
  sortTodoTasks,
  taskIsClosed,
  taskMatchesTodoView,
} from "../../../components/admin/workspace/todo/todoTaskUtils";
import { getTodoViewConfig } from "../../../components/admin/workspace/todo/todoViewConfig";
import { useAuth } from "../../../hooks/useAuth";
import { buildNavigationState } from "../../../utils/navigationContext";

export default function WorkspaceTodoPage({
  view = "today",
}) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { listId } = useParams();
  const detailRequestRef = useRef(0);
  const isTaskListView = view === "list";

  const [tasks, setTasks] = useState([]);
  const [taskListInfo, setTaskListInfo] = useState(null);
  const [taskListGroup, setTaskListGroup] = useState(null);
  const [todayKey, setTodayKey] = useState("");
  const [selectedTask, setSelectedTask] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingMyDay, setIsUpdatingMyDay] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [detailError, setDetailError] = useState("");

  const config = getTodoViewConfig({
    taskListInfo,
    view,
  });

  useEffect(() => {
    let ignore = false;

    async function loadTasks() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const params = {
          ordering: "due_at",
        };

        if (isTaskListView && listId) {
          params.task_list = listId;
        }

        const [tasksData, listData] = await Promise.all([
          getWorkspaceTasks(params),
          isTaskListView && listId
            ? getWorkspaceTaskListById(listId)
            : Promise.resolve(null),
        ]);

        let groupData = null;

        if (listData?.workspace_group) {
          try {
            groupData = await getWorkspaceGroupById(
              listData.workspace_group,
            );
          } catch (groupError) {
            console.error(
              "No se pudieron cargar los responsables de la lista.",
              groupError,
            );
          }
        }

        if (!ignore) {
          setTasks(normalizeTodoTasks(tasksData));
          setTaskListInfo(listData);
          setTaskListGroup(groupData);
          setTodayKey(getLocalDateKey(new Date()));
        }
      } catch (error) {
        if (!ignore) {
          setTasks([]);
          setTaskListInfo(null);
          setTaskListGroup(null);
          setErrorMessage(
            isTaskListView
              ? "No se pudo cargar esta lista de tareas."
              : "No se pudieron cargar las tareas de ToDo.",
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
  }, [isTaskListView, listId]);

  const viewTasks = useMemo(
    () =>
      tasks.filter((task) =>
        taskMatchesTodoView(
          task,
          view,
          user?.id,
        ),
      ),
    [tasks, user?.id, view],
  );

  const activeTasks = useMemo(
    () =>
      sortTodoTasks(
        viewTasks.filter(
          (task) => !taskIsClosed(task),
        ),
        todayKey,
      ),
    [todayKey, viewTasks],
  );

  const completedTasks = useMemo(
    () =>
      sortCompletedTodoTasks(
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

  const quickAssigneeOptions = useMemo(
    () => {
      if (
        !isTaskListView
        || !taskListInfo?.is_shared
        || !taskListInfo?.can_manage
      ) {
        return [];
      }

      return (taskListGroup?.memberships || [])
        .filter(
          (membership) =>
            membership.is_active
            && membership.user,
        )
        .map((membership) => ({
          value: String(membership.user),
          label: membership.user_name || `Usuario ${membership.user}`,
        }));
    },
    [
      isTaskListView,
      taskListGroup,
      taskListInfo?.can_manage,
      taskListInfo?.is_shared,
    ],
  );

  async function handleCreateTask({
    title,
    dueDate,
    assignedTo,
  }) {
    try {
      setIsSaving(true);
      setErrorMessage("");

      const payload = {
        title,
      };

      if (isTaskListView && listId) {
        payload.task_list = Number(listId);

        if (assignedTo) {
          payload.assigned_to = Number(assignedTo);
        } else if (
          taskListInfo?.is_shared
          && !taskListInfo?.can_manage
          && user?.id
        ) {
          payload.assigned_to = Number(user.id);
        }
      }

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

      let taskToShow = createdTask;

      if (view === "today") {
        try {
          taskToShow = await addWorkspaceTaskToMyDay(
            createdTask.id,
          );
        } catch (myDayError) {
          setTasks((currentTasks) => [
            createdTask,
            ...currentTasks,
          ]);
          setErrorMessage(
            "La tarea se creó, pero no se pudo agregar a Mi día.",
          );
          console.error(myDayError);
          return true;
        }
      }

      setTasks((currentTasks) => [
        taskToShow,
        ...currentTasks,
      ]);

      return true;
    } catch (error) {
      setErrorMessage(getTodoApiErrorMessage(error));
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

  async function toggleTaskMyDay(task) {
    try {
      setIsUpdatingMyDay(true);
      setDetailError("");

      const updatedTask = task.in_my_day
        ? await removeWorkspaceTaskFromMyDay(task.id)
        : await addWorkspaceTaskToMyDay(task.id);

      setTasks((currentTasks) =>
        currentTasks.map((currentTask) =>
          currentTask.id === updatedTask.id
            ? updatedTask
            : currentTask,
        ),
      );
      setSelectedTask(updatedTask);
    } catch (error) {
      setDetailError(
        "No se pudo actualizar Mi día. Intenta nuevamente.",
      );
      console.error(error);
    } finally {
      setIsUpdatingMyDay(false);
    }
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
      <TodoViewHeader
        config={config}
        summary={summary}
        onOpenManager={() =>
          navigate("/admin/workspace/tasks")
        }
      />

      <div className="mt-5">
        <TodoQuickTaskInput
          key={`${view}-${listId || "smart"}`}
          assigneeOptions={quickAssigneeOptions}
          isSaving={isSaving}
          onCreate={handleCreateTask}
          requireDate={view === "planned"}
          showAssignee={
            isTaskListView
            && taskListInfo?.is_shared
            && taskListInfo?.can_manage
          }
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

      <TodoTaskSections
        activeTasks={activeTasks}
        completedTasks={completedTasks}
        isLoading={isLoading}
        title={config.title}
        onOpenTask={openTask}
      />

      <TodoTaskDetailDrawer
        task={selectedTask}
        isLoading={isLoadingDetail}
        errorMessage={detailError}
        isUpdatingMyDay={isUpdatingMyDay}
        onClose={closeTaskDetail}
        onManage={manageTask}
        onToggleMyDay={toggleTaskMyDay}
      />
    </div>
  );
}
