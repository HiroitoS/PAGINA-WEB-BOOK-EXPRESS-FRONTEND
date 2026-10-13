import assert from "node:assert/strict";
import test from "node:test";

import {
  buildEditFormFromTask,
  buildTaskPayload,
  formatDateTimeLocal,
  getTaskValidationMessage,
  sortTasks,
  taskCanComplete,
  taskCanEditDetails,
  taskCanFollowUp,
  taskCanReopen,
  taskIsClosed,
  taskIsReadOnly,
} from "../src/utils/workspaceTaskRules.js";

const sampleForm = {
  title: "  Llamar al colegio  ",
  description: "  Coordinar visita ",
  task_type: "school",
  priority: "high",
  group: "9",
  assigned_to: "5",
  due_at: "",
  reminder_at: "",
};

test("el responsable solo se envía si el rol permite asignar", () => {
  const own = buildTaskPayload(sampleForm);
  assert.equal(own.title, "Llamar al colegio");
  assert.equal(own.description, "Coordinar visita");
  assert.equal(own.group, 9);
  assert.equal(own.assigned_to, undefined);

  const delegated = buildTaskPayload(sampleForm, true);
  assert.equal(delegated.assigned_to, 5);
  assert.equal(delegated.is_important, false);
});

test("valida título, fecha y recordatorios sin cambios", () => {
  assert.equal(getTaskValidationMessage({ ...sampleForm, title: " " }), "Ingresa el título de la tarea.");
  assert.match(getTaskValidationMessage({ ...sampleForm, due_at: "fecha-invalida" }), /fecha límite/i);
  assert.match(getTaskValidationMessage({
    ...sampleForm, due_at: "2026-10-12T12:00", reminder_at: "2026-10-12T13:00",
  }), /recordatorio no puede ser después/i);
  assert.equal(getTaskValidationMessage(sampleForm), "");
});

test("el orden conserva abiertas antes de cerradas y vencidas antes de próximas", () => {
  const list = sortTasks([
    { id: 1, status: "completed", priority: "urgent", due_at: "2026-10-01" },
    { id: 2, status: "pending", priority: "low", due_at: "2026-10-20" },
    { id: 3, status: "pending", priority: "high", is_overdue: true, due_at: "2026-10-10" },
    { id: 4, status: "pending", priority: "urgent", due_at: "2026-10-15" },
  ]);
  assert.deepEqual(list.map((task) => task.id), [3, 4, 2, 1]);
});

test("las autorizaciones permanecen basadas exclusivamente en indicadores del backend", () => {
  assert.equal(taskCanEditDetails({ can_edit_details: true }), true);
  assert.equal(taskCanFollowUp({ can_follow_up: true }), true);
  assert.equal(taskCanComplete({ can_complete: true }), true);
  assert.equal(taskCanReopen({ can_reopen: true }), true);
  assert.equal(taskIsReadOnly({ can_edit_details: false, can_follow_up: false }), true);
  assert.equal(taskIsReadOnly({ can_follow_up: true }), false);
  assert.equal(taskIsClosed({ status: "cancelled" }), true);
  assert.equal(taskIsClosed({ status: "in_progress" }), false);
});

test("editar una tarea conserva los valores por defecto", () => {
  const value = buildEditFormFromTask({ title: "Revisar", assigned_to: 5, group: 4 });
  assert.equal(value.title, "Revisar");
  assert.equal(value.group, "4");
  assert.equal(value.assigned_to, "5");
  assert.equal(value.due_at, "");
  assert.equal(value.priority, "medium");
  assert.equal(formatDateTimeLocal(null), "");
});
