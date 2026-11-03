# Pruebas diarias y reporte de salud de aplicaciones

## 1. Summary
- Automatizar comprobaciones diarias y generar un listado del estado de salud de aplicaciones de los grupos ABCD en desarrollo y certificación.
- El inventario, los criterios de salud y los parámetros operativos requieren confirmación antes de implementar.

## 2. Scope
- **Dentro del alcance:** comprobar las aplicaciones acordadas de A, B, C y D en desarrollo y certificación; producir un resultado por aplicación, grupo y ambiente.
- **Fuera del alcance:** cambios funcionales a las aplicaciones o infraestructura no acordados como necesarios para ejecutar las comprobaciones.

## 3. Supuestos
- La frecuencia solicitada es diaria.
- No se asume inventario, horario, herramienta, estado, umbral ni destino del reporte.

## 4. Decisiones técnicas por tomar (pendientes o resueltas)
- Pendientes: inventario y mapeo de aplicaciones a grupos; comprobaciones y estados/umbrales; hora y zona horaria; formato, destino, audiencia y retención; accesos autorizados y política de reintentos.
- El listado debe identificar grupo, aplicación, ambiente, estado de salud y fecha/hora de comprobación.

## 5. Riesgos y mitigaciones
- **Falso resultado saludable:** acordar criterios y tratar explícitamente errores o resultados ausentes; no convertirlos en éxito.
- **Exposición de información:** limitar el reporte y sus registros a datos operativos necesarios, sin secretos ni datos reales de clientes.
- **Cobertura incompleta:** validar el inventario y comprobar los cuatro grupos en ambos ambientes antes de aceptar la entrega.

## 6. Criterios de aceptación (medibles)
- La automatización produce un reporte en cada ejecución diaria configurada.
- El reporte incluye aplicaciones acordadas de los grupos A, B, C y D, tanto en desarrollo como en certificación.
- Cada resultado identifica grupo, aplicación, ambiente, estado de salud y fecha/hora de comprobación.
- Las comprobaciones fallidas o sin resultado se identifican explícitamente y nunca se reportan como saludables.
- La ejecución y el reporte pueden verificarse con evidencia de prueba no sensible.

## 7. Plan de validación
- **Pruebas unitarias:** validar la asociación aplicación/grupo/ambiente, la representación de estados acordada y el manejo de errores o ausencia de resultados.
- **Pruebas funcionales:** verificar una ejecución programada y la generación del listado para ambos ambientes y los cuatro grupos con inventario de prueba.
- **Seguridad:** comprobar que el acceso usa permisos autorizados y que reporte/registros no exponen secretos ni datos sensibles.
- **Evidencia requerida:** salida de ejecución, reporte de prueba generado y resultados de pruebas para desarrollo y certificación.

## 8. Tareas sugeridas por rol
- **Chapter/PO:** confirmar inventario y mapeo; acordar audiencia y utilidad del reporte; definir métricas de éxito.
- **Tech Lead:** confirmar stack y patrón de ejecución; definir diseño del reporte y manejo de fallos; revisar permisos y operación diaria.
- **Backend:** implementar comprobaciones según criterios acordados; generar el listado con los campos requeridos; registrar errores sin exponer datos sensibles.
- **Frontend:** confirmar si el listado requiere interfaz; si aplica, acordar cómo presentar filtros por grupo y ambiente; validar estados visibles con PO y QA.
- **QA:** preparar casos por grupo y ambiente; probar resultados saludables, fallidos y ausentes; adjuntar evidencia del reporte y de la ejecución.
- **Cyber:** revisar permisos mínimos; verificar que secretos no aparezcan en reporte/registros; validar controles de acceso al destino acordado.

## 9. Preguntas abiertas
- ¿Qué aplicaciones pertenecen a cada grupo ABCD?
- ¿Qué comprobaciones, estados y umbrales determinan la salud?
- ¿A qué hora y zona horaria debe ejecutarse la tarea? ¿Qué hacer ante omisiones o duplicados?
- ¿Cuál es el formato, destino, audiencia y retención del reporte?
- ¿Qué stack, accesos y permisos están autorizados?
- ¿Se requiere una interfaz para consultar el listado o basta con generar el reporte?
