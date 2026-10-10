import {
  FaBell,
  FaCalendarAlt,
  FaExternalLinkAlt,
  FaFlag,
  FaFolderOpen,
  FaSun,
  FaTimes,
  FaUser,
  FaUserEdit,
  FaUsers,
} from "react-icons/fa";

function formatDateTime(value) {
  if (!value) {
    return "Sin fecha";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3 border-b border-gray-100 py-3 last:border-b-0">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
        {icon}
      </span>

      <div className="min-w-0">
        <p className="text-xs font-black uppercase tracking-wide text-gray-500">
          {label}
        </p>
        <p className="mt-1 text-sm font-bold leading-5 text-gray-900">
          {value || "No registrado"}
        </p>
      </div>
    </div>
  );
}

export default function TodoTaskDetailDrawer({
  task,
  isLoading = false,
  errorMessage = "",
  isUpdatingMyDay = false,
  onClose,
  onManage,
  onToggleMyDay,
}) {
  if (!task) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/45"
      role="presentation"
      onClick={onClose}
    >
      <aside
        aria-modal="true"
        className="flex h-dvh w-full flex-col overflow-hidden bg-white shadow-2xl sm:max-w-xl"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="shrink-0 border-b border-gray-200 bg-white px-4 py-4 sm:px-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wide text-red-700">
                Detalle de tarea
              </p>
              <h2 className="mt-1 text-xl font-black leading-7 text-gray-950">
                {task.title}
              </h2>

              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-black text-gray-700">
                  {task.status_display || task.status || "Pendiente"}
                </span>
                <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-black text-red-700">
                  {task.priority_display || task.priority || "Media"}
                </span>
              </div>
            </div>

            <button
              aria-label="Cerrar detalle"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
              type="button"
              onClick={onClose}
            >
              <FaTimes />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }, (_, index) => (
                <div
                  key={index}
                  className="h-14 animate-pulse rounded-2xl bg-gray-100"
                />
              ))}
            </div>
          ) : (
            <>
              {errorMessage ? (
                <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
                  {errorMessage}
                </div>
              ) : null}

              {task.description ? (
                <section className="mb-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                    Descripción
                  </p>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-700">
                    {task.description}
                  </p>
                </section>
              ) : null}

              <section className="rounded-2xl border border-gray-200 bg-white px-4">
                <InfoRow
                  icon={<FaCalendarAlt />}
                  label="Fecha límite"
                  value={formatDateTime(task.due_at)}
                />
                <InfoRow
                  icon={<FaBell />}
                  label="Recordatorio"
                  value={formatDateTime(task.reminder_at)}
                />
                <InfoRow
                  icon={<FaUser />}
                  label="Responsable"
                  value={task.assigned_to_name}
                />
                <InfoRow
                  icon={<FaUserEdit />}
                  label="Asignada por"
                  value={task.created_by_name}
                />
                <InfoRow
                  icon={<FaFlag />}
                  label="Tipo de tarea"
                  value={task.task_type_display}
                />
                {task.task_list_name ? (
                  <InfoRow
                    icon={<FaFolderOpen />}
                    label="Lista"
                    value={task.task_list_name}
                  />
                ) : null}
                <InfoRow
                  icon={<FaUsers />}
                  label="Equipo"
                  value={task.group_name}
                />
              </section>

              {task.is_important ? (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                  Esta tarea está marcada como importante.
                </div>
              ) : null}
            </>
          )}
        </div>

        <footer className="shrink-0 border-t border-gray-200 bg-white px-4 py-3 sm:px-5">
          {task.status !== "completed" && task.status !== "cancelled" ? (
            <button
              className="mb-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-black text-gray-900 transition hover:border-red-200 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              disabled={isUpdatingMyDay}
              onClick={() => onToggleMyDay(task)}
            >
              <FaSun className="text-red-700" />
              {isUpdatingMyDay
                ? "Actualizando..."
                : task.in_my_day
                  ? "Quitar de Mi día"
                  : "Agregar a Mi día"}
            </button>
          ) : null}

          <button
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 py-3 text-sm font-black text-white transition hover:bg-gray-800"
            type="button"
            onClick={() => onManage(task)}
          >
            <FaExternalLinkAlt className="text-xs" />
            Gestionar tarea
          </button>
          <p className="mt-2 text-center text-xs leading-5 text-gray-500">
            Edición, seguimiento e historial continúan disponibles en el gestor completo.
          </p>
        </footer>
      </aside>
    </div>
  );
}
