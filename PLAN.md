# Plan de corrección — web

## Alcance y selección

### Aprobación humana
- Nombre: Pedro
- Fecha: 2026/10/26
- H-WEB-01,H-WEB-02,H-WEB-03,H-WEB-04,H-WEB-05,H-WEB-06

Se incluyen, a petición del usuario, todos los hallazgos web que figuran como
`Pendiente` en `HALLAZGOS.md`: H-WEB-01 a H-WEB-06. La aprobación humana
registrada arriba cubre esos seis IDs.

No existe `docs/ENDPOINTS.md`. Hasta que los contratos sean acordados, se
conserva el comportamiento observado: `POST /auth/login` con username,
password y client; lectura de token y usuario; `GET /api/tasks?owner=...` con
Bearer token; filtrado de tareas archivadas; navegación y cierre de sesión.
La observación está registrada en `HALLAZGOS.md`.

## Secuencia y restricciones

1. Escribir y ejecutar primero las pruebas de caracterización indicadas por
   hallazgo desde `web/`; registrar resultados reales en `docs/TESTING.md`
   cuando ese entregable sea solicitado. Ningún resultado se presume en este
   plan.
2. Implementar en cambios pequeños dentro de `web/`, reutilizando los tipos,
   servicios y pruebas comunes señalados abajo.
3. Mantener las rutas y formatos de `/auth/login` y `/api/tasks`, sin agregar
   dependencias ni alterar quality gates.
4. Revalidar build, pruebas y cobertura de código modificado; investigar las
   dependencias antes de decidir versiones. No se conocen ni se afirman CVEs
   confirmados por este plan.

## H-WEB-01 — Token de sesión en localStorage

- **Hallazgo:** H-WEB-01, token escrito en `localStorage` al iniciar sesión y
  leído desde el dashboard (`web/src/app/login/login.component.ts:47`,
  `web/src/app/dashboard/dashboard.component.ts:36`).
- **Problema:** código JavaScript ejecutado en el origen puede acceder al
  token guardado allí y reutilizarlo.
- **Cambio propuesto:** centralizar lectura, escritura y eliminación de
  credenciales en un servicio de sesión (`SessionService`), sin accesos al
  almacenamiento desde componentes. La decisión del responsable fue usar
  `sessionStorage`: reduce la vida de la sesión al contexto de la pestaña, pero
  **no protege contra JavaScript malicioso** y modifica la persistencia entre
  sesiones del navegador. Conservar el flujo login-dashboard y la cabecera
  Bearer; una cookie HttpOnly requeriría coordinación y cambios de
  contrato/backend fuera de este alcance.
- **Archivos propuestos:** `web/src/app/services/session.service.ts` (nuevo),
  `web/src/app/services/session.service.spec.ts` (nuevo),
  `web/src/app/login/login.component.ts`,
  `web/src/app/dashboard/dashboard.component.ts`,
  `web/src/app/login/login.component.spec.ts` (nuevo) y
  `web/src/app/dashboard/dashboard.component.spec.ts` (nuevo).
- **Caracterización antes del cambio:** probar login exitoso y verificar token
  y usuario guardados, navegación a `/dashboard`, lectura por dashboard,
  autorización Bearer, redirección sin token y logout que elimina credenciales
  y navega a `/login`. Registrar el comportamiento actual de persistencia tras
  recarga; usar esa prueba para hacer visible el cambio de duración si se
  elige `sessionStorage`.

## H-WEB-02 — Mensaje dinámico renderizado con [innerHTML]

- **Hallazgo:** H-WEB-02, el componente concatena texto de usuario/error y la
  plantilla lo enlaza con `[innerHTML]`
  (`web/src/app/login/login.component.ts:56`,
  `web/src/app/login/login.component.html:39`).
- **Problema:** el mensaje se interpreta como marcado dinámico. Angular
  sanitiza el binding por defecto, por lo que el hallazgo no presupone
  ejecución de script; la interpretación HTML puede evitarse completamente.
- **Cambio propuesto:** guardar mensajes como texto plano y representarlos con
  interpolación Angular. Mantener los mismos casos y significado de mensajes
  de validación, error de backend y respuesta sin token; sustituir el formato
  HTML por presentación declarativa/CSS, sin incluir valores de error como
  marcado.
- **Archivos propuestos:** `web/src/app/login/login.component.ts`,
  `web/src/app/login/login.component.html`,
  `web/src/app/login/login.component.css` y
  `web/src/app/login/login.component.spec.ts` (nuevo).
- **Caracterización antes del cambio:** probar mensajes para usuario
  obligatorio, contraseña obligatoria, respuesta sin token y fallo HTTP;
  comprobar el texto visible. Añadir una prueba de regresión que suministre
  texto con etiquetas y verifique que se presenta como texto y no crea
  elementos DOM a partir de la entrada.

