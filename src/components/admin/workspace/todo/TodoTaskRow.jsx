import {
  FaCalendarAlt,
  FaFlag,
  FaStar,
  FaUser,
} from "react-icons/fa";

function formatDueDate(value) {
  if (!value) {
    return "Sin fecha";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function getPriorityLabel(priority) {
  const labels = {
    low: "Baja",
    medium: "Media",
    high: "Alta",
    urgent: "Urgente",
  };

  return labels[priority] || "Media";
}

export default function TodoTaskRow({
  task,
  onOpen,
  completed = false,
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(task)}
      className="group flex w-full items-start gap-3 border-b border-gray-100 px-4 py-3 text-left transition last:border-b-0 hover:bg-gray-50 sm:px-5"
    >
      <span
        className={
          "mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 "
          + (completed
            ? "border-gray-300 bg-gray-200"
            : "border-red-300 bg-white group-hover:border-red-600")
        }
      />

      <span className="min-w-0 flex-1">
        <span
          className={
            "block truncate text-sm font-black "
            + (completed
              ? "text-gray-400 line-through"
              : "text-gray-950")
          }
        >
          {task.title}
        </span>

        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1">
            <FaCalendarAlt className="text-gray-400" />
            {formatDueDate(task.due_at)}
          </span>

          <span className="inline-flex items-center gap-1">
            <FaFlag className="text-gray-400" />
            {getPriorityLabel(task.priority)}
          </span>

          {task.assigned_to_name ? (
            <span className="inline-flex items-center gap-1">
              <FaUser className="text-gray-400" />
              {task.assigned_to_name}
            </span>
          ) : null}

          {task.group_name ? (
            <span>{task.group_name}</span>
          ) : null}
        </span>
      </span>

      {task.is_important ? (
        <FaStar className="mt-1 shrink-0 text-amber-500" />
      ) : null}
    </button>
  );
}
