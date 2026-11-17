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
