# Bitácora de continuidad — ERP Book Express

Actualizada: 08/11/2026. Documento de trabajo; contrastar con GitHub antes de ejecutar.


## 08/11/2026 — Propuesta UX para reducir módulos visibles de Almacén [PENDIENTE DE APROBACIÓN]

**Observación de usuario:** el submenú Almacén presenta demasiadas entradas independientes (Recepción, Inventario, Traslados, Historial, Cortesías, Ubicaciones). La intención es agrupar funciones relacionadas y simplificar navegación en escritorio y celular, sin mezclar entidades o reglas de negocio.

**Recomendación conceptual, NO implementada todavía:** mantener menú compacto:
1. **Recepción de mercadería:** pedidos por recibir, borradores, validación, incidentes e historial de recepciones como pestañas internas.
2. **Inventario:** existencias generales, stock por almacén y administración de ubicaciones como pestañas/acciones contextuales; posteriormente conteo de existencias según permisos.
3. **Movimientos:** traslados, cortesías/muestras y **historial completo** como pestañas internas (sin ocultar ni perder acceso directo por URL), posteriormente retornos/devoluciones cuando existan endpoints reales.
4. **Preparación y despachos:** mostrar SOLO cuando funcione; requerimientos internos, picking y **armado/recepción de packs** en un mismo flujo, seguido de despacho y recepción en destino, con historial de envíos contextual.
5. **Control logístico:** incorporar cuando exista funcionalidad: incidencias, conteos, ajustes autorizados, reportes y auditoría. Podría ubicarse dentro de Inventario/Movimientos si al probarlo resulta más fácil.

**Distinción de dominio clave:** «Pedidos a Editoriales» (compra al proveedor) no se debe fusionar automáticamente con «Preparación de pedidos / Packs» (separación y empaque de mercadería para distribución). Comparten productos y demanda, pero tienen propietarios del proceso, estados y movimientos distintos. **Agrupar visualmente no es mezclar servicios, permisos ni tablas**.

**UX:** navegación principal corta, pestañas visibles por permiso, encabezados compactos, acciones contextuales; en móvil, pestañas desplazables o selector compacto sin menús anidados interminables; historial accesible desde su proceso y desde una consulta transversal. Cada evento confirmado conserva autor, fecha, producto, cantidades, documento y origen/destino. No crear enlaces a acciones futuras inexistentes.

**Siguiente paso:** aprobar la agrupación con el usuario, luego refactorizar rutas/menú sin romper URLs ni APIs y pasar pruebas lint/build, navegador móvil y flujos end-to-end. La decisión es una **propuesta por validar**, no un cambio ya incorporado al frontend. Mantener rama `feature/erp-p08-traslados-por-guia`; no integrar `main` ni desplegar.

## 08/11/2026 — Revisión visual: regreso a Inventario y mapa hasta devoluciones

**Solicitud del usuario:** en la captura de `/admin/erp/almacen/stock-por-almacen` se comprueba la nueva vista con cero existencias. En Traslados faltaba un acceso directo de regreso a Inventario; Cortesías tenía "Ver inventario" pero no un regreso claramente reconocible. Ubicaciones sí ofrece retorno. Se pide mapa de cierre del flujo de recepciones, reparto, retornos y devoluciones, con MOF y Macroproceso ya colocados por el usuario en carpeta raíz **local**.

**Cambios de código hechos EN LA MISMA rama P-08 (sin main):**
- `src/pages/admin/erp/ERPTrasladosPage.jsx`: botón `← Volver a inventario`, siempre visible, junto a Ubicaciones cuando el permiso lo permite, diseño adaptable para celular.
- `src/pages/admin/erp/ERPCortesiasPage.jsx`: reemplazado "Ver inventario →" por `← Volver a inventario`, enlace directo y espacio táctil móvil.
- Nuevo documento `docs/erp/P09_mapa_cierre_flujo_almacen.md`: flujo integral y prioridades F0-F5; diferencia funciones actuales de pendientes; conserva packs, despachos, consignaciones, ferias, devolución, incidencias, conteos y archivo. No implica implementación de esos módulos.
- Se evita inventar un botón de "Devolución" sin backend real. La próxima fase es **prueba E2E controlada** del camino existente y diseño del requerimiento/preparación/despacho.

**Fundamento funcional:** el Macroproceso documenta gestión comercial, recepción, almacenamiento, preparación, despacho, control de inventario, dañados/faltantes y archivo. El MOF asigna supervisión/aprobación al Jefe de Logística y operación a asistentes/coordinador/personal de almacén; estos cargos no representan aún un mapeo RBAC aprobado. Políticas exactas de devoluciones y packs se proponen para validación, no constan íntegramente en esos documentos.

**Pendientes para cerrar:** `git pull` del frontend de la rama `feature/erp-p08-traslados-por-guia`, pruebas de enlaces manuales, `npm run lint`, `npm run build`, pantalla 360/390/430/768/1440 px. Verificar ejecutoria CI más reciente. No desplegar ni integrar ramas sin aprobación explícita.

## 08/11/2026 — P-08.6: trazabilidad e historial completo de traslados, mejoras logísticas

**Nueva necesidad confirmada:** el usuario quiere ver el historial de **cada traslado** y, cuando implementemos despacho, también **de cada envío**, con información de qué se envió, hacia dónde, cuándo y quién intervino. Es requisito esencial para presentar el sistema a jefatura. El histórico de recepción ya tiene eventos, pero **despacho/retorno aún no existen**.

**Implementación backend en rama existente** `feature/erp-p08-traslados-por-guia`:
- `warehouse/api_transfers.py`: listado paginado con filtros validados `q`, `source_id`, `destination_id`, `batch_id`, `date_from`, `date_to`; respuesta incorpora `operation_reference` BE-TG-* (guía) / BE-TI-* (individual), `operation_type`, editorial, código, recepción, autor visible y fecha/hora. Preserva contrato anterior y `select_related`.
- `warehouse/test_transfers.py`: casos nuevos de filtros por código/colegio/guía, cantidades, límites, permiso denegado, identidades por guía y comprobación de historial. GitHub Actions Django/PostgreSQL **aprobó** commit b62c08a (tests incluidos).
- Sin nuevas migraciones ni borrado de movimientos. Historial de traslados confirmados; **NO equivale al futuro historial de despachos en tránsito**.

**Implementación frontend:**
- Nuevo `src/pages/admin/erp/ERPHistorialTrasladosPage.jsx`, ruta `/admin/erp/almacen/historial-traslados` protegida, acceso desde menú y Traslados, filtros, 25 movimientos por página, detalle por guía `batch_id`, fecha/hora, origen-destino, usuario, colegio y observación; móvil con tarjetas.
- `src/api/warehouseApi.js` acepta filtros sin modificar llamadas anteriores.
- `InventoryTransfersPanel.jsx`: "Traslados recientes" diferencia primeros 25 del historial completo; muestra referencia, fecha, responsable y acceso por guía.
- Corregido texto engañoso: ferias/consignaciones **no exigen** trasladar toda la guía; solo unidades realmente entregadas al destino.
- Primera ejecución de CI detectó una regla de hooks `react-hooks/set-state-in-effect` en nueva pantalla; corregida moviendo setState a callback asíncrono; la siguiente ejecución de GitHub Actions frontend aprobó lint/tests/build. Registrar si hubo errores posteriores a esta actualización.

**Diagnóstico y decisiones:** MOF y Macroproceso describen ocho procesos con responsables y flujogramas, pero no un sistema de estados completo de despachos, packs y devoluciones. Se evita presentar como implementadas reglas inexistentes. Documento de jefatura: `docs/erp/P11_propuesta_mejora_procesos_logisticos.md`, con 13 mejoras propuestas, control del historial, fases y criterios de demo; guarda originales fuente solo en raíz local, fuera de repositorios públicos.

**Siguiente implementación real (NO hecha):** requerimientos de mercadería → preparación/picking/pack → despacho con estados y eventos inmutables → recepción en destino → devolución por tipo e inspección → conteo y ajustes autorizados. No usar traslado directo como sustituto de despacho ni crear stock con packs. Requiere validación de reglas documentales, roles y tests de no duplicación antes de escribir nuevos movimientos.

**Comprobaciones pendientes:** ejecución completa de frontend después del último commit, `git pull` en backend/frontend, pruebas manuales con recepciones y movimientos reales en base de prueba, UI de 360/390/430/768/1440 px, verificación de permisos y orden. Cero cambios en `crm/gestion-colegios`, `main` o Tecnoweb.

## 08/11/2026 — UX Almacén: navegación compacta, espacios, mobile-first, lenguaje claro [IMPLEMENTADO EN RAMA]

**Solicitud:** simplificar el submenú, evitar pantallas demasiado largas, textos principales centrados y mensajes de error técnicos. Mantener procesos y rutas que funcionan, proteger permisos y mejorar su presentación para demo ante jefatura.

**Decisiones e implementación:**
- **Submenú de Almacén reducido a 3 accesos:** *Recepción de mercadería*, *Inventario*, *Movimientos*. Las URLs existentes de Ubicaciones, Traslados, Cortesías y su Historial se **mantienen**; no se fusionan reglas de negocio ni se modifican APIs.
- **Movimientos agrupa** Traslados / Cortesías / Historial de traslados mediante componente reutilizable `src/components/admin/WarehouseMovementTabs.jsx`: pestañas visibles, enlaces reales, estado activo, desplazamiento horizontal si el celular es estrecho y objetivos táctiles mínimos de 44px. En las páginas se conserva acceso de retorno.
- **Inventario:** accesos rápidos agrupados en *Por almacén / Movimientos / Ubicaciones* más pestañas internas de *Existencias / Entradas*; métricas alineadas a la **izquierda**, descripciones más cortas y enlaces más compactos. No se eliminan cantidades, valorización ni datos históricos.
- **Ubicaciones:** cuando ya hay principal y destinos activos, reemplaza dos tarjetas y la explicación extensa por una franja de estado corta; el enlace *Ver existencias* aparece solo con permiso de inventario. Si aún falta configuración, se muestran instrucciones directas. Se preservan administración y conciliación.
- **Precisión comercial:** se muestra «Cortesías» (no se promete gestión de muestras retornables), y la pestaña de historial se llama «Historial de traslados» para no confundirla con el futuro historial de despachos.
- **Traslados:** solo se muestran 4 movimientos recientes en el panel de trabajo, con enlace al **historial paginado completo**. Estados vacíos breves y alineados a la izquierda, sin múltiples bloques de scroll innecesarios.
- **Mensajes y alertas:** nuevo `src/utils/warehouseErrorMessage.js` con lenguaje de usuario, explicación por sesión/permisos/conexión, validaciones españolas conocidas y protección contra respuestas internas (SQL, trazas, JSON, rutas, etc.). Integrado en Traslados, Cortesías, Ubicaciones, Recepciones, Historial y Conciliación. Pruebas unitarias `tests/warehouseErrorMessage.test.js`.
- **Conciliación inicial:** diálogo limitado a la altura del dispositivo, con scroll accesible y botones completos en móvil.
- **Diseño:** evitar centrar KPI, métricas y mensajes sin motivo; mantener texto alineado a la izquierda, botones con altura táctil apropiada, filas compactas y espacios coherentes con marca Book Express. **Mobile-first** pendiente de revisión visual manual real en 360/390/430/768/1024/1440 px.

**Archivos modificados:** `src/layouts/AdminLayout.jsx`, `src/pages/admin/erp/ERPInventarioPage.jsx`, `ERPTrasladosPage.jsx`, `ERPCortesiasPage.jsx`, `ERPHistorialTrasladosPage.jsx`, `ERPUbicacionesPage.jsx`, `ERPStockPorAlmacenPage.jsx`, `ERPRecepcionPage.jsx`, `src/components/admin/InventoryTransfersPanel.jsx`, `InventoryCourtesyPanel.jsx`, `WarehouseLocationsPanel.jsx`, `WarehouseReconciliationPanel.jsx` y dos archivos nuevos (pestañas y mensajes) más test.

**Verificación:** comprobar CI del commit final, `npm run lint`, `npm run build`, `node --test tests/*.test.js`; navegador responsive y recorridos de cada ruta protegida, formularios y permisos. **No se ha desplegado**, no se ha fusionado a `crm/gestion-colegios` ni `main`; el backend se mantiene intacto en este ciclo UX. No confundir mejora de interfaz con cierre de flujos pendientes de despacho, packs y devoluciones.

## 08/11/2026 — P-09.1: primera entrega real de Solicitudes internas [EN REVISIÓN]

**Motivo comercial:** el Macroproceso de Almacén exige atender requerimientos de tienda/feria/consignación antes de seleccionar, contar, empacar y despachar los libros. Se mantiene la arquitectura **Pedidos a Editoriales = Compras**, mientras que **Solicitudes internas = operación logística de distribución**. El MOF asigna preparación al personal de almacén y supervisión a Logística; el mapeo de cargos a permisos del sistema aún debe validarse con jefatura.

**Implementado — backend Django:**
- Nuevas entidades `InternalStockRequest` (origen, destino, responsable, operación, fecha requerida, estado, autor), `InternalStockRequestItem` (libro, cantidad, nombre/código congelados) y `InternalStockRequestEvent` (actor, fecha, transición, motivo) en `warehouse/models.py`.
- Migración **0013_internal_stock_request.py** crea tablas de solicitudes, líneas y eventos. **No modifica tablas de stock existentes ni crea entradas/salidas**.
- Nueva API privada `warehouse/api_internal_requests.py` con lista paginada, detalle, búsqueda de libros activos sin precios, ubicaciones activas de solo lectura, alta de solicitud, aprobación, rechazo con motivo, anulación de pendientes; operaciones por usuario/permiso.
- Creación idempotente mediante clave UUID y huella del contenido; envío repetido con mismo contenido devuelve registro existente y no duplica líneas ni eventos. Transiciones protegidas por transacción y `select_for_update`.
- Estados `submitted / approved / rejected / cancelled`. **Aprobar NO reserva ni descuenta stock**, y no significa que esté despachado ni recibido.
- Roles de Almacén reciben lectura y registro de solicitudes mediante `sync_bookexpress_roles`, **NO aprobación**. Permiso de aprobación separado `warehouse.approve_internal_stock_requests` para responsable designado mediante Panel.
- Tests `warehouse/test_internal_requests.py`: permisos, transiciones, duplicados, validaciones, lectura paginada, historial y stock sin cambios.

**Implementado — frontend React:**
- Página real `src/pages/admin/erp/ERPSolicitudesMercaderiaPage.jsx`, ruta `/admin/erp/almacen/solicitudes`; enlace nuevo **Solicitudes internas** en menú compacto de Almacén, según permiso.
- Formulario mobile-first para origen, destino, responsable, feria/colegio de operación, fecha, notas, búsqueda de libros y cantidades; lista y detalle con historial; decisiones de aprobar/rechazar/anular con confirmación.
- API `src/api/warehouseApi.js` y actualización de permisos `src/utils/adminAccess.js`; mensajes breves de validación `warehouseErrorMessage.js`. No se muestran botones de picking, despacho o packs sin implementación.
- Prepara test visual de 360/390/430/768/1440 px, estados sin datos y errores de conexión.

**Pendientes críticos antes de jefatura:**
1. Confirmar que GitHub Actions de **ambos repositorios** pasa en el **último commit**, incluyendo migraciones, lint y tests. No marcar como completado hasta verificar.
2. Ejecutar `git pull` en backend y frontend en rama `feature/erp-p08-traslados-por-guia` sin perder modificaciones locales; `python manage.py check`, `python manage.py makemigrations --check --dry-run`, `python manage.py migrate`, `python manage.py test warehouse.test_internal_requests`, `npm run lint`, `npm run build`.
3. Prueba funcional de solicitud para Tienda, Feria y Consignación con productos activos y permisos; comprobar stock global igual antes/después y respuesta idempotente en reintento.
4. Validar la experiencia en celular y redacción final; revisar política de aprobación, jefatura de Logística y rangos de tiempo del MOF antes de crear avisos.
5. Implementar posteriormente **P-09.2 Reservas y preparación/picking**, **P-09.3 Packs**, **P-09.4 Despachos/envíos**, **P-09.5 Devoluciones**. Mantener los módulos de Compras y Almacén separados, aunque estén enlazados.

