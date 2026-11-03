## Business context (brief)
Se necesita conocer diariamente el estado de salud de las aplicaciones de los grupos ABCD en los ambientes desarrollo y certificación.

## Feature request / user story
Como responsable de operación, quiero automatizar las pruebas diarias de salud y obtener un listado por grupo y ambiente para identificar aplicaciones que requieren atención.

## Expected impact
Disponer de un reporte diario que cubra las aplicaciones acordadas de ABCD en desarrollo y certificación. La métrica de disponibilidad o reducción de incidentes está pendiente de definición.

## Application inventory and group mapping
Pendiente: confirmar las aplicaciones incluidas y su asignación a los grupos A, B, C y D.

## Health-check definition
Pendiente: confirmar las comprobaciones, los estados posibles, los umbrales y cómo registrar resultados no disponibles.

## Daily schedule
La frecuencia solicitada es diaria. Pendiente: hora, zona horaria, calendario y política ante una ejecución omitida o repetida.

## Report requirements
Se requiere un listado con estado de salud por aplicación, grupo y ambiente. Pendiente: formato, campos adicionales, destino, audiencia y retención. Incluir fecha/hora de comprobación para identificar cada resultado.

## Scope (in/out)
Dentro: automatización de comprobaciones diarias y generación del listado para los grupos ABCD en desarrollo y certificación.

Fuera: cambios a aplicaciones o infraestructura que no sean necesarios para la comprobación, salvo que se acuerden explícitamente.

## Known technical constraints
Pendiente: stack permitido, mecanismos de acceso a los ambientes y disponibilidad esperada de los servicios.

## Known risks
- Resultados falsos de salud si las comprobaciones o umbrales no se definen.
- Exposición de datos internos si el reporte o los registros contienen información sensible.

## Dependencies
Pendiente: equipos responsables de las aplicaciones, accesos autorizados y servicios requeridos para las comprobaciones.

## Team Definition of Done (DoD)
Pendiente de confirmación. Como mínimo, definir pruebas para ambos ambientes y evidencia del reporte generado con datos de prueba no sensibles.
