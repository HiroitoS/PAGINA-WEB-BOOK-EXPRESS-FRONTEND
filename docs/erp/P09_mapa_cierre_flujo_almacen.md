# Book Express — Mapa de cierre del flujo de Almacén
**Fecha:** 08/11/2026 · **Estado:** planificación funcional; no implica funciones implementadas.
**Rama:** `feature/erp-p08-traslados-por-guia`. **Sin integración a main ni despliegue.**

## Referencias operativas
- `MOF ALMACEN.docx`: funciones del Jefe de Logística, Asistente de Recepción y Documentación, Coordinador de Inventario y Personal de Almacén. Responsabilidades organizacionales, no equivalen automáticamente a roles del sistema.
- `MACROPROCESO ALMACEN BOOK EXPRESS.docx`: ocho procesos intermedios, desde adopciones y recepciones hasta almacenamiento, preparación, despacho, control, dañados/faltantes y archivo. Los documentos originales permanecen en la **carpeta local** `BookExpress/`, fuera de los repositorios públicos.
- Este documento distingue **reglas del MOF/macroproceso**, **implementación actual** y **propuestas ERP**. No atribuir al documento decisiones que aún deben validarse con Book Express.

## Mapa de proceso esperado
```text
CRM / ADOPCIÓN ACEPTADA
       ↓
COMPRAS: PEDIDO POR EDITORIAL → APROBACIÓN / ENVÍO
       ↓
RECEPCIÓN: GUÍA / CONTEO / CONFORMIDAD / INCIDENCIAS
       ↓ (solo unidades físicamente recibidas y validadas)
ALMACÉN PRINCIPAL: ENTRADA + UBICACIÓN + INVENTARIO
       ↓
REQUERIMIENTO INTERNO (TIENDA / FERIA / CONSIGNACIÓN)
       ↓
PREPARACIÓN: reservar/verificar → picking → conteo → empaquetado
                                     ├─ PACK EDUCATIVO POR COLEGIO: agrupación de componentes, sin duplicar stock
                                     └─ LIBROS SUELTOS
       ↓
DESPACHO: responsable / destino concreto / documento / envío
       ↓
EN TRÁNSITO → RECEPCIÓN DE DESTINO → CONFORMIDAD O DIFERENCIA
       ↓
TENENCIA / STOCK POR UBICACIÓN (tienda, feria específica, consignación de colegio específico)
       ├── VENTA (se implementará en módulo Ventas) → consumo de stock
       ├── DEVOLUCIÓN DE FERIA/CONSIGNACIÓN → inspección → reingreso/observado
       ├── DEVOLUCIÓN DE CLIENTE → verificación comercial y documental → inspección → saldo
       ├── DEVOLUCIÓN A EDITORIAL → autorización / documento / salida definitiva
       └── CORTESÍA / MUESTRA → entrega final o salida retornable según tipo
       ↓
CONTROL: CONTEO FÍSICO / DIFERENCIAS / AJUSTE APROBADO / AUDITORÍA
       ↓
REPORTES: editorial / colegio / guía / modalidad / almacén / responsable
       ↓
ARCHIVO DOCUMENTAL: guías, facturas, constancias y evidencias firmadas
```
**El traslado directo actual P-08.3 NO equivale al flujo completo de preparación→despacho→tránsito→recepción.** Debe usarse solo cuando la entrega física ya ocurrió.

