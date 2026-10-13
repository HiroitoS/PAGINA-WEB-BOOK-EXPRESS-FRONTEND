import { useState } from "react";
import { FaChevronDown, FaPlus, FaSpinner } from "react-icons/fa";
import { DateTimeField, SelectField, QuickDateButton } from "./WorkspaceTaskUI";

export default function WorkspaceTaskQuickForm({
  canAssignToOthers,
  categoryOptions,
  priorityOptions,
  getUserLabel,
  getTodayAt,
  getTomorrowAt,
  getReminderBeforeDue,
  getTodayReminderAt,
  groups,
  isSaving,
  taskForm,
  users,
  onChange,
  onReset,
  onSetField,
  onSubmit,
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
      <form onSubmit={onSubmit}>
        <div className="border-b border-gray-100 bg-gray-50 px-4 py-4 sm:px-5">
          <p className="text-xs font-black uppercase tracking-wide text-red-700">Nueva tarea</p>
          <h2 className="mt-1 text-xl font-black text-gray-950">Registrar pendiente</h2>
          <p className="mt-1 text-sm leading-5 text-gray-500">
            Ingresa la actividad, define una fecha y agrega detalles solo si corresponde.
          </p>
        </div>

        <div className="grid gap-0 lg:grid-cols-12">
          <div className="space-y-4 p-4 sm:p-5 lg:col-span-7 lg:border-r lg:border-gray-100 xl:col-span-8">
            <div>
              <label
                className="mb-1.5 block text-xs font-black uppercase tracking-wide text-gray-500"
                htmlFor="task_title"
              >
                ¿Qué se debe hacer?
              </label>

              <input
                className="input-admin"
                id="task_title"
                name="title"
                placeholder="Ejemplo: Confirmar atención de solicitud"
                type="text"
                value={taskForm.title}
                onChange={onChange}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <DateTimeField
                helper="Fecha en la que debe estar terminado."
                id="task_due_at"
                label="Fecha límite"
                name="due_at"
                value={taskForm.due_at}
                onChange={onChange}
              />

              <DateTimeField
                helper="Día y hora del aviso."
                id="task_reminder_at"
                label="Recordatorio"
                name="reminder_at"
                value={taskForm.reminder_at}
                onChange={onChange}
              />
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
              <p className="mb-2 text-xs font-black uppercase tracking-wide text-gray-500">
                Accesos rápidos
              </p>

              <div className="flex flex-wrap gap-2">
                <QuickDateButton
                  label="Vence hoy 6 p. m."
                  onClick={() => onSetField("due_at", getTodayAt(18))}
                />

                <QuickDateButton
                  label="Vence mañana 9 a. m."
                  onClick={() => onSetField("due_at", getTomorrowAt(9))}
                />

                <QuickDateButton
                  label="Recordar en 1 hora"
                  onClick={() => onSetField("reminder_at", getTodayReminderAt(60))}
                />

                <QuickDateButton
                  label="1 h antes"
                  onClick={() =>
                    onSetField("reminder_at", getReminderBeforeDue(taskForm.due_at, 60))
                  }
                />
              </div>
            </div>

            <div className="hidden lg:block">
              <label
                className="mb-1.5 block text-xs font-black uppercase tracking-wide text-gray-500"
                htmlFor="task_description_desktop"
              >
                Descripción
              </label>

              <textarea
                className="input-admin min-h-24 resize-none"
                id="task_description_desktop"
                name="description"
                placeholder="Detalle breve del pendiente, indicación o resultado esperado."
                value={taskForm.description}
                onChange={onChange}
              />
            </div>

            <button
              className="flex w-full items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left text-sm font-black text-gray-800 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 lg:hidden"
              type="button"
              onClick={() => setShowAdvanced((currentValue) => !currentValue)}
            >
              <span>Más detalles opcionales</span>
              <FaChevronDown
                className={`text-xs transition ${showAdvanced ? "rotate-180" : "rotate-0"}`}
              />
            </button>
          </div>

          <div
            className={`space-y-4 bg-gray-50 p-4 sm:p-5 lg:col-span-5 lg:block xl:col-span-4 ${
              showAdvanced ? "block" : "hidden"
            }`}
          >
            <div className="rounded-2xl border border-gray-100 bg-white p-4">
              <p className="text-xs font-black uppercase tracking-wide text-gray-500">Opcional</p>
              <h3 className="mt-1 text-base font-black text-gray-950">Detalles de la tarea</h3>
              <p className="mt-1 text-sm leading-5 text-gray-500">
                Completa estos datos cuando el pendiente tenga grupo, responsable, prioridad o
                clasificación interna.
                {canAssignToOthers
                  ? " Como administrador puedes asignarla a otro usuario."
                  : " Esta tarea quedará asignada a ti."}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <SelectField
                id="task_group"
                label="Grupo"
                name="group"
                options={groups.map((group) => ({
                  value: String(group.id),
                  label: group.name,
                }))}
                placeholder="Sin grupo"
                value={taskForm.group}
                onChange={onChange}
              />

              {canAssignToOthers ? (
                <SelectField
                  helper="Por defecto queda para ti."
                  id="task_assigned_to"
                  label="Asignado a"
                  name="assigned_to"
                  options={users.map((user) => ({
                    value: String(user.id),
                    label: getUserLabel(user),
                  }))}
                  placeholder="Para mí"
                  value={taskForm.assigned_to}
                  onChange={onChange}
                />
              ) : (
                <div className="rounded-2xl border border-gray-100 bg-white p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                    Asignado a
                  </p>
                  <p className="mt-1 text-sm font-black text-gray-950">Para mí</p>
                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    Los usuarios de atención o catálogo crean tareas propias.
                  </p>
                </div>
              )}

              <SelectField
                id="task_type"
                label="Categoría"
                name="task_type"
                options={categoryOptions}
                value={taskForm.task_type}
                onChange={onChange}
              />

              <SelectField
                id="task_priority"
                label="Prioridad"
                name="priority"
                options={priorityOptions}
                value={taskForm.priority}
                onChange={onChange}
              />
            </div>

            <div className="lg:hidden">
              <label
                className="mb-1.5 block text-xs font-black uppercase tracking-wide text-gray-500"
                htmlFor="task_description_mobile"
              >
                Descripción
              </label>

              <textarea
                className="input-admin min-h-20 resize-none"
                id="task_description_mobile"
                name="description"
                placeholder="Detalle breve del pendiente."
                value={taskForm.description}
                onChange={onChange}
              />
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 bg-white px-4 py-4 sm:px-5">
          <div className="grid gap-2 sm:flex sm:justify-end">
            <button
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-black text-gray-700 transition hover:bg-gray-50"
              type="button"
              onClick={onReset}
            >
              Limpiar
            </button>

            <button
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-5 py-3 text-sm font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? <FaSpinner className="animate-spin" /> : <FaPlus />}
              {isSaving ? "Guardando..." : "Crear tarea"}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