**Documento operativo específico:** `docs/erp/P12_solicitudes_internas_inicio_preparacion.md`. Las fuentes MOF/Macroproceso originales permanecen en la raíz local privada, sin subir a GitHub.

**Integración/despliegue:** ningún merge a `crm/gestion-colegios` o `main`; nada a Tecnoweb. Las PR existentes siguen en revisión.

## 09/11/2026 — Diagnóstico importación de colegios: vista previa sin colegios listos

**Caso observado:** el usuario intenta importar el archivo local `BE - LISTADO DE LEADS 2027(2).xlsx` en CRM → Colegios → Importar. La vista previa devuelve «No hay colegios listos para importar», sin explicación clara en el primer pliegue de pantalla. El Excel se inspeccionó directamente: hoja `Instituciones`, encabezados compatibles, **1,165 filas**, niveles Inicial - Jardín (442), Inicial - Cuna Jardín (39), Primaria (419), Secundaria (265), **54 registros sin cantidad de alumnos**, 537 códigos de institución distintos; estos datos son del archivo, no de registros importados. **No cambiar el año de población solo por el nombre «Leads 2027»; confirmar procedencia del censo.**

**Hipótesis a verificar primero en el PostgreSQL local:** los niveles educativos del catálogo `catalog.Level` están vacíos o inactivos tras un arranque sin datos maestros. El importador `crm/services/school_imports.py` exige un nivel activo cuyo nombre/slug corresponda a Inicial, Primaria o Secundaria; si no existe, genera «No se reconoce el nivel» por cada fila y ninguna institución queda lista. No afirmar confirmación hasta consultar `Level.objects.values_list('name','slug','is_active')` y/o revisar detalles de vista previa.

**Solución operativa sin alterar importador:** Gestión web → Clasificaciones → Niveles; crear/activar **Inicial**, **Primaria**, **Secundaria** si faltan; verificar antes de importar. Regenerar vista previa y revisar nuevos, actualizaciones, advertencias y conflictos. Confirmar importación **solo después** de revisar resultado. No ejecutar importación en producción ni duplicar datos. La ausencia de alumnos es advertencia y no debería bloquear.

**Corrección UX aplicada (solo frontend, misma rama):** `src/pages/admin/crm/CRMSchoolImportsPage.jsx` ahora identifica el error «No se reconoce el nivel» en la vista previa, muestra instrucción clara y enlace real a `/admin/clasificaciones`. Otros casos sin colegios listos remiten a resultados de validación, evitando mensaje genérico. Pendiente comprobación CI lint/build en commit final y validación manual en navegador. Backend y reglas de importación **sin cambios**.

**Contexto ERP:** cargar colegios es útil para CRM/adopciones y pedidos a editoriales, pero las solicitudes internas P-09.1 no requieren colegios cargados (por ahora destinatario se registra como texto). **No inventar adopciones ni ingresos en producción** para probar almacén.

## 09/11/2026 — Plan de pruebas con colegios y productos realmente cargados [PREPARADO]

**Situación:** ya existen colegios y productos cargados en PostgreSQL local `bookexpress_db`; el usuario necesita verificar el recorrido real CRM → cotización → adopción → pedidos por editorial → recepción parcial → inventario/traslados. **No existen por importación automática** oportunidades, cotizaciones, adopciones, pedidos o stock. No generar adopciones ficticias en la BD de trabajo como si fueran ventas reales.

**Implementación conservadora en backend:** comando `crm/management/commands/preparar_demo_erp.py` y pruebas `crm/tests/test_demo_seed.py`. La orden **sin `--crear` es de solo lectura** y muestra los totales reales de colegios, libros, precios del año y selecciona candidato con nivel/grado y PVP. `--crear` sólo está autorizado cuando **DEBUG=True** y el nombre de la base comienza con `bookexpress_demo_`: usa los productos, precios y nombre de colegio importados, pero crea colegio separado marcado **[PRUEBA ERP]**, contacto ficticio, campaña de prueba, oportunidad y proyección vía servicios del dominio y cotización **en borrador**, sin inventar un descuento editorial real, firma, aceptación, adopción, pedido, guía ni movimientos de stock. Idempotencia por `book_express_code`; sin duplicar escenario.

**Ejecución prevista** (Git Bash, backend; NO ejecutar los comandos de `--crear` con `bookexpress_db`):
1. `python manage.py preparar_demo_erp --year 2027` → revisar disponibilidad de datos reales en BD local, sin escrituras.
2. Detener servidores, efectuar respaldo/clon local `bookexpress_db` → `bookexpress_demo_db` mediante pgAdmin/pg_dump+pg_restore; verificar que **DB_NAME=bookexpress_demo_db**.
3. `DB_NAME=bookexpress_demo_db python manage.py preparar_demo_erp --year 2027` (vista previa).
4. `DB_NAME=bookexpress_demo_db python manage.py preparar_demo_erp --year 2027 --crear` (ejecución sólo en clon), con IDs explícitos opcionales `--school-id`, `--product-id`.
5. `DB_NAME=bookexpress_demo_db python manage.py runserver`: navegar CRM y continuar decisiones de cotización/descuento editorial, envío, aceptación y adopción **solo simulada** mediante UI, generar pedidos con servicios existentes y simular recepción parcial utilizando documentos rotulados DEMO; ejecutar luego validación de stock, traslado e historial.

**Justificación:** PVP por campaña debe venir de `ProductPrice` realmente importado; no colocar valores arbitrarios. Costos y descuentos editoriales requieren validación del responsable. No se firma ninguna adopción automáticamente. El demo no interfiere en reportes reales ni en PostgreSQL de producción. La demostración para jefatura debe indicarse **simulada**.

**Pendientes:** verificar último CI backend, tests `crm.tests.test_demo_seed`, ejecutar clon y pruebas manuales; comprobar productos importados con precios numéricos activos 2027 y clasificaciones nivel/grado. Se mantiene la rama `feature/erp-p08-traslados-por-guia`, sin merge ni despliegue a Tecnoweb.

## 09/11/2026 — Prueba de entorno DEMO: bloqueos PostgreSQL y pipeline [DIAGNÓSTICO]

**Evidencia de la máquina del usuario:** `python manage.py preparar_demo_erp --year 2027` en `bookexpress_db` mostró **578 colegios activos, 1557 productos y 1557 productos con PVP numérico 2027**, pero finalizó con «Falta configurar el pipeline comercial predeterminado y su etapa inicial». Son datos presentes, pero falta el dato maestro `Pipeline` y `PipelineStage` (no es un fallo de importación). No ejecutar `sync_crm_pipeline` en `bookexpress_db` sin revisión: el comando cambia el default y normaliza etapas existentes.

**Clonado de PostgreSQL:** `CREATE DATABASE bookexpress_demo_db WITH TEMPLATE bookexpress_db OWNER bookexpress_user;` devolvió SQLSTATE 55006 (hay **1 sesión abierta usando bookexpress_db**). La captura muestra pestaña Query Tool conectada a `bookexpress_db` en pgAdmin. Cerrar ese Query Tool y servidores Django, verificar desde Query Tool conectado a `postgres` que `pg_stat_activity` no tiene conexiones al origen; volver a ejecutar `CREATE DATABASE` fuera de transacción. El error posterior «no existe bookexpress_demo_db» es consecuencia del clonado fallido, no del comando demo.

**Pasos tras copiar exitosamente (solo DEMO):**
1. `DB_NAME=bookexpress_demo_db python manage.py sync_crm_pipeline` (sincronizar exclusivamente en clon; puede modificar estado/etapas de demo).
2. `DB_NAME=bookexpress_demo_db python manage.py preparar_demo_erp --year 2027` (lectura).
3. `DB_NAME=bookexpress_demo_db python manage.py preparar_demo_erp --year 2027 --crear` (crea colegio marcado prueba, oportunidad, proyección y cotización borrador).
4. `DB_NAME=bookexpress_demo_db python manage.py runserver`, abrir frontend, seguir flujo.
**Nunca** ejecutar `--crear` con `bookexpress_db` ni tratar las adopciones/pedidos simulados como operaciones reales. El original queda intacto.

## 09/11/2026 — Simplificación de datos para prueba CRM→ERP en base local

**Decisión del usuario:** no crear un segundo PostgreSQL ni clonar `bookexpress_db` para las pruebas; la base actual ya tiene 578 colegios y 1,557 productos con PVP 2027. Priorizar pasos cortos, seguros y verificables. No crear adopciones, ventas ni recepciones ficticias como operaciones reales sin identificarlas claramente.

**Bloqueo detectado en ficha de colegio:** «No existe una campaña escolar activa para crear una oportunidad». Los Excel de colegios y catálogo **no crean campañas ni pipelines**; son maestros separados. Código revisado: `crm/management/commands/sync_crm_campaign.py` acepta `--year 2027 --campaign-type school --status active`, creando/actualizando solo esa campaña; `crm/management/commands/sync_crm_pipeline.py` configura pipeline y etapas, pero altera el pipeline por defecto y puede reordenar etapas, por eso hay que inspeccionar si ya existen oportunidades antes de ejecutarlo en la base habitual.

**Paso inmediato:** en `bookexpress_backend`, ejecutar `python manage.py sync_crm_campaign --year 2027 --campaign-type school --status active`, actualizar la ficha del colegio y comprobar si permite crear oportunidad. Si falta pipeline, ejecutar primero `python manage.py shell -c "from crm.models import Pipeline, Opportunity; print(list(Pipeline.objects.values_list('code','is_active','is_default'))); print('Oportunidades:', Opportunity.objects.count())"`. **Si no hay oportunidades/pipeline real**, sincronizar con `python manage.py sync_crm_pipeline`; si hay, revisar antes para conservar relaciones.

**Siguiente:** probar UNA oportunidad/cotización para un colegio de prueba, con libros importados y precios reales; generar adopción y documentos de compras únicamente como simulación rotulada. No correr `preparar_demo_erp --crear` en `bookexpress_db`: tiene una protección explícita. Cualquier cambio al comando para permitir datos de prueba en base local debe incluir marca evidente y limpieza controlada, además de pruebas.

## 09/11/2026 — CRM: campañas gestionables desde la aplicación (sin terminal anual) [IMPLEMENTADO EN RAMA]

**Problema reportado:** en desarrollo y Tecnoweb fue necesario ejecutar `sync_crm_campaign` en consola para registrar la campaña escolar 2027. En colegio se muestra «No existe una campaña escolar activa». Al vender/licenciar el sistema esto no es aceptable como operación recurrente para el cliente.

**Causa técnica confirmada en código:** `crm/api/views.py` expone `CampaignViewSet(viewsets.ReadOnlyModelViewSet)` (GET solamente); no había frontend de mantenimiento de campañas. La importación de colegios y productos no las crea; pipeline es una configuración de etapas separada, generalmente inicializada solo al instalar, NO cada año.

**Mejora de producto implementada (solo rama `feature/erp-p08-traslados-por-guia`):**
- Backend: `crm/api/serializers.py` incluye serializers de alta y edición; `CampaignViewSet` permite `GET/POST/PATCH` con permiso `crm.manage_campaigns`, niega eliminación y cambios de año/tipo tras creación; valida año, fecha final, duplicados por tipo/año, y **una sola campaña escolar activa**. El código de la campaña se genera siempre en servidor. No crea automáticamente una campaña al llegar enero, pues requeriría aprobación y permitiría duplicados silenciosos.
- Inicialización de pipeline: `POST /api/admin/crm/pipelines/configurar-inicial/` con `crm.manage_campaigns`, **solo cuando no exista NINGÚN pipeline**; reutiliza el comando de configuración, pero bloquea un segundo intento o si ya hay pipeline (no modifica oportunidades/etapas existentes).
- Frontend: nueva pantalla `src/pages/admin/crm/CRMCampaignsPage.jsx` en `/admin/crm/campanas`, acceso desde menú CRM → Campañas visible únicamente a quien tiene permiso. Administrador crea campaña 2027 como planificación y la activa; puede cerrar la anterior conservando el historial. Estado y pantalla de pipeline con acción inicial solo si no hay etapas configuradas. Diseño responsive, controles táctiles, mensajes de negocio.
- Ficha de colegio `CRMSchoolDetailPage.jsx`: en ausencia de campaña única activa ofrece **Gestionar campañas** si autorizado; para asesor muestra «Solicita al administrador que configure la campaña escolar». Un asesor no recibe acciones técnicas.
- Tests backend: `crm/tests/test_campaign_management_api.py` cubren CRUD limitado, año inmutable, permisos, activación exclusiva, fechas, configuración inicial sin sobrescribir pipeline existente. Sin migraciones ni cambios en valores/relaciones de campañas ya creadas. La campaña 2027 que el usuario creó anteriormente se conserva.
- UX: NO agregar gestor de pipeline completo en V1; configuración inicial solo cuando no existe pipeline; si ya existe alguno mal configurado, requiere revisión responsable (no sobrescribirlo automáticamente).
- Riesgo de negocio: cerrar 2026 no borra sus oportunidades, pero impide nuevas oportunidades en ella. Evaluar política de transición anual y permitir campaña seleccionada explícitamente en la ficha si se requiere mantener múltiples campañas abiertas. Actual CRM espera exactamente una campaña escolar activa si no se especifica.
- Estado: código comprometido en rama de desarrollo, **pendiente verificación completa CI + pruebas manuales**. No fusionar `crm/gestion-colegios` ni `main`, no subir a Tecnoweb sin autorización y respaldo.

**Prueba manual posterior a `git pull`:** CRM → Campañas → comprobar 2027 existente y activa (no crear otra), revisar pipeline predeterminado ya creado; ingresar a colegio 382, F5, crear oportunidad. Para próxima campaña 2028: Registrar (planificación) → cerrar campaña anterior (cuando corresponda) → activar 2028 → usar CRM. Probar con usuario sin permiso: solo lectura/acción no disponible.

## 09/11/2026 — Generación automática de datos CRM de prueba en la MISMA base local [CAMBIO IMPLEMENTADO]

**Decisión operativa del usuario:** no crear `bookexpress_demo_db` ni operar una segunda base; trabajar sobre `bookexpress_db` local de desarrollo, que ya cuenta con colegios, productos y PVP 2027 importados, campaña escolar 2027 activa y pipeline inicial. Se necesita comprobar el circuito CRM → cotización → adopción → pedidos → recepciones → almacén.

**Solución:** se adaptó `crm/management/commands/preparar_demo_erp.py` para aceptar `--crear --local`, **solo** si `DEBUG=True`, motor PostgreSQL, `DB_NAME=bookexpress_db` y `DB_HOST` es localhost/127.0.0.1/::1. El modo anterior de base `bookexpress_demo_*` sigue disponible sin `--local`; sigue bloqueado en producción normal. Sin `--crear`, el comando solo inspecciona datos.

**Importante corrección de dominio:** antes el seed creaba segunda campaña activa `BE-DEMO-2027`, lo que podía inutilizar la ficha de colegios que requiere una única campaña escolar activa. Ahora **reutiliza** la `SCHOOL-2027` activa existente; si no es única, aborta sin escribir. No duplica campañas, ni altera colegios maestros importados.

**Objetos creados al autorizar:** colegio totalmente separado con nombre **[PRUEBA ERP] Colegio de demostración 2027** y código BE interno de demostración; contacto ficticio; servicio educativo, oportunidad [PRUEBA ERP], proyección con productos/cantidades importados, **cotización en borrador**. No crea adopción, firma, pedido, movimiento de stock ni recepción. Operación transaccional; segundo intento con misma combinación de año/colegio no duplica. La cotización real y descuentos se revisan manualmente en la interfaz.

