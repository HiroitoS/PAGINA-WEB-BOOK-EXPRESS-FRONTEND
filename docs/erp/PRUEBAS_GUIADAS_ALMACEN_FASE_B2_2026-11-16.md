# Book Express — Pruebas guiadas de Almacén: Fase B2 y UX de Entregas

**Versión:** 16/11/2026 · **Entorno:** desarrollo local, `feature/erp-p08-traslados-por-guia`.
**Estado:** cambios implementados; pendientes de validación manual por el usuario. **NO producción.**

## 0. Antes de empezar (seguridad)

1. Abrir VS Code y verificar la rama en **ambos** repositorios con `git branch --show-current`; debe ser `feature/erp-p08-traslados-por-guia`. Si existen modificaciones sin guardar, resolverlas antes de descargar.
2. En cada proyecto: `git status`, luego `git pull --ff-only origin feature/erp-p08-traslados-por-guia`. **No hacer `git reset --hard`, merge a `main` ni publicar Tecnoweb.**
3. Respaldar PostgreSQL local (`bookexpress_db`) antes de migrar/registrar pruebas. Revisar migraciones existentes de la rama con `python manage.py showmigrations warehouse` y `python manage.py migrate --plan`; aplicar `python manage.py migrate` **solo en base de desarrollo respaldada**, si corresponde. La mejora UX/B2 actual no introduce migración nueva.
4. Backend, en el entorno virtual: `python manage.py check`; `python manage.py makemigrations --check --dry-run`; `python manage.py test warehouse.test_distribution`; al finalizar, `python manage.py test warehouse purchasing`.
5. Frontend: `npm run lint`, `npm run build`, iniciar normalmente `npm run dev`.
6. Acceder a `http://localhost:5173/admin/erp/almacen/distribuciones` con usuario autorizado y navegar desde **ERP → Almacén → Movimientos → Entregas**.

**Si un comando devuelve error:** anotar el texto literal y la pantalla; no avanzar con registros ni migrar de forma improvisada.

## 1. Entender los campos (casos de ejemplo, no valores que se deben imponer)

- **Tipo de atención:** qué finalidad comercial tiene esta entrega: **Punto de venta**, **Feria** o **Consignación**.
- **Lugar de salida:** ubicación física donde hoy está la mercadería, según Inventario; **no** se presupone Principal.
- **Lugar de llegada o atención:** ubicación prevista para atención o custodia. Puede sugerirse una ubicación real por su tipo, pero el usuario debe confirmar el lugar correcto.
- **Cantidad para esta entrega:** puede ser el 100 % de la adopción o una parte, sin superar la cantidad adoptada junto con las otras entregas activas.
- **Guardar planificación:** registra únicamente el compromiso logístico, **NO** comprueba todavía stock por lote, NO reserva, NO mueve ni vende libros.
- **Movimientos → Traslados:** flujo separado que solo debe registrarse si la recepción física en destino ya ocurrió. **No usarlo para simular una planificación.**

Ejemplos orientativos: **Feria** suele llegar a **Almacén Feria**; **Punto de venta** a **Almacén Tienda**; **Consignación** a **Almacén Consignación**. La existencia de esos nombres no significa que haya unidades allí. Un cambio de finalidad no crea stock.

## 2. Probar búsqueda de adopciones (filtro corregido)

1. Pulsar **Planificar entrega**. Verificar que aparece **1. Elegir adopción confirmada**.
2. Sin filtros, leer contador y resultados en lista. Cada fila debe identificar **colegio, campaña, año, número de adopción y títulos**. No debe seleccionar automáticamente una adopción solo por ser el primer resultado.
3. En **Año de campaña**, elegir **2027** (solo debe aparecer si realmente hay adopciones 2027). Deben filtrarse resultados y actualizarse el contador.
4. En **Buscar colegio o campaña**, escribir `PRUEBA ERP` o parte del nombre del colegio DEMO; verificar actualización tras una pausa breve y que no se mezclen resultados anteriores.
5. Probar búsqueda por el **número real de adopción** que se muestra en el resultado; debe aparecer esa adopción.
6. Probar búsqueda inexistente: debe indicar claramente que no se encontraron adopciones. Pulsar **Limpiar filtros** y verificar recuperación.
7. Si hay más de 20 adopciones en un filtro, probar **Anterior/Siguiente** y revisar número de página; los filtros deben conservarse.
8. Pulsar **Elegir** sobre la adopción DEMO correcta, verificar tarjeta **Adopción seleccionada**. Pulsar **Cambiar adopción** y comprobar que permite escoger otra sin inventar IDs.
9. En edición de una planificación existente, verificar que la adopción sigue fija y su colegio/campaña se muestran sin posibilidad de sustituirla.

## 3. Probar claridad de modalidad y ubicaciones

