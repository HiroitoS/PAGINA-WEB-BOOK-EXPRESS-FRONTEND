import assert from "node:assert/strict";
import test from "node:test";

import {
  formatDateOnly,
  formatDateTimeLocal,
  formatDateTitle,
  formatMonthTitle,
  formatShortTime,
  getDateKey,
  getInitialCalendarRange,
  getMonthCalendarDays,
  getStartOfWeek,
  getWeekCalendarDays,
  moveMonth,
  moveWeek,
  parseCalendarDate,
} from "../src/utils/calendarDates.js";

test("fechas YYYY-MM-DD representan el día local, sin desviarse por UTC", () => {
  const date = parseCalendarDate("2026-10-12");
  assert.equal(date.getFullYear(), 2026);
  assert.equal(date.getMonth(), 9);
  assert.equal(date.getDate(), 12);
  assert.equal(formatDateOnly("2026-10-12"), "2026-10-12");
  assert.equal(getDateKey("2026-10-12"), "2026-10-12");
});

test("mes de octubre mantiene domingo a sábado", () => {
  const days = getMonthCalendarDays("2026-10-01");
  assert.equal(days.slice(0, 4).every((day) => day === null), true);
  assert.equal(days.filter(Boolean).length, 31);
  assert.equal(formatDateOnly(days[4]), "2026-10-01");
  assert.equal(formatDateOnly(days.at(-1)), "2026-10-31");
});

test("semana: el domingo inicial y los siete días se conservan", () => {
  assert.equal(formatDateOnly(getStartOfWeek("2026-10-12")), "2026-10-11");
  const dates = getWeekCalendarDays("2026-10-12");
  assert.equal(dates.length, 7);
  assert.equal(formatDateOnly(dates[0]), "2026-10-11");
  assert.equal(formatDateOnly(dates[6]), "2026-10-17");
  assert.equal(moveWeek("2026-10-12", 1), "2026-10-19");
  assert.equal(moveWeek("2026-10-12", -1), "2026-10-05");
});

test("desplazamiento mensual mantiene la fecha intermedia", () => {
  assert.equal(moveMonth("2026-10-12", 1), "2026-11-12");
  assert.equal(moveMonth("2026-10-12", -1), "2026-09-12");
});

test("formato español y tratamiento previo de fechas vacías", () => {
  assert.match(formatMonthTitle("2026-10-12").toLowerCase(), /octubre/);
  assert.match(formatDateTitle("2026-10-12").toLowerCase(), /octubre/);
  assert.equal(formatShortTime(null), "Sin hora");
  assert.equal(formatDateTimeLocal(null), "");
  assert.equal(getDateKey("fecha-no-válida"), "sin-fecha");
});

test("rango inicial incluye un margen a ambos lados del mes", () => {
  const range = getInitialCalendarRange();
  const today = formatDateOnly(new Date());
  assert.ok(range.start < today);
  assert.ok(range.end > today);
});