**Comandos previstos desde backend local:**
- `python manage.py preparar_demo_erp --year 2027` (vista previa).
- `python manage.py preparar_demo_erp --year 2027 --crear --local` (escritura local explícita).
- Opcionales `--school-id N --product-id N --quantity 10` para elegir escenario.
- `python manage.py test crm.tests.test_demo_seed` (tests en BD temporal).

**Riesgo documentado:** al estar en la misma base, las operaciones de prueba aparecerán en el CRM y podrían influir en reportes; deben mantenerse claramente rotuladas y **NO** tratarse como negocio real. No mezclar con operaciones reales de colegios; no crear comprobantes SUNAT ni enviar notificaciones a contactos reales. Respaldar el PostgreSQL local antes de generar datos. Limpieza futura será controlada para no borrar dependencias. No ejecutar comandos demo en Tecnoweb.

**Próximos pasos:** comprobar CI final y prueba local; abrir el colegio [PRUEBA ERP] en CRM y continuar desde la cotización en borrador mediante flujo real hasta adopción, compras y almacén. El comando no inventa decisiones pedagógicas ni descuentos de proveedor. Mantener rama `feature/erp-p08-traslados-por-guia`, sin merge/despliegue.

## 11/11/2026 — Pedido de Santillana enviado y recepción parcial de prueba [EN VALIDACIÓN FUNCIONAL]

**Evidencia aportada:** en pantalla `ERP → Pedidos a Editoriales` figura pedido enviado de Santillana para `[PRUEBA ERP] Colegio de demostración 2027`, con **LECTOPOLIS 3**, 10 ejemplares y costo editorial unitario mostrado de S/72.00. En `ERP → Almacén → Recepción de Mercadería` aparece ese pedido con **10 unidades pendientes**; todavía no se ve una recepción validada ni existencias provenientes de esa orden. No afirmar que llegaron físicamente libros reales.

**Siguiente prueba por interfaz, sin crear más datos:** seleccionar pedido marcado [PRUEBA ERP], tipo **Otro documento** con referencia explícita `PRUEBA-REC-001` (no simular una guía oficial), fecha local, **Documento 6 / Físico 6 / Observados 0**, notas «Simulación local, sin entrega física real»; guardar borrador y revisar en Recepciones registradas. **Solo en base local**, confirmar validación: debe quedar **6 ejemplares conformes en Inventario principal** y **4 unidades pendientes** del pedido, con evento y usuario. Repetir después con referencia `PRUEBA-REC-002`, Documento 4 / Físico 4 / Observados 0 para completar, y luego probar un traslado parcial a Tienda. Si se ingresa Documento 10 / Físico 6, se creará incidencia por 4 faltantes frente al documento: no confundir con entrega parcial normal. La prueba genera stock ficticio en la BD local, **no ventas ni documentos electrónicos**, y por ello deben mantenerse etiquetadas estas entradas para no mezclarlas con datos reales. Los tests en `warehouse/tests.py` ya cubren parcialidades, saldos y ausencia de duplicación.

**Correcciones frontend realmente aplicadas:** `src/pages/admin/erp/ERPRecepcionPage.jsx`: elimina las dos frases que exponían «Django» en el formulario y el diálogo de validación, reemplazándolas por explicaciones del proceso; muestra aviso cuando se seleccionan pedidos rotulados `[PRUEBA ERP]`, indicando usar documento interno de prueba, no una guía oficial inexistente, y alertando que validar aumenta inventario de esta BD; adapta la captura de cantidades a tarjetas móvil (<1024px), conserva tabla detallada en escritorio, hace KPI alineados a la izquierda, añade acceso constante «Ver inventario» (o retorno si procede). Sin cambios a la API de Recepción ni al backend. **Por comprobar** GitHub Actions (lint/build), 360/390/768/1440 px, caso completo y saldo exacto en backend. No se ha modificado `main` ni Tecnoweb.

## 11/11/2026 — Almacén: costo unitario y simplificación de módulos [EN VALIDACIÓN]

**Capturas del usuario.** En inventario figura LECTOPOLIS 3 de Santillana: 10 unidades, 0 observadas, valor referencial S/720.00. Traslado registrado de 8 unidades desde Almacén Principal a Almacén Feria, con costo histórico del lote S/72.00 por ejemplar y valor transferido S/576.00. En el origen quedan 2 unidades (S/144.00), suponiendo ausencia de otras operaciones. El total global sigue 10 y S/720.00: trasladar no es vender.

**Fundamento documental revisado.** El MACROPROCESO ALMACEN BOOK EXPRESS.docx, apartados 3.1–3.8, y el MOF ALMACEN.docx, procesos 1–8, contemplan recepción documental y física, almacenamiento, preparación para tienda/feria/consignación, verificación/conteo/empaque, despacho documentado, inventarios, faltantes, daños y archivo. El documento 01_Levantamiento_Funcional_ERP_Book_Express_v2_FINAL1.docx registra que las consignaciones pueden originarse en adopciones, que las muestras tienen problemas de trazabilidad y que los pagos a proveedores se concilian con ventas, facturas, devoluciones, notas de crédito y pagos.

**Hallazgo crítico.** La pantalla Solicitudes internas existe y su aprobación es un cambio de estado, pero NO envía avisos a un destinatario concreto, NO reserva, NO realiza picking ni crea traslado/despacho. Los usuarios que tengan el permiso warehouse.approve_internal_stock_requests pueden aprobar; aún no se ha definido el aprobador de negocio. No fingir que esta acción produce una orden de almacén cerrada. El MOF requiere recibir requerimientos, no necesariamente aprobación genérica de todas las solicitudes. Consolidar más adelante el requerimiento, la preparación y el despacho en el mismo flujo de Movimientos y mantener excepciones bajo aprobación explícita.

**Cambios implementados, sin nuevas pantallas/módulos.** Backend warehouse/api_inventory.py agrega unit_cost_average_reference por producto calculado como valor de las existencias disponibles dividido entre unidades disponibles, con Decimal; si hay lotes sin costo, devuelve nulo. Backend warehouse/api_transfers.py agrega value_reference por lote en ubicación. Test warehouse/tests.py valida costo promedio. Frontend ERPInventarioPage.jsx muestra costo promedio por ejemplar y valor disponible en tabla y móvil; ERPStockPorAlmacenPage.jsx muestra costo histórico por lote y valorización en tabla y móvil. El menú AdminLayout.jsx se simplifica a tres accesos: Recepción, Inventario, Movimientos; se oculta Solicitudes internas del menú hasta integrar flujo completo, sin borrar rutas, tablas o datos.

**Regla contable.** Costo histórico del inventario NO es importe exigible a la editorial. La obligación de pago se define en Administración/Finanzas (CxP) por facturación, venta, acuerdos editoriales, notas de crédito, devoluciones y abonos; no duplicar esa lógica en Almacén.

**Pendiente para cerrar la operación logística.** Preparación (selección y verificación física), guía/constancia de salida, recepción en destino o estado en tránsito, devoluciones feria/consignación, packs por colegio, control de pérdidas y conteos autorizados; documentar responsables/SLAs por modalidad. No afirmar que el ERP Almacén está completo hasta probar esas etapas.

**Pruebas inmediatas.** Actualizar ambas ramas feature/erp-p08-traslados-por-guia y ejecutar tests warehouse.tests warehouse.test_transfers warehouse.test_locations, lint y build. En Inventario verificar 10 unidades y S/720 total más costo promedio S/72 c/u. En Por almacén verificar Principal 2 unidades / S/144 y Feria 8 unidades / S/576. Probar celular 360/390/430 px. Confirmar CI de último commit antes de main/Tecnoweb.

## 11/11/2026 — Diseño acordado para análisis: inventario global, por editorial y colegio, valorización y cierre logístico [PROPUESTA; NO PROGRAMADO]

**Documentos contrastados:** MOF ALMACEN, Macroproceso Almacén (8 procesos) y Levantamiento Funcional ERP v2 (secciones 9 y 10). El MOF exige stock por editorial y cliente, conteos semanales, registro de daños, evidencias de entrega y archivo. El levantamiento agrega packs termosellados, muestras, ferias, consignaciones, devoluciones, valorización e información para conciliar proveedores. Se separa lo indicado en documentos de las propuestas técnicas siguientes.

**Decisión de menú propuesta (sin nuevos módulos independientes):** 1) Recepción (recepción parcial, diferencias, observados, documentos); 2) Inventario (global consolidado, por almacén, por editorial, colegio/adopción, costos unitarios y valor total, conteos y ajustes con aprobación, configuración de ubicaciones); 3) Movimientos (requerimiento/preparación, despacho con evidencia, transferencias entre almacenes, retorno y devolución, cortesías/muestras, packs y trazabilidad, historial). Los informes son vistas/filtros y exportaciones de Inventario, NO un cuarto módulo logístico. El flujo de entrega termina en recepción confirmada del destino; el flujo de devolución a proveedor termina al aceptar la devolución, con conciliación documental separada.

**Regla de stock global:** toda unidad debe estar contabilizada una sola vez; traslado principal→feria no suma ni resta unidades de Book Express. Conciliar global contra suma por ubicaciones/estados, separando disponible, reservado, en tránsito, observado, retorno pendiente y mercadería ajena cuando aplique. La valorización se calcula por lotes con costo histórico, no solo multiplicando por el último costo ni haciendo promedio simple. El costo por unidad de un producto agregado puede mostrarse como promedio ponderado, con alerta de lotes sin costo.

**Reporte por editorial y colegio:** tabla por editorial, libro/código, colegio/adopción vinculada, ubicación, estado, lote/guía, cantidades recibidas, disponibles, reservadas, trasladadas, vendidas (futuro módulo Ventas), por devolver, devueltas, costo histórico c/u y valor disponible. Agrupar por colegio solo si existe vínculo verificable; stock libre/sin colegio se distingue, no se adjudica por inferencia. Consignación/ferias deben identificar operación/destino particular, no mezclar todos los colegios en un único depósito lógico.

**Reglas financieras:** Valor de inventario (unidades físicas × costo histórico) ≠ deuda editorial. Por pagar debe cruzar facturas, abonos, ventas, devoluciones y notas de crédito desde Administración/Finanzas. Diferenciar proyectado para devolver, preparado, enviado y recibido/aceptado por proveedor. Un valor de posible devolución es informativo y solo disminuye deuda cuando existe la conciliación correspondiente.

**Packs:** pack físico tiene identificador/composición por editorial, colegio y adopción; cada libro mantiene su código, costo y trazabilidad; no duplicar stock de componentes al contar packs. Apertura requiere autorización del proveedor según levantamiento y evidencia; manejar pack incompleto para devolución.

**Solicitud interna:** requerimiento sí aparece en MOF, pero no presupone un aprobador genérico. Propuesta: generar preparación desde adopción de consignación/feria o requerimiento excepcional de tienda, aprobar solo excepciones definidas, asignar responsable real, pasar a preparación y despacho dentro de Movimientos. El módulo técnico aislado Solicitudes internas permanece sin promoverse como proceso listo.

**Estado y orden sugerido:** recepción, stock global, ubicaciones y traslado ya tienen implementación parcial/probada; faltan consolidación de reportes por colegio/editorial con exportación, preparaciones/reservas, tránsito/entrega firmada, retornos, devoluciones a editorial, packs/muestras, conteo/ajustes, conciliación con Ventas/Finanzas. Priorizar (1) stock consolidado reconciliado por ubicación y reportes, (2) preparación→despacho→recepción destino, (3) retornos y devoluciones, (4) packs/muestras y conteos. **Todo esto es análisis, no se declara implementado**. Seguir en rama feature/erp-p08-traslados-por-guia; sin merge ni deploy.

## 11/11/2026 — Análisis de distribución identificada, devolución conciliada y descuentos editoriales [PROPUESTA PARA IMPLEMENTACIÓN]

**Fuentes:** Macroproceso de Almacén §§3.4–3.8 y MOF de Almacén (requerimientos, entrega al responsable, guías, conteos e historial); Levantamiento ERP v2 §§7–10 (ferias, consignaciones, packs, devoluciones y conciliación del proveedor). Distinguir prácticas actuales de mejoras propuestas. Pendiente validación operativa por Gerencia/Administración.

**Distribución feria/consignación:** no basta saldo genérico en «Almacén Feria». Cada salida debe enlazarse a una **operación de distribución**: modalidad, colegio/adopción cuando exista, feria (nombre, fechas), destino físico, responsable que recibe, productos/lotes y cantidades, firma/constancia, documentos, estado (preparación, despachado, tránsito, recibido, liquidado/cerrado). Se puede compartir almacén físico entre ferias, pero NO mezclar sub-saldos de operaciones de colegios distintos; exigir un destino/operación inequívoco y guardar trazabilidad por lote sin duplicar el stock global. Preparación puede nacer de Adopción confirmada y modalidad autorizada; evitar solicitud con aprobación redundante cuando ya existe compromiso aprobado. Excepciones requieren permiso específico.

**Devoluciones a editorial:** Personal de Almacén propone unidades de baja rotación/no vendidas, prepara y etiqueta físicamente por editorial/producto/lote/condición; **«posible devolución» NO es devolución realizada**, NO crea crédito ni rebaja inventario inmediatamente. Jefe de Logística valida cantidades/estado, Administración gestiona coordinación; personal de editorial (ej. Santillana) realiza verificación/conteo presencial; registrar cantidad propuesta, contada, aceptada y diferencias + firma/evidencias. Emitir GRE/documento legal correspondiente **antes de iniciar el traslado**, no después, según reglas SUNAT vigentes. Salida física hacia proveedor cambia stock disponible a en tránsito de devolución; confirmación de recepción y aceptación del proveedor cierra salida; si hay rechazo/reingreso, regularizar con movimiento inverso e historial. Nota de crédito/compensación se gestiona en Administración/Finanzas, nunca equiparar «mercadería propuesta para devolución» con deuda cancelada. Diferenciar retorno de feria/consignación a Book Express vs devolución desde Book Express a editorial.

**Descuentos con editoriales:** Código actual CRM `CommercialQuotationItem.supplier_discount_percent` y `supplier_cost`, con escritura autorizada por administrador/supervisor comercial, `PurchaseOrderItem.unit_supplier_cost` y `StockEntry.unit_cost_snapshot`. **Pendiente construir fuente maestra de Condiciones comerciales por editorial/campaña, con vigencia y excepciones colegio/producto**, dentro de **Compras / Pedidos a Editoriales**, no Almacén. Jefe Comercial/Gerencia negocia; Administración/Compras registra sustento (acuerdo, lista de precios, correo, fechas); Gerencia o perfil autorizado aprueba; CRM utiliza condición aprobada automáticamente con snapshot en cotización/adopción/pedido; Administración/Finanzas concilia contra factura proveedor y notas de crédito; Almacén ve productos, cantidades y documentos logísticos, opcionalmente valoración si su permiso lo autoriza. Separar descuento editorial (compra) de descuento colegio (venta) y comisión. Evitar defaults globales quemados (Bruño 40 % puede tener excepciones).

**Menú definitivo en análisis:** Almacén tiene solo 3 accesos: Recepción; Inventario (consolidado por editorial/colegio/almacén, conteos); Movimientos (preparación, despacho, traslado, retorno feria, devolución editorial, packs/muestras, historial). Finanzas/CxP separado; Condiciones comerciales dentro de Compras. No crear módulos principales adicionales ni programar sin acordar primero las transiciones y permisos. **No hay modificaciones funcionales en esta anotación.**

