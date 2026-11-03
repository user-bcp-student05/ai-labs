---
name: feature-work-test
description: Define y valida especificaciones para automatizar pruebas diarias que reportan el estado de salud de aplicaciones por grupo y ambiente.
---

# Skill: Pruebas diarias y reporte de salud de aplicaciones

## 1) Metadata
- **Skill ID:** feature-work-test
- **Version:** 0.1.0
- **Purpose:** Estandarizar la definición de una tarea automatizada de comprobación diaria y su reporte de salud para aplicaciones de los grupos ABCD en desarrollo y certificación.
- **Audience (roles):** Chapter/PO, Tech Lead, Backend, Frontend, QA, Cyber
- **When to use:** Antes de implementar o cambiar la ejecución diaria de pruebas y el reporte de salud de aplicaciones.
- **When NOT to use:** Incidentes P1 de producción, cambios triviales sin impacto funcional o ejecución manual aislada que no requiera automatización.
- **Sensitive inputs:** No incluyas datos reales de clientes, credenciales, secretos, tokens ni URLs internas no autorizadas.
- **Expected output:** Un documento Markdown estructurado conforme a la sección Output.

## 2) Inputs
Solicita o registra la información disponible en este formato. No inventes valores faltantes; enuméralos en **Preguntas abiertas**:

- **Business context (brief):**
- **Feature request / user story:** Automatizar una tarea diaria de pruebas y generar un listado con el estado de salud de las aplicaciones de los grupos ABCD en desarrollo y certificación.
- **Expected impact (metric or outcome):**
- **Application inventory and group mapping:** Aplicaciones incluidas y grupo ABCD correspondiente.
- **Health-check definition:** Comprobaciones, criterios de salud y estados posibles.
- **Daily schedule:** Hora, zona horaria, calendario y comportamiento ante ejecuciones omitidas.
- **Report requirements:** Formato, campos, destino, audiencia y retención del listado.
- **Scope (in/out):**
- **Known technical constraints:** Stack, entornos, acceso, disponibilidad y estándares aplicables.
- **Known risks:** Seguridad, cumplimiento, estabilidad y disponibilidad de dependencias.
- **Dependencies:** Servicios, equipos, datos y permisos necesarios.
- **Team Definition of Done (DoD):** (if available)

## 3) Output
Devuelve **solo** un documento Markdown con estas secciones y bullets:

1. **Summary**
2. **Scope**
   - Dentro del alcance
   - Fuera del alcance
3. **Supuestos**
4. **Decisiones técnicas por tomar (pendientes o resueltas)**
5. **Riesgos y mitigaciones**
6. **Criterios de aceptación (medibles)**
7. **Plan de validación**
   - Pruebas unitarias
   - Pruebas funcionales
   - Seguridad (comprobaciones mínimas)
   - Evidencia requerida (qué adjuntar)
8. **Tareas sugeridas por rol**
   - Chapter/PO
   - Tech Lead
   - Backend
   - Frontend
   - QA
   - Cyber
9. **Preguntas abiertas**

En el reporte, considera al menos los campos grupo, aplicación, ambiente, estado de salud y fecha/hora de comprobación. Confirma los campos adicionales con el solicitante. Incluye los cuatro grupos ABCD y los ambientes desarrollo y certificación; no presupongas el inventario de aplicaciones ni la definición de los estados.

## 4) Constraints
- No inventes requisitos, aplicaciones, horarios, estados, umbrales, herramientas ni destinos de reportes. Lo que falte va en **Preguntas abiertas**.
- No propongas herramientas fuera del stack permitido.
- No incluyas datos sensibles, secretos ni valores de producción.
- Distingue desarrollo de certificación en el alcance, la validación y el reporte.
- Define cómo se detectan y presentan resultados faltantes o errores; nunca los presentes como saludables.
- Los criterios de aceptación deben ser verificables y no depender de métricas sin línea base o fuente acordada.
- El plan de validación debe incluir evidencia concreta: por ejemplo, salida de una ejecución y listado producido con datos de prueba.
- Mantén la salida en un máximo de 1-2 páginas, priorizando decisiones, criterios y preguntas pendientes.

## 5) Validation Rules
La salida es válida si:
- Incluye todas las secciones definidas en Output.
- Incluye al menos 3 criterios de aceptación verificables.
- Cubre los grupos ABCD y ambos ambientes: desarrollo y certificación.
- Indica que el listado identifica grupo, aplicación, ambiente, estado de salud y fecha/hora de comprobación, o registra cualquier excepción como pregunta abierta.
- Incluye al menos 3 tareas para cada rol central: Tech Lead, Backend y QA, o explica por qué un rol no aplica.
- Incluye al menos 2 riesgos con mitigaciones.
- Identifica como preguntas abiertas toda definición operativa no proporcionada, incluyendo inventario, criterios/estados de salud, horario y destino/formato del reporte.
- No contiene datos sensibles ni secretos.
- No contiene supuestos no declarados.

## 6) Evidence
Adjunta o referencia estos elementos en la entrega:
- `SKILL.md` actualizado.
- `examples/input.sample.md`.
- `examples/output.sample.md`.
- Evidencia de validación documental y, cuando se implemente, salida de una ejecución diaria con datos no sensibles de prueba.
