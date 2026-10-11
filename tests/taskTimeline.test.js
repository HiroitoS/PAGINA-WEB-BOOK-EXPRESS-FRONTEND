import assert from "node:assert/strict";
import test from "node:test";

import { buildTaskTimeline } from "../src/utils/taskTimeline.js";

test("combines management, state and planning changes chronologically", () => {
  const items = buildTaskTimeline({
    comments: [{
      id: 1,
      action_type_display: "Llamada",
      comment: "Se conversó con el colegio.",
      user_name: "Asesor",
      created_at: "2026-10-11T10:00:00Z",
    }],
    status_history: [{
      id: 2,
      old_status_display: "Pendiente",
      new_status_display: "En proceso",
      changed_by_name: "Asesor",
      created_at: "2026-10-11T11:00:00Z",
    }],
    change_history: [{
      id: 3,
      changed_by_name: "Jefe",
      created_at: "2026-10-11T12:00:00Z",
      changes: [
        { field: "due_at", label: "Fecha límite", old: "11/10", new: "12/10" },
        { field: "priority", label: "Prioridad", old: "Media", new: "Alta" },
      ],
    }],
  });

  assert.deepEqual(items.map((item) => item.kind), [
    "planning", "status", "management",
  ]);
  assert.equal(items[0].actor, "Jefe");
  assert.match(items[0].detail, /Fecha límite: 11\/10 → 12\/10/);
  assert.match(items[0].detail, /Prioridad: Media → Alta/);
});

test("preserves compatibility with existing tasks without planning history", () => {
  assert.deepEqual(buildTaskTimeline({}), []);
  assert.deepEqual(buildTaskTimeline(null), []);
});