## Reglas de trabajo
- GitHub es fuente de código; el usuario hace pull y prueba en VS Code.
- No editar main ni publicar a producción sin revisión y aprobación.
- Commits y explicaciones en español; evitar nuevos módulos sin análisis de modelos y APIs existentes.
- Django REST Framework + PostgreSQL / React + Vite + Tailwind; arquitectura monolito modular.
- Proteger datos de CRM y permisos; tests específicos por bloque, tests integrales antes del merge.

## 08/11/2026 — Revisión de pantallas de Almacén y fuentes funcionales (P-08.5)

**Evidencia del entorno local:** el usuario registró cuatro ubicaciones (principal, tienda, feria y consignación). En capturas, conciliación inicial presenta 0 lotes pendientes y Inventario/Traslados siguen sin existencias. Alta de ubicaciones ≠ creación de stock. No inventar saldos ni mover mercancía automáticamente.

**Diferenciar conceptos del ERP:**
- **Ubicaciones**: maestro de lugares físicos donde se custodian libros. No registra movimiento de mercancía.
- **Conciliación inicial**: herramienta excepcional para lotes históricos recibidos ANTES de usar ubicaciones y físicamente verificados. Con cero lotes por conciliar, no se ejecuta nada ni genera stock.
- **Recepciones**: cuando una guía real es validada, genera entradas al inventario asociadas al pedido de compra y, si hay principal activo, asigna la ubicación inicial.
- **Inventario**: cantidades globales y existencias por producto, además del nuevo acceso **Stock por almacén** (consulta de saldos por lugar y lotes conformes disponibles, sin escrituras); las cantidades observadas figuran en el resumen, no entre lotes trasladables.
- **Traslados**: operaciones directas confirmadas físicamente que descuentan del origen y suman al destino; saldo total sin cambios. No representan etapas de preparación, despacho, tránsito y entrega futura.
- **Cortesías**: entregas sin costo. Sigue pendiente extender el control a salidas desde almacenes receptores sin romper el saldo por ubicación.
- **Packs**: problema relevante NO implementado. Deben representar una agrupación logística por colegio/adopción con libros componentes y trazabilidad de armado, traslado, apertura/devolución; **no generar inventario duplicado** ni inventar SKU de pack. Separar de inventario de componentes y no publicar 'pack colegio' en catálogo público.

**Fuentes internas aportadas por el usuario, 08/11:** `MOF ALMACEN.docx` y `MACROPROCESO ALMACEN BOOK EXPRESS.docx`. Los repositorios GitHub de backend y frontend son **públicos**: NO subir originales ni copiar datos operativos sensibles a GitHub sin aprobación explícita. Se entregó paquete ZIP para colocarlos en la raíz local `BookExpress/` (carpeta contenedora, fuera de ambos repos). Este apunte es referencia de continuidad, NO reemplaza documentos originales.
- MOF: jefe de Logística (supervisa y autoriza ajustes), asistente de recepción/documentación, coordinador de inventario, personal de almacén.
- Macroproceso: gestión de adopciones, recepción, almacenamiento físico, preparación de pedidos, despacho por tienda/feria/consignación, control de inventario, dañados/faltantes y archivo documental. El manual establece controles documentales y conteo, no únicamente movimientos de stock.
- El MOF define atención de requerimientos internos en temporada alta hasta 48 h, baja hasta 24 h; verificar con gerencia si continúa vigente antes de automatizar alertas.
- Una ubicación genérica de "Feria" o "Consignación" no identifica múltiples ferias/colegios concurrentes; el futuro proceso de despacho debe vincular destino, responsable, campaña/modalidad y documentos concretos. No crear ubicaciones adicionales sin caso físico real.

**Código P-08.5 en rama `feature/erp-p08-traslados-por-guia`:**
- Nueva vista de solo lectura `src/pages/admin/erp/ERPStockPorAlmacenPage.jsx`, ruta `/admin/erp/almacen/stock-por-almacen`, enlazada desde Inventario y Ubicaciones. Reutiliza APIs ya existentes `resumen-ubicaciones/` y `traslados/lotes/`, con selector de almacén, buscador, paginación, cantidades disponibles, observadas y valor referencial. Sin migraciones nuevas.
- Pendiente de comprobación: CI de frontend, pruebas manuales con ingresos reales o datos de prueba aislados, y contraste del saldo antes/después de trasladar sin alterar el global.
- No desplegar ni fusionar a `crm/gestion-colegios` / `main` hasta validar. No mezclar la rama separada de corrección de CRM.

## Actualización 08/11/2026 — P-08.4: separación visual de Almacén y configuración inicial (en revisión)

**Entorno y ramas:** backend y frontend de prueba deben usar `feature/erp-p08-traslados-por-guia`. `crm/gestion-colegios` es la base de integración; `main` queda reservado para producción, sin merges ni despliegue automático. La corrección paralela de colegios en tareas/calendario sigue separada en `fix/crm-colegio-en-todo-calendario` (NO fusionarla implícitamente con P-08).

**Diagnóstico operativo:**
- Las capturas de la instancia local devolvieron `GET /api/admin/erp/almacen/ubicaciones/` con HTTP 200 y 2 bytes, compatible con `[]`, y un historial de traslados sin registros. Es indicio de ubicaciones vacías en esa instancia, **no prueba** de que se hayan perdido datos ni de que Git guarde datos por rama. Confirmar conexión y tablas PostgreSQL antes de actuar.
- Backend existente: solo puede existir un `WarehouseLocation` principal activo. Su identificador se genera en servidor. La recepción validada nueva se asigna al principal activo; lotes anteriores requieren conciliación de ubicación **con comprobación física**. Registrar una ubicación no crea ni mueve inventario.
- Un traslado P-08.3 sigue siendo **directo y confirmado físicamente**: no modela despacho en tránsito, recepción pendiente, consignación completa ni venta. Operación por guía con 1–200 lotes, cantidades por lote, idempotencia y control transaccional. No usar con mercadería aún en camino.
- No crear almacenes ficticios por software. El responsable debe confirmar nombre y uso físico reales de los depósitos de Book Express, registrar al menos el principal y un destino cuando correspondan.

**Decisión UX/UI / mobile-first:**
- Inventario se concentra en **Existencias** y **Entradas**, incluyendo cantidades y valorización. **Traslados** y **Cortesías** tienen pantallas propias; **Ubicaciones** conserva administración y conciliación. No mostrar accesos operativos a Devoluciones/Ajustes hasta implementar sus reglas. No duplicar tablas de stock ni tocar endpoints.
- Navegación ERP → Almacén: Recepción, Inventario, Traslados, Cortesías, Ubicaciones, cada una protegida por los permisos ya utilizados. URLs legadas `inventario?vista=traslados|cortesias|salidas|ubicaciones` redirigen a las rutas nuevas.
- Ubicaciones explica pasos 1 (almacén principal) y 2 (destino real), facilita alta/edición y muestra estado vacío con acción real según permisos. Traslados muestra un estado vacío con navegación real cuando hay menos de 2 ubicaciones activas. En ambos casos, mensajes simples y sin jerga de implementación.
- Cabeceras compactas, distribución de tarjetas adaptable, acciones de al menos 44px, filas/cards móviles, confirmación con scroll vertical y botones cómodos en pantallas pequeñas. Rojo para acciones principales; verde no utilizado como elemento decorativo.
- No rediseñar todo el CRM en esta rama: las mejoras compartidas serán incrementales y verificables.

**Código frontend comprometido en la rama de P-08:**
- Nuevas páginas: `src/pages/admin/erp/ERPTrasladosPage.jsx` y `ERPCortesiasPage.jsx`.
- Rutas: `src/app/router.jsx`; menú: `src/layouts/AdminLayout.jsx`.
- Inventario: `src/pages/admin/erp/ERPInventarioPage.jsx` (consulta y accesos separados).
- Ubicaciones: `src/pages/admin/erp/ERPUbicacionesPage.jsx` y `src/components/admin/WarehouseLocationsPanel.jsx`.
- Traslados: `src/components/admin/InventoryTransfersPanel.jsx` (estado vacío y `onRefresh` opcional).
- Confirmaciones: `src/components/admin/ConfirmActionDialog.jsx` (altura móvil y botones).
- Workflows GitHub Actions backend/frontend habilitados para PR hacia `crm/gestion-colegios`; se corrige el valor inválido de `retention-days` en frontend.

**Pruebas y pendientes de aprobación:**
1. GitHub Actions de frontend (lint, tests, build): última ejecución de P-08.4 verificada satisfactoria tras cambios frontend. Revisar el estado del backend en su ejecución específica.
2. En la computadora del usuario: `git status`, `git fetch origin`, `git switch feature/erp-p08-traslados-por-guia`, `git pull --ff-only` por **cada repositorio**, sin perder cambios locales.
3. `npm run lint`, `npm run build`; `python manage.py check`, `python manage.py makemigrations --check --dry-run`, `python manage.py migrate`, `python manage.py test warehouse purchasing`.
4. Verificar ubicaciones reales (no crear datos ficticios): registrar principal, registrar destino cuando exista; inspeccionar conciliación según permisos; comprobar que la creación no aumenta el stock.
5. Realizar traslado por guía con cantidades parciales y completas cuando exista stock real conciliado; comprobar origen −N, destino +N, global constante, no doble movimiento; probar recarga, mensajes, historial y roles.
6. Pruebas visuales a 360/390/430/768/1024/1440 px, teclado abierto, tablas, menús, diálogos; completar revisión manual responsive y accesibilidad.
7. Pendiente funcional: búsqueda de guías con más de 25 resultados paginados (la selección *de una guía hallada* carga sus lotes completos, pero el descubrimiento se hace por página). Definir búsqueda directa del documento si resulta necesario, antes de cerrar.
8. No fusionar a `crm/gestion-colegios` ni a `main`; no desplegar Tecnoweb sin autorización explícita y respaldo de datos.

## Backend
Repositorio: HiroitoS/PAGINA-WEB-BOOK-EXPRESS; rama de trabajo crm/gestion-colegios.
- Aplicación purchasing inicializada; migración 0001_initial generada y aplicada por el usuario a su entorno local.
- PurchaseOrder, PurchaseOrderItem y PurchaseOrderEvent; snapshots de productos y costos.
- Pedidos desde adopción por editorial, sin duplicar; servicio idempotente transaccional.
- API /api/admin/erp/compras/pedidos/ con listado, filtros, detalle, generar desde adopción, cambiar cantidad, aprobar y registrar envío.
- P-04: 36 pruebas de purchasing correctas según captura del usuario tras corrección de tests; batería backend general 328 OK antes de los últimos cambios de P-04.
- Pendiente: revisión exhaustiva de controles de transición/permisos y prueba de extremo a extremo tras frontend.

## Frontend — P-05
Repositorio: HiroitoS/PAGINA-WEB-BOOK-EXPRESS-FRONTEND; rama de trabajo crm/gestion-colegios.
Cambios publicados: src/api/purchasingApi.js; src/pages/admin/erp/ERPPedidosPage.jsx; rutas en src/app/router.jsx y acceso ERP en src/layouts/AdminLayout.jsx.
Funcionalidad: listado, filtros, detalle, generación desde adopción, edición de cantidades en borrador, aprobación y registro de envío. TODAVÍA SIN VALIDAR BUILD/LINT NI UX.
Importante: GitHub compara main y crm/gestion-colegios como DIVERGIDAS (rama ERP 4 commits ahead / 8 commits behind, al 23/10/2026). NO hacer pull a main ni merge automático a producción. Reconciliar antes de prueba local en rama frontend.
UX pendiente: reemplazar entrada manual de ID de adopción por selector de adopciones confirmadas; evaluar endpoint real. Verificar permisos y presentación de menú ERP. Paginar listado; corregir posibles limitaciones de filtros.
No usar datos ficticios ni botones sin soporte backend.

## Flujo comercial confirmado
Adopción confirmada por colegio → pedido independiente por editorial → aprobación/envío → recepción parcial → inventario → packs → ventas, comprobantes electrónicos, caja.
Santillana suele remitir cerca de 80% de lo pedido: 100 solicitadas, 80 recibidas, 20 pendientes. La reposición reclama el saldo del pedido original; automatización de correo Tecnoweb/Outlook pospuesta.
No se debe modificar una adopción confirmada ni contabilizar unidades no recibidas como stock.
Precios 2027 se actualizarán más adelante desde listas del proveedor; no alterar documentos históricos.

## Próximos pasos
1. Reconciliar ramas frontend mediante comparación revisión controlada, sin main ni pérdida de commits.
2. Corregir/validar P-05, pruebas frontend lint/build e integración manual.
3. Completar UX de selección de adopción (no IDs), filtros y paginación.
4. Implementar P-06 recepciones parciales de compras y luego Almacén/Inventario, Packs, Ventas/Facturación.

## Actualización 23/10/2026 — P-05 UX
- Código React publicado en rama crm/gestion-colegios: dos pestañas, "Adopciones confirmadas" y "Pedidos generados"; filtros visibles con nombres (editorial, campaña, colegio) y estado de pedido.
- El servidor continúa siendo autoridad sobre permisos y estados. Pendiente de validación local: npm run lint, npm run build y prueba manual de selección/generación/edición.
- Limitación técnica aún pendiente: la lista de pedidos está paginada por DRF; los filtros de nombres actuales operan sobre la página cargada. Para escalar, construir filtros de búsqueda en backend con paginación real antes de desplegar a producción.
- No integrar a main ni desplegar hasta validar y resolver limitaciones.

## P-05 — corrección y criterio operativo de almacén (23/10/2026)
- Corregido JSX en ERPPedidosPage: cierre del contenedor condicional de la pestaña "Pedidos generados" (antes generaba error ESLint de JSX adyacente). Commit `996a33a`.
- Añadido resumen compacto al desplegable por editorial: número de colegios/adopciones, unidades de la adopción y pendientes de generar pedido.
- Al generar un pedido se selecciona el de la editorial elegida, incluso si la adopción contiene varios proveedores; la pestaña cambia solo si la operación tuvo éxito. Se refresca la agrupación después de operaciones.
- Flujo de almacén confirmado: antiguo Excel de adopciones de varios colegios/editoriales → agrupación editorial → pedidos por colegio conservando precio/costo/condiciones particulares. Resumen por editorial NO equivale todavía a un archivo Excel consolidado ni a una orden única: exportación detallada pendiente.
- Validación pendiente en laptop del usuario: git pull, npm run lint, npm run build y prueba de pestañas, acordeones, totales y selección de pedido. No desplegar a producción hasta pasar validaciones.

## P-05 / Compras: depuración y orden de compra formal — 23/10/2026
- Se corrigió el error de ESLint en la pestaña Pedidos generados: se añadieron las variables derivadas opcionesEditoriales, opcionesCampanias y pedidosVisibles, y se evita enviar al backend filtros de nombre que todavía no admite como IDs. Frontend commit 89655d5.
- Pedidos aprobados pueden exportar PDF por colegio/editorial, con RUC y razón social Book Express, referencia BE-OC-NNNNNN, campaña, ítems con código, cantidades, costo editorial e importe total; los borradores no se exportan como orden final.
- El PDF sale del backend Django desde snapshots persistidos, no desde cálculos de React. Descarga requiere permiso de lectura y registra evento document_exported, sin cambiar estado. No se envía correo automáticamente.
- Nueva dependencia backend reportlab==5.0.1 en requirements.txt. Ejecutar pip install -r requirements.txt después del pull. Se añadieron 3 pruebas del endpoint PDF a purchasing/test_api.py.
- Pendiente de confirmar en entorno local: python manage.py check, python manage.py test purchasing, npm run lint, npm run build, prueba manual PDF aprobado. No pasar a main ni Tecnoweb antes de validar.
- Limitación: exportación actual es una orden individual por colegio/editorial; consolidado informativo/Excel por editorial y varios colegios sigue pendiente, respetando costos particulares.

