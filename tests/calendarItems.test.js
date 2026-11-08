import assert from "node:assert/strict";
import test from "node:test";

import {
  buildFullCalendarEvents,
  getCalendarDisplayTitle,
} from "../src/utils/calendarItems.js";

test("identifies the linked school in the calendar without mutating the task title", () => {
  const task = {
    id: 25,
    type: "task",
    title: "Enviar propuesta",
    crm_school_name: "Colegio Zárate",
    due_at: "2026-11-12T15:00:00.000Z",
  };
  assert.equal(getCalendarDisplayTitle(task), "Colegio Zárate · Enviar propuesta");
  assert.equal(buildFullCalendarEvents([task])[0].title, "Colegio Zárate · Enviar propuesta");
  assert.equal(task.title, "Enviar propuesta");
});

test("keeps ordinary tasks and events unchanged", () => {
  const event = {
    id: 26,
    type: "event",
    title: "Reunión interna",
    start: "2026-11-12T16:00:00.000Z",
  };
  assert.equal(getCalendarDisplayTitle(event), "Reunión interna");
  assert.equal(buildFullCalendarEvents([event])[0].title, "Reunión interna");
});