## Estado verificable según código y capturas del 08/11/2026
| Flujo | Estado | Restricción |
| --- | --- | --- |
| Pedidos por editorial desde adopción | Avanzado | Validar extremo a extremo con recepciones reales |
| Recepciones parciales, guías, incidencias, alta de stock | Implementado | Sin stock hasta validación de una recepción |
| Maestro de ubicaciones; principal único activo | Implementado | Crear lugar no mueve ni crea libros |
| Conciliación inicial de lotes antiguos | Implementado | Solo si existe stock histórico sin ubicación, previa verificación física |
| Inventario global y consulta por almacén | Implementado; vista por almacén agregada P-08.5 | Disponibles de lotes conformes; observados en resumen |
| Traslado entre ubicaciones y por guía | Implementado P-08.3 | Directo tras entrega física; no en tránsito |
| Cortesías | Implementado parcialmente | Revisar salidas desde destinos diferentes del principal |
| Navegación de vuelta a Inventario | Corregida | Traslados y Cortesías, pendiente validación visual |
| Reserva por lote y conteo B3; picking/armado de packs | B3 parcial en rama; packs pendientes | La reserva ya controla concurrencia; no equivale a despacho ni arma packs |
| Despacho con guía, tránsito y recepción en destino | Pendiente | Requiere identidad del destino, responsable y pruebas |
| Feria y consignación por evento/colegio | Pendiente | Un almacén genérico no distingue varias operaciones simultáneas |
| Devoluciones (varios orígenes) | Pendiente | No usar "ajuste" o "traslado" como sustituto |
| Conteo periódico y ajustes autorizados | Pendiente | Deben ser auditables y con permisos separados |
| Control integral de incidencias/evidencias | Parcial | El flujo de recepción tiene incidencias, no todas las salidas |
| Reportes consolidados y archivo documental | Pendiente | Integración con ventas/facturación aún no implementada |

## Orden de implementación propuesto (dependencias explícitas)

### Fase 0 — Navegación y ensayo controlado de lo existente [EN CURSO]
- Unificar navegación de regreso entre Inventario / Traslados / Cortesías / Ubicaciones / Stock por almacén.
- Ejecutar un circuito **en base aislada**: pedido aprobado → guía validada → entrada a principal → traslado parcial → stock origen -N, destino +N, total sin alteración. No sembrar datos de prueba en producción.
- Revisar saldos, permisos, casos vacíos, reintentos e idempotencia; pruebas móviles 360/390/430/768 px.
- Completar CI y pruebas manuales antes de iniciar procesos que escriban más movimientos.

### Fase 1 — Maestro de destinos y requerimiento interno [PENDIENTE]
- Distinguir ubicación física estable (principal/tienda) de **operación o custodia** (feria con fecha, consignación de colegio, responsable). Relacionar ambas con la distribución de mercadería.
- Requerimientos internos: solicitante, destino exacto, colegio/feria, modalidad, campaña, productos, cantidades y fechas; estados y permisos.
- Referencia del MOF: atención en temporada alta 48 horas, baja 24 horas; confirmar vigencia antes de automatizar SLA.

### Fase 2 — Preparación y packs [EN CURSO: B3 parcial; packs pendientes]
- Separar preparación (picking/conteo/reserva) de traslado/venta; registrar quién preparó y cantidades.
- Modelo de packs Santillana: agrupación física **por colegio/adopción** con componentes por producto, cantidad, proveedor, etiqueta, estado de armado; código interno de identificación logística si es necesario, **sin crear SKU comercial ni duplicar stock**. Manejar packs termosellados entregados ya armados y libros sueltos.
- Casos de apertura, armado incompleto, desarme, devolución e identificación de colegio. No publicar "pack colegio" en catálogo web.

### Fase 3 — Despacho y confirmación de recepción [PENDIENTE]
- Preparado → Despachado → En tránsito → Recibido (conforme / parcial / observado).
- Trazabilidad: origen, destino específico, responsable, guía de salida, firma/fecha/hora, evidencia y diferencias. Preparar integración regulatoria SUNAT de guías sin inventar emisión actual.
- Evitar doble salida, doble recepción y saldos negativos; las reservas no equivalen a salidas definitivas.

### Fase 4 — Devoluciones y retornos [PENDIENTE]
- Diferenciar **retorno de feria**, **liquidación/retorno de consignación**, **devolución del cliente** y **devolución a editorial**; condiciones, autorización y documentación particulares.
- Flujo físico mínimo: solicitud → autorización cuando aplique → recepción y conteo → evaluación (vendible/observado/dañado) → movimiento auditado → conciliación de saldo; posible vinculación con documento comercial.
- Para packs: devolver unidad completa o componentes sin duplicar y sin perder asignación de colegio.

