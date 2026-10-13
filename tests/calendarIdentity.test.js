import assert from "node:assert/strict";
import test from "node:test";

import { getCalendarRealId } from "../src/utils/calendarIdentity.js";

test("uses the reminder's own ID instead of its related task ID", () => {
  assert.equal(getCalendarRealId({ id: 41, task: 7, source: "task" }), 41);
});

test("uses the event's own ID instead of its linked task", () => {
  assert.equal(getCalendarRealId({ id: 18, task: 5, event: 6 }), 18);
});

test("prefers the calendar API's explicit real_id", () => {
  assert.equal(getCalendarRealId({
    id: "reminder-41",
    real_id: 41,
    task_id: 7,
    reminder_id: 41,
  }), 41);
});

test("reads a prefixed calendar entity ID before a related task", () => {
  assert.equal(getCalendarRealId({ id: "reminder-41", task: 7 }), "41");
});

test("keeps task and event identifiers working", () => {
  assert.equal(getCalendarRealId({ id: "task-14", task_id: 14 }), 14);
  assert.equal(getCalendarRealId({ id: "event-8", event_id: 8 }), 8);
});

test("returns no identifier when the item is missing", () => {
  assert.equal(getCalendarRealId(null), undefined);
});
