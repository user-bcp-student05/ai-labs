# Hallazgos de ReqFlow

## Contrato observado de web (no acordado)

No existe `docs/ENDPOINTS.md`; este resumen se deriva únicamente del código
frontend y requiere contrastarse con los responsables de los servicios:

- El login envía `POST http://localhost:8080/auth/login` con
  `username`, `password` y `client`; espera `response.data.token` y
  `response.data.user`. Al tener token, guarda token y usuario en
  `localStorage` y navega a `/dashboard`
  (`web/src/app/login/login.component.ts:41`,
  `web/src/app/login/login.component.ts:43`,
  `web/src/app/login/login.component.ts:46`,
  `web/src/app/login/login.component.ts:47`,
  `web/src/app/login/login.component.ts:48`,
  `web/src/app/login/login.component.ts:50`).
- El dashboard lee token y usuario de `localStorage`; con token consulta
  `GET http://localhost:8000/api/tasks?owner=<username>` y envía el token en
  la cabecera `Authorization`; presenta tareas no archivadas
  (`web/src/app/dashboard/dashboard.component.ts:36`,
  `web/src/app/dashboard/dashboard.component.ts:37`,
  `web/src/app/dashboard/dashboard.component.ts:43`,
  `web/src/app/dashboard/dashboard.component.ts:44`,
  `web/src/app/dashboard/dashboard.component.ts:49`).
- Si no hay token, el dashboard navega a `/login`. El cierre de sesión elimina
  token y usuario del almacenamiento local y navega a `/login`; el código
  observado no hace una solicitud de cierre de sesión al servidor
  (`web/src/app/dashboard/dashboard.component.ts:38`,
  `web/src/app/dashboard/dashboard.component.ts:39`,
  `web/src/app/dashboard/dashboard.component.ts:74`,
  `web/src/app/dashboard/dashboard.component.ts:75`,
  `web/src/app/dashboard/dashboard.component.ts:76`,
  `web/src/app/dashboard/dashboard.component.ts:77`).
- `/` y cualquier ruta no reconocida redirigen a `/login`
  (`web/src/app/app.routes.ts:12`,
  `web/src/app/app.routes.ts:13`).

Tras la implementación, el frontend conserva las rutas, payloads y cabeceras
HTTP observadas. Token y usuario se guardan ahora en `sessionStorage`; las
preferencias permanecen en `localStorage`. No se añadió una solicitud de
cierre de sesión al servidor.

## Matriz de seguimiento

Los hallazgos corresponden a la sección web de `RETO.md`. Las evidencias de
descubrimiento permanecen como historial; las notas de resolución reflejan el
cambio validado después de la aprobación registrada en `PLAN.md`.

| id | componente | hallazgo | tipo | explicacion | evidencia (archivo:linea) | severidad | estado |
|---|---|---|---|---|---|---|---|
| H-WEB-01 | web | Token de sesión en `localStorage` | Vulnerabilidad | El token queda accesible a cualquier JavaScript ejecutado en el origen; una vulnerabilidad de script podría permitir su lectura y reutilización. | web/src/app/login/login.component.ts:47; web/src/app/dashboard/dashboard.component.ts:36 | alta | Resuelto — token y usuario se centralizaron en `SessionService` y se migraron a `sessionStorage`; sigue siendo accesible a JavaScript, por lo que no equivale a una cookie HttpOnly. |
| H-WEB-02 | web | Mensaje dinámico renderizado con `[innerHTML]` | Vulnerabilidad | El mensaje concatena el nombre introducido por el usuario y texto procedente del error; el binding interpreta contenido como HTML. Angular aplica sanitización por defecto, por lo que no se confirma ejecución de script, pero se mantiene una superficie evitable de interpretación de marcado. | web/src/app/login/login.component.ts:56; web/src/app/login/login.component.html:39 | media | Resuelto — mensajes de texto plano mediante interpolación Angular; errores de autenticación genéricos y sin detalles internos. |
| H-WEB-03 | web | Versiones candidatas de Axios y Lodash requieren revisión SCA | Vulnerabilidad | El manifiesto fijaba `axios` 0.31.0 y `lodash` 4.17.21. El audit confirmó advisories aplicables a ambas dependencias. | web/package.json:19; web/package.json:20 | media | Resuelto — se retiraron Axios, Lodash y `@types/lodash`; las llamadas usan Fetch y las preferencias una combinación tipada nativa. El audit final no las reporta; quedan alertas independientes documentadas en `PLAN.md`. |
| H-WEB-04 | web | Los componentes acoplan HTTP, URLs, sesión y navegación | Refactor | Login y dashboard realizan solicitudes Axios, contienen URLs, administran el almacenamiento de sesión y navegan directamente; cambios de contrato o transporte pueden afectar a componentes y dificultar pruebas aisladas. | web/src/app/login/login.component.ts:22; web/src/app/login/login.component.ts:41; web/src/app/login/login.component.ts:47; web/src/app/dashboard/dashboard.component.ts:29; web/src/app/dashboard/dashboard.component.ts:43; web/src/app/dashboard/dashboard.component.ts:74 | media | Resuelto — HTTP se aisló en `AuthService` y `TasksService`, la sesión en `SessionService` y las URLs base en configuración de ambiente; componentes mantienen presentación y navegación. |
| H-WEB-05 | web | Uso de `any`, validación anidada y transformación imperativa de tareas | Refactor | `any` elimina comprobaciones estáticas sobre formularios, respuestas y tareas; las validaciones anidadas y la transformación por índice hacen más difícil detectar errores y mantener las reglas. | web/src/app/login/login.component.ts:16; web/src/app/login/login.component.ts:33; web/src/app/login/login.component.ts:36; web/src/app/dashboard/dashboard.component.ts:23; web/src/app/dashboard/dashboard.component.ts:48; web/src/app/utils/legacy-format.ts:1 | baja | Pendiente — tipado y separación corregidos, pero la validación nueva rechaza campos opcionales con `null`; falta caracterizar y preservar ese caso observado en el formateador anterior. |
| H-WEB-06 | web | Cobertura de pruebas limitada a una utilidad | Sugerencia | La prueba encontrada cubría únicamente el formato de etiqueta; no había pruebas para login, sesión, carga de tareas, redirección ni logout. | web/src/app/utils/legacy-format.spec.ts:4; web/src/app/utils/legacy-format.spec.ts:5; web/src/app/utils/legacy-format.spec.ts:6 | baja | Resuelto — suite ampliada a 33 pruebas; `npm run test:coverage` pasó con 88.72% de cobertura de líneas agregada y más de 85% en cada archivo de producción modificado con código ejecutable. |