### Fase 5 — Control, reportes y cierre [PENDIENTE]
- Conteos semanales, diferencias y ajustes con aprobación del Jefe de Logística según MOF; reporte por editorial/colegio/ubicación/fecha; auditoría.
- Control de dañados/faltantes: aislamiento físico, evidencia fotográfica, comunicación con administración.
- Archivo de documentos de recepción/traslado/devolución, constancias firmadas y trazabilidad de cambios.
- E2E completo (recepción → pedido preparado → despacho → destino → retorno) + seguridad/permisos + pruebas responsive + validación usuario.

## Reglas de dominio que NO deben quebrarse
1. El catálogo no genera stock; solo recepción validada o ajuste formal aprobado puede incrementarlo, según reglas de cada módulo.
2. Una ubicación registrada no crea mercancía. Conciliación inicial tampoco crea mercancía.
3. Movimiento entre ubicaciones: -N en origen, +N en destino; 0 de variación en stock global (salvo movimientos de consumo/ingreso explícito).
4. Venta, devolución, consignación, cortesía, despachos y packs son conceptos distintos: cada uno conserva trazabilidad, sin contabilizar dos veces.
5. No publicar datos internos de costos/packs en la web pública.
6. No crear acciones aparentes sin backend/validación; mensajes claros, estados vacíos y permisos visibles desde la UX.
7. Main/Tecnoweb solo tras aprobación explícita, con migraciones y datos protegidos.

## Preguntas de negocio que deben cerrarse antes de programar cada fase
- ¿Cuáles son las ubicaciones físicas permanentes y quién recibe físicamente en cada feria o consignación?
- ¿Cómo se identifica un pack recibido termosellado y cómo se registra su desarme/venta por libro?
- ¿Qué documentos y aprobaciones exige cada tipo de devolución? El MOF describe logística, pero no fija políticas completas de devoluciones.
- ¿Qué roles concretos de Django se asignarán a los cargos del MOF y qué actos necesitan doble aprobación?
- ¿Cómo migrar datos históricos del sistema anterior sin generar stock doble?

## 17/11/2026 — Decisiones recuperadas: packs y devoluciones (NO implementar todavía)

**Packs Santillana y otras editoriales:** un pack puede llegar termosellado con etiqueta de colegio, o sus libros pueden llegar sueltos. No siempre existe código propio de pack; las facturas de la editorial y comprobantes de venta detallan **libros individuales**, que deben conservar sus códigos, costos y saldos. El futuro ERP relacionará pack físico/logístico, colegio, campaña, adopción, proveedor, componentes y estado de sellado/armado. **No generar inventario adicional por crear un pack**, y no crear un SKU comercial artificial para el pack. La apertura/ruptura será excepcional, autorizada, y registrará quién, cuándo, motivo, componentes retirados y faltantes; la política exacta de autorización continúa sujeta a confirmación. En el catálogo web público no aparece «pack colegio».

**Devoluciones por origen/destino, todas pendientes de implementación:** (a) retorno de feria al almacén tras conciliación de unidades vendidas/no vendidas, (b) liquidación y retorno de consignación por colegio, (c) devolución de cliente con verificación comercial/documental y revisión física, (d) devolución a editorial por incidencia, daño, sobrante o acuerdo autorizado. No confundir un retorno con una nueva compra ni sumar dos veces existencias. Cada caso tendrá solicitud, autorización según proceda, conteo, clasificación vendible/observado/dañado, documento y movimiento auditable. Una devolución a editorial requiere separación física, conteo conciliado con el proveedor y guía/documento correspondiente; ajustes de descuentos/facturas únicamente con autorización de Administración y rastro de auditoría.

**No usar traslados manuales ni ajustes de inventario como sustitutos de estas devoluciones.** Definir los casos AS-IS con responsables reales antes de programar. La mejora actual de correo por observados **solo documenta un reclamo**, no crea automáticamente una devolución ni una nota de crédito.

## 18/11/2026 — Consignación: preparación, venta, facturación y retorno [DISEÑO PENDIENTE]

**Regla de negocio:** la reserva/preparación que ya probamos en Feria también debe servir para consignación. Después de entregar físicamente los libros, hay que controlar la custodia del colegio o tercero, sus ventas rendidas, los comprobantes correspondientes y la devolución de sobrantes o dañados. **Salir en consignación NO implica automáticamente vender ni facturar toda la mercadería**: los términos exactos dependen del convenio y de la validación de Administración/Contabilidad.