## Revisión funcional de Compras — 23/10/2026
- Decisión: módulo Pedidos a Editoriales comprende preparar orden desde adopción vigente confirmada, validar cantidades y costo de editorial almacenado, aprobar, generar PDF y registrar envío MANUAL de la orden (no la entrega física). No registra stock ni recepción parcial.
- Recepciones parciales/totales y diferencias de despacho son responsabilidad del futuro módulo Recepción de Mercadería, vinculadas al pedido y sus líneas; posteriormente afectan Almacén.
- PDF de orden actualizado a A4 horizontal compacto, cabecera institucional, número BE-OC, productos/cantidades/costos, totales, nota de no documento tributario. Intenta incluir logo original de src/assets/brand/logo-book-express-negro-recortado.png del frontend hermano en instalación local; para producción configurar BOOK_EXPRESS_LOGO_PATH o copiar mismo archivo a backend/assets/brand. No dibujar marca falsa.
- Corregido el desajuste entre acción "Generar pedido" para una editorial y el servicio que anteriormente podía crear pedidos de todas las editoriales de la adopción: petición recibe provider_id opcional y, si se indica, crea únicamente la editorial elegida. La opción sin provider_id conserva compatibilidad anterior. Pruebas nuevas de solo editorial e ID ajeno.
- En React, se elimina columna vacía "Acción" e inputs deshabilitados de pedidos aprobados: solo borradores editables muestran Guardar. Se aclara "Marcar orden enviada" y constancia de correo (NO mercadería). Filtros de estados se limitan a Borrador/Aprobado/Enviado mientras recepción no esté implementada.
- Pendiente: ejecutar python manage.py test purchasing (incluye comprobación de PDF horizontal), python manage.py check, npm run lint y npm run build; inspección visual del logo y PDF con varias líneas. Nada de producción hasta validar.
- Pendiente a nivel arquitectura: consolidado exportable por editorial que reúna cantidades de múltiples colegios sin perder los pedidos individuales ni sus condiciones especiales; filtros/paginación server-side para escala; gestión del logo en backend desplegado.

## Acuerdo arquitectónico — Compras, Recepción, Almacén, Ventas y Finanzas (23/10/2026)
- La navegación ERP agrupará por área de trabajo, no por aplicaciones Django gigantes: Compras/Pedidos; Almacén/Recepción de mercadería; Almacén/Inventario y packs; Ventas/Salidas, devoluciones y comprobantes; Finanzas/Liquidación y pagos a editoriales; Comercial/Comisiones y rentabilidad.
- Pedidos a Editoriales conserva un pedido por colegio/editorial/campaña desde adopción vigente confirmada. Almacén puede operar preparación de pedidos mediante permisos; aprobación económica queda bajo rol autorizado. Recepción física se registra aparte, ligada a líneas del pedido. No duplicar entrada en inventario.
- Caso Santillana: 100 solicitados, 80 recibidos, 20 aún por entregar. El saldo de entrega no es devolución ni corresponde liquidarlo como venta.
- Caso de liquidación futura: 100 efectivamente recibidos, 90 vendidos, 10 devueltos y aceptados. Solo bajo condiciones contractuales de liquidación por venta/devolución se liquida costo por 90; en compras firmes/invoicing se aplica factura y nota de crédito, no regla universal. Dejar trazabilidad por editorial, colegio, producto, campaña, guía, venta y devolución.
- La rentabilidad/participaciones del colegio deben basarse en ventas y costos documentados, descuentos, comisiones y gastos aplicables, sin recalcular histórico ni anticipar liquidaciones. Pendiente de levantamiento/validación según convenio real por editorial.
- Defecto reparado backend: test de orientación PDF tenía doble escape en regex de MediaBox, arrojaba re.PatternError. Corregido en commit 9887cf3. No afecta base de datos ni requiere migración. Validación Python/Django local pendiente.
- Pendiente: prueba backend de 41 tests, revisión documento PDF horizontal/logo y consolidado Excel por editorial. No crear recepción/stock ni facturación en módulo de Pedidos.

## P-05 – 23/10/2026: revisión de pedidos, cantidades, filtros y documentos
- Validación del usuario: 41 pruebas backend de compras OK y frontend lint/build OK sobre versión anterior.
- Pregunta de duplicados: restricción de datos exige UNA orden por pareja (adopción, editorial), pero puede haber varias adopciones de un colegio en la misma campaña. No asumir que son legítimas ni borrar pedidos: ahora se muestra identificador/versión de adopción y advertencia de revisar coincidencias.
- Se separan claramente dos estados: adopción confirmada (CRM) y orden aprobada para envío (ERP). Estado "Enviado a editorial" solo se registra al confirmar envío manual con evidencia; descargar el PDF NO lo marca como enviado. Al registrar envío, el filtro pasa a enviados.
- Mejora guardado de borradores: múltiples cantidades se guardan con una sola acción "Guardar cambios". Endpoint POST /cambiar-cantidades/ valida duplicados y pertenencia de líneas; operación atómica y auditada. Se impide aprobar con cambios pendientes. Conserva endpoint individual por compatibilidad.
- Se generan dos documentos PDF a partir de los mismos datos: SOLICITUD DE LIBROS BE-SL (sin precios para remitir editorial) y ORDEN VALORIZADA BE-OC (uso interno, únicamente con permiso de aprobación en endpoint). La solicitud sin precios no elimina costos históricos internos. Contrato con cada editorial determina cuándo se usa orden valorizada formal.
- Confirmación comercial del usuario: todas las editoriales con las que trabaja aceptan devolución del material no vendido. El ERP futuro debe registrar devolución, aceptación, conciliación y liquidación contractual; no asumir automáticamente que factura/deuda = unidades vendidas antes de validar convenio y documentos tributarios por editorial.
- No se implementó recepción física, movimientos de almacén, stock, factura, cobro, liquidación ni comisión aquí. En Compras se conserva trazabilidad por adopción/editorial/colegio/campaña.
- Validación pendiente de ESTA iteración: backend python manage.py check, python manage.py test purchasing; frontend npm run lint y npm run build; pruebas manuales guardar 2 cantidades → aprobar → exportar PDF sin precios → marcar envío → buscar en enviados; y caso posibles adopciones repetidas.
- Siguientes: paginación/filtros reales en backend, consolidado de cantidades por editorial (sin mezclar costos de colegios), Recepción de Mercadería vinculada con líneas del pedido.

## P-05 – 23/10/2026: semáforos y correo preparado para revisión
- Se agregan semáforos basados en datos reales. Rojo: adopción sin pedido generado (o pedido anulado); amarillo: pedido borrador/aprobado todavía NO registrado como enviado; verde: pedido registrado como enviado a editorial y estados posteriores de recepción. El rojo NO significa prohibición definitiva de pedir, sino falta de pedido generado.
- Se visualizan tanto en las adopciones confirmadas como en los pedidos generados, y los grupos por editorial resumen cantidades de cada situación. Se mantienen etiquetas legibles además del color.
- Para pedidos aprobados y usuario con permiso de envío, aparece "Preparar correo para Outlook": genera asunto y cuerpo basados en editorial, colegio, campaña, número BE-SL y unidades de la orden. Se revisan en pantalla y se abre la aplicación predeterminada mediante mailto. No accede a Outlook, no crea borrador persistente, no envía correos, NO adjunta PDF automáticamente y NO marca la orden como enviada.
- El operador debe descargar y adjuntar BE-SL manualmente, revisar destinatario y enviar desde su correo; luego registra constancia de envío en ERP. Como alternativa a mailto se añadió un botón «Copiar correo» para pegar asunto y cuerpo en Outlook web. Si Outlook web no está registrado como manejador mailto, el botón puede abrir otra aplicación de correo; futura integración real opcional Microsoft Graph con OAuth y permisos delegados.
- Validación pendiente: npm run lint y npm run build, revisión visual de semáforos de las tres situaciones, apertura de correo y advertencia de adjuntar archivo. Sin cambios backend, sin migraciones. No mezclar con P-06 de Recepción/Almacén.

## P-05 cierre visual y transición P-06 – 23/10/2026
- Aprobada preliminarmente por usuario la preparación de correo y los indicadores; pendiente prueba de correo con su propia cuenta. Outlook en Windows se abrió, pero mostró error de configuración/autenticación de cuenta: no atribuirlo al ERP. Se deja intacto mailto y la opción «Copiar correo», que funciona con cualquier cliente web elegido por el usuario. No guardar datos personales de correo en la app.
- Se ampliaron semáforos como etiquetas con fondo de contraste, punto de 12 px y texto de 14 px. Se elimina la etiqueta repetida «Enviado a editorial» en el detalle cuando corresponde a estado SENT. Mantener etiqueta textual para accesibilidad; verde = envío registrado, amarillo = aún no registrado, rojo = no generado/anulado.
- Revisión read-only del backend: purchasing/models.py conserva PurchaseOrder, PurchaseOrderItem y PurchaseOrderEvent; la cantidad solicitada NO acredita recepción física ni constituye stock. order_management.py valida cambios, aprobación y constancia de envío; no registra recepción.
- P-06 Recepción: diseñar capa warehouse/receiving modular y separada de Compras; cada movimiento debe vincularse a una línea de pedido y documento real del proveedor. Permitir recepción parcial, múltiples entregas, diferencias, entregas que cubran más de un pedido, controles de doble registro, auditoría, autorización y saldos calculados. Solo las cantidades aceptadas tras validación pueden crear movimientos de stock, exactamente una vez; mercadería observada queda separada. No deducir deudas ni utilidad directamente de los pedidos o de la mera recepción. Revisar reglas de packs/stock/consignación antes de implementarlas.
- Pendiente para siguiente sesión: validar lint/build del cambio visual, confirmar flujo de semáforos, revisar dependencias de almacén existentes, definir recepción documental y autorizaciones antes de escribir migraciones. Sin cambios en main ni en producción.

## P-05 – 23/10/2026: corrección de codificación mailto para Outlook
- **Incidencia comprobada por captura de usuario:** al pulsar «Abrir en mi aplicación de correo», Outlook mostraba `+` literalmente en espacios de asunto y cuerpo; la aplicación sí lograba abrir el borrador, pero el contenido estaba mal codificado.
- **Causa técnica:** `new URLSearchParams({ subject, body }).toString()` codifica espacios como `+` (application/x-www-form-urlencoded); el manejador `mailto:` de Outlook no los transformaba en espacios.
- **Corrección:** generar `mailto:?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(mensaje.replace(/\\n/g, "\\r\\n"))}`; `encodeURIComponent` usa `%20` para espacios y los saltos de línea se normalizan a CRLF para clientes de correo. Se mantiene «Copiar correo» como alternativa.
- **Alcance:** solo frontend, sin migraciones ni modificaciones de backend/credenciales. No envía ni adjunta PDF automáticamente.
- **Validación pendiente con usuario:** `git pull --ff-only origin crm/gestion-colegios`, `npm run lint`, `npm run build`; pulsar «Abrir en mi aplicación de correo» desde un pedido aprobado y verificar asunto sin signos `+`, líneas y tildes correctas. Confirmar manualmente destinatario y adjunto antes de enviar.

## P-05 – 23/10/2026: texto institucional de correo de pedidos
- Validación del usuario: el enlace `mailto` corregido abre Outlook con espacios y tildes correctamente.
- Mejora del contenido automático: saludo neutro, solicitud formal de libros y materiales educativos, datos de editorial/colegio/campaña/unidades y código de solicitud, confirmación de recepción, disponibilidad y fecha de despacho, incluyendo tratamiento de entregas parciales.
- Retirada del **cuerpo de correo** la instrucción técnica `[Adjuntar el archivo ... antes de enviar]`; el recordatorio operativo para que el usuario agregue PDF y destinatario se mantiene solo en la interfaz del ERP. Sin integración de envío automático.
- Confirmación pendiente: pull del frontend y revisión manual de un borrador con Outlook. No hay cambios de backend ni migraciones. Próximo trabajo P-06 Recepción de Mercadería.

## P-06 – 24/10/2026: revisión del levantamiento, separación Pedidos/Recepción e inicio backend
- Se leyó el archivo de proyecto `01_Levantamiento_Funcional_ERP_Book_Express_v2_FINAL1.docx`. Los apartados de recepción 9.1–9.4 están planteados como cuestionarios y en la copia examinada 9.1 no tiene respuestas; validar procedimientos con evidencia y no atribuir reglas inventadas al AS-IS.
- Se revisó código actual de backend purchasing (modelos, creación, gestión, vistas y tests) y frontend ERP (pantalla y navegación), así como la bitácora. P-05 cuenta con pruebas anteriores 45/45 y verificación visual de PDFs/correos, pero la integración final entre módulos permanece pendiente. Riesgos conocidos: listado de adopciones por editorial limitado a 200 y validación de documentos/roles de almacén aún por cerrar.
- En interfaz se cambió únicamente el rótulo «ERP · Compras» a «ERP · Pedidos»; mantener la ruta estable `/admin/erp/compras/pedidos`, API `/api/admin/erp/compras/` y app interna `purchasing` para no romper compatibilidad.
- Inicio de backend P-06 en repositorio backend rama `crm/gestion-colegios`: app `warehouse`, modelos de cabecera/líneas/eventos, migración 0001, API `/api/admin/erp/almacen/recepciones/`, servicio transaccional de borrador/validación/saldos y pruebas. Pedidos no cambian cantidades solicitadas; saldos se calculan de unidades aceptadas en recepciones validadas. Soporta 100 solicitados, 80 aceptados, 20 pendientes; soporta misma guía con pedidos distintos de la misma editorial, bloqueo de guías repetidas y auditoría. Nunca crea stock ni deudas.
- Permisos nuevos `warehouse.view_receiving`, `manage_receiving`, `validate_receiving` sin asignación automática a roles; roles MOF por validar.
- **Sin validar aún en entorno local:** `python manage.py check`, `python manage.py makemigrations --check --dry-run`, `python manage.py test warehouse purchasing`, migración local y pruebas con base PostgreSQL. NO desplegar en producción.
- **Próximo:** validar backend, corregir eventuales incidencias, implementar interfaz React P-06 y luego validar flujo operativo hasta recepción parcial/completa, estado del pedido y auditoría. Pendientes P06 quedan detallados en `docs/p06-recepcion-mercaderia.md` del backend.

## P-06 – 24/10/2026: pantalla operativa de recepción y relación con facturas
- El usuario confirmó `python manage.py check` OK, `makemigrations --check --dry-run` sin diferencias, y **55 pruebas de warehouse+purchasing correctas** para la base inicial del backend. Tras esta validación se añadieron endpoints y pruebas nuevas, por lo que esos cambios recientes requieren volver a ejecutar pruebas.
- Se publicó pantalla `src/pages/admin/erp/ERPRecepcionPage.jsx` y API `src/api/warehouseApi.js`: lista pedidos enviados con saldo por editorial/colegio/campaña, permite seleccionar varios pedidos de una editorial para una misma guía, capturar cantidad llegada y observada, obtener cantidad aceptada, registrar un borrador, revisarlo, corregirlo y validarlo.
- Menú ERP separa «Pedidos a Editoriales» y «Almacén · Recepción» con permisos específicos; ruta `/admin/erp/almacen/recepciones`. `src/utils/adminAccess.js` permite acceso a usuarios autorizados solo para recepción.
- Los pedidos parcialmente/totalmente recepcionados continúan visibles en filtros de P-05. No se crea stock, liquidación ni factura al validar la recepción; quedan para otros dominios.
- **Facturas:** cuando se reciba una factura con la mercadería se puede citar como documento físico de recepción, pero su registro tributario/financiero (comprobante, impuestos, vencimiento, notas de crédito, conciliación y pago) es responsabilidad de un submódulo posterior de Finanzas. No inferir obligación financiera del mero pedido o entrega.
- **Pruebas pendientes antes de cerrar P-06:** backend `python manage.py check`, `python manage.py makemigrations --check --dry-run`, `python manage.py test warehouse purchasing`; frontend `npm run lint` y `npm run build`, flujo manual con 100 pedidos → 80 aceptados/20 pendientes → segunda entrega 20 → 0 pendientes; edición de borrador, documento duplicado y permisos. No desplegar a producción.

