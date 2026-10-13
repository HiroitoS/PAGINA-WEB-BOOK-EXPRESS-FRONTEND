import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FaArrowRight,
  FaTasks,
} from "react-icons/fa";
import { useNavigate } from "react-router";

import {
  createWorkspaceTaskList,
  getWorkspaceGroups,
  getWorkspaceTaskLists,
  updateWorkspaceTaskList,
} from "../../../api/adminApi";
import TodoTaskListCollection from "../../../components/admin/workspace/todo/TodoTaskListCollection";
import TodoTaskListForm from "../../../components/admin/workspace/todo/TodoTaskListForm";
import { normalizeTaskLists } from "../../../components/admin/workspace/todo/taskListUtils";

const INITIAL_FORM = {
  name: "",
  description: "",
  color: "#dc2626",
  workspace_group: "",
  is_active: true,
};

function getApiErrorMessage(error, fallbackMessage) {
  const data = error?.response?.data;

  if (typeof data?.detail === "string") {
    return data.detail;
  }

  if (Array.isArray(data?.name) && data.name.length > 0) {
    return data.name[0];
  }

  if (
    Array.isArray(data?.workspace_group)
    && data.workspace_group.length > 0
  ) {
    return data.workspace_group[0];
  }

  return fallbackMessage;
}

export default function WorkspaceTaskListsPage() {
  const navigate = useNavigate();

  const [taskLists, setTaskLists] = useState([]);
  const [groups, setGroups] = useState([]);
  const [form, setForm] = useState(INITIAL_FORM);
  const [editingId, setEditingId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [noticeMessage, setNoticeMessage] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        const [listsData, groupsData] = await Promise.all([
          getWorkspaceTaskLists(),
          getWorkspaceGroups({
            is_active: "true",
          }),
        ]);

        if (!ignore) {
          setTaskLists(normalizeTaskLists(listsData));
          setGroups(normalizeTaskLists(groupsData));
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(
            "No se pudieron cargar las listas de tareas.",
          );
        }
        console.error(error);
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      ignore = true;
    };
  }, []);

  const manageableGroups = useMemo(
    () =>
      groups.filter(
        (group) => group.can_manage === true,
      ),
    [groups],
  );

  const activeCount = useMemo(
    () =>
      taskLists.filter(
        (taskList) => taskList.is_active !== false,
      ).length,
    [taskLists],
  );

  const sharedCount = useMemo(
    () =>
      taskLists.filter(
        (taskList) => taskList.is_shared,
      ).length,
    [taskLists],
  );

  const personalCount = taskLists.length - sharedCount;
  const editingList = taskLists.find(
    (taskList) => Number(taskList.id) === Number(editingId),
  );

  function handleChange(event) {
    const {
      checked,
      name,
      type,
      value,
    } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
    setErrorMessage("");
    setNoticeMessage("");
  }

  function resetForm() {
    setEditingId(null);
    setForm(INITIAL_FORM);
  }

  function cancelEditing() {
    resetForm();
    setErrorMessage("");
    setNoticeMessage("");
  }

  function startEditing(taskList) {
    setEditingId(taskList.id);
    setForm({
      name: taskList.name || "",
      description: taskList.description || "",
      color: taskList.color || "#dc2626",
      workspace_group: taskList.workspace_group
        ? String(taskList.workspace_group)
        : "",
      is_active: taskList.is_active !== false,
    });
    setErrorMessage("");
    setNoticeMessage("");
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const cleanName = form.name.trim();

    if (!cleanName) {
      setErrorMessage("Ingresa un nombre para la lista.");
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage("");
      setNoticeMessage("");

      if (editingId) {
        const updated = await updateWorkspaceTaskList(
          editingId,
          {
            name: cleanName,
            description: form.description.trim(),
            color: form.color,
            is_active: form.is_active,
          },
        );

        setTaskLists((current) =>
          current.map((taskList) =>
            Number(taskList.id) === Number(updated.id)
              ? updated
              : taskList,
          ),
        );
        resetForm();
        setNoticeMessage(
          "La lista se actualizó correctamente.",
        );
        return;
      }

      const created = await createWorkspaceTaskList({
        name: cleanName,
        description: form.description.trim(),
        color: form.color,
        workspace_group: form.workspace_group
          ? Number(form.workspace_group)
          : null,
        is_active: true,
      });

      setTaskLists((current) => [
        ...current,
        created,
      ]);
      resetForm();
      navigate(`/admin/workspace/lists/${created.id}`);
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(
          error,
          editingId
            ? "No se pudo actualizar la lista."
            : "No se pudo crear la lista.",
        ),
      );
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl">
      <section className="overflow-hidden rounded-3xl bg-gray-950 text-white shadow-sm">
        <div className="flex flex-col gap-5 px-5 py-6 sm:px-7 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-700 text-xl">
              <FaTasks />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wide text-red-300">
                Organización del trabajo
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
                Listas de tareas
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-300">
                Crea listas personales o compartidas por equipo y organiza el trabajo sin mezclar responsabilidades.
              </p>
            </div>
          </div>

          <button
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-black text-white transition hover:bg-white/15"
            type="button"
            onClick={() => navigate("/admin/workspace")}
          >
            Volver a Mi día
            <FaArrowRight className="text-xs" />
          </button>
        </div>
      </section>

      <div className="mt-5 grid grid-cols-3 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <Metric label="Activas" value={activeCount} />
        <Metric label="Personales" value={personalCount} />
        <Metric label="Compartidas" value={sharedCount} last />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-12">
        <TodoTaskListForm
          editingId={editingId}
          editingList={editingList}
          errorMessage={errorMessage}
          form={form}
          isSaving={isSaving}
          manageableGroups={manageableGroups}
          noticeMessage={noticeMessage}
          onCancel={cancelEditing}
          onChange={handleChange}
          onSubmit={handleSubmit}
        />

        <TodoTaskListCollection
          isLoading={isLoading}
          taskLists={taskLists}
          onEdit={startEditing}
          onOpen={(taskList) =>
            navigate(
              `/admin/workspace/lists/${taskList.id}`,
            )
          }
        />
      </div>
    </div>
  );
}

function Metric({
  label,
  last = false,
  value,
}) {
  return (
    <div
      className={
        "px-4 py-3 sm:px-5 "
        + (last ? "" : "border-r border-gray-100")
      }
    >
      <p className="text-xs font-black uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black text-gray-950">
        {value}
      </p>
    </div>
  );
}
