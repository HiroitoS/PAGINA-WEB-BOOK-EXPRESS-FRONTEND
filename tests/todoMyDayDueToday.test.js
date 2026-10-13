import assert from "node:assert/strict";
import test from "node:test";
import { taskMatchesTodoView } from "../src/components/admin/workspace/todo/todoTaskUtils.js";

const today = new Date();
today.setHours(12, 0, 0, 0);
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);

test("Mi día incluye automáticamente tarea asignada para hoy", () => {
  assert.equal(taskMatchesTodoView({
    assigned_to: 7,
    due_at: today.toISOString(),
    status: "pending",
    in_my_day: false,
  }, "today", 7), true);
});

test("Mi día no incluye tareas futuras ni tareas de otro asesor", () => {
  assert.equal(taskMatchesTodoView({
    assigned_to: 7,
    due_at: tomorrow.toISOString(),
    status: "pending",
    in_my_day: false,
  }, "today", 7), false);
  assert.equal(taskMatchesTodoView({
    assigned_to: 8,
    due_at: today.toISOString(),
    status: "pending",
    in_my_day: false,
  }, "today", 7), false);
});

test("Mi día conserva selección manual y excluye tareas cerradas", () => {
  assert.equal(taskMatchesTodoView({
    assigned_to: 7,
    due_at: tomorrow.toISOString(),
    status: "pending",
    in_my_day: true,
  }, "today", 7), true);
  assert.equal(taskMatchesTodoView({
    assigned_to: 7,
    due_at: today.toISOString(),
    status: "completed",
    in_my_day: true,
  }, "today", 7), false);
});