## P-06 – 24/10/2026: validación visual e identidad de guías
- El usuario probó P-06 en local y mostró dos recepciones validadas con el mismo número visible `T001-25200`, una de **Bruño** y otra de **Santillana**. NO son duplicadas según la regla `editorial + tipo + serie/número`; una prohibición global dañaría el negocio.
- Corregimos backend: índice case-insensitive por editorial/tipo/guía, normalización de números, validación amistosa, protección ante concurrencia e inspección preventiva de conflictos históricos antes de migrar; ninguna recepción se borra automáticamente. Migración nueva `warehouse.0002_guia_unique_ci` y pruebas.
- Corregimos frontend `ERPRecepcionPage.jsx`: modal de confirmación propio de Book Express en vez de `window.confirm`, protege cambios de borrador sin guardar, visualiza cantidades llegadas/aceptadas/observadas. Las recepciones validadas se muestran en amarillo cuando subsisten pedidos asociados sin completar y verde claro cuando todos se completaron; los borradores en gris.
- Menú ERP reorganizado con submenú desplegable **Almacén**, cuyo primer módulo es **Recepción de mercadería**; preparados los futuros Inventario, Salidas, Devoluciones sin botones falsos.
- **Prueba local pendiente**: ejecutar migración backend y pruebas de `warehouse purchasing`; `npm run lint` y `npm run build` en frontend; probar ambas editoriales con igual número de guía (permitido), mismas editoriales con distintas mayúsculas (denegado), 80/100 → 20/100, y confirmar que el semáforo represente el saldo real. No desplegar ni mezclar a `main` sin estas pruebas.

## P-06 – 24/10/2026: cuadro de cantidades y trazabilidad solicitados por gerencia
- Basado en `requerimientos 24-10-2026.docx`: se amplía a 2/3 el panel de registro de entrega, con filtros editorial/colegio apilados en el tercio izquierdo.
- API `warehouse/api_views.py`, `pedidos-pendientes`: se añade `resumen` por pedido (solicitadas, aceptadas acumuladas de recepciones VALIDADAS y pendientes), calculado con todas las líneas del pedido; los `productos` siguen limitados a los que tienen saldo para no romper el formulario ni crear entradas duplicadas.
- En registro de entrega se muestran los tres totales del pedido y, por producto pendiente, solicitadas, aceptadas anteriormente, saldo previo, llegaron hoy, observadas, aceptadas hoy y saldo previsto tras validar. Los campos de recepción actual siguen sin generar stock y la validación real continúa en backend.
- API `GoodsReceiptSerializer`: expone `created_by_name`, `validated_by_name` y `events` (acción, usuario, fecha, nota) a usuarios autorizados, sin nuevas tablas. React muestra historial plegable y diferencia «Recepción validada» del estado dinámico «Pedido completo / saldo pendiente».
- Se añadieron pruebas backend para cronología/responsables y para resumen 100 solicitadas, 80 aceptadas y 20 pendientes; aún deben ejecutarse en Windows del usuario tras `git pull`. Backend y frontend se editaron solo en `crm/gestion-colegios`, nunca `main`; no hubo despliegue ni migraciones.
- **Pendiente de aceptación**: `python manage.py check`, `python manage.py makemigrations --check --dry-run`, `python manage.py test warehouse purchasing`; `npm run lint`, `npm run build`; pruebas visuales de recibo parcial, segundo envío que completa saldo, observadas, una guía para varios colegios y trazabilidad visible.
- Historial de aprobación/validación de adopción debe consultarse a través del CRM, sin duplicarlo en almacén; verificar en el modelo CRM qué auditoría ya existe antes de implementarlo.

## P-06 – 24/10/2026: entrega parcial, trazabilidad por guía y excedentes
- Solicitud de gerencia: mostrar en Recepciones registradas el estado acumulado de los pedidos asociados y **qué recibió cada guía**, sin regresar a «Pedidos pendientes» para conocer saldos.
- Nuevo endpoint protegido `GET /api/admin/erp/almacen/recepciones/{id}/seguimiento/`: para cada pedido de la recepción devuelve colegio, referencia, solicitadas, aceptadas acumuladas, pendientes actuales, productos (incluida cantidad aceptada/observada en la guía seleccionada) y secuencia cronológica de guías validadas, con llegada/aceptación/observación por guía. La cronología se calcula de recepciones validadas, no de filas cargadas parcialmente ni de stock. Admite una guía para dos o más pedidos de la misma editorial sin fusionar sus saldos.
- React: bloque «Saldos y entregas por pedido» en Recepciones registradas, junto a resumen de cantidades de la guía, detalle de esa guía desplegable, historial de las guías desplegable por pedido e historial de auditoría del documento; elimina duplicación visual inicial. Las consultas son de solo lectura, se cancelan lógicamente al cambiar de guía y mantienen permisos.
- Los semáforos de recepciones se aclaran: una guía **validada** es un hecho histórico inmutable, mientras el **pedido completo hoy / pendiente hoy** se calcula dinámicamente y puede evolucionar cuando llegan otras guías. No etiquetar retrospectivamente una guía parcial como entrega completa.
- **Excedente físico**: si llegan más unidades de las pendientes, las adicionales pueden documentarse como observadas, pero NO se aceptan por encima de lo solicitado, ni se convierten en stock, compra, deuda o venta. La validación exige explicación de exceso en notas de cabecera o línea. Rechaza aceptación mayor al pendiente y no cambia estado si falla. El flujo posterior de rechazo, devolución física o ampliación autorizada del pedido queda por diseñar en su dominio correspondiente.
- Pruebas Django agregadas: dos entregas 80+20, cronología y saldo de la primera guía tras cerrar el pedido, excedente 110 llegado/100 aceptado/10 observado con motivo, bloqueo sin motivo, guía con varios pedidos/colegios, denegación por falta de permisos.
- **Outlook**: `mailto:` abre el mensaje con asunto/cuerpo, pero no permite incluir un archivo adjunto de forma estándar. Mantener preparación manual + descarga PDF. Revisión humana con adjunto automático requiere integración posterior Microsoft Graph/OAuth u otro proveedor autorizado, con validación de destinatarios y trazabilidad.
- **No ejecutado desde esta sesión:** pytest/Django tests y lint/build del repositorio local. Antes de cerrar P-06, ejecutar `python manage.py check`, `python manage.py makemigrations --check --dry-run`, `python manage.py test warehouse purchasing`, `npm run lint` y `npm run build`, además de aceptación funcional visual. Sin modificaciones de `main`, sin nuevas migraciones ni despliegue de producción.

## P-07 / 27-10-2026 — Inventario y cortesías; validación en curso

**Fuente de verdad del código:** backend `HiroitoS/PAGINA-WEB-BOOK-EXPRESS` y frontend `HiroitoS/PAGINA-WEB-BOOK-EXPRESS-FRONTEND`, rama `crm/gestion-colegios`. No tocar `main` ni desplegar Tecnoweb sin pruebas y aprobación.

- Las recepciones validadas registran entradas de stock automáticamente, una entrada por línea de guía y sin doble contabilización. Los adicionales conformes **sí** se conservan y se incluyen en existencia física y valorización referencial, pero **no se presentan como deuda a la editorial**. Esta es la regla operativa vigente: reemplaza el criterio preliminar del apartado histórico P-06 del 24/10 que decía que los excedentes no entraban a stock.
- Se mantiene control separado de faltantes respecto de guía, observados/no conformes y entregas parciales; los libros no conformes no están disponibles para venta. El tratamiento de reposición y devolución requiere módulo posterior.
- Inventario permite consultar existencias, entradas históricas, costos unitarios de referencia y adicionales. Un ingreso histórico no debe reescribirse por una salida.
- Iniciada **P-07.3: cortesías a directivos**: `StockMovement`, migración `warehouse.0008_stock_movement`, servicio transaccional `warehouse/stock_movements.py`, endpoints de entradas disponibles, cortesías y salidas en `warehouse/api_inventory.py`, y panel React `InventoryCourtesyPanel.jsx`. La salida se vincula a una entrada de mercadería de **ese mismo colegio**; no se permite stock negativo; requiere permiso `warehouse.manage_stock_courtesies`; usa clave de idempotencia y costo histórico. Las operaciones de recepción y cortesía son distintas, no se crea otra entrada física al facturar.
- API de Inventario separada de `warehouse/api_views.py` para reducir acoplamiento y preservar rutas existentes; no atribuir por ello que el módulo completo de Almacén esté terminado.
- En el frontend, pestañas `Existencias`, `Entradas` y `Cortesías`; búsqueda paginada de lotes disponibles por libro/colegio/guía y confirmación propia React. Falta aceptación visual y funcional de esta parte.
- **Incidencia detectada por el usuario el 27/10:** `python manage.py test warehouse purchasing` encontró **84 pruebas, 1 error**: `test_solo_entradas_del_colegio_con_saldo_y_busqueda_paginada` fallaba con `KeyError: 'school_id'`. Causa: el payload de `InventoryEntryViewSet._item` exponía `school` pero omitía `school_id` requerido por la prueba y la pantalla de cortesías. **Corrección publicada en backend:** `warehouse/api_inventory.py`, commit `dcbcc3f7844aae3a035bfbf213f8937603d1cbc6`, agregando `"school_id": order_item.order.school_id`. Sin migración y sin relajar la prueba. **PENDIENTE:** nueva ejecución local para confirmar 84/84 verdes; no afirmar pruebas OK sin resultado del usuario.
- Comandos backend, en Git Bash: `git pull --ff-only origin crm/gestion-colegios`, `python manage.py check`, `python manage.py makemigrations --check --dry-run`, `python manage.py test warehouse purchasing`. Migrar `warehouse` solo si hay migraciones sin aplicar y tras revisar y respaldar base local.
- Comandos frontend en su repositorio: `git pull --ff-only origin crm/gestion-colegios`, `npm run lint`, `npm run build`. Verificar permisos, cortesía con 1 unidad, consulta de saldo, historial, reintento, colegio ajeno y regreso a Inventario.

### Contraste con levantamiento funcional ERP v2 (documento de proyecto)

- El documento **AS-IS** recoge deficiencias de registros en Excel/Negosy, recepción por guía, conciliación factura-guía-físico y ausencia de control de regalos/muestras (secciones **9.1**, **9.2**); cortesías y stock trazable responden a esos problemas.
- **10.2** y **Gerencia** requieren conciliación de facturas, notas de crédito, deuda real, pagos y alertas de diferencias: solo está planteado el diseño de **P-08 Conciliación de facturas** en `docs/erp/P08_conciliacion_facturas_editoriales.md`. **NO implementado**. Almacén valida cantidad física, Administración controla factura y Cuentas por Pagar; vincular documentos sin registrar entradas dos veces.
- Pendientes del levantamiento: inventario semanal, ubicaciones, traslados feria/consignación, controles de packs, muestras, souvenirs, ajustes con aprobación, incidencias y liquidación proveedor. No marcar como resueltos.
- El documento es levantamiento/entrevista AS-IS: sus prácticas reflejan funcionamiento actual, no siempre especificación final. Cuando cambie una regla (ej.: excedentes conformes), anotar decisión posterior expresamente sin borrar su evidencia histórica.

## Incidencia P-07.3 / 27-10-2026 — Tabla de movimientos ausente en base local

- El usuario ejecutó correctamente **84 pruebas** de `warehouse purchasing`, `python manage.py check` y `makemigrations --check --dry-run`. Sin embargo, el Inventario local devolvió HTTP 500 con `django.db.utils.ProgrammingError: no existe la relación «warehouse_stockmovement»`.
- Diagnóstico confirmado al revisar `warehouse/migrations/0008_stock_movement.py`: la tabla es creada por la migración **0008**, pero no consta aplicada en la base local habitual. **Los tests usan una base de prueba diferente; el dry-run no verifica migraciones aplicadas.**
- Acción pendiente del usuario, únicamente en entorno de desarrollo: `python manage.py showmigrations warehouse`, `python manage.py migrate warehouse --plan`, revisar operaciones, `python manage.py migrate warehouse`, volver a consultar. No usar `--fake`, borrar tablas ni duplicar recepciones. No afirmar completado hasta que el usuario confirme `[X] 0008_stock_movement` y la carga de inventario.
- GitHub frontend commit `a1c7631cf106b399fb70012e58e074d3551ca0f4`: evitar **falsos ceros** o mensajes «no hay ingresos» cuando falla el API. Los indicadores mostrarán «—» y la consulta como no disponible, sin presentar el error como stock agotado.
- Control recomendado para futuras entregas: desplegar migraciones antes de activar endpoints que consulten modelos nuevos; comprobar `python manage.py migrate --check` tras aplicar, respaldar la base y separar pruebas de modelo, migración y aceptación en base real.

## P-07.4 / 27-10-2026 — UX de salidas y cortesías (pendiente de aceptación visual)

- **Navegación recomendada:** `Existencias` (saldo actualizado), `Entradas` (histórico de guías), `Salidas` (inicialmente solo cortesías). Se conserva compatibilidad del enlace anterior `?vista=cortesias` a `?vista=salidas`. No presentar todavía ventas, traslados o devoluciones como funcionales.
- La pestaña Salidas muestra a la izquierda una **búsqueda compacta y desplazable de lotes** por colegio, libro o guía y a la derecha un **formulario fijo en columna** para la cantidad y los datos de quien recibe; en móvil se apilan verticalmente. La lista tiene paginación por API y evita ocupar la página completa.
- Campo Cargo ahora usa `CRM_POSITION_OPTIONS` compartido con `CRMContactDetailPage.jsx`: Director(a), Subdirector(a), Promotor(a), Coordinador(a), Administrador(a), Docente, Secretaría y Otro (con detalle libre obligatorio). El cargo debe seleccionarse explícitamente.
- Historial de salidas por cortesía detalla fecha, guía, producto, colegio, destinatario, unidades y costo referencial. `/inventario/salidas/` devuelve hasta 100 movimientos recientes: **no equivale aún a un kardex completo paginado**; futuro trabajo para filtros y paginación.
- Se mantiene la confirmación propia React, sin `alert` nativo; frontend ya no multiplica para presentar valoración final de la salida: muestra costo unitario obtenido del backend y Django registra la valorización histórica del movimiento.
- Robustez UX: si el backend confirma una salida pero falla la actualización posterior del resumen, se conserva el mensaje de éxito y se muestra advertencia de refresco, evitando sugerir una segunda operación innecesaria.
- Cambios exclusivamente en frontend de la rama `crm/gestion-colegios`: commits `8d36c6c` (cargos compartidos), `ec4a3e8` (CRM consume lista común), `9da8938` (diseño cortesías), `c3e347c` (tab Salidas), `59ca8f7` (validación/refresh). **NO desplegado**, no modificados backend ni migraciones en esta fase.
- **Pruebas aún pendientes en equipo del usuario:** `npm run lint`, `npm run build`; abrir Inventario → Salidas, filtrar lote por colegio/guía, registrar una cortesía de prueba, verificar saldo neto, detalle y destinatario; comprobar móvil, cargo Otro, falta de permisos e intento de salida mayor al saldo. Mantener `main` y Tecnoweb sin cambios.

- **Corrección posterior P-07.4 (27-10-2026):** `npm run lint` detectó `POSITION_OPTIONS is not defined` en `src/pages/admin/crm/CRMContactDetailPage.jsx:250` después de centralizar los cargos. Corregida la referencia en `buildContactForm` a `CRM_POSITION_OPTIONS.includes(position)`; se revisaron los usos de la constante en CRM e Inventario. Commit `d4e9daf`. **Pendiente ejecutar `npm run lint` y `npm run build` en el entorno local y confirmar ambos resultados**; no se ha desplegado a producción.

