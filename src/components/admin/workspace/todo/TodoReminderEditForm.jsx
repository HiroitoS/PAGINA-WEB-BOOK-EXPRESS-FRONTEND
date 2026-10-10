export default function TodoReminderEditForm({
  form,
  groups,
  users,
  isSaving,
  canAssignToOthers,
  isTaskReminder,
  assignedToName,
  onCancel,
  onChange,
  onSubmit,
}) {
  const inputClass =
    "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-900 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100";
  const labelClass = "mb-1.5 block text-xs font-black uppercase tracking-wide text-gray-600";

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      {isTaskReminder ? (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
          <p className="text-xs font-black uppercase tracking-wide text-blue-700">
            Recordatorio de una tarea
          </p>
          <p className="mt-1 text-sm leading-5 text-blue-900">
            Puedes ajustar la fecha y hora del aviso. El título, responsable y equipo se mantienen
            vinculados a la tarea original.
          </p>
        </div>
      ) : null}

      <div>
        <label className={labelClass} htmlFor="calendar-reminder-title">
          Título
        </label>
        <input
          className={`${inputClass} ${isTaskReminder ? "bg-gray-100 text-gray-600" : ""}`}
          disabled={isTaskReminder}
          id="calendar-reminder-title"
          name="title"
          type="text"
          value={form.title}
          onChange={onChange}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="calendar-reminder-at">
          Fecha y hora
        </label>
        <input
          className={inputClass}
          id="calendar-reminder-at"
          name="remind_at"
          type="datetime-local"
          value={form.remind_at}
          onChange={onChange}
        />
      </div>

      {!isTaskReminder ? (
        <>
          <div>
            <label className={labelClass} htmlFor="calendar-reminder-group">
              Grupo
            </label>
            <select
              className={inputClass}
              id="calendar-reminder-group"
              name="group"
              value={form.group}
              onChange={onChange}
            >
              <option value="">Sin grupo</option>
              {groups.map((group) => (
                <option key={group.id} value={String(group.id)}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass} htmlFor="calendar-reminder-assigned-to">
              Responsable
            </label>
            {canAssignToOthers ? (
              <select
                className={inputClass}
                id="calendar-reminder-assigned-to"
                name="assigned_to"
                value={form.assigned_to}
                onChange={onChange}
              >
                {users.map((user) => (
                  <option key={user.id} value={String(user.id)}>
                    {user.full_name || user.username || "Usuario " + user.id}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className={`${inputClass} bg-gray-100 text-gray-600`}
                disabled
                id="calendar-reminder-assigned-to"
                type="text"
                value={assignedToName || "Usuario actual"}
              />
            )}
          </div>

          <div>
            <label className={labelClass} htmlFor="calendar-reminder-description">
              Nota breve
            </label>
            <textarea
              className={`${inputClass} min-h-24 resize-y`}
              id="calendar-reminder-description"
              name="description"
              value={form.description}
              onChange={onChange}
            />
          </div>
        </>
      ) : null}

      <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
        <button
          className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-black text-gray-700 transition hover:bg-gray-50"
          disabled={isSaving}
          type="button"
          onClick={onCancel}
        >
          Cancelar
        </button>
        <button
          className="rounded-xl bg-red-700 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSaving}
          type="submit"
        >
          {isSaving ? "Guardando..." : "Guardar recordatorio"}
        </button>
      </div>
    </form>
  );
}