1. Tras elegir adopción, en **2. ¿Para qué se preparan los libros?** seleccionar **Feria**. Verificar tarjeta activa y descripción.
2. En **3. ¿Desde dónde salen y dónde quedarán?**, comprobar **Lugar de salida** sin presuponer Principal. Consultar el inventario mediante el enlace antes de elegir.
3. Confirmar que **Lugar de llegada o atención** sugiere **Almacén Feria** si existe uno de ese tipo; probar cambiar a **Punto de venta** y después **Consignación**, verificando las sugerencias correspondientes.
4. Elegir un destino de tipo distinto de la modalidad: debe aparecer una **advertencia**, no registrarse un movimiento automáticamente. Confirmar que el usuario puede rectificar.
5. Comprobar que el resumen explica modalidad y el recorrido de salida a llegada. Elegir el mismo lugar como salida/llegada: el sistema actual lo rechaza. **Anotar los casos donde no se requiere traslado físico para diseñarlos en B3; no falsear ubicaciones**.

## 4. Probar distribución completa y parcial (adopción DEMO con 10 LECTOPOLIS 3)

**Antes:** revisar en el listado todas las operaciones activas `Por preparar` de esa adopción, porque podría existir ya una de 10 unidades. **No crear otra de 10 si ya hay 10 planificados**. La operación anulada no consume cantidades.

1. Si hay una planificación activa de **10**, pulsar **Editar planificación**. En **4. ¿Cuántos libros irán en esta entrega?**, cambiar de **10 a 6** y escribir el motivo (mínimo ocho caracteres). Guardar. Comprobar evento en **Historial de cambios**.
2. Crear una nueva planificación para la misma adopción, elegir **Punto de venta**, fijar lugares reales de salida y llegada, responsable y nombre. El saldo para este libro debe indicar **4**. Indicar **3** y guardar.
3. Crear tercera planificación **Consignación**. El saldo para este libro debe indicar **1**. Guardar **1**.
4. Nueva planificación para la misma adopción: **0 unidades pendientes**; debe impedir registrar una cuarta entrega positiva, sin efectos secundarios.
5. Confirmar que **Asignar todo el saldo** llena solo el remanente, y que puede reducirse sin forzar reparto de tres modalidades.
6. Elegir **otra adopción DEMO sin entregas activas** y planificar el **100 %** en una sola modalidad; debe aceptarse, sin dividir.
7. Editar una operación sin modificar valores: **Guardar cambio** debe continuar deshabilitado y **Motivo del cambio** oculto. Al cambiar cantidad o modalidad, mostrar motivo y exigir ocho caracteres.
8. Anular **solo una planificación DEMO** con motivo: las cantidades deben liberarse para planificar otra entrega; la anulación queda en el historial y no debe mover stock.
9. Probar introducir cantidades decimales, negativas o mayores al disponible: interfaz y API deben rechazarlas.

**Importante sobre la base mostrada en la captura del 15/11:** el inventario consolidado indicaba 10 libros, 8 en Almacén Feria y 2 en Almacén Consignación, valor S/720; no hay garantía de que siga igual mañana. **Consultar el saldo actual**. Guardar o anular planificaciones no debe cambiar el total global, las ubicaciones ni la valoración; un traslado físico registrado por separado sí redistribuye por almacén.

## 5. Validación visual y de permisos

1. Escritorio: probar ancho 1366 px; los textos no deben cortarse, y los pasos deben ser identificables.
2. Dispositivos: revisar 360, 390, 440 y 768 px a zoom 100 %. Comprobar que las tres tarjetas de modalidad se apilan, los selectores no quedan fuera de pantalla, botones tocables y sin scroll horizontal del documento.
3. Revisar teclado: Tab hasta búsqueda, seleccionar resultado, radios, ubicaciones, cantidades y guardar; mensajes de error visibles.
4. Acceso sin permiso de gestión: ocultar acciones de escritura y exigir permiso en API (HTTP 403). No probar en cuenta real de tercero sin autorización.
5. Revisar que la adopción en CRM mantiene **modalidad original**, cantidades y firma; editar el plan logístico no debe modificar el CRM.
6. Revisar que el listado diferencia **tipo de atención**, **colegio**, **salida**, **destino**, **por preparar/anulada** y avisa si el tipo habitual del destino no coincide.

## 6. Criterio de cierre de B2 / entrada a B3

B2 queda aprobada solo si los casos anteriores pasan y los tests automáticos están verdes. No confundir **cantidad planificada** con **reservada**: aún falta B3 para seleccionar lotes reales, verificar stock disponible por ubicación, preparar, revisar, registrar responsables y aprobar. Luego B4 para despacho/documento/en tránsito/recepción/transferencia enlazada y retornos. **No desplegar a Tecnoweb ni fusionar main** antes de pruebas y aprobación del flujo completo.

**Registro recomendado:** fecha, usuario de pruebas, colegio/adopción, resultado esperado vs observado, captura y error de consola/red cuando falle. Prioridad alta a cualquier duplicación de cantidades o movimiento físico inesperado.