## P-07.5 / 27-10-2026 — Valorización global y por editorial

- A solicitud de Book Express, se integró a Inventario la **valorización referencial del stock** con separación entre conforme disponible y observado. El costo unitario proviene del **snapshot histórico** de la entrada/pedido; ni los precios de venta ni las liquidaciones a editoriales se calculan en React.
- **Django backend**: `warehouse/valuation.py` (nuevo) agrega unidades y costos por editorial, y resta `StockMovement` (cortesías) por separado para evitar producto cartesiano y doble conteo. `warehouse/api_inventory.py` añade `GET /api/admin/erp/almacen/inventario/resumen-por-editorial/` y amplía `GET .../resumen/` con `observed_value_reference`, `physical_value_reference`, `unvalued_observed_units` y `physical_valuation_complete`, manteniendo contratos anteriores.
- **Definiciones**: stock conforme disponible = ingreso conforme (adicionales ya incluidos) menos cortesías; físico = disponible + observado; valor disponible = saldos netos valorizados al costo histórico; valor observado = observado a costo histórico referencial (no vendible); valor físico = suma de ambos. **No es importe a pagar a la editorial ni valoración contable definitiva de daños**. Adicionales históricos no se vuelven a sumar.
- Las filas sin costo histórico se identifican como **valor parcial**; nunca deben ocultarse como si el valor reportado fuera definitivo. El campo `extra_received` por editorial es **histórico**, no unidades adicionales remanentes. No se introdujeron cambios de modelo ni migraciones.
- **Frontend**: `ERPInventarioPage.jsx` muestra tres métricas monetarias (físico, disponible, observado), su desglose compacto por editorial en la pestaña Existencias y un filtro que permite ver los productos de la editorial seleccionada. `warehouseApi.js` añade el cliente del endpoint; la consulta del desglose tiene advertencia propia para que una falla de esta consulta no oculte todo el inventario.
- **Pruebas Django añadidas a `warehouse/test_stock_movements.py`**: valorización inicial/adicionales/cortesías, separación de observados, costo faltante y 2 editoriales. Aún **NO EJECUTADAS** en máquina del usuario. Ejecutar `python manage.py check`, `python manage.py makemigrations --check --dry-run`, `python manage.py test warehouse purchasing`, `python manage.py migrate --check`. En frontend `npm run lint` y `npm run build`. Revisión manual con guías y una cortesía ficticia; comparar total global contra suma de editoriales.
- **Arquitectura pendiente de Almacenes y Traslados:** actualmente `StockEntry` **no identifica ubicación/almacén físico**. La valorización presentada es **global de toda la mercadería registrada en el sistema**; NO permite todavía valorizar por tienda/feria/consignación. No hay que reutilizar las cortesías como traslados: una cortesía es salida definitiva; el movimiento entre almacenes mantiene propiedad y cantidad global mientras cambia de ubicación. Diseñar entidad de almacenes físicos, saldos por ubicación/lote, transferencias origen/destino, despacho, recepción, diferencias y responsables; ferias como ubicaciones temporales y consignaciones como stock bajo custodia externa con liquidación/retorno. Distinguir de pagos/facturación.
- **Pendiente comercial:** precisar cuándo y cómo se valoran observados deteriorados (ajuste/devolución/reposición), cómo se controla inventario de sucursales y la disponibilidad reservada a colegios antes de cerrar esos módulos. No mover a `main` ni desplegar Tecnoweb sin aceptación.

## P-07.6 / 27-10-2026 — UX de Inventario y búsqueda de cortesías

- Observación del usuario validada con capturas: pantalla de Inventario excesivamente vertical, productos bajo tabla de valorización y búsqueda de cortesías dependiente de botón Buscar.
- `src/pages/admin/erp/ERPInventarioPage.jsx`: **Existencias** ahora prioriza buscador y productos arriba, limita el alto visible de la tabla con scroll interno y deja el **desglose de valorización por editorial desplegable debajo**. Se compactaron indicadores generales y espacios de la pantalla. No cambian el contrato ni los cálculos de stock.
- `src/components/admin/InventoryCourtesyPanel.jsx`: búsqueda automática por libro/colegio/guía después de 300 ms sin nuevas pulsaciones, sin botón Buscar; permite limpiar búsqueda y reinicia a página 1 al cambiar el criterio. Mantiene paginación **real del backend** (Anterior/Siguiente), bandera para ignorar solicitudes obsoletas y salida idempotente confirmada con modal. Lista compacta con scroll y un historial más corto visualmente.
- Aclaración: **la selección de lotes de cortesía sí tiene paginación**; el listado actual de Existencias recibe un resumen agregado de productos y ahora presenta scroll interno, pero **no incorpora paginación server-side**. Evaluarla cuando exista más stock/productos para no traer un inventario ilimitado al navegador.
- **Pendiente de validación local:** `npm run lint` y `npm run build`, abrir Inventario/Existencias, buscar libro y cambiar editorial, expandir desglose, abrir Salidas, teclear nombre/colegio/guía lentamente y rápidamente, borrar y comprobar que vuelvan los lotes, cambiar páginas y confirmar una cortesía de prueba sin exceder saldo; revisar móvil. No se ejecutaron pruebas locales desde el conector GitHub.
- **Siguiente módulo:** definir infraestructura de Almacenes y Traslados (principal/tienda/ferias/consignación, stock por ubicación y custodia, despacho/recepción, diferencias y devolución), sin modelar una transferencia como salida definitiva ni duplicar compra o coste. No implementar ni desplegar `main`/Tecnoweb sin pruebas.

## P-07.7 y P-08.0 / 27-10-2026 — Navegación Almacén y base de ubicaciones

- **Diseño aprobado por usuario**: seis áreas de Almacén (Existencias, Entradas, Cortesías, Traslados, Devoluciones, Ajustes) en estructura de seis tarjetas compactas y responsive.
- **P-07.7 Frontend implementado**: `src/pages/admin/erp/ERPInventarioPage.jsx` sustituye las tres pestañas por las seis opciones visuales. **Únicamente las tres existentes son interactivas**; Traslados, Devoluciones y Ajustes se muestran atenuadas y sin interacción hasta que tengan rutas y procesos reales. La antigua URL `?vista=salidas` conserva su funcionamiento y ahora se llama “Cortesías”; `?vista=cortesias` también conserva alias de compatibilidad.
- **P-08.0 Backend implementado**: nuevo modelo `WarehouseLocation` en `warehouse/models.py`, con código único, nombre, clase (principal, tienda, feria temporal, consignación u otro depósito), dirección opcional, estado y notas. La migración `warehouse/migrations/0009_warehouse_location.py` crea el catálogo sin fabricar depósitos físicos y **sin asignar stock anterior arbitrariamente a Principal**.
- Nuevo endpoint de solo lectura `GET /api/admin/erp/almacen/ubicaciones/`, aislado en `warehouse/api_locations.py`, protegido por el permiso `warehouse.view_warehouse_locations`; usuarios administradores pueden consultar y las altas/cambios quedan deshabilitadas hasta definir administración. Pruebas agregadas en `warehouse/test_locations.py` para permisos, consulta y bloqueo de escrituras.
- **Sin transferencia de stock todavía.** El siguiente P-08.1 debe introducir identificación controlada de lote/ubicación, conciliación de stock legado antes de mostrar saldos por lugar, traslados registrados con origen, destino, despacho, recepción, responsable, faltantes, cancelación y reversión auditada; un traslado NO es una cortesía ni reduce el stock global. Ubicaciones temporales y consignaciones tienen custodia/retorno diferenciado.
- **Validación pendiente en el equipo local**: frontend `git pull --ff-only origin crm/gestion-colegios`, `npm run lint`, `npm run build`; backend `git pull --ff-only origin crm/gestion-colegios`, `python manage.py check`, `python manage.py makemigrations --check --dry-run`, `python manage.py test warehouse purchasing`, revisar migraciones con `python manage.py migrate warehouse --plan` y `python manage.py migrate warehouse` **solo en base de desarrollo y con respaldo**. Ningún test local se declara aprobado por el simple commit.
- No desplegar Tecnoweb ni integrar a main hasta aprobación del módulo. Estructura preparada para continuar con P-08.1.

## P-07.8 / 27-10-2026 — Responsive y separación conceptual de operaciones

- Revisión solicitada con capturas de Inventario propio y Negosy. Se confirma **Cortesías** como única salida definitiva operativa actualmente; las incidencias por daños corresponden a Recepción (observados/cuarentena), posteriormente Devoluciones (editorial, con reposición/control documental) o Ajustes (baja/pérdida autorizada). Traslados son cambios de ubicación/custodia y **no** deben restar stock global. Ventas/entregas comerciales son procesos separados, no mezclar con cortesías.
- UX móvil: `ERPInventarioPage.jsx` sitúa navegación de Almacén inmediatamente después del encabezado (antes de cifras extensas), presenta seis opciones como carrusel horizontal desplazable en celular y grilla al crecer el ancho. Al seleccionar una operación desde teléfono baja suavemente a su contenido para evitar pasar nuevamente por las tarjetas de stock y valorización. Valorización monetaria usa desplazamiento horizontal en móviles; tablas de existencias y detalle mantienen ancho legible con scroll interno. Los enlaces al Catálogo y Recepciones se conservan. El estado de la operación seleccionada sigue basado en parámetros URL ya existentes.
- `InventoryCourtesyPanel.jsx`: en pantallas pequeñas, seleccionar un lote desplaza suavemente hacia el formulario situado debajo; lista de productos más compacta, historial con desplazamiento horizontal y confirmación React intacta. No cambia cantidad, validación, idempotencia, permisos ni cálculos.
- Referencia Negosy: útiles para Book Express son estados por movimiento, número/fecha/origen/destino/motivo, filtros/paginación y responsabilidad de despacho/recepción. No copiar creación manual genérica de entradas que duplique recepciones ni gestión de productos/variantes desacoplada del catálogo único de Book Express.
- **P-08.1 pendiente**: conciliar stock histórico no ubicado, distinguir almacenes propios de custodia de terceros, reservar por colegio cuando corresponda y registrar despachos/recepciones de traslados como transacciones con saldos por lote/ubicación. Las ubicaciones y API P-08.0 aún no constituyen traslados funcionales.
- **Pendiente de pruebas locales**: `npm run lint` y `npm run build`; vista móvil con Chrome DevTools 360 px / 390 px y tablet 768 px; comprobar el scroll del carrusel, tablas, selección de lote, formulario, confirmación y retorno. Backend: `python manage.py check`, `python manage.py makemigrations --check --dry-run`, `python manage.py test warehouse purchasing`. No afirmar éxito sin ejecutar pruebas; no desplegar.

## P-07.9 / P-08.1a — 27-10-2026 · Ajuste móvil y administración de ubicaciones

- **Capturas analizadas**: DevTools Samsung Galaxy A55 360×800, iPhone 16 Pro Max 440×956 e iPad Mini 768×1024; dispositivo simulado a 50 % de escala, por lo que se recomienda validar a 100 % antes de juzgar la legibilidad.
- **Responsive Inventario**: se eliminó el carrusel horizontal de las seis operaciones en celular. Se visualizan **dos columnas en móvil y tablet; tres en escritorio grande**, con tarjetas compactas y sin opciones cortadas; la tercera tarjeta monetaria ocupa una fila completa en móvil y las primeras dos se muestran lado a lado. Se conservan los seis ámbitos y se mantienen deshabilitados Traslados, Devoluciones y Ajustes hasta que existan flujos efectivos. Tablas de datos extensas conservan desplazamiento horizontal interno.
- **P-08.1a backend**: API de ubicaciones `/api/admin/erp/almacen/ubicaciones/` permite GET/listar, POST/crear y PATCH/actualizar con permisos independientes `warehouse.view_warehouse_locations` y `warehouse.manage_warehouse_locations`. No admite DELETE ni cambios de código en ubicaciones existentes; normaliza códigos a mayúsculas y bloquea duplicados. Pruebas ampliadas en `warehouse/test_locations.py`. Modelo y migración `0009_warehouse_location` sin cambios.
- **P-08.1a frontend**: agregado `src/components/admin/WarehouseLocationsPanel.jsx` (listar y crear/editar ubicaciones con tipos Principal, Tienda, Feria temporal, Consignación u Otro; sin datos prefabricados), y botón de acceso **Configurar ubicaciones** en Inventario visible solo a quienes tengan permiso de consulta. Vista responsive con formulario, mensajes React y sin posibilidad de eliminar depósitos; API en `src/api/warehouseApi.js`.
- **Sin stock ficticio**: crear una ubicación no distribuye físicamente las 415 unidades del inventario global ni las revaloriza. Falta P-08.1b: conciliación y asignación verificable por lote/ubicación, con auditoría, antes de operar traslados con despacho y recepción, sin reducir stock total. Los movimientos de cortesías siguen separados de los futuros traslados.
- **Pendiente de validación en equipo local**: Backend: `python manage.py check`, `python manage.py makemigrations --check --dry-run`, `python manage.py test warehouse purchasing`, `python manage.py showmigrations warehouse`; aplicar `python manage.py migrate warehouse` solo si `0009` sigue pendiente y tras respaldar desarrollo. Frontend: `npm run lint`, `npm run build`; probar Inventario en 360/390/440/768 px a escala 100 %, tarjetas de dos columnas sin corte, tabla con scroll interno, cortesías, y administración de ubicaciones (crear/editar/denegación por permisos). **Conector GitHub no ejecuta pruebas locales**, no declarar éxito aún.
- **Seguridad de despliegue**: permanece en rama `crm/gestion-colegios`; no fusionar a `main` ni publicar en Tecnoweb sin pruebas y aprobación.


## P-08.1a — separación de configuración y primer estándar móvil del ERP (27-10-2026)

**Problema observado con capturas reales**
- En Inventario, la pantalla `?vista=ubicaciones` mostraba un formulario administrativo debajo de indicadores de stock y las seis opciones operativas. Esto cargaba innecesariamente la vista, confundía las tareas del almacenero y obligaba a desplazarse demasiado.
- El usuario aprobó el patrón de **dos columnas de operaciones en teléfono**, pero solicitó consistencia móvil para ERP, CRM, ToDo y web administrativa. No se hará una sustitución indiscriminada de pantallas: se revisará cada dominio y sus tareas, conservando accesibilidad y procesos ya validados.

**Cambios de este incremento (frontend, rama `crm/gestion-colegios`)**
- Nueva ruta administrativa independiente `/admin/erp/almacen/ubicaciones`, protegida por `warehouse.view_warehouse_locations`, con página `src/pages/admin/erp/ERPUbicacionesPage.jsx`. Acceso desde el submenú **ERP → Almacén → Ubicaciones**; Inventario deja de ofrecer el formulario de configuración en su propio cuerpo y la URL histórica `/inventario?vista=ubicaciones` redirige a la nueva ruta para conservar enlaces.
- Gestión de ubicaciones más compacta: primero lista; botón **Nueva ubicación** abre el formulario bajo demanda, edición contextual, mensajes dentro de React, cancelar edición, campos táctiles, visualización **tarjetas en móvil** y **tabla en escritorio**. No se atribuyen existencias automáticas a ubicaciones ni se habilitan transferencias ficticias.
- Inventario móvil: tarjetas de existencia por producto y de entradas por guía con cantidades, adicionales, colegio y desglose de costos, en lugar de forzar tablas de múltiples columnas en 360–440 px. Escritorio conserva las tablas originales. Las operaciones principales mantienen una cuadrícula de dos columnas en móvil.
- Patrón inicial común para páginas de Recepción y Pedidos: `min-w-0`, espacios adaptables y navegación entre sus dos vistas en cuadrícula de dos columnas con botones de tamaño táctil. `AdminLayout` utiliza contenedor flexible y `adminAccess` reconoce el permiso de ubicaciones. Faltan auditorías visuales específicas de CRM, ToDo y el resto de vistas; no afirmar que todo el panel es responsive por estos cambios.
- Las operaciones de Traslados, Devoluciones y Ajustes continúan inactivas hasta implementar su lógica. Se elimina `P-08` del texto visible para usuario en la tarjeta Traslados: ahora dice `Próximamente`.

