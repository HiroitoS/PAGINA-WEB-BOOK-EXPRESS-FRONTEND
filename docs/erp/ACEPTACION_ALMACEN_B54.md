# Book Express | Checklist de aceptación de Almacén B5.4

**Ambiente:** base PostgreSQL de ensayo, con operaciones DEMO. No ingresar diferencias o devoluciones ficticias en el inventario habitual. Las cantidades de esta guía son datos de prueba, no movimientos reales.

**Responsable:** ____________________  **Fecha:** ____________________  
**Versión de backend y frontend:** ____________________

Ruta: ERP → Almacén → Movimientos → Distribuciones → Recibidas → Ver detalle. En cada caso, marca «Conforme» o «No conforme». Si falla, apunta la operación, el mensaje visto y adjunta una captura sin datos de clientes.

| Caso | Qué ingresar o revisar | Resultado esperado | Resultado / evidencia |
|---|---|---|---|
| B54-01 · Diferencia inicial | En una feria DEMO recibida con un lote entregado de 3 libros, registra 2 con motivo de conteo y una explicación de al menos 20 caracteres. | Se guarda una observación de 2; queda permitido reportar 1 más en ese lote. Sin cambios en existencias. | ☐ Conforme / ☐ No conforme: ______ |
| B54-02 · Límite por lote | En el mismo lote, registra 1 con una explicación distinta. Intenta registrar otro. | Se guarda la observación de 1, luego el lote deja de admitir observaciones adicionales. No se afecta otro lote. | ☐ Conforme / ☐ No conforme: ______ |
| B54-03 · Hallazgo parcial | Selecciona la primera observación (la de 2). Prueba 3, luego registra 1 con lugar y explicación. | No se puede enviar 3. La observación correcta muestra 1 de 2 encontrado; la otra no cambia. No aumenta stock ni se registra una venta. | ☐ Conforme / ☐ No conforme: ______ |
| B54-04 · Reintento | Si un guardado no se confirma por conexión, conserva la pantalla y pulsa de nuevo sin editar los datos. La interrupción deliberada se prueba solo en ensayo. | Hay una sola observación o un solo hallazgo para el mismo intento. No ingresar una nueva nota solo para verificar una respuesta perdida. | ☐ Conforme / ☐ No conforme: ______ |
| B54-05 · Retorno físico | Usa otra operación DEMO con 15 libros entregados. En Retornos de feria registra 5 físicamente recibidos con los datos de ensayo y abre «Imprimir recepción». | El resumen muestra 15 entregados, 5 devueltos y 10 sin retorno. BE-RC acredita 5; no sobrescribe el documento de preparación BE-RI. Solo los 5 devueltos afectan stock. Vendidos queda «Por integrar». | ☐ Conforme / ☐ No conforme: ______ |
| B54-06 · Punto de venta | En otra distribución DEMO de punto de venta con 4 entregados, confirma el retorno físico de 2. | 2 devueltos, 2 sin retorno, constancia física de 2 y ventas no inferidas. | ☐ Conforme / ☐ No conforme: ______ |
| B54-07 · Consignación | En una consignación DEMO con 4 entregados, sigue el retorno de 2 con la documentación de ensayo. | El registro refleja las 2 unidades retornadas; no crea liquidación, venta ni abono. | ☐ Conforme / ☐ No conforme: ______ |
| B54-08 · Uso y permisos | Revisa el panel en escritorio y móvil. Repite la consulta con un perfil sin permiso de gestión de movimientos. | Los lotes se distinguen por producto, guía e ID. Se entienden los estados sin depender del color. El perfil no autorizado no puede registrar ni borrar movimientos o hallazgos. | ☐ Conforme / ☐ No conforme: ______ |

## Siguiente fase: B6, conciliación comercial

Antes de activar el cierre debe existir una fuente verificable de ventas por operación y lote y confirmarse quién aprueba las diferencias y el cierre. La revisión de Almacén llega hasta el retorno físico y los hallazgos. «Sin retorno» no equivale a «vendido». Un pago de consignación tampoco prueba unidades vendidas. Packs (B7) y reportes (B8) se mantienen detrás de esta dependencia, sin darlos por implementados.