**Flujo previsto:**
1. Registrar operación de consignación, colegio/consignatario, campaña, fechas, ubicación de custodia y responsable. No mezclar consignaciones distintas.
2. Planificar → reservar por guía/lote → verificar conteo (B3 ya disponible) → documento interno numerado de salida + verificación tributaria cuando corresponda (B4, pendiente).
3. Despachar → registrar tránsito → confirmar cantidades efectivamente recibidas en el destino. El traslado entre custodias no aumenta ni reduce el inventario global por sí solo.
4. Rendición: registrar período, productos, unidades entregadas, unidades vendidas, no vendidas, devueltas y diferencias; impedir vender más que lo recibido y evitar duplicidad.
5. Validación de lo vendido y emisión de boleta/factura cuando proceda desde el futuro módulo **Ventas/Facturación**. Vincular a cada rendición, comprobar destinatario y condiciones comerciales. No generar factura por el mero despacho; criterio tributario sujeto a validación profesional.
6. Devolución parcial o total: autorización según política, retorno físico, conteo, inspección, clasificación conforme/observado/dañado y movimiento auditado al almacén receptor. No simular devolución como una compra nueva.
7. Conciliar saldos, diferencias, comprobantes y responsabilidades antes de cerrar; informar por colegio/consignatario, campaña, editorial, producto y lote.

**Regla contable-operativa:** unidades en custodia + vendidas registradas + devueltas recibidas + diferencias justificadas deben reconciliar contra lo entregado, con movimientos/idempotencia trazables; definir el tratamiento de cada faltante y nota de crédito antes de codificar.

**Estado del código:** B3 soporta modalidad Consignación y reserva, **pero todavía NO** existe el circuito integral de recepción en destino, custodia por colegio, rendición, facturación ni retorno de consignación. B3.2 agregó solo ferias específicas. No habilitar botones de Facturar o Devolver sin soporte backend; preparar el diseño equivalente de subalmacenes de consignación por colegio como siguiente alcance.

**Simplificación UX:** una línea operativa común Planificar → Reservar → Preparar → Despachar → Recibir → Liquidar / Devolver, mostrando solo las acciones posibles en la etapa actual. No solicitar conductor ni transportista para apartar libros; documentación interna en despacho, no en reserva. La facturación se visualiza en Ventas/Administración, enlazada a la rendición.

## B5.1 — Incidencias de llegada y recuento supervisado (19/11/2026, en rama)

**Implementado en backend y frontend:** registro de diferencia por lote al confirmar una recepción en destino, observaciones y persona que contó; una sola incidencia abierta por despacho, con historial. Al registrar una diferencia **no entra mercancía al destino** ni cambia la existencia global: permanece en tránsito. El cierre por jefatura exige contar nuevamente todos los lotes y que coincidan exactamente con lo despachado; la jefatura deja una explicación y solo entonces puede realizarse la confirmación de recepción habitual por separado. Auditoría y pruebas PostgreSQL incluidas (508 pruebas OK).

**No implementado en B5.1:** recepción parcial aceptando diferencias, clasificación automática de dañados, faltantes que no aparecen en un recuento, reclamos a transportista, retorno al origen y resolución contable de pérdidas. Una incidencia con diferencia persistente **debe permanecer abierta** hasta implementar una resolución autorizada sin inventar saldo. La corrección supervisada de conteo no puede usarse para justificar bienes no recibidos.

**Modernización UX asociada:** pantalla de Distribuciones con tarjetas y filtro animados (Motion compatible con preferencia de movimiento reducido), formulario de preparación compacto, documento interno con logo real y formato A4 institucional; panel de incidencias contextual en la etapa En tránsito, sin presentar acciones todavía no soportadas.

**Prueba local pendiente:** migración `0022_distribution_arrival_incidents` en entorno de desarrollo respaldado; probar mediante datos sintéticos en base aislada para no falsear GRE, despacho ni recepción del Colegio 22 DE ABRIL. No desplegar a producción sin validar interfaz, documentos y permisos.
