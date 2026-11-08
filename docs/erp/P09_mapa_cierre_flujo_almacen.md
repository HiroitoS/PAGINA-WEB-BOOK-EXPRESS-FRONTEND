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
| Preparación/picking, armado de packs | Pendiente | No reservar sin control de concurrencia |
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

### Fase 2 — Preparación y packs [PENDIENTE]
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