## H-WEB-03 — Revisión SCA de Axios y Lodash

- **Hallazgo:** H-WEB-03, `axios` 0.31.0 y `lodash` 4.17.21 están declarados
  (`web/package.json:19`, `web/package.json:20`). La auditoría ejecutada en
  este paso confirmó advisories aplicables a ambas dependencias.
- **Problema:** sin revisar el árbol resuelto y los advisories no se puede
  determinar si existe riesgo explotable ni qué cambio es compatible.
- **Cambio propuesto:** ejecutar la auditoría del proyecto y revisar avisos,
  versiones transitivas y uso. Eliminar Lodash si su única operación puede
  reemplazarse con funcionalidad nativa sin regresión; actualizar o reemplazar
  Axios solo si hay advisory aplicable o una alternativa justificada.
  Mantener URLs, payloads, respuesta esperada y manejo observable del flujo.
  No fijar una versión especulativa ni ocultar avisos.
- **Archivos propuestos, solo si la evidencia requiere cambio:** `web/package.json`,
  `web/package-lock.json`, los módulos de `web/src/app/` que importen la
  dependencia y sus pruebas. Si no hay aviso aplicable ni justificación para
  eliminarla, documentar la conclusión en la evidencia del componente sin
  editar dependencias.
- **Caracterización antes del cambio:** desde `web/`, registrar salida de
  `npm audit --json`, `npm ls axios lodash`, `npm test` y `npm run build`.
  Si se modifica una dependencia, repetir los mismos comandos y comparar
  resultado, árbol y comportamiento del flujo HTTP. Revisar cuidadosamente el
  diff de `package-lock.json`; no descartar cambios preexistentes.

## H-WEB-04 — Acoplamiento de HTTP, URL, sesión y navegación

- **Hallazgo:** H-WEB-04, los componentes hacen llamadas HTTP y administran
  estado/navegación directamente
  (`web/src/app/login/login.component.ts:22`,
  `web/src/app/login/login.component.ts:41`,
  `web/src/app/dashboard/dashboard.component.ts:29`,
  `web/src/app/dashboard/dashboard.component.ts:43`,
  `web/src/app/dashboard/dashboard.component.ts:74`).
- **Problema:** responsabilidades mezcladas dificultan probar por separado
  transporte, sesión y presentación, y dispersan configuración y errores.
- **Cambio propuesto:** mover autenticación HTTP a `AuthService`, tareas HTTP
  a `TasksService` y sesión a `SessionService`; dejar en los componentes
  interacción/formulario y navegación. Centralizar las URLs en configuración
  Angular de ambiente conforme a las buenas prácticas existentes. Reutilizar
  los servicios creados para H-WEB-01 y no duplicar estado ni manejo común de
  errores.
- **Archivos propuestos:** `web/src/app/services/auth.service.ts` (nuevo),
  `web/src/app/services/tasks.service.ts` (nuevo),
  `web/src/app/services/session.service.ts` (nuevo),
  configuración `web/src/environments/` (nueva si se necesita),
  `web/src/app/login/login.component.ts`,
  `web/src/app/dashboard/dashboard.component.ts` y pruebas de servicios y
  componentes bajo `web/src/app/`.
- **Caracterización antes del cambio:** con Axios simulado, probar método,
  URL, payload de login, respuesta esperada, query `owner`, cabecera Bearer,
  filtro de archivadas, estados de carga/error, navegación de login/logout y
  respuesta de error. Verificar que los componentes mantienen el mismo flujo
  después de inyectar servicios.

## H-WEB-05 — Tipado, validación anidada y transformación

- **Hallazgo:** H-WEB-05, `any` en los modelos/valores de login y tareas,
  validaciones anidadas y transformación imperativa
  (`web/src/app/login/login.component.ts:16`,
  `web/src/app/login/login.component.ts:33`,
  `web/src/app/login/login.component.ts:36`,
  `web/src/app/dashboard/dashboard.component.ts:23`,
  `web/src/app/dashboard/dashboard.component.ts:48`,
  `web/src/app/utils/legacy-format.ts:1`).
- **Problema:** `any` oculta incompatibilidades entre UI y respuestas; la
  anidación y variables de propósito genérico vuelven menos claras las reglas.
- **Cambio propuesto:** definir tipos de request/response de login y tareas,
  tipos de sesión y error; reemplazar `any` por esos tipos o `unknown` con
  validación; simplificar validaciones con retornos anticipados y extraer una
  transformación pura de tareas con nombres descriptivos. Reutilizar los
  tipos del trabajo de H-WEB-04; evitar duplicar lógica y conservar el orden,
  las etiquetas y el descarte de tareas archivadas.
