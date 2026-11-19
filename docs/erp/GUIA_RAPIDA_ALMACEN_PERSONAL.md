# Book Express — Guía de recorrido para personal de Almacén (ERP en pruebas)

**Revisión:** 18/11/2026 · **Entorno:** rama de pruebas `feature/erp-p08-traslados-por-guia` · **No publicado en Tecnoweb**.

> **Regla básica:** pedir ≠ recibir ≠ reservar ≠ preparar ≠ trasladar ≠ vender. Cada operación tiene responsable y momento diferentes. Crear una ubicación o feria **no crea ni mueve stock**.

## ¿A qué pantalla entro para cada tarea?

| Necesidad del usuario | Ruta de menú | Funciona ahora | Consecuencia |
|---|---|---|---|
| Pedir libros a la editorial | ERP → Pedidos a Editoriales | Sí, revisar adopción y pedido | Pedido comercial; no es ingreso físico. |
| Registrar guías que llegan | ERP → Almacén → Recepción de mercadería | Sí | Conteo, observados, evidencia y validación; luego existencias conformes. |
| Revisar cantidades y dónde están | ERP → Almacén → Inventario | Sí | Solo consulta, sin movimiento. |
| Registrar una feria o un depósito | ERP → Almacén → Ubicaciones y ferias | Sí, B3.2 | Identifica ubicación de custodia. Stock inicial cero. |
| Preparar libros para feria, tienda o consignación | ERP → Almacén → Movimientos → **Entregas** | Sí, B2/B3 | Planificar → reservar por lote → conteo físico. Aún en origen. |
| Registrar un traslado físico directo ya concluido | ERP → Almacén → Movimientos → **Traslados directos** | Sí, función independiente | Cambia existencias de origen a destino, sin vincularse a una entrega planificada. |
| Registrar una cortesía | ERP → Almacén → Movimientos → **Cortesías** | Sí, con permisos y controles existentes | Salida sin venta; no confundir con consignación. |
| Consultar traslados anteriores | ERP → Almacén → Movimientos → **Historial** | Sí | Consulta y auditoría de los traslados. |
| Generar orden interna, despachar y confirmar llegada | ERP → Almacén → Movimientos → **Entregas** | Implementado B4 en la rama; prueba local pendiente | Orden interna numerada (sin mover stock) → confirmar salida física (en tránsito) → recepción por lote (ingresa en destino). No es GRE. |
| Liquidar ventas en consignación, facturar y devolver sobrantes | En desarrollo B5 + Ventas | **Aún no** | No facturar automáticamente por solo entregar en consignación. |

## Una sola historia de ejemplo, con datos de la base local

La recepción Santillana `T001-12358` de LECTOPOLIS 4 registró **20 libros físicos: 15 conformes y 5 observados**. La entrega de prueba del colegio **[PRUEBA ERP] ANDINO, campaña 2027** inicialmente planificó 20; luego se dividió en **15 reservados/preparados** más **5 pendientes**. El inventario físico conserva los 15 conformes (ahora comprometidos) y los 5 observados. La preparación verificada **NO movió** libros a Feria ni generó GRE, venta o factura. Las cinco unidades pendientes representan un compromiso comercial que espera reposición de stock conforme, y **no deben cubrirse con observados**.

Por separado, se registró una feria `COLEGIO 22 DE ABRIL`, con responsable `ROBERTO`. Su ubicación de custodia no se llena al crear el evento. No corresponde trasladar los 15 libros preparados del colegio ANDINO a esa feria sin una operación comercial/logística explícita y documentada.

## Prueba de navegación segura (sin alterar existencias)

1. **Ubicaciones y ferias → Ferias:** comprobar la fila `COLEGIO 22 DE ABRIL`, su dirección, fechas y responsable. **No registrar una duplicada.**
2. Cambiar a **Almacenes y destinos:** comprobar que existe una ubicación propia para esa feria. La pestaña no altera libros.
3. Ir a **Inventario:** buscar LECTOPOLIS 4, confirmar que la existencia física es 20, con 15 conformes y 5 observados. «Conformes» NO equivale a saldo libre de reserva.
4. Ir a **Movimientos → Entregas:** consultar la operación ANDINO. Comprobar 15 preparados y otra entrega pendiente de 5; **no volver a reservar ni anular**.
5. Entrar en **Movimientos → Traslados directos** solo a leer la pantalla. Su casilla de confirmación indica que la entrega física **ya ocurrió**. No registrar un traslado de ejemplo sin recepción real en destino.

**Resultado aceptado:** el empleado comprende las diferencias sin crear entradas, reservas, traslados, ventas ni documentos fiscales nuevos. Si faltan datos o permisos, anotar la observación y no inventar operaciones para completar una prueba.

## ¿Qué haremos después?

**B4 (en rama, pendiente prueba local):** al confirmar el conteo, Entregas permite generar orden interna numerada e imprimible, verificar externamente el sustento legal, registrar salida física (en tránsito) y confirmar recepción por lote. El documento interno no sustituye la GRE legalmente exigible. Solo realizar estas acciones si el movimiento es real o en una base de prueba aislada; no generar un traslado ficticio en Tecnoweb.

**Consignación:** recibida físicamente la mercadería, quedará en custodia por colegio/tercero; se controlará la rendición de vendidas/no vendidas, facturación aplicable en Ventas y retorno inspeccionado de sobrantes. El traslado no implica por sí mismo venta ni factura.

**Otros pendientes:** packs termosellados/armados por colegio sin duplicar existencias, devoluciones a editorial/cliente, retorno de ferias, ajustes con autorización y conciliaciones.

**No fusionar a `main` ni desplegar a Tecnoweb** hasta completar validaciones y autorización.
