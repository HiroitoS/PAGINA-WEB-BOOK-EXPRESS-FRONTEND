import {
  FaBell,
  FaCheckCircle,
  FaChevronDown,
  FaClock,
  FaFolderOpen,
  FaUserCheck,
} from "react-icons/fa";
import {
  getReminderDate,
  formatShortDate,
  reminderIsCompleted,
  reminderIsOverdue,
  reminderCanComplete,
  reminderCanReopen,
  reminderIsReadOnly,
} from "./reminderUtils";

export function MobileReminderAccordion({
  isSaving,
  openingReminderId,
  openSections,
  sections,
  onComplete,
  onDetail,
  onReopen,
  onToggleSection,
}) {
  return (
    <div className="space-y-3">
      {sections.map((section) => {
        const isOpen = Boolean(openSections[section.key]);

        return (
          <section
            key={section.key}
            className={`overflow-hidden rounded-3xl border bg-white shadow-sm transition ${
              isOpen ? "border-red-100" : "border-gray-200"
            }`}
          >
            <button
              className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
              type="button"
              onClick={() => onToggleSection(section.key)}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-gray-950">{section.title}</h3>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-black ${
                      section.variant === "danger"
                        ? "bg-red-50 text-red-700"
                        : section.variant === "success"
                          ? "bg-gray-100 text-gray-700"
                          : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {section.items.length}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-gray-500">{section.description}</p>
              </div>

              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition ${
                  isOpen ? "bg-red-50 text-red-700" : "bg-gray-50 text-gray-500"
                }`}
              >
                <FaChevronDown
                  className={`text-xs transition ${isOpen ? "rotate-180" : "rotate-0"}`}
                />
              </span>
            </button>

            {isOpen ? (
              <div className="border-t border-gray-100 bg-gray-50 p-3">
                {section.items.length === 0 ? (
                  <EmptyState text="No hay recordatorios en esta sección." />
                ) : (
                  <div className="space-y-2">
                    {section.items.map((reminder) => (
                      <ReminderCard
                        key={reminder.id}
                        compact
                        isSaving={isSaving}
                        openingReminderId={openingReminderId}
                        reminder={reminder}
                        onComplete={() => onComplete(reminder)}
                        onDetail={() => onDetail(reminder)}
                        onReopen={() => onReopen(reminder)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

export function ReminderCard({
  compact = false,
  isSaving,
  openingReminderId,
  reminder,
  onComplete,
  onDetail,
  onReopen,
}) {
  const isCompleted = reminderIsCompleted(reminder);
  const isOverdue = reminderIsOverdue(reminder);
  const isOpening = openingReminderId === reminder.id;
  const canComplete = reminderCanComplete(reminder);
  const canReopen = reminderCanReopen(reminder);
  const canAct = isCompleted ? canReopen : canComplete;
  const readOnly = reminderIsReadOnly(reminder);
  const reminderOrigin = reminder.source === "task"
    ? "Aviso de tarea"
    : reminder.event
      ? "Aviso de evento"
      : "Aviso independiente";

  return (
    <article
      className={`rounded-xl border bg-white px-3 py-3 transition hover:border-gray-300 sm:px-4 ${
        isOverdue ? "border-red-200" : "border-gray-200"
      } ${compact ? "" : "shadow-sm"}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span
            aria-hidden="true"
            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
              isCompleted
                ? "border-gray-200 bg-gray-100 text-gray-600"
                : isOverdue
                  ? "border-red-100 bg-red-50 text-red-700"
                  : "border-gray-200 bg-gray-50 text-gray-500"
            }`}
          >
            {isCompleted ? <FaCheckCircle /> : <FaBell />}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3
                className={`min-w-0 text-sm font-black leading-5 ${
                  isCompleted ? "text-gray-500 line-through" : "text-gray-950"
                }`}
              >
                {reminder.title}
              </h3>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                  isOverdue
                    ? "bg-red-50 text-red-700"
                    : isCompleted
                      ? "bg-gray-100 text-gray-600"
                      : "bg-gray-100 text-gray-700"
                }`}
              >
                {isCompleted ? "Atendido" : isOverdue ? "Vencido" : "Programado"}
              </span>
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-gray-600">
              <span className="inline-flex items-center gap-1.5">
                <FaClock className="text-gray-500" aria-hidden="true" />
                {formatShortDate(getReminderDate(reminder))}
              </span>
              <span>{reminderOrigin}</span>
              {reminder.group_name ? (
                <span className="inline-flex items-center gap-1.5">
                  <FaFolderOpen aria-hidden="true" />
                  {reminder.group_name}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1.5">
                <FaUserCheck aria-hidden="true" />
                {reminder.assigned_to_name || reminder.user_name || "Sin asignar"}
              </span>
            </div>

            {reminder.description && !compact ? (
              <p className="mt-1.5 line-clamp-1 text-xs text-gray-500">
                {reminder.description}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 pl-11 sm:pl-0">
          <button
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 transition hover:border-red-200 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isOpening}
            type="button"
            onClick={onDetail}
          >
            {isOpening ? "Abriendo..." : "Ver detalle"}
          </button>

          {canAct ? (
            <button
              className={`rounded-lg px-3 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                isCompleted
                  ? "border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
                  : "bg-gray-950 text-white hover:bg-gray-800"
              }`}
              disabled={isSaving}
              type="button"
              onClick={isCompleted ? onReopen : onComplete}
            >
              {isCompleted ? "Reabrir" : "Marcar atendido"}
            </button>
          ) : (
            <span className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-gray-500">
              {isCompleted && !canReopen && !readOnly
                ? "Cerrado con la tarea"
                : "Solo lectura"}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

export function ReminderMetricCard({ label, value, variant = "default" }) {
  const iconClass =
    variant === "danger"
      ? "bg-red-50 text-red-700"
      : variant === "success"
        ? "bg-gray-100 text-gray-700"
        : "bg-yellow-50 text-yellow-800";

  return (
    <div className="border-b border-gray-100 p-3 sm:p-4 xl:border-b-0 xl:border-r">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black text-gray-700 sm:text-sm">{label}</p>
          <p className="mt-1 text-2xl font-black text-gray-950 sm:text-3xl">{value}</p>
        </div>

        <div className={`flex h-9 w-9 items-center justify-center rounded-2xl ${iconClass}`}>
          <FaBell />
        </div>
      </div>
    </div>
  );
}

export function EmptyState({ text }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm font-semibold text-gray-500 sm:p-5">
      {text}
    </div>
  );
}
