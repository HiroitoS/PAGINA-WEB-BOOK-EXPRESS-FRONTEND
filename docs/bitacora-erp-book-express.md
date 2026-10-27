# Bitácora de continuidad — ERP Book Express

Actualizada: 27/10/2026. Documento de trabajo; contrastar con GitHub antes de ejecutar.

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