**Verificaciones pendientes en equipo local**
1. Ejecutar `git pull --ff-only origin crm/gestion-colegios` en ambos repositorios; frontend `npm run lint` y `npm run build`; backend `python manage.py check`, `python manage.py makemigrations --check --dry-run`, `python manage.py test warehouse purchasing` (la última captura mostró 93 pruebas aprobadas antes de esta separación de páginas).
2. Probar a **100 % de zoom del emulador**, 360 / 390 / 440 / 768 px: menú lateral, las seis operaciones, saldos, tarjetas de Existencias/Entradas, formulario/confirmación de Cortesías, Recepción y Pedidos. Verificar que no hay desplazamiento horizontal del documento.
3. Ubicaciones: crear solo ubicaciones reales o de prueba controladas, editar, desactivar y comprobar que no se modifican 415 unidades históricas ni S/ 36,639.10 en costo referencial; probar acceso sin permiso. Validar redirección de URL anterior.
4. Fase siguiente `P-08.1b`: conciliación de saldos por `StockEntry` y ubicación con control de doble asignación, auditoría, validación simultánea y rechazo de stock negativo antes de habilitar traslados con recepción en destino.
5. **Sin publicación**: no fusionar `main` ni desplegar a Tecnoweb antes de validar los recorridos funcionales y los resultados de pruebas.

**Regla de diseño a replicar gradualmente**: móvil 320–440 px con controles táctiles ~44 px, navegación de máximo dos columnas para operaciones compactas, listas como tarjetas con datos principales, formularios de una columna, filtros de ancho completo y tablas complejas con scroll interno en lugar de desbordar el documento. Tablet/desktop pueden usar estructuras más densas. Preservar permisos y estados del backend, sin acciones que parezcan activas cuando no lo están.


## P-08.1a · cierre UX de Ubicaciones — 27/10/2026

**Decisión comercial y funcional**
- El encargado no debe crear ni memorizar códigos internos para dar de alta el almacén principal, tienda, feria, consignación u otro depósito. Solo registra nombre, tipo y datos opcionales del lugar.
- Las ubicaciones se administran en **ERP → Almacén → Ubicaciones**, separadas de Inventario. Son destinos o custodias para los futuros traslados; **crearlas no mueve mercadería, no cambia 415 unidades de prueba ni valoriza por ubicación**. Hasta completar conciliación de P-08.1b, el stock continúa siendo global.
- La pantalla móvil y escritorio muestran lista de lugares y formulario bajo demanda, etiquetas sencillas y ayuda contextual por tipo. Al crear se presume estado **Activa**; se puede editar y desactivar después. Los códigos dejan de ser una obligación del usuario o una columna visible.

**Backend (rama `crm/gestion-colegios`)**
- `warehouse/api_locations.py`: `WarehouseLocationSerializer` marca `code` solo lectura. La API `POST /api/admin/erp/almacen/ubicaciones/` genera `UBI-<24 caracteres hexadecimales>` mediante UUID; el índice UNIQUE existente evita colisiones y la escritura atómica reintenta ante coincidencia, sin ocultar otros errores de integridad. No hay migraciones nuevas ni cambios en `WarehouseLocation` o `StockEntry`. Se conservan identificadores históricos y se rechaza la modificación de código en PATCH.
- `warehouse/test_locations.py`: tests adaptados a alta sin código, códigos únicos incluso con nombre repetido, imposibilidad de editar identificadores, recuperación frente a colisión simulada, tipo no permitido, permisos, no eliminación y conservación de stock.
- Se conservan las APIs, roles y permisos de consulta/gestión. No se habilitan traslados, ajustes ni devoluciones.

**Frontend (rama `crm/gestion-colegios`)**
- `src/components/admin/WarehouseLocationsPanel.jsx`: elimina campo de código y su validación; POST solo envía datos funcionales; una breve descripción cambia según Principal/Tienda/Feria/Consignación/Otro. Estado visible al editar, no en el alta; una ubicación nueva comienza activa. Se elimina la referencia técnica de las tarjetas y tabla; el identificador sigue disponible en API para trazabilidad interna. Se evita el estado vacío detrás del formulario cuando se está creando.
- `src/pages/admin/erp/ERPUbicacionesPage.jsx`: encabezado explica que se configuran destinos para movimientos futuros.

**Pruebas exigidas antes de declarar listo**
- En `bookexpress_backend`: `git pull --ff-only origin crm/gestion-colegios`, `python manage.py check`, `python manage.py makemigrations --check --dry-run`, `python manage.py test warehouse.test_locations`, `python manage.py test warehouse purchasing`.
- En `bookexpress_frontend`: mismo pull, `npm run lint`, `npm run build`; entrar a `/admin/erp/almacen/ubicaciones` en ancho 360/390/440 px y en escritorio; crear con nombre/tipo y sin código, editar, desactivar, confirmar que el stock global se mantiene. Las pruebas no se ejecutan desde el conector GitHub y requieren resultado local.
- **Sin merge a `main` ni publicación en Tecnoweb** hasta que esas verificaciones y el flujo funcional terminen correctamente.

**Siguiente paso P-08.1b**: diseño y pruebas de conciliación de los lotes de recepción con ubicaciones reales, con total global invariable, auditoría, idempotencia y bloqueo de sobreasignaciones antes de habilitar traslados entre Principal, Tienda, Feria y Consignación.


## P-08.1b — 27/10/2026 · Ubicación inicial por lote y conciliación histórica (desarrollo)

**Decisión arquitectónica**: registrar el `WarehouseLocation` Principal no significa que todo el stock anterior esté físicamente allí. Los 415 libros mostrados en el entorno de pruebas son saldos globales de `StockEntry` menos cortesías; no se deben migrar por defecto a Principal. La asignación inicial se hace por lote de guía/colegio, comprobando la ubicación real. Un lote solo puede asignarse íntegramente a un sitio durante esta fase; si está dividido físicamente entre almacenes, requiere la siguiente etapa de conciliación por partidas y traslados.

**Backend, rama `crm/gestion-colegios`**:
- Nuevo modelo `StockEntryLocation` en `warehouse/models.py` y migración `0010_stock_entry_location.py`. Es una relación 1:1 entre lote de `StockEntry` y ubicación inicial, con origen `receipt` o `reconciliation`, cantidades netas al asignar, responsable, notas y fechas. No modifica las cantidades históricas ni crea nuevas entradas. La migración NO asigna stock existente.
- `warehouse/location_assignment.py` incorpora: selección automática del único Principal activo al crear nuevas entradas de recepción; las entradas históricas siguen pendientes; si no hay Principal la operación queda sin ubicación, y si hay más de uno la validación se bloquea por ambigüedad. La conciliación es explícita, transaccional y protegida por bloqueo de lotes; si ya fue conciliado al mismo destino, reintentar no duplica asignaciones; se impide cambiar a otro sitio sin un flujo posterior de traslado.
- En `warehouse/inventory.py`, `asignar_nueva_entrada` solo se ejecuta cuando una recepción validada crea su `StockEntry` por primera vez; un reintento no reasigna stock histórico.
- `warehouse/api_locations.py`: `GET /api/admin/erp/almacen/ubicaciones/pendientes-asignacion/` (consulta paginada por libro, editorial, guía o colegio), `GET /api/admin/erp/almacen/ubicaciones/resumen-ubicaciones/` (conformes/observados por ubicación y sin asignar) y `POST /api/admin/erp/almacen/ubicaciones/<id>/conciliar/` (lista de IDs, confirmación de verificación física). El registro de conciliación requiere `warehouse.manage_warehouse_locations` y `warehouse.validate_receiving`; la lectura adicional de stock exige `warehouse.view_receiving`.
- Se previene crear un segundo Principal activo mediante el serializer. Los lugares secundarios se pueden crear sin añadir mercadería.
- Se añadieron pruebas `warehouse/test_location_assignment.py` y una regresión en `warehouse/test_locations.py` para asignación automática, conciliación neta tras cortesía, intento de duplicar, cambio de ubicación indebido, permiso de usuario y Principales duplicados.
- **Limitación intencional**: en esta entrega no existe movimiento entre depósitos ni fraccionamiento físico de un lote durante la conciliación. La ubicación inicial identifica la custodia de todo su saldo neto; un traslado parcial requerirá movimientos adicionales (P-08.2). No es correcto copiar la cantidad histórica recibida sin descontar cortesías.

**Frontend**:
- `src/components/admin/WarehouseReconciliationPanel.jsx` bajo la pantalla administrativa de Ubicaciones, plegado por defecto. Presenta cifras **sin ubicación**, lotes por guía/colegio/producto y la selección explícita de lugar físico; hay paginación, búsqueda, confirmación React y control de permisos. No se selecciona automáticamente todo el inventario. Los lotes físicamente divididos deben esperar un proceso posterior.
- El formulario de nuevas ubicaciones ahora recomienda `Tienda` cuando ya existe un `Principal` activo.
- `src/api/warehouseApi.js` agrega llamadas de resumen/pendientes/conciliación. `ERPUbicacionesPage.jsx` controla acceso a la conciliación y distingue configuración de saldos.

**Validación pendiente en equipo local (GitHub no ejecuta tests)**:
1. Respaldar base de datos **local de pruebas** antes de aplicar migraciones. Ejecutar `python manage.py migrate warehouse`, verificar `0010` en `showmigrations` y pasar `python manage.py check`, `python manage.py makemigrations --check --dry-run`, `python manage.py test warehouse.test_locations warehouse.test_location_assignment` y `python manage.py test warehouse purchasing`.
2. Frontend: `npm run lint` y `npm run build`; revisar 360, 390, 440 y 768 px, las listas plegables, la confirmación y el regreso a Inventario.
3. Confirmar Principal único; crear recepción ficticia adicional y verificar que figura en su ubicación. Comprobar que los lotes previos siguen sin ubicación y que luego de conciliarlos con verificación física se reducen los pendientes y **no varían el total global ni su valorización**. Probar reintento e imposibilidad de asignar un mismo lote a dos lugares. Un libro dividido entre Principal y Tienda NO se debe conciliar en esta fase.
4. No fusionar a `main` ni desplegar a Tecnoweb hasta finalizar migraciones y flujo E2E.

**Próximo P-08.2**: saldos por ubicación respaldados por movimientos de traslado/recepción con origen y destino, validación de cantidades disponibles, estados de envío/recepción y diferencias, valorización por almacén, stock temporal de ferias y conciliación de consignaciones. Este alcance NO está implementado.


## P-08.2 — 28/10/2026: traslados directos entre ubicaciones (rama de desarrollo)

- Revisión de base real: `warehouse.StockEntry` representa la entrada inmutable; `StockEntryLocation` conserva la primera ubicación por lote. Las recepciones nuevas se asignan al único almacén principal activo; los ingresos anteriores sin ubicación requieren **conciliación física**, nunca se atribuyen a un depósito por simple existencia del registro.
- Se implementa `warehouse.StockTransfer` con lote, origen, destino, cantidad, usuario, fecha, costo histórico, observación e idempotencia; migración `warehouse.0011_stock_transfer`. Prohibido origen=destino, faltante de stock local y movimiento desde lotes sin conciliación. Se emplea transacción y bloqueo de la entrada para evitar doble consumo ante peticiones simultáneas.
- `warehouse/transfers.py` calcula saldos por ubicación desde saldo inicial, cortesías posteriores y traslados; `warehouse/api_transfers.py` incorpora `GET/POST /api/admin/erp/almacen/traslados/` y `GET /traslados/lotes/`. `resumen-ubicaciones` incorpora saldo y valorización disponible por ubicación. La suma de los traslados es cero para el inventario global.
- **Alcance operativo:** traslado directo **solo cuando la entrega física al destino ya ocurrió**. El responsable debe marcar confirmación explícita; no se implementa todavía expedición/en tránsito/recepción separada, ni reserva, devolución, ajuste, venta o comprobante de traslado. No utilizar este flujo para mercadería que aún está en camino.
- Se protege el saldo de cortesías del almacén de ubicación inicial, de modo que no pueda consumirse allí stock ya trasladado. Las cortesías en un almacén receptor necesitarán extensión de elección de ubicación: no simular el movimiento desde el principal.
- React integra `InventoryTransfersPanel.jsx` dentro de Inventario → Traslados: filtros por origen/destino, búsqueda automática de libros/colegio/guía, saldo disponible, detalle, confirmación modal institucional, historial y valorización por almacén, diseños móvil/tablet/escritorio. Se reutilizan servicios de `warehouseApi.js`.
- **Control y pruebas:** GitHub Actions revisa lint/build frontend y Django/PostgreSQL en cada push. Primera ejecución completa backend detectó `FOR UPDATE` sobre el lado opcional de una unión; se corrigió bloqueando únicamente el registro `StockEntry`. No confundir una migración correcta con pruebas finales aprobadas: verificar la última ejecución tras los cambios. Backend: `python manage.py check`, `python manage.py makemigrations --check --dry-run`, `python manage.py migrate warehouse`, `python manage.py test warehouse purchasing`; frontend: `npm run lint`, `npm run build`.
- **Prueba manual mínima:** confirmar recepción a Principal → abrir Traslados → escoger lote y destino Tienda → confirmar recepción física y registrar un traslado parcial de prueba → comprobar saldo Principal -N, Tienda +N, saldo global sin cambios y valorización local redistribuida → intentar repetir la operación con misma clave → intentar más unidades de las disponibles (debe rechazarse) → verificar historial y cortesías del colegio.
- Entorno: `crm/gestion-colegios` en frontend y backend. No pasar a `main` ni desplegar Tecnoweb hasta aprobación de pruebas visuales y funcionales.


## Incidencia catálogo → CRM — 06/11/2026: accesos digitales GARDEN

- Síntoma en producción: los productos Santillana «CÓDIGO DE ACCESO AL SISTEMA GARDEN STAND ALONE» (9900000030926) y «TARJETA DE ACCESO AL SISTEMA GARDEN STAND ALONE» (9900000030919) aparecen en Gestión web → Productos, pero no en la búsqueda de 1.º de Primaria de Proyección.
- Causa en código: la API filtra por línea comercial y grado exacto o grado sin asignar (NULL). Un grado llamado «Sin Nivel» NO equivale a un campo vacío. El importador no identifica automáticamente tipo «Acceso digital» como Texto escolar si no se define su línea comercial. Verificar clasificación real de los registros en producción.
- Corrección de datos: establecer Texto escolar cuando el material pertenezca a esa línea y quitar grado «Sin Nivel» cuando sea transversal; si el recurso es de un grado específico, asignar el real. Verificar precio numérico activo 2027. Mantener tipo Acceso digital, editorial y códigos. Actualizar el maestro 2027 para evitar regresiones al reimportar.
- Mejora técnica: backend CRM rama crm/gestion-colegios acepta búsqueda por código de producto y SKU, además de nombre y serie. Commits f0799ed y f2e56da incluyen cambio y test de regresión.
- Validación pendiente: ejecutar python manage.py check y python manage.py test crm.tests.test_projections; validar la búsqueda por nombre, serie, código y SKU sobre una oportunidad de prueba. Los cambios no se han desplegado automáticamente a Tecnoweb.
- Mejora futura de importación: normalizar correctamente los valores «Sin Nivel» y exigir una línea comercial explícita para materiales complementarios, sin clasificar por defecto todos los accesos como escolares.
