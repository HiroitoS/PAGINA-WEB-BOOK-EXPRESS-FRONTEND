import {
  FaPlus,
  FaSave,
  FaSpinner,
} from "react-icons/fa";

import { getTaskListScopeLabel } from "./taskListUtils";

export default function TodoTaskListForm({
  editingId,
  editingList,
  errorMessage,
  form,
  isSaving,
  manageableGroups,
  noticeMessage,
  onCancel,
  onChange,
  onSubmit,
}) {
  return (
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
        onSubmit={onSubmit}
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
            onChange={onChange}
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
            onChange={onChange}
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
              onChange={onChange}
            />
          </div>

          {editingId ? (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                Alcance
              </p>
              <p className="mt-1 text-sm font-black text-gray-950">
                {getTaskListScopeLabel(editingList || form)}
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
                onChange={onChange}
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
              onChange={onChange}
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
              onClick={onCancel}
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
  );
}
