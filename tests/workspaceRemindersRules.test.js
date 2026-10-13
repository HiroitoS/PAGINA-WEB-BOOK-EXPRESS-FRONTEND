import assert from "node:assert/strict";
import test from "node:test";

import {
  getReminderSections,
  reminderCanComplete,
  reminderCanEditDetails,
  reminderCanReopen,
  reminderIsCompleted,
  reminderIsReadOnly,
  sortReminders,
} from "../src/components/admin/workspace/reminders/reminderUtils.js";

test("el recordatorio atendido no cambia por sí mismo el estado de una tarea", () => {
  const reminder = { id: 1, status: "completed", is_completed: true, task: 54 };
  assert.equal(reminderIsCompleted(reminder), true);
  assert.equal(reminder.task, 54);
  assert.equal(reminderIsCompleted({ status: "pending" }), false);
});

test("permisos para editar, atender y reabrir provienen del backend", () => {
  assert.equal(reminderCanEditDetails({ can_edit_details: true }), true);
  assert.equal(reminderCanComplete({ can_complete: true }), true);
  assert.equal(reminderCanComplete({ can_complete: false }), false);
  assert.equal(reminderCanReopen({ can_complete: true, can_reopen: false }), false);
  assert.equal(reminderCanReopen({ can_complete: true }), true);
  assert.equal(reminderIsReadOnly({ can_edit_details: false, can_complete: false }), true);
  assert.equal(reminderIsReadOnly({ can_edit_details: false, can_complete: true }), false);
});

test("las tareas de aviso vencidas se ordenan antes de futuras, atendidas al final", () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 2);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 2);
  const reminders = [
    { id: 1, remind_at: yesterday.toISOString(), status: "completed" },
    { id: 2, remind_at: tomorrow.toISOString(), status: "pending" },
    { id: 3, remind_at: yesterday.toISOString(), status: "pending" },
  ];
  assert.deepEqual(sortReminders(reminders).map((reminder) => reminder.id), [3, 2, 1]);
});

test("las listas conservan avisos cerrados y separan vencidos y futuros", () => {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 2);
  const future = new Date(now);
  future.setDate(now.getDate() + 14);
  const items = [
    { id: 1, remind_at: yesterday.toISOString(), status: "completed" },
    { id: 2, remind_at: yesterday.toISOString(), status: "pending" },
    { id: 3, remind_at: future.toISOString(), status: "pending" },
  ];
  const sections = Object.fromEntries(getReminderSections(items).map((section) => [
    section.key, section.items.map((item) => item.id),
  ]));
  assert.deepEqual(sections.overdue, [2]);
  assert.deepEqual(sections.later, [3]);
  assert.deepEqual(sections.completed, [1]);
});
