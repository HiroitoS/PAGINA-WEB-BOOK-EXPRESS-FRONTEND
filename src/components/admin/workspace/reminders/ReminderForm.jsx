import { useState } from "react";
import {
  FaChevronDown,
  FaPlus,
  FaSpinner,
} from "react-icons/fa";
import {
  getUserLabel,
  getTodayAt,
  getTomorrowAt,
  getMinutesFromNow,
} from "./reminderUtils";
import { SelectField, DateTimeField, QuickDateButton } from "./ReminderFields";

export default function ReminderForm({
  canAssignToOthers,
  form,
  groups,
  isSaving,
  submitLabel,
  users,
  onCancel,
  onChange,
  onSetField,
  onSubmit,
}) {
  const [showMore, setShowMore] = useState(false);

  return (
    <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
      <form onSubmit={onSubmit}>
        <div className="border-b border-gray-100 bg-gray-950 px-4 py-4 text-white sm:px-5">
          <p className="text-xs font-black uppercase tracking-wide text-red-300">
            Nuevo recordatorio
          </p>
          <h2 className="mt-1 text-xl font-black">Crear aviso rápido</h2>
          <p className="mt-1 text-sm leading-5 text-gray-300">
            Registra un pendiente simple para no olvidarlo. No es una tarea ni un evento.
          </p>
        </div>

        <div className="grid gap-0 xl:grid-cols-12">
          <div className="space-y-4 p-4 sm:p-5 xl:col-span-7 xl:border-r xl:border-gray-100">
            <div>
              <label
                className="mb-1.5 block text-xs font-black uppercase tracking-wide text-gray-500"
                htmlFor="reminder_title"
              >
                ¿Qué quieres recordar?
              </label>

              <input
                className="input-admin"
                id="reminder_title"
                name="title"
                placeholder="Ejemplo: Llamar al colegio para confirmar entrega"
                type="text"
                value={form.title}
                onChange={onChange}
              />
            </div>

            <DateTimeField
              helper="Día y hora en que debe aparecer el aviso."
              id="reminder_remind_at"
              label="Fecha y hora"
              name="remind_at"
              value={form.remind_at}
              onChange={onChange}
            />

            <div className="rounded-2xl border border-yellow-100 bg-yellow-50 p-3">
              <p className="mb-2 text-xs font-black uppercase tracking-wide text-yellow-800">
                Recordatorio rápido
              </p>

              <div className="flex flex-wrap gap-2">
                <QuickDateButton
                  label="En 1 hora"
                  onClick={() => onSetField("remind_at", getMinutesFromNow(60))}
                />

                <QuickDateButton
                  label="Hoy 6 p. m."
                  onClick={() => onSetField("remind_at", getTodayAt(18))}
                />

                <QuickDateButton
                  label="Mañana 9 a. m."
                  onClick={() => onSetField("remind_at", getTomorrowAt(9))}
                />

                <QuickDateButton label="Limpiar" onClick={() => onSetField("remind_at", "")} />
              </div>
            </div>

            <button
              className="flex w-full items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left text-sm font-black text-gray-800 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 xl:hidden"
              type="button"
              onClick={() => setShowMore((currentValue) => !currentValue)}
            >
              <span>Más detalles opcionales</span>
              <FaChevronDown
                className={`text-xs transition ${showMore ? "rotate-180" : "rotate-0"}`}
              />
            </button>
          </div>

          <div
            className={`space-y-4 bg-gray-50 p-4 sm:p-5 xl:col-span-5 xl:block ${
              showMore ? "block" : "hidden"
            }`}
          >
            <div className="rounded-2xl border border-gray-100 bg-white p-4">
              <p className="text-xs font-black uppercase tracking-wide text-gray-500">Opcional</p>
              <h3 className="mt-1 text-base font-black text-gray-950">Contexto opcional</h3>
              <p className="mt-1 text-sm leading-5 text-gray-500">
                Usa esta sección solo si el aviso pertenece a un grupo interno.
                {canAssignToOthers
                  ? " Como administrador también puedes enviarlo a otro responsable."
                  : " Este recordatorio quedará asignado a ti."}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <SelectField
                id="reminder_group"
                label="Grupo"
                name="group"
                options={groups.map((group) => ({
                  value: String(group.id),
                  label: group.name,
                }))}
                placeholder="Sin grupo"
                value={form.group}
                onChange={onChange}
              />

              {canAssignToOthers ? (
                <SelectField
                  id="reminder_assigned_to"
                  label="Responsable"
                  name="assigned_to"
                  options={users.map((userItem) => ({
                    value: String(userItem.id),
                    label: getUserLabel(userItem),
                  }))}
                  placeholder="Para mí"
                  value={form.assigned_to}
                  onChange={onChange}
                />
              ) : (
                <div className="rounded-2xl border border-gray-100 bg-white p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                    Responsable
                  </p>
                  <p className="mt-1 text-sm font-black text-gray-950">Para mí</p>
                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    Los recordatorios que crees quedarán en tu propia agenda.
                  </p>
                </div>
              )}
            </div>

            <div>
              <label
                className="mb-1.5 block text-xs font-black uppercase tracking-wide text-gray-500"
                htmlFor="reminder_description"
              >
                Nota breve
              </label>

              <textarea
                className="input-admin min-h-24 resize-none"
                id="reminder_description"
                name="description"
                placeholder="Agrega una indicación corta si hace falta."
                value={form.description}
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
              onClick={onCancel}
            >
              Cancelar
            </button>

            <button
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-5 py-3 text-sm font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? <FaSpinner className="animate-spin" /> : <FaPlus />}
              {isSaving ? "Guardando..." : submitLabel}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
