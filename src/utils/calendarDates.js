/**
 * Utilidades de fechas y navegación de Calendario Book Express.
 * Extraídas sin cambiar las reglas originales ni las fechas de la API.
 * YYYY-MM-DD se interpreta como día local para evitar desajustes de zona horaria.
 */

export function parseCalendarDate(value) {
  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  if (typeof value === "string") {
    const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

    if (dateOnlyMatch) {
      const [, year, month, day] = dateOnlyMatch;

      return new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
      );
    }
  }

  return new Date(value);
}

export function formatDateOnly(value) {
  const date = parseCalendarDate(value);

  if (Number.isNaN(date.getTime())) {
    return formatDateOnly(new Date());
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function formatMonthTitle(value) {
  const date = value ? parseCalendarDate(value) : new Date();

  if (Number.isNaN(date.getTime())) return "Mes actual";

  return new Intl.DateTimeFormat("es-PE", {
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatDateTitle(value) {
  const date = value ? parseCalendarDate(value) : new Date();

  if (Number.isNaN(date.getTime())) return "Fecha";

  return new Intl.DateTimeFormat("es-PE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(date);
}

export function formatDateTime(value) {
  if (!value) return "Sin fecha";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Fecha no válida";

  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatShortDate(value) {
  if (!value) return "Sin fecha";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Fecha no válida";

  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatShortTime(value) {
  if (!value) return "Sin hora";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Sin hora";

  return new Intl.DateTimeFormat("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatDateTimeLocal(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);

  return offsetDate.toISOString().slice(0, 16);
}

export function getDateTimeValue(value) {
  if (!value) return Number.MAX_SAFE_INTEGER;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return Number.MAX_SAFE_INTEGER;

  return date.getTime();
}

export function getInitialCalendarRange() {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  start.setDate(start.getDate() - 14);
  end.setDate(end.getDate() + 14);

  return {
    start: formatDateOnly(start),
    end: formatDateOnly(end),
  };
}

export function getDateKey(value) {
  const date = parseCalendarDate(value);

  if (Number.isNaN(date.getTime())) return "sin-fecha";

  return formatDateOnly(date);
}

export function getMonthCalendarDays(monthDate) {
  const baseDate = parseCalendarDate(monthDate);

  if (Number.isNaN(baseDate.getTime())) return [];

  const firstDay = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  const lastDay = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
  const days = [];

  for (let index = 0; index < firstDay.getDay(); index += 1) {
    days.push(null);
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    days.push(new Date(baseDate.getFullYear(), baseDate.getMonth(), day));
  }

  return days;
}

export function moveMonth(value, amount) {
  const date = parseCalendarDate(value);

  if (Number.isNaN(date.getTime())) return formatDateOnly(new Date());

  date.setMonth(date.getMonth() + amount);

  return formatDateOnly(date);
}

export function getStartOfWeek(value) {
  const date = parseCalendarDate(value);

  if (Number.isNaN(date.getTime())) {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
  }

  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay());
}

export function getWeekCalendarDays(value) {
  const startDate = getStartOfWeek(value);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);

    return date;
  });
}

export function moveWeek(value, amount) {
  const date = parseCalendarDate(value);

  if (Number.isNaN(date.getTime())) return formatDateOnly(new Date());

  date.setDate(date.getDate() + amount * 7);

  return formatDateOnly(date);
}

export function formatWeekRangeTitle(value) {
  const weekDays = getWeekCalendarDays(value);
  const firstDay = weekDays[0];
  const lastDay = weekDays[6];

  return `${new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
  }).format(firstDay)} - ${new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(lastDay)}`;
}

export function formatWeekDayLabel(value) {
  const date = parseCalendarDate(value);

  if (Number.isNaN(date.getTime())) return "Día";

  return new Intl.DateTimeFormat("es-PE", {
    weekday: "short",
  }).format(date);
}