- **Archivos propuestos:** `web/src/app/models/` (nuevos tipos, si no hay
  equivalente), `web/src/app/login/login.component.ts`,
  `web/src/app/dashboard/dashboard.component.ts`,
  `web/src/app/utils/legacy-format.ts` y pruebas de utilidad/dashboard.
- **Caracterización antes del cambio:** cubrir validaciones para campos
  vacíos, valores por defecto de etiqueta, etiquetas con prioridad/owner,
  filtrado de `ARCHIVED`, orden por prioridad y estados/errores. Ejecutar
  `npm test` y `npm run build` antes de cambiar implementación y comparar
  los resultados después.

## H-WEB-06 — Cobertura de pruebas limitada a una utilidad

- **Hallazgo:** H-WEB-06, la prueba existente cubre solo
  `formatTaskLabel` (`web/src/app/utils/legacy-format.spec.ts:4`,
  `web/src/app/utils/legacy-format.spec.ts:5`,
  `web/src/app/utils/legacy-format.spec.ts:6`).
- **Problema:** no se comprueban los flujos principales, por lo que errores de
  autenticación, carga y cierre de sesión podrían pasar inadvertidos.
- **Cambio propuesto:** ampliar pruebas Vitest para los contratos y reglas de
  login, sesión, servicios, dashboard, errores y logout, usando dependencias
  simuladas y sin introducir una librería de pruebas adicional sin necesidad
  demostrada. Mantener los tests de caracterización de H-WEB-01, H-WEB-02,
  H-WEB-04 y H-WEB-05 como base compartida, sin duplicar escenarios. Medir
  cobertura y buscar la meta del 85% para el código modificado sin reducir
  umbrales.
- **Archivos propuestos:** `web/src/app/login/login.component.spec.ts`
  (nuevo), `web/src/app/dashboard/dashboard.component.spec.ts` (nuevo),
  pruebas para servicios nuevos en `web/src/app/services/`, y
  `web/src/app/utils/legacy-format.spec.ts`.
- **Caracterización antes del cambio:** ejecutar `npm test` para establecer
  resultado actual; ampliar primero las pruebas con las respuestas observadas
  del código: login válido/inválido, respuesta sin token, tareas válidas y
  archivadas, error de carga, usuario sin token y logout. Ejecutar
  `npm run test:coverage` antes y después; anotar los resultados reales y la
  cobertura del código modificado cuando se ejecute.

## Riesgos y decisiones pendientes al crear el plan

- En la fecha de elaboración del plan no se habían ejecutado pruebas ni
  obtenido aprobación; la aprobación y los resultados posteriores se registran
  en la siguiente sección.
- Los contratos se observaron en código, no están acordados en
  `docs/ENDPOINTS.md`; cualquier discrepancia debe resolverse antes de cambiar
  URLs, payloads, formatos o semántica del flujo.
- `web/package-lock.json` ya tenía un cambio previo no atribuible a este plan;
  se preservó y revisó al retirar dependencias.

## Decisión y ejecución — web, H-WEB-01 a H-WEB-06

### Decisión y límites

- **H-WEB-01:** se eligió `sessionStorage` para token y usuario. No es una
  barrera frente a XSS/JavaScript del mismo origen; una cookie HttpOnly sigue
  fuera del alcance porque requiere soporte backend.
- Se conservaron `POST /auth/login` (payload `username`, `password`,
  `client`), `GET /api/tasks?owner=...` con autorización Bearer, la exclusión
  de tareas `ARCHIVED`, y logout local con navegación a `/login`. No se probó
  un backend real ni se cambió el contrato HTTP observado.
- Se retiraron Axios, Lodash y `@types/lodash`; el comportamiento HTTP ahora
  usa Fetch y el merge de preferencias se implementa con tipos y funciones
  nativas. La actualización conservó la modificación preexistente del
  lockfile que eliminaba entradas anidadas extraneous de Vitest.

### Registro de pruebas y herramientas

Todos los comandos se ejecutaron con cwd `web/`. Las caracterizaciones se
añadieron y ejecutaron antes del cambio de producción; luego se repitieron en
la implementación final.

