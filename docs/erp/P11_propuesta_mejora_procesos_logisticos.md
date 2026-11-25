# Book Express — Propuesta de mejora de procesos logísticos
**Fecha:** 08/11/2026 · **Destino:** revisión funcional con jefatura.
**Situación:** diseño objetivo y alcance por fases. **No confundir con módulos ya implementados.**

## 1. Punto de partida y evidencias

**MOF de Logística:** describe responsabilidades del Jefe de Logística, Asistente de Recepción y Documentación, Coordinador de Inventario y Personal de Almacén. El jefe supervisa procesos y aprueba ajustes; recepción verifica guías/facturas, cantidades y evidencia; inventario realiza conteos semanales; almacén prepara, empaqueta y despacha.

**Macroproceso:** documenta ocho procesos: información de adopciones escolares, recepción, almacenamiento físico, preparación de pedidos, despacho por modalidad, control de inventario, dañados/faltantes y archivo documental. Sus anexos muestran flujogramas y formatos de control. Los originales .docx se conservan únicamente en la carpeta local del usuario `BookExpress/`, fuera de repositorios públicos.

**Interpretación técnica:** los documentos describen prácticas actuales y responsabilidades; **no establecen** una máquina de estados completa para envíos, devoluciones por tipo, sellado/desarmado de packs o emisión automática de guías SUNAT. Esos puntos son propuestas a validar, no reglas aprobadas por los documentos.

## 2. Mejoras propuestas de procesos

| Área | Riesgo/limitación actual | Propuesta ERP | Impacto esperado |
| --- | --- | --- | --- |
| Adopción → logística | Transferencia manual de pedidos/cantidades | Requerimiento digital desde adopción o pedido; snapshots por campaña, colegio, producto, editorial | Evitar transcripción y preparar con base aprobada |
| Recepción | Diferencias entre guía, llegada y conformidad | Validación con firmas/evidencia y registro de faltantes/dañados; stock solo al validar | Trazabilidad desde origen |
| Ubicación física | Se conoce un depósito, no anaquel | Jerarquía almacén → sector/anaquel opcional, sin duplicar stock | Mejor localización y conteo |
| Requerimientos internos | Pedidos de tienda/feria/consignación por mensajes/correos | Solicitud identificada, responsable, prioridad, destino, fecha, estado, revisión de disponibilidad | Ordenar atención |
| Preparación | Errores en selección y empaque | Picking, cantidad reservada/conteada/preparada, verificador, pack o suelto | Doble control antes de salir |
| Packs termosellados | Libros componentes no identificados como conjunto | Unidad logística por colegio/adopción con componentes y estado de sellado/apertura, nunca stock adicional | Evitar duplicidades y pérdidas de trazabilidad |
| Despacho | Salida no necesariamente equivale a recepción | Documento/logística separado; historial de eventos: preparado → enviado → recibido → observado/cerrado | Saber quién tiene la mercadería |
| Feria | Agrupar diferentes ferias en ubicación genérica | Feria/evento concreto, fechas, responsable, saldos por feria, liquidación y retorno | Evitar mezclar operaciones |
| Consignación | Diferencias entre entrega, venta, abono y retorno | Custodia por colegio, acta de entrega, cantidades vendidas y devueltas; integración posterior con ventas/cobranza | Control de lo pendiente |
| Devoluciones | Un retorno puede ser confundido con un nuevo ingreso | Tipos diferenciados y evaluación vendible/observado/dañado; sin aumento hasta aceptar físicamente | Evitar stock ficticio |
| Cortesías/muestras | Entrega final versus muestra retornable | Separar cortesía definitiva y préstamo/muestra con fecha de devolución | Controlar salidas |
| Control de inventario | Ajustes sin circuito claro | Conteo físico por almacén, diferencia, justificación y aprobación del jefe | Auditoría confiable |
| Documentación | Guías/facturas/constancias dispersas | Documentos relacionados con pedido, recepción, traslado, envío y devolución; evidencia | Consulta y rendición |

**Mejora transversal:** cada operación tiene **código único, autor, fecha/hora, estado, destinatario, origen, destino y bitácora de eventos**. Una corrección no altera silenciosamente el evento anterior: genera un evento o documento de reversión autorizado.

## 3. Estados y trazabilidad (DISEÑO PENDIENTE)

**Requerimiento:** borrador → solicitado → aprobado → en preparación → listo para despacho → atendido; rechazado o anulado según permisos y condiciones.

**Despacho físico:** borrador → preparado → despachado → en tránsito → recibido conforme / recibido con diferencias → cerrado.

**Devolución:** solicitada → autorizada (si aplica) → recibida para revisión → clasificada (apta, observada, dañada) → conciliada y cerrada.

**Eventos históricos inmutables:** registro, cambio de etapa, preparación, entrega al transportista, llegada, conteo, diferencia, autorización, retorno. Cada evento guarda responsable, fecha/hora, documento y observación. Prohibir eliminar/editar eventos confirmados; cualquier reverso debe tener trazabilidad.

