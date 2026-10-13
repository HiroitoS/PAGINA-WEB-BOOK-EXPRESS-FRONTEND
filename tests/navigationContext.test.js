import assert from "node:assert/strict";
import test from "node:test";

import {
  buildNavigationState,
  resolveReturnContext,
} from "../src/utils/navigationContext.js";

const origins = [
  ["/admin/workspace/assigned", "Asignadas a mí"],
  ["/admin/workspace/all", "Todas las tareas"],
  ["/admin/workspace/today", "Mi día"],
  ["/admin/workspace/calendar", "Calendario"],
  ["/admin/crm/colegios/386", "Colegio"],
];

for (const [path, label] of origins) {
  test(`el gestor regresa a ${label} sin perder el contexto`, () => {
    const originalState = { selectedView: "active" };
    const navigationState = buildNavigationState({
      from: path,
      fromLabel: label,
      fromType: "workspace-smart-view",
      currentState: originalState,
    });

    const context = resolveReturnContext(navigationState);
    assert.equal(context.path, path);
    assert.equal(context.label, label);
    assert.deepEqual(context.state, originalState);
  });
}

test("no acepta una ruta externa como destino de retorno", () => {
  const context = resolveReturnContext(
    { from: "https://ejemplo.com", fromLabel: "Externo" },
    { fallbackPath: "/admin/workspace/all", fallbackLabel: "ToDo" },
  );

  assert.equal(context.path, "/admin/workspace/all");
});

test("sin origen no inventa un destino de navegación", () => {
  assert.equal(resolveReturnContext(null).path, "");
});
