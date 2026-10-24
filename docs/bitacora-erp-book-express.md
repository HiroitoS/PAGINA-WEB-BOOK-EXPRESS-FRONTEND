# Bitácora de continuidad — ERP Book Express

Actualizada: 23/10/2026. Documento de trabajo; contrastar con GitHub antes de ejecutar.

## Reglas de trabajo
- GitHub es fuente de código; el usuario hace pull y prueba en VS Code.
- No editar main ni publicar a producción sin revisión y aprobación.
- Commits y explicaciones en español; evitar nuevos módulos sin análisis de modelos y APIs existentes.
- Django REST Framework + PostgreSQL / React + Vite + Tailwind; arquitectura monolito modular.
- Proteger datos de CRM y permisos; tests específicos por bloque, tests integrales antes del merge.

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
