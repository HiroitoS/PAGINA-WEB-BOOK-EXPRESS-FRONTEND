# Criterios UX/UI — Book Express (versión de trabajo, 17/11/2026)

## Origen
Revisión visual de capturas locales del usuario (Roles y permisos; Usuarios) y síntesis facilitada por el usuario del reel de Go Expoose sobre hero móvil: aislar activo principal, visual full-bleed, titulares en base y CTA simple. **No se pudo verificar directamente el video ni el perfil de Facebook** desde las herramientas disponibles; no atribuir otros consejos al autor. Contraste técnico: Nielsen Norman Group (formularios y carga cognitiva) y web.dev (diseño responsivo y accesibilidad).

Referencias:
- https://www.nngroup.com/articles/4-principles-reduce-cognitive-load/
- https://www.nngroup.com/articles/web-form-design/
- https://web.dev/articles/responsive-web-design-basics
- https://web.dev/learn/forms/design-basics

## Dos sistemas visuales, una sola marca

| Dimensión | Web pública Book Express | ERP/CRM administrativo |
| --- | --- | --- |
| Objetivo | Descubrir libros, servicios y contactar | Registrar, consultar, verificar y aprobar operaciones |
| Jerarquía | Portada/foto real > mensaje > CTA | Título > estado > acción principal > filtros/datos |
| Imagen | Hero móvil impactante si existen fotografías optimizadas | Sin banners hero full-bleed: distraerían de los datos |
| Rojo | CTA comercial primario | Acción primaria y selección, nunca para todas las acciones |
| Blanco y grises | Lectura y catálogo | Tablas, filtros, formularios y detalles |
| Verde | WhatsApp o disponibilidad | Señales de éxito/estado cuando sean necesarias, nunca como color de marca |
| Altura | Ritmo visual, mensajes cortos | Alta densidad legible: filas breves sin texto minúsculo |

## Patrones aprobados para ERP

1. **Panel compacto sin aglomeración**: encabezado de aproximadamente una línea de título + frase breve, sin cabecera grande repetida en cada sección; navegación lateral persiste.
2. **Preferir pestañas de dominio y filtros**: en Roles y permisos elegir un rol en grilla horizontal; consultar una categoría de permisos cada vez. Mantener búsqueda y opción «Solo activos». Se evita una pantalla interminable.
3. **Acciones visibles sin duplicación**: una primaria por contexto, secundarias con menor énfasis. Los estados “borrador”, “pendiente de aprobación”, “validada” se distinguen con texto, no solo color.
4. **Formularios guiados**: campos agrupados y etiquetas persistentes. Obligatorios explícitos. Confirmación antes de cambiar permisos de todos los usuarios. Mostrar errores accionables junto al flujo.
5. **Roles y permisos separados**: cambios del rol afectan a todos; excepciones se editan por usuario. Mantener historial/auditoría. No cambiar permisos implícitamente con comandos de sincronización.
6. **Densidad no es tamaño microscópico**: 14px en datos y campos, 12px en ayudas, controles interactivos de aproximadamente 36–44px de alto; escalado móvil sin scroll horizontal evitable.
7. **Responsive**: grillas colapsan a una columna, etiquetas se mantienen, controles no se solapan ni quedan debajo de encabezados fijos.
8. **Fotografías reales**: Home y Plan lector solo usar imágenes propias o licenciadas; no imágenes inventadas de libros/editoriales. En ERP usar portadas en consulta, no como decoración.
9. **Rendimiento**: assets ligeros, lazy load por ruta, evitar GIF/video decorativo en ERP, verificar build y métricas Core Web Vitals en producción más adelante.
10. **Pruebas UX**: validar roles con dos usuarios reales, escritorio 1366px y móvil 390px, zoom 200%, teclado, estados vacíos, filtros y cambios no guardados.

## Cambios implementados en esta iteración

- `src/pages/admin/RolePermissionsPage.jsx`: encabezado compacto, roles horizontales (2–4 columnas), selector por área, búsqueda, «Solo activos», permisos en grilla y acciones de guardar visibles; historial plegable.
- `src/pages/admin/UsersPage.jsx`: encabezado y métricas de menor altura, filtros compactos, tabla con botones en una fila flexible y radio-opciones compactas para alta de usuarios.
- API y lógica de permisos conservadas. No se modificaron rutas ni nombres de campos del backend.

## Próximo refinamiento, sin mezclar prioridades

1. Probar visualmente escritorio/móvil con usuario y jefe de almacén, revisar contraste y zoom.
2. Estandarizar cabeceras, filtros, semáforos y confirmaciones de Recepción, Inventario y Movimientos con componentes compartidos; evitar retocar cada pantalla con clases diferentes.
3. Revisar Home pública con la adaptación *solo si hay foto real y optimizada*; no adoptar hero cinematográfico en ERP.
4. Unificar sistema de tipografía, espaciados y tokens de marca. No sobreingenierizar con framework nuevo.

## Auditoría incremental — 17/11/2026: Recepciones e incidencias

La evaluación visual del usuario confirmó la navegación directa a la recepción N.° 6 desde la campana del administrador y del usuario ALMACEN. En Santillana T001-12358, 20 unidades contadas, 15 conformes, 5 observadas, 0 excedentes y 5 pendientes del pedido. El acordeón de evidencias indicaba **0 archivos** y quedaba escondido, por lo que la acción importante no era suficientemente visible.

**Referencias técnicas consultadas (guías, no diseños para copiar):**
- Nielsen Norman Group, *Data Tables: Four Major User Tasks*: localizar registros, comparar datos, abrir/editar y actuar deben funcionar sin exploración excesiva: https://www.nngroup.com/articles/data-tables/
- HPE Design System, *DataTable*: usar filtros adecuados al tipo de dato y previsibles: https://design-system.hpe.design/components/datatable
- U.S. Web Design System, *Alert*: mensajes informativos no deben comportarse como interrupciones modales; usar una acción asociada y roles ARIA adecuados: https://designsystem.digital.gov/components/alert/

**Cambio UI ahora implementado:**
1. Faja de seguimiento compacta cuando hay al menos una línea con observados o faltantes frente a la guía. No confundir saldo de pedido con faltante de guía.
2. Indicar cuántos productos afectados aún no tienen ningún archivo asociado. Una fotografía puede servir como evidencia para varias unidades del mismo producto; no exigir una foto por cada libro.
3. Acción «Adjuntar evidencia» abre el panel y preselecciona un producto sin respaldo.
4. Validar 8 MB en cliente, además del límite y el tipo real verificados por backend, limpiar selector de archivo después de guardar.
5. Plegar reporte editorial y ofrecer «Copiar reporte» después de la validación. Copiar texto NO registra envío ni sustituye evidencias; el correo automatizado permanece apagado sin la configuración corporativa explícita.
6. Evitar tarjetas de éxito inventadas: archivo adjunto ≠ reclamación aceptada por la editorial ni ajuste de inventario.

**Pruebas pendientes en navegador local:** como `Almacen1`, abrir `/admin/erp/almacen/recepciones?recepcion=6`; ver la advertencia 5 observados/sin archivo, adjuntar foto/PDF DEMO al producto LECTOPOLIS 4, descargarla en ambas sesiones; comprobar que 15 disponibles, 5 observados y 5 por recibir no cambian. Revisar el cuerpo del reporte como JEFE_ALMACEN sin enviar correos reales. Luego continuar **B3 preparación por lote**; **B4 (despacho legal y conformidad destino)** sigue pendiente y no se presenta como implementado.
