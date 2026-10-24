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
- El operador debe descargar y adjuntar BE-SL manualmente, revisar destinatario y enviar desde su correo; luego registra constancia de envío en ERP. Si Outlook web no está registrado como manejador mailto, el botón puede abrir otra aplicación de correo; futura integración real opcional Microsoft Graph con OAuth y permisos delegados.
- Validación pendiente: npm run lint y npm run build, revisión visual de semáforos de las tres situaciones, apertura de correo y advertencia de adjuntar archivo. Sin cambios backend, sin migraciones. No mezclar con P-06 de Recepción/Almacén.
