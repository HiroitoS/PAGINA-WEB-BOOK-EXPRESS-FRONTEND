import { useEffect } from "react";
import {
  FaCheckCircle,
  FaEdit,
  FaFolderOpen,
  FaSpinner,
  FaTimes,
  FaUserCheck,
} from "react-icons/fa";
import {
  getUserLabel,
  getReminderDate,
  formatDateTime,
  reminderIsCompleted,
  reminderIsOverdue,
  reminderCanEditDetails,
  reminderCanComplete,
  reminderCanReopen,
  reminderIsReadOnly,
} from "./reminderUtils";
import { SelectField, DateTimeField } from "./ReminderFields";

export default function ReminderDrawer({
  canAssignToOthers,
  detailError,
  form,
  groups,
  isSaving,
  reminder,
  users,
  onChange,
  onClose,
  onComplete,
  onReopen,
  onSubmit,
}) {
  const isTaskReminder = reminder.source === "task";
  const isCompleted = reminderIsCompleted(reminder);
  const isOverdue = reminderIsOverdue(reminder);
  const canEditDetails = reminderCanEditDetails(reminder);
  const canComplete = reminderCanComplete(reminder);
  const canReopen = reminderCanReopen(reminder);
  const readOnly = reminderIsReadOnly(reminder);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/50"
      role="presentation"
      onClick={onClose}
    >
      <aside
        aria-modal="true"
        className="flex h-screen w-full flex-col overflow-hidden bg-white shadow-2xl sm:max-w-xl"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="border-b border-gray-200 bg-gray-950 px-4 py-4 text-white sm:px-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-red-300">
                Recordatorio
              </p>
              <h2 className="mt-1 line-clamp-2 text-xl font-black sm:text-2xl">
                {reminder.title}
              </h2>
              <p className="mt-1 text-sm leading-5 text-gray-300">
                {canEditDetails
                  ? "Edita la fecha del aviso o marca el recordatorio como completado."
                  : "Consulta el aviso y complétalo si está asignado a ti."}
              </p>
            </div>

            <button
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20"
              type="button"
              onClick={onClose}
            >
              <FaTimes />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-5">
          {detailError ? (
            <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {detailError}
            </div>
          ) : null}

          {readOnly ? (
            <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">
              Puedes ver este recordatorio porque pertenece a un grupo donde participas, pero no
              está asignado a ti.
            </div>
          ) : null}

          {!canEditDetails && canComplete ? (
            <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">
              Recordatorio asignado. Puedes marcarlo como completado, pero no modificar sus datos.
            </div>
          ) : null}

          <section className="mb-4 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap gap-2">
              <span
                className={`rounded-full border px-2.5 py-1 text-xs font-black ${
                  isCompleted
                    ? "border-gray-200 bg-gray-100 text-gray-700"
                    : isOverdue
                      ? "border-red-100 bg-red-50 text-red-700"
                      : "border-yellow-100 bg-yellow-50 text-yellow-800"
                }`}
              >
                {isCompleted ? "Completado" : isOverdue ? "Vencido" : "Activo"}
              </span>

              <span className="rounded-full border border-gray-100 bg-gray-50 px-2.5 py-1 text-xs font-black text-gray-600">
                {formatDateTime(getReminderDate(reminder))}
              </span>

              {readOnly ? (
                <span className="rounded-full border border-gray-100 bg-gray-50 px-2.5 py-1 text-xs font-black text-gray-500">
                  Solo lectura
                </span>
              ) : null}
            </div>

            <div className="mt-3 grid gap-2 text-xs font-bold text-gray-500">
              <span className="inline-flex items-center gap-2">
                <FaFolderOpen />
                {reminder.group_name || "Sin grupo"}
              </span>

              <span className="inline-flex items-center gap-2">
                <FaUserCheck />
                {reminder.assigned_to_name || reminder.user_name || "Sin asignar"}
              </span>
            </div>

            <p className="mt-3 text-sm leading-6 text-gray-700">
              {reminder.description || reminder.message || "Sin descripción registrada."}
            </p>
          </section>

          {canEditDetails ? (
            <form
              className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm"
              onSubmit={onSubmit}
            >
              <div className="mb-4">
                <p className="text-xs font-black uppercase tracking-wide text-red-700">Editar</p>
                <h3 className="mt-1 text-xl font-black text-gray-950">Datos del recordatorio</h3>
              </div>

              <div className="space-y-3">
                {isTaskReminder ? (
                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm font-semibold text-blue-900">
                    Este aviso pertenece a una tarea. Puedes reprogramar su fecha;
                    para modificar el título o responsable, abre la tarea original.
                  </div>
                ) : (
                  <div>
                    <label
                      className="mb-1.5 block text-xs font-black uppercase tracking-wide text-gray-500"
                      htmlFor="edit_reminder_title"
                    >
                      Título
                    </label>

                    <input
                      className="input-admin"
                      id="edit_reminder_title"
                      name="title"
                      type="text"
                      value={form.title}
                      onChange={onChange}
                    />
                  </div>
                )}

                <DateTimeField
                  helper="Día y hora del aviso."
                  id="edit_reminder_remind_at"
                  label="Fecha y hora"
                  name="remind_at"
                  value={form.remind_at}
                  onChange={onChange}
                />

                {!isTaskReminder ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <SelectField
                        id="edit_reminder_group"
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
                          id="edit_reminder_assigned_to"
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
                        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                          <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                            Responsable
                          </p>
                          <p className="mt-1 text-sm font-black text-gray-950">
                            {reminder.user_name || reminder.assigned_to_name || "Para mí"}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-gray-500">
                            Este campo no se cambia desde tu perfil.
                          </p>
                        </div>
                      )}
                    </div>

                    <div>
                      <label
                        className="mb-1.5 block text-xs font-black uppercase tracking-wide text-gray-500"
                        htmlFor="edit_reminder_description"
                      >
                        Nota breve
                      </label>

                      <textarea
                        className="input-admin min-h-24 resize-none"
                        id="edit_reminder_description"
                        name="description"
                        value={form.description}
                        onChange={onChange}
                      />
                    </div>
                  </>
                ) : null}

                <div className="flex flex-col gap-2 border-t border-gray-100 pt-4">
                  <ReminderCompletionButton
                    canComplete={canComplete}
                    canReopen={canReopen}
                    isCompleted={isCompleted}
                    isSaving={isSaving}
                    onComplete={onComplete}
                    onReopen={onReopen}
                  />

                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                      className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-black text-gray-700 transition hover:bg-gray-50"
                      type="button"
                      onClick={onClose}
                    >
                      Cancelar
                    </button>

                    <button
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-3 text-sm font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isSaving}
                      type="submit"
                    >
                      {isSaving ? <FaSpinner className="animate-spin" /> : <FaEdit />}
                      {isSaving ? "Guardando..." : "Guardar cambios"}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            <section className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-4">
                <p className="text-xs font-black uppercase tracking-wide text-red-700">Detalle</p>
                <h3 className="mt-1 text-xl font-black text-gray-950">Vista del recordatorio</h3>
                <p className="mt-1 text-sm leading-5 text-gray-500">
                  La planificación de este aviso no se puede modificar desde este usuario.
                </p>
              </div>

              <ReminderCompletionButton
                canComplete={canComplete}
                canReopen={canReopen}
                isCompleted={isCompleted}
                isSaving={isSaving}
                onComplete={onComplete}
                onReopen={onReopen}
              />
            </section>
          )}
        </div>
      </aside>
    </div>
  );
}

function ReminderCompletionButton({ canComplete, canReopen, isCompleted, isSaving, onComplete, onReopen }) {
  if (isCompleted && !canReopen) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
        {canComplete
          ? "Aviso atendido. La tarea está cerrada; reábrela solo si necesitas programar otro aviso."
          : "Aviso atendido. No tienes permiso para reabrirlo."}
      </div>
    );
  }

  if (!canComplete) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-500">
        Solo lectura. No tienes permiso para atender este aviso.
      </div>
    );
  }

  if (isCompleted) {
    return (
      <button
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-black text-gray-700 transition hover:border-red-200 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSaving}
        type="button"
        onClick={onReopen}
      >
        Reabrir recordatorio
      </button>
    );
  }

  return (
    <button
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 py-3 text-sm font-black text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={isSaving}
      type="button"
      onClick={onComplete}
    >
      <FaCheckCircle />
      Marcar atendido
    </button>
  );
}