## Candidatos de auth (pendiente de revisión humana)

### H-AUTH-01: Consulta de credenciales construida por concatenación
- Estado: CANDIDATO
- Evidencia: `auth/src/main/java/com/bcp/workshop/auth/LegacyDatabase.java:32`; la consulta incorpora directamente el nombre de usuario y la contraseña recibidos.
- Impacto: una entrada especialmente formada podría alterar la consulta de autenticación y permitir acceso no autorizado.
- Prioridad propuesta: alta.
- Contrato potencialmente afectado: `POST /auth/login`, en la aceptación o rechazo de credenciales.
- Cómo validarlo: crear una prueba de integración con base aislada que envíe entradas de autenticación con caracteres de control SQL y confirme que no alteran la consulta ni autentican otro usuario.

### H-AUTH-02: Contraseñas almacenadas y comparadas sin hash visible
- Estado: CANDIDATO
- Evidencia: `auth/src/main/java/com/bcp/workshop/auth/LegacyDatabase.java:22` define la columna de contraseña; `auth/src/main/java/com/bcp/workshop/auth/LegacyDatabase.java:32` y `auth/src/main/java/com/bcp/workshop/auth/LegacyDatabase.java:34` la comparan directamente con el valor recibido.
- Impacto: una exposición de la base de datos podría revelar las contraseñas almacenadas.
- Prioridad propuesta: alta.
- Contrato potencialmente afectado: persistencia de usuarios y autenticación de `POST /auth/login`.
- Cómo validarlo: inspeccionar una base de datos de prueba inicializada y comprobar si los valores persistidos son verificables como texto original; revisar también el flujo de alta/actualización de usuarios si existe.

### H-AUTH-03: Cuentas predeterminadas insertadas durante la inicialización
- Estado: CANDIDATO
- Evidencia: `auth/src/main/java/com/bcp/workshop/auth/LegacyDatabase.java:18` y `auth/src/main/java/com/bcp/workshop/auth/LegacyDatabase.java:22`-`24` inicializan la base e insertan dos cuentas con credenciales literales en el código fuente. No se reproducen aquí sus valores.
- Impacto: una instancia que inicialice esta base podría habilitar acceso mediante cuentas predeterminadas no gestionadas por configuración del entorno.
- Prioridad propuesta: alta.
- Contrato potencialmente afectado: inicialización de la base de usuarios y autenticación de `POST /auth/login`.
- Cómo validarlo: inicializar una base temporal vacía y verificar qué cuentas se crean y si su alta puede deshabilitarse o configurarse sin credenciales embebidas.

### H-AUTH-04: Token reversible sin firma criptográfica visible
- Estado: CANDIDATO
- Evidencia: `auth/src/main/java/com/bcp/workshop/auth/LegacyTokenUtil.java:8`-`15` construye el contenido del token con una constante embebida y lo codifica con Base64; `auth/src/main/java/com/bcp/workshop/auth/AuthResource.java:39` lo utiliza en el login. No se encontró una operación de validación o firma en el código de auth revisado.
- Impacto: Base64 no proporciona confidencialidad ni integridad; consumidores que confíen en el contenido sin verificación criptográfica podrían aceptar datos manipulados.
- Prioridad propuesta: alta.
- Contrato potencialmente afectado: formato y confianza del campo `token` devuelto por `POST /auth/login`, y cualquier consumidor que lo valide.
- Cómo validarlo: caracterizar el formato en una prueba aislada y revisar con los responsables del consumidor si se verifica firma, vencimiento y claims antes de autorizar solicitudes.

### H-AUTH-05: Respuestas de autenticación exponen datos de diagnóstico
- Estado: CANDIDATO
- Evidencia: `auth/src/main/java/com/bcp/workshop/auth/AuthResource.java:37` incluye el nombre de usuario en el rechazo; `auth/src/main/java/com/bcp/workshop/auth/AuthResource.java:48` agrega un campo de diagnóstico al éxito; `auth/src/main/java/com/bcp/workshop/auth/AuthResource.java:55`-`57` devuelve mensaje y clase de la excepción.
- Impacto: las respuestas pueden revelar información sobre usuarios o detalles internos de fallos.
- Prioridad propuesta: media.
- Contrato potencialmente afectado: esquema y mensajes de error/éxito de `POST /auth/login`.
- Cómo validarlo: agregar pruebas de respuesta para autenticación fallida y error interno; comprobar que no incluyan datos de diagnóstico ni permitan distinguir usuarios existentes.
