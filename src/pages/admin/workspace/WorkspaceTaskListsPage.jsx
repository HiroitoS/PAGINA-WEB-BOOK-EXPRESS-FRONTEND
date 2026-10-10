import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FaArrowRight,
  FaEdit,
  FaPlus,
  FaSave,
  FaSpinner,
  FaTasks,
  FaUsers,
} from "react-icons/fa";
import { useNavigate } from "react-router";

import {
  createWorkspaceTaskList,
  getWorkspaceGroups,
  getWorkspaceTaskLists,
  updateWorkspaceTaskList,
} from "../../../api/adminApi";

const INITIAL_FORM = {
  name: "",
  description: "",
  color: "#dc2626",
  workspace_group: "",
  is_active: true,
};

function normalizeList(data) {
  if (Array.isArray(data)) {
    return data;
  }

  return Array.isArray(data?.results) ? data.results : [];
}

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

function getScopeLabel(taskList) {
  if (taskList.workspace_group_name) {
    return `Equipo: ${taskList.workspace_group_name}`;
  }

  return "Lista personal";
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
          setTaskLists(normalizeList(listsData));
          setGroups(normalizeList(groupsData));
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
    const { name, type, checked, value } = event.target;

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
        setNoticeMessage("La lista se actualizó correctamente.");
        resetForm();
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
        <section className="rounded-3xl border border-gray-200 bg-white shadow-sm xl:col-span-5">
          <div className="border-b border-gray-100 bg-gray-50 px-5 py-4">
            <p className="text-xs font-black uppercase tracking-wide text-red-700">
              {editingId ? "Edición" : "Nueva lista"}
            </p>
            <h2 className="mt-1 text-xl font-black text-gray-950">
              {editingId
                ? "Actualizar lista"
                : "Crear lista de tareas"}
            </h2>
            <p className="mt-1 text-sm leading-5 text-gray-500">
              {editingId
                ? "Puedes cambiar nombre, descripción, color y disponibilidad. El alcance de la lista se conserva."
                : "Una lista personal es solo tuya. Una lista compartida pertenece a un equipo que administras."}
            </p>
          </div>

          <form
            className="space-y-4 p-5"
            onSubmit={handleSubmit}
          >
            <div>
              <label
                className="mb-1.5 block text-xs font-black uppercase tracking-wide text-gray-500"
                htmlFor="task_list_name"
              >
                Nombre
              </label>
              <input
                className="input-admin"
                id="task_list_name"
                name="name"
                placeholder="Ejemplo: Campaña escolar 2027"
                type="text"
                value={form.name}
                onChange={handleChange}
              />
            </div>

            <div>
              <label
                className="mb-1.5 block text-xs font-black uppercase tracking-wide text-gray-500"
                htmlFor="task_list_description"
              >
                Descripción
              </label>
              <textarea
                className="input-admin min-h-24 resize-none"
                id="task_list_description"
                name="description"
                placeholder="Describe brevemente qué trabajo se organizará aquí."
                value={form.description}
                onChange={handleChange}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label
                  className="mb-1.5 block text-xs font-black uppercase tracking-wide text-gray-500"
                  htmlFor="task_list_color"
                >
                  Color
                </label>
                <input
                  className="input-admin h-12"
                  id="task_list_color"
                  name="color"
                  type="color"
                  value={form.color}
                  onChange={handleChange}
                />
              </div>

              {editingId ? (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                    Alcance
                  </p>
                  <p className="mt-1 text-sm font-black text-gray-950">
                    {getScopeLabel(editingList || form)}
                  </p>
                </div>
              ) : (
                <div>
                  <label
                    className="mb-1.5 block text-xs font-black uppercase tracking-wide text-gray-500"
                    htmlFor="task_list_group"
                  >
                    Alcance
                  </label>
                  <select
                    className="input-admin"
                    id="task_list_group"
                    name="workspace_group"
                    value={form.workspace_group}
                    onChange={handleChange}
                  >
                    <option value="">
                      Personal · solo yo
                    </option>
                    {manageableGroups.map((group) => (
                      <option
                        key={group.id}
                        value={group.id}
                      >
                        Compartida · {group.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {editingId ? (
              <label className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-black text-gray-700">
                <input
                  checked={form.is_active}
                  className="h-4 w-4 rounded border-gray-300 text-red-700 focus:ring-red-600"
                  name="is_active"
                  type="checkbox"
                  onChange={handleChange}
                />
                Lista activa
              </label>
            ) : null}

            {!editingId && manageableGroups.length === 0 ? (
              <p className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs leading-5 text-gray-600">
                Puedes crear listas personales. Las listas compartidas estarán disponibles cuando administres un equipo de trabajo.
              </p>
            ) : null}

            {errorMessage ? (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
                {errorMessage}
              </p>
            ) : null}

            {noticeMessage ? (
              <p className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-700">
                {noticeMessage}
              </p>
            ) : null}

            <div className="grid gap-2 sm:flex sm:justify-end">
              {editingId ? (
                <button
                  className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-black text-gray-700 transition hover:bg-gray-50"
                  type="button"
                  onClick={resetForm}
                >
                  Cancelar
                </button>
              ) : null}

              <button
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-5 py-3 text-sm font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSaving}
                type="submit"
              >
                {isSaving ? (
                  <FaSpinner className="animate-spin" />
                ) : editingId ? (
                  <FaSave />
                ) : (
                  <FaPlus />
                )}
                {isSaving
                  ? "Guardando..."
                  : editingId
                    ? "Guardar cambios"
                    : "Crear lista"}
              </button>
            </div>
          </form>
        </section>

        <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm xl:col-span-7">
          <div className="border-b border-gray-100 px-5 py-4">
            <p className="text-xs font-black uppercase tracking-wide text-red-700">
              Tus espacios
            </p>
            <h2 className="mt-1 text-xl font-black text-gray-950">
              Listas visibles
            </h2>
            <p className="mt-1 text-sm leading-5 text-gray-500">
              Las listas compartidas solo muestran equipos a los que tienes acceso.
            </p>
          </div>

          {isLoading ? (
            <div className="space-y-3 p-5">
              {Array.from(
                { length: 4 },
                (_, index) => (
                  <div
                    key={index}
                    className="h-20 animate-pulse rounded-2xl bg-gray-100"
                  />
                ),
              )}
            </div>
          ) : taskLists.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {taskLists.map((taskList) => (
                <article
                  key={taskList.id}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className="mt-1 h-3 w-3 shrink-0 rounded-full"
                      style={{
                        backgroundColor: taskList.color || "#dc2626",
                      }}
                    />

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-black text-gray-950">
                          {taskList.name}
                        </h3>
                        <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-black text-gray-600">
                          {taskList.is_shared
                            ? "Compartida"
                            : "Personal"}
                        </span>
                        {taskList.is_active === false ? (
                          <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-black text-red-700">
                            Inactiva
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-1 text-xs font-semibold text-gray-500">
                        {getScopeLabel(taskList)}
                        {taskList.created_by_name
                          ? ` · Creada por ${taskList.created_by_name}`
                          : ""}
                      </p>

                      {taskList.description ? (
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">
                          {taskList.description}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    {taskList.can_manage ? (
                      <button
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-black text-gray-700 transition hover:border-red-200 hover:text-red-700"
                        type="button"
                        onClick={() => startEditing(taskList)}
                      >
                        <FaEdit />
                        Editar
                      </button>
                    ) : null}

                    <button
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-950 px-3 py-2 text-xs font-black text-white transition hover:bg-gray-800"
                      type="button"
                      onClick={() =>
                        navigate(
                          `/admin/workspace/lists/${taskList.id}`,
                        )
                      }
                    >
                      {taskList.is_shared ? <FaUsers /> : <FaTasks />}
                      Abrir
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="px-5 py-12 text-center">
              <FaTasks className="mx-auto text-3xl text-gray-300" />
              <p className="mt-3 text-sm font-black text-gray-900">
                Todavía no tienes listas.
              </p>
              <p className="mt-1 text-xs leading-5 text-gray-500">
                Crea una lista personal o una lista compartida con uno de tus equipos.
              </p>
            </div>
          )}
        </section>
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