**No confundir:** el `StockTransfer` existente es un traslado DIRECTO ya recibido físicamente; no se debe registrar como "despachado" para envíos aún en camino. Cuando se implemente Despacho se definirá separación entre stock disponible, reservado, en tránsito y custodia del destino.

## 4. Controles de stock y packs

- **Invariante de traslado:** origen −N, destino +N, total global = constante.
- **Recepción validada:** entrada +N según cantidad conforme. La observada queda identificada aparte.
- **Despacho pendiente:** bloquear o reservar N de manera consistente; no duplicar unidades por estado de tránsito.
- **Devolución:** solo sumar como disponible al cerrar su inspección, o mantener observado/no vendible.
- **Packs Santillana:** una agrupación lógica *sobre componentes ya existentes* por colegio/adopción. Si viene termosellado, registrar identidad física del grupo, cantidad y etiquetas sin inventar un SKU de venta. El stock sigue contando cada libro.
- **Consignación:** libros siguen bajo control de Book Express mientras no exista operación comercial confirmada. Diferenciar custodia vs venta; la misma unidad no puede figurar vendida y disponible.
- **Cancelación/reintento:** idempotencia obligatoria, controles concurrentes y permisos con bloqueo transaccional.
- **Trazabilidad de valuación:** costo histórico por lote, no precio del año actual.

## 5. Entregas concretas de este ciclo (IMPLEMENTADAS EN RAMA, no en producción)

**Backend P-08:**
- `GET /api/admin/erp/almacen/traslados/` ahora acepta filtros `q`, `source_id`, `destination_id`, `batch_id`, `date_from`, `date_to`, mantiene paginación y validación.
- Cada movimiento devuelve código de operación estable (guía `BE-TG-...` o individual `BE-TI-...`), fecha/hora, usuario, libro/código, editorial, colegio, guía, unidades, origen, destino y observación.
- Traslado por guía: líneas comparten identificador de operación; historial filtrable por `batch_id`. No se han añadido ventas ni generado movimientos ficticios.
- Tests: historial, filtros inválidos, permisos, reintento y lote de guía; sin migración nueva.

**Frontend P-08:**
- Nueva pantalla `/admin/erp/almacen/historial-traslados` con filtros, paginación, detalle individual y acceso a todos los libros de una misma operación por guía; responsive, consulta de solo lectura.
- Desde Traslados hay botón "Ver historial", y desde el menú ERP también puede abrirse el historial; el resumen muestra solo 25 movimientos recientes con acceso al registro completo.
- Corrección UX: NO exigir cantidades completas en ferias o consignaciones; solo registrar unidades entregadas físicamente.

**Estado:** código y pruebas automáticas en rama `feature/erp-p08-traslados-por-guia`. La ejecución manual con movimientos reales, pruebas móviles y los flujos de despacho/devolución siguen pendientes. Nada se fusiona a `crm/gestion-colegios` ni a `main` sin aprobación.

## 6. Prioridades y criterios de aceptación

**P0 — Certificar lo existente:** pedido → recepción validada → stock principal → traslado → historial → saldo por almacén, con prueba de reintentos y permisos.

**P1 — Requerimiento, destino y reserva:** un responsable puede solicitar stock para tienda/feria/consignación sin confundir solicitudes con ventas o movimientos; solo responsables autorizados aprueban.

**P2 — Picking y packs:** componentes completos, preparación/conteo, empaque, asignación colegio/adopción; conservar stock sin doble conteo; recepción y apertura de pack original.

**P3 — Envío y recepción en destino:** auditoría de cada despacho con folio, guía, emisor, transportista/responsable, fechas, origen/destino, firma y diferencias; pruebas de transición.

**P4 — Devoluciones:** feria, consignación, cliente y editorial; cada una con autorizaciones y efectos contables/de inventario distintos; exigir inspección física.

**P5 — Conteos, ajustes, reportes, archivo:** reportes por colegio/editorial/almacén/responsable; control por inventarios semanales y aprobación de ajustes.

**Criterio de demo a jefatura:** comprobar al menos un circuito end-to-end en base de prueba, enseñar historial con detalle y responsable, simular diferencia y devolución con los módulos que estén realmente implementados. No presentar una pantalla de mockup como si tuviera procesamiento real.

## 7. Indicadores sugeridos (sin valores inventados)

- Pedidos recibidos completos y a tiempo.
- Diferencias por editorial y guía.
- Tiempo solicitud → despacho → recepción.
- Exactitud de inventario por almacén.
- Mercadería por feria, colegio consignatario y responsable.
- Packs armados, entregados, pendientes y desarmados.
- Devoluciones pendientes, aceptadas, observadas y reclamadas.
- Cortesías definitivas frente a muestras con retorno pendiente.

**Regla de publicación:** los originales del MOF y Macroproceso no se subirán a repositorios públicos. Mantener en entorno local seguro. Despliegue Tecnoweb y merge a `main` únicamente con validación explícita.
