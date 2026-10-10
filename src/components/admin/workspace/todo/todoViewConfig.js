import {
  FaCalendarAlt,
  FaClock,
  FaStar,
  FaTasks,
  FaUserCheck,
} from "react-icons/fa";

const VIEW_CONFIG = {
  today: {
    eyebrow: "Enfoque diario",
    title: "Mi día",
    description:
      "Selecciona el trabajo en el que quieres concentrarte durante el día.",
    icon: FaClock,
  },
  important: {
    eyebrow: "Prioridad",
    title: "Importantes",
    description:
      "Tareas marcadas como importantes que todavía requieren atención.",
    icon: FaStar,
  },
  planned: {
    eyebrow: "Planificación",
    title: "Planificadas",
    description:
      "Tareas activas con una fecha límite definida.",
    icon: FaCalendarAlt,
  },
  assigned: {
    eyebrow: "Responsabilidad",
    title: "Asignadas a mí",
    description:
      "Trabajo del que eres responsable dentro de Book Express.",
    icon: FaUserCheck,
  },
  all: {
    eyebrow: "Trabajo pendiente",
    title: "Todas las tareas",
    description:
      "Todas las tareas visibles según tus permisos.",
    icon: FaTasks,
  },
};

export function getTodoViewConfig({
  taskListInfo,
  view,
}) {
  if (view === "list") {
    return {
      eyebrow: taskListInfo?.is_shared
        ? "Lista compartida"
        : "Lista personal",
      title: taskListInfo?.name || "Lista de tareas",
      description:
        taskListInfo?.description
        || (taskListInfo?.workspace_group_name
          ? `Equipo: ${taskListInfo.workspace_group_name}. Tareas organizadas dentro de este espacio de trabajo.`
          : "Organiza aquí las tareas que pertenecen a esta lista."),
      icon: FaTasks,
    };
  }

  return VIEW_CONFIG[view] || VIEW_CONFIG.today;
}