| Momento | Componente / IDs | Comando | Resultado observado |
|---|---|---|---|
| Antes del cambio | web — H-WEB-01 a H-WEB-06 | `npm test` | Pasó: 1 prueba inicial. |
| Antes del cambio | web — H-WEB-01 a H-WEB-06 | `npm run build` | Pasó; mostró advertencias de módulos CommonJS Axios/Lodash. |
| Antes del cambio | web — H-WEB-01, H-WEB-02, H-WEB-04, H-WEB-05, H-WEB-06 | `npm test` | Pasó: 11 pruebas de caracterización en componentes existentes. |
| Antes del cambio | web — H-WEB-06 | `npm run test:coverage` | Cobertura de líneas agregada: 80.48%; login 96.66%, dashboard 100%. |
| Después del cambio | web — H-WEB-01 a H-WEB-06 | `npm test` | Pasó: 33/33 pruebas en 9 archivos. |
| Después del cambio | web — H-WEB-01 a H-WEB-06 | `npm run build` | Pasó. |
| Después del cambio | web — H-WEB-01 a H-WEB-06 | `npm run test:coverage` | Pasó: 88.72% de cobertura de líneas agregada; cada archivo de producción modificado con sentencias ejecutables alcanzó al menos 86.66%. `api.models.ts` solo declara tipos y no tiene sentencias ejecutables. |
| Después del cambio | web — H-WEB-03 | `npm audit --json` | El audit final no reportó Axios, Lodash ni `@types/lodash`; sigue devolviendo estado de fallo por 23 advisories en otras dependencias: 10 moderados, 7 altos y 6 críticos. Esas dependencias exceden el alcance aprobado; no se silenciaron ni actualizaron. |
| Después del cambio | web — H-WEB-03 | `npm ls axios lodash @types/lodash` | Árbol vacío (npm devuelve código 1 cuando no hay paquetes que listar). |

La desinstalación normal con npm falló en Arborist; se retiraron las entradas
del manifiesto/lockfile mediante la resolución `--package-lock-only
--ignore-scripts --legacy-peer-deps` y luego se podaron los módulos instalados.
La auditoría general aún requiere remediación separada y aprobada. No se
ejecutó validación de navegador contra servicios reales ni revisión/aprobación
humana posterior a la implementación.

### Resultado por hallazgo

- **H-WEB-01:** token y usuario centralizados en `SessionService` con
  `sessionStorage`; logout limpia ambos. Persistencia entre sesiones cambia
  intencionalmente según la decisión anotada arriba.
- **H-WEB-02:** el mensaje se renderiza como texto interpolado, no con
  `[innerHTML]`; los errores de autenticación presentados son genéricos.
- **H-WEB-03:** Axios y Lodash eliminados, junto con sus tipos de Lodash; no se
  ocultaron los advisories restantes.
- **H-WEB-04:** HTTP y manejo de respuestas están en servicios; URLs base se
  centralizan en el ambiente; los componentes mantienen interacción y
  navegación.
- **H-WEB-05:** respuestas validadas desde `unknown` con guards, modelos tipados,
  guard clauses y transformación de tareas reutilizable, sin `any` en
  producción.
- **H-WEB-06:** suite ampliada a login, dashboard, servicios, sesión,
  preferencias, validación de respuestas y utilidades; la cobertura final
  cumple el umbral de 85% para código de producción modificado y ejecutable.

Desviación menor del plan: se introdujo Fetch en vez de actualizar Axios porque
el reemplazo preserva el contrato observado, elimina los advisories de las
dependencias seleccionadas y no agrega paquetes. No se crearon
`docs/ENDPOINTS.md` ni `docs/TESTING.md`, ya que esos entregables no
correspondían a este paso.

## Revisión local previa a integración

- **web — H-WEB-05 reabierto:** `TasksService.isTaskRecord` solo acepta
  `description`, `owner` y `priority` si son strings cuando esas propiedades
  aparecen (`web/src/app/services/tasks.service.ts:37-39`). El formateador
  anterior usaba valores truthy y aplicaba valores por defecto cuando
  `priority` u `owner` eran nulos o ausentes (`web/src/app/utils/legacy-format.ts:7-8`).
  Por tanto, una respuesta con un campo opcional explícitamente `null`, antes
  tolerada y formateada, ahora hace que `TasksService` rechace toda la lista
  (`web/src/app/services/tasks.service.ts:19-20`). Los tests cubren campos
  ausentes, no `null` (`web/src/app/utils/legacy-format.spec.ts:9-10`); falta
  confirmar el contrato y agregar la caracterización antes de cerrar este
  hallazgo.
- La revisión confirma que el código fuente de `web/src/` no usa
  `[innerHTML]` ni el tipo `any`; las coincidencias de `any` están en
  `expect.any(...)` de pruebas Vitest. H-WEB-02 permanece resuelto.
- Sugerencia de accesibilidad: el mensaje dinámico de login no declara una
  región viva (`web/src/app/login/login.component.html:39`), por lo que el
  lector de pantalla podría no anunciar los errores automáticamente.
- Esta es una revisión local asistida; no sustituye la revisión humana ni
  aprobación de integración indicadas en `README.md`.
