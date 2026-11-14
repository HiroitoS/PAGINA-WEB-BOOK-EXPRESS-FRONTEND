# Book Express — P-09.1: solicitudes internas de mercadería
**Fecha:** 08/11/2026 · **Rama:** `feature/erp-p08-traslados-por-guia` (backend y frontend).
**Tipo:** entrega funcional inicial para revisión local; **NO es despacho, reserva ni preparación física de pedidos**.

## 1. Fundamento documental y alcance
El `MACROPROCESO ALMACEN BOOK EXPRESS.docx`, proceso 3.4, indica: atender requerimientos de libros para tienda, feria y consignación, revisar el stock, seleccionar, contar y empacar. El proceso 3.5 distingue despacho, guía, entrega al responsable y registro de salida. El `MOF ALMACEN.docx` asigna al personal de almacén la preparación y al jefe de logística la supervisión. Por ello, **primero registramos un requerimiento de mercadería** y dejamos picking/pack/despacho como pasos separados y auditables.

*Decisiones de software (no descritas literalmente en los manuales)*:
- Una solicitud puede tener varios productos y cantidades, destino real, operación de feria/consignación, responsable y fecha requerida.
- `submitted → approved/rejected/cancelled`, historial de actor/fecha/motivo.
- El aprobador tiene un permiso distinto del solicitante. El grupo `ALMACEN` puede crear/consultar tras sincronización de permisos; no puede aprobar salvo autorización explícita.
- La aprobación **NO reserva stock, NO descuenta cantidades, NO crea movimientos ni cambia ubicaciones**. La comprobación de disponibilidad y reserva ocurrirá en P-09.2.
- El cliente aporta `idempotency_key` por solicitud; reintentos idénticos no crean copias, cambios con la misma clave se rechazan.
- Para feria o consignación se exige una referencia de operación para no mezclar destinos distintos. Es texto registrado en esta primera fase; falta entidad operativa trazable por evento/colegio (P-09.2).

## 2. Entrega programada en repositorios

### Backend
- Modelos `InternalStockRequest`, `InternalStockRequestItem`, `InternalStockRequestEvent` en `warehouse/models.py`.
- Migración `warehouse/migrations/0013_internal_stock_request.py` (tabla nueva; no altera ingresos existentes).
- API `warehouse/api_internal_requests.py`, `warehouse/urls.py`:
  - `GET /api/admin/erp/almacen/solicitudes-internas/`: listado paginado (20) y filtro de estado.
  - `POST /api/admin/erp/almacen/solicitudes-internas/`: registra una solicitud completa.
  - `GET /api/admin/erp/almacen/solicitudes-internas/{id}/`: detalle con líneas e historial.
  - `GET /api/admin/erp/almacen/solicitudes-internas/ubicaciones/`: destinos activos de solo lectura.
  - `GET /api/admin/erp/almacen/solicitudes-internas/productos/?q=...`: búsqueda de catálogo activo sin precios.
  - `POST /api/admin/erp/almacen/solicitudes-internas/{id}/aprobar/`: autoriza preparación.
  - `POST /api/admin/erp/almacen/solicitudes-internas/{id}/rechazar/`: rechazo con motivo obligatorio.
  - `POST /api/admin/erp/almacen/solicitudes-internas/{id}/anular/`: anula una solicitud pendiente de su autor.
- Permisos `warehouse.view_internal_stock_requests`, `manage_internal_stock_requests`, `approve_internal_stock_requests` en `accounts/permission_registry.py`, y `sync_bookexpress_roles.py`. **No ejecutar sincronización de roles en producción sin revisar impacto de los grupos existentes**.
- Pruebas en `warehouse/test_internal_requests.py`: validaciones, permisos separados, historial, estados, inmutabilidad de salida, reintentos y comprobación de stock intacto.

### Frontend
- `src/pages/admin/erp/ERPSolicitudesMercaderiaPage.jsx` — formulario responsive con ubicaciones, responsable, referencia, búsqueda de libros, cantidades, solicitudes y seguimiento del historial; aprobación/rechazo según permiso.
- `src/api/warehouseApi.js` — cliente de API.
- `src/app/router.jsx`: URL `/admin/erp/almacen/solicitudes`.
- `src/layouts/AdminLayout.jsx`: acceso **Solicitudes internas** dentro de Almacén, sin abrir nuevas secciones vacías.
- `src/utils/adminAccess.js`: control de navegación/roles.
- `src/utils/warehouseErrorMessage.js`: campos de validación legibles.
- UX mobile-first: tarjetas en lugar de tabla densa, controles táctiles >=44px, textos a la izquierda, estados vacíos y confirmaciones específicas.

## 3. Validación local obligatoria antes de presentar
1. En ambos repositorios `git status` y `git pull --ff-only origin feature/erp-p08-traslados-por-guia` una vez confirmados cambios locales.
2. Backend en entorno de desarrollo: `python manage.py check`; `python manage.py makemigrations --check --dry-run`; `python manage.py migrate`; `python manage.py test warehouse.test_internal_requests`.
3. Frontend: `npm run lint`, `npm run build`; abrir la ruta como superusuario de prueba.
4. Solicitar 2 libros para Tienda y comprobar que la solicitud genera historial, **pero NO cambia stock**.
5. Validar que solo quien tenga permiso apruebe/rechace, que rechazo exija motivo, que el autor pueda anular y que no existan duplicados tras reintento.
6. Seleccionar Feria/Consignación y comprobar que exige nombre real del evento/colegio; comprobar el mismo comportamiento en 360/390/430/768/1440 px.
7. No usar datos inventados en producción. Para demo, usar base local aislada y datos rotulados como pruebas.

## 4. Por hacer / restricciones para siguiente iteración
- **P-09.2:** verificar disponibilidad por origen, reservas transaccionales y control de concurrencia; pedido parcial y saldo faltante.
- **P-09.3:** preparación (picking/conteo), armado/desarme de packs y empaquetado; etiquetado interno por colegio/adopción.
- **P-09.4:** despacho documentado, guía de remisión/integ. regulatoria cuando corresponda, tránsito, recepción y diferencias.
- **P-09.5:** retornos, devoluciones y clasificación física, liquidación feria/consignación, conteos y ajustes autorizados.
- La solicitud **no integra todavía** un vínculo estructural con la adopción, ni controla cantidades vendidas o facturación; los responsables deben aprobar la definición de las siguientes fases.
- Evitar publicar el MOF o el Macroproceso original en GitHub: repositorios públicos, originales conservados en raíz local privada del proyecto.

**Estado técnico al guardar:** esperar verificación final de GitHub Actions para la última modificación y pruebas manuales del usuario; no se han fusionado ramas ni desplegado Tecnoweb.
