import assert from "node:assert/strict";
import test from "node:test";

import { warehouseErrorMessage } from "../src/utils/warehouseErrorMessage.js";

test("muestra validaciones conocidas con lenguaje sencillo", () => {
  assert.equal(
    warehouseErrorMessage({ response: { status: 400, data: { quantity: ["Selecciona una cantidad válida."] } } }),
    "Cantidad: Selecciona una cantidad válida.",
  );
  assert.equal(
    warehouseErrorMessage({ response: { status: 400, data: { detail: "Confirma que los libros ya fueron recibidos." } } }),
    "Confirma que los libros ya fueron recibidos.",
  );
});

test("no revela errores internos ni campos desconocidos", () => {
  const fallback = "No pudimos guardar los cambios.";
  assert.equal(
    warehouseErrorMessage({ response: { status: 500, data: { detail: "Traceback IntegrityError SQL" } } }, fallback),
    "Ocurrió un problema al consultar el sistema. Inténtalo nuevamente.",
  );
  assert.equal(
    warehouseErrorMessage({ response: { status: 400, data: { debug: "Queryset error" } } }, fallback),
    fallback,
  );
  assert.equal(
    warehouseErrorMessage({ response: { status: 400, data: { detail: "No JSON payload received at /api/" } } }, fallback),
    fallback,
  );
});

test("explica problemas de conexión, acceso y registros faltantes", () => {
  assert.match(warehouseErrorMessage({}), /conectarnos/);
  assert.match(warehouseErrorMessage({ response: { status: 403 } }), /autorización/);
  assert.match(warehouseErrorMessage({ response: { status: 404 } }), /No encontramos/);
});
