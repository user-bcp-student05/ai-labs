# Design: hu-01-token-web-clasificacion

## Componente y alcance

- Componente: **web** (`web/`). El Issue #25 / HU-01 trata el token de autenticación de la aplicación Angular.
- Alcance de este diseño: caracterizar el contrato del token en el flujo de login, sesión y solicitud de tareas. No modifica `auth/` ni `api/`.
- Base de referencia: `proposal.md`, `specs/web-auth-session/spec.md`, `docs/ENDPOINTS.md` y el código de `web/src/app`.

## Contexto técnico

Flujo actual observado:

1. `LoginComponent.login()` valida usuario y contraseña y llama a `AuthService.login()`.
2. `AuthService.login()` hace `POST {authApiUrl}/auth/login` con `{ username, password, client: 'angular-workshop' }` mediante `requestJson` y un timeout de 5 s. `isLoginResponse` acepta la respuesta solo si `token` es string no vacío y `user` cumple `isUserProfile`.
3. Si la respuesta es válida, `SessionService.save()` guarda token y usuario en `sessionStorage` (claves `workshop_token` y `workshop_user`). Las preferencias sí usan `localStorage`, pero no el token.
4. `DashboardComponent.ngOnInit()` lee el token con `SessionService.getToken()`. Si falta, navega a `/login`. Si existe, llama a `TasksService.getTasks(user.username, token)`, que hace `GET {tasksApiUrl}/api/tasks?owner=<username>` con la cabecera `Authorization`. El token no va en la URL.
5. `DashboardComponent.logout()` llama a `SessionService.clear()` y navega a `/login`.

Reglas de validación de perfil (`models/api.guards.ts`): `username` es obligatorio y string. `displayName` y `role` son opcionales, pero si están presentes deben ser string. Un valor `null` **se rechaza**.

Contexto de hallazgos (`HALLAZGOS.md`):

- **H-WEB-01** (Resuelto): el token pasó de `localStorage` a `sessionStorage` centralizado en `SessionService`. Sigue siendo legible por JavaScript; no equivale a cookie HttpOnly.
- **H-WEB-05** (Pendiente): la validación nueva rechaza campos opcionales con `null`, que el formateador anterior aceptaba. No describe el token, pero afecta la definición de "perfil de usuario válido" que usa el login de esta HU.

Cobertura existente relevante (`*.spec.ts`, nombres verificados):

- `auth-flow.spec.ts`: login exitoso con sesión y carga de tareas; 401 en dashboard con error genérico.
- `login/login.component.spec.ts`: sin token válido muestra mensaje; guarda sesión y navega.
- `services/auth.service.spec.ts`: payload observado, respuesta inválida, errores HTTP, timeout.
- `services/tasks.service.spec.ts`: owner con bearer, codificación del owner, 401, respuesta no válida.
- `services/session.service.spec.ts`: sessionStorage, no localStorage para token, logout, datos malformados.
- `dashboard/dashboard.component.spec.ts`: redirección sin token, carga, error, logout.
- `models/api.guards.spec.ts`: perfiles válidos e inválidos.

## Goals

1. Verificar con pruebas que cada escenario de `specs/web-auth-session/spec.md` está cubierto por el comportamiento actual.
2. Añadir pruebas de caracterización solo donde falte cobertura explícita.
3. Corregir la ambigüedad del spec antes de aprobar (ver estrategia, paso 0).
4. Mantener las metas de cobertura del código modificado (85 % o superior) y `python tools/lab.py test web` en verde.

## Non-goals

- No cambiar el formato, la expiración ni la revocación del token. Son responsabilidad del backend de `auth/` y no están especificados (ver `docs/ENDPOINTS.md`).
- No migrar a cookie HttpOnly ni cambiar el almacenamiento (`sessionStorage`).
- No aceptar `null` en `displayName`/`role` ni reclasificar H-WEB-05 (es una decisión de producto).
- No validar el token contra el backend al cargar el dashboard.
- No refactorizar componentes, servicios ni rutas (H-WEB-04 ya está resuelto).
- No modificar `HALLAZGOS.md` para reclasificar H-WEB-01 ni H-WEB-05.
- No tocar `auth/` ni `api/`.

## Contratos protegidos

| Contrato | Fuente | Protección |
|---|---|---|
| `POST /auth/login` con `{username, password, client}`; respuesta `{token, user}` | `auth.service.ts`, `docs/ENDPOINTS.md` | `auth.service.spec.ts` (payload observado) |
| Token válido = string no vacío | `auth.service.ts` `isLoginResponse` | `login.component.spec.ts` y `auth.service.spec.ts` |
| Perfil válido = `isUserProfile` (sin `null` en opcionales) | `models/api.guards.ts` | `api.guards.spec.ts` |
| Mensaje `El backend respondió sin token.` | `login.component.ts` | `login.component.spec.ts` |
| Claves `workshop_token` / `workshop_user` en `sessionStorage`; el token no va a `localStorage` | `session.service.ts` | `session.service.spec.ts` |
| `GET /api/tasks?owner=<username>` con cabecera `Authorization: Bearer <token>`; token fuera de la URL | `tasks.service.ts` | `tasks.service.spec.ts` |
| Sin token: no se piden tareas y se navega a `/login` | `dashboard.component.ts` | `dashboard.component.spec.ts` |
| Mensajes `No se pudo cargar el dashboard.` y `No se pudo autenticar. Intente de nuevo.` | `tasks.service.ts`, `auth.service.ts` | pruebas de error existentes |
| Logout limpia token y usuario y navega a `/login` | `session.service.ts`, `dashboard.component.ts` | `session.service.spec.ts` y `dashboard.component.spec.ts` |

## Componentes afectados

Solo lectura en la implementación de esta HU; cambian pruebas y, en el paso 0, el spec.

- `web/src/app/services/auth.service.ts`: validación de la respuesta de login.
- `web/src/app/services/session.service.ts`: almacenamiento del token y del usuario.
- `web/src/app/services/tasks.service.ts`: cabecera y URL de tareas.
- `web/src/app/login/login.component.ts`: decisión de sesión y navegación.
- `web/src/app/dashboard/dashboard.component.ts`: lectura de sesión y logout.
- `web/src/app/models/api.guards.ts`: definición de perfil válido.
- Pruebas: `auth-flow.spec.ts`, `login/login.component.spec.ts`, `dashboard/dashboard.component.spec.ts`, `services/*.spec.ts`, `models/api.guards.spec.ts`.
- `openspec/changes/hu-01-token-web-clasificacion/specs/web-auth-session/spec.md`: solo la corrección del esquema de autorización (paso 0).

## Decisiones técnicas y alternativas

**D1. Mantener `sessionStorage` como almacenamiento del token.**
- Elegida: `sessionStorage`, ya implementado. Limita la vida del token a la pestaña, como exige el spec.
- Alternativa A: `localStorage`. Descartada: persiste entre sesiones y contradice el requisito de "solo sesión del navegador".
- Alternativa B: cookie HttpOnly. Descartada en esta HU: requiere cambios de backend y de CORS/credenciales, fuera del alcance de un Issue que no autoriza cambios funcionales.

**D2. Caracterizar, no cambiar, el rechazo de `null` en el perfil.**
- Elegida: mantener `isUserProfile` tal cual y documentarlo en el spec mediante la definición de "perfil válido".
- Alternativa: aceptar `null` en opcionales (lo que hacía el formateador anterior). Descartada aquí porque cambia qué respuestas de login se aceptan. Es una decisión de producto que debe tomar una persona (pregunta abierta 1).

**D3. El `owner` sale del usuario almacenado, no del token.**
- Elegida: `user.username` de `SessionService`. El token es opaco en el cliente y no se puede decodificar.
- Consecuencia observada: si hay token pero el usuario almacenado es inválido, el dashboard pide tareas con `owner=` vacío. Se caracteriza como comportamiento actual y se marca como pregunta abierta 2.

**D4. El dashboard decide sesión solo por presencia del token.**
- Elegida: no validar el token antes de pedir tareas. Un token rechazado produce 401 y el error genérico `No se pudo cargar el dashboard.`
- Alternativa: endpoint de validación de sesión. Descartada: añade un contrato nuevo en `auth/`, fuera de alcance.

**D5. Pruebas con el runner existente (Vitest).**
- Elegida: añadir casos a los specs actuales. No se incorporan herramientas nuevas.

## Estrategia incremental

Cada paso es revisable por separado y no modifica comportamiento.

- **Paso 0 (spec):** verificar el esquema literal de la cabecera `Authorization` y reemplazar el marcador `******` del spec. `docs/ENDPOINTS.md` (línea 114) documenta `Bearer` seguido del token. En la salida de herramientas el literal aparece redactado, así que hay que confirmarlo en `tasks.service.ts` antes de escribir el valor final.
- **Paso 1 (auditoría):** cotejar cada escenario del spec con las pruebas listadas. Registrar cobertura explícita, implícita o ausente.
- **Paso 2 (caracterización de huecos):** añadir solo las pruebas de la tabla siguiente que estén ausentes. Cada prueba se nombra como caracterización del comportamiento actual.
- **Paso 3 (verificación):** `python tools/lab.py test web` (equivale a `npm test`, `npm run test:coverage` y `npm run build` en `web/`). Confirmar cobertura ≥ 85 % en los archivos modificados.
- **Paso 4 (parada):** si una prueba revela una divergencia con el spec, no corregir en silencio. Documentarla y pedir decisión.

No se modifica código de producción en ningún paso.

## Pruebas de caracterización

Deben existir antes de cualquier refactor de login, sesión o token. El estado indica lo que hay que verificar contra el contenido real de cada prueba.

| Escenario del spec | Prueba existente | Acción |
|---|---|---|
| Login válido: sesión y navegación a `/dashboard` | `login.component.spec.ts` (guarda y navega); `auth-flow.spec.ts` | Ninguna |
| Respuesta sin token, con token vacío o perfil inválido: sin sesión, sin navegación, mensaje | `login.component.spec.ts` (sin token válido); `auth.service.spec.ts` (respuesta inválida) | Auditoría: componente con `null` explícito; token vacío, token ausente y perfil inválido solo implícitos (en servicio). Acción: añadido en `auth-flow.spec.ts` con `AuthService` real |
| Tareas con owner y bearer; token fuera de la URL | `tasks.service.spec.ts` (owner con bearer; codificación) | Auditoría: token fuera de la URL solo implícito (URL exacta). Acción: añadida aserción explícita |
| Dashboard sin token: no pide tareas y navega a `/login` | `dashboard.component.spec.ts` (redirección) | Auditoría: `getTasks` no llamado (nivel servicio mock); ausencia de `fetch` ausente. Acción: añadido en `auth-flow.spec.ts` con servicios reales |
| Recarga conserva token y usuario | `session.service.spec.ts` (lectura tras guardar) | Auditoría: ausente con instancia nueva. Acción: añadida en `session.service.spec.ts` |
| Logout limpia y navega | `session.service.spec.ts`; `dashboard.component.spec.ts` | Ninguna |
| 401 muestra error genérico | `auth-flow.spec.ts`; `tasks.service.spec.ts` | Ninguna |
| `displayName: null` se rechaza (H-WEB-05) | `api.guards.spec.ts` (tipos inválidos en opcionales) | Auditoría: `null` ausente. Acción: añadida en `api.guards.spec.ts` y reflejada en `auth-flow.spec.ts` |
| Token presente con usuario inválido: owner vacío (D3) | Sin cobertura explícita | Auditoría: ausente. Acción: caracterización añadida en `dashboard.component.spec.ts`, marcada como pregunta abierta 2 |

## Riesgos y trade-offs

- **Token legible por JavaScript** (`sessionStorage`). Una vulnerabilidad XSS permitiría leerlo. Se acepta y se documenta; H-WEB-01 queda como resuelto parcialmente, no como equivalente a HttpOnly.
- **Rechazo de `null` con mensaje engañoso.** Si el backend devuelve token válido pero `displayName: null`, la UI muestra `El backend respondió sin token.`, aunque sí lo envió. Es un trade-off de la validación actual que se caracteriza, no se corrige.
- **Caracterizar comportamiento discutible** (`null`, owner vacío) puede fijar en las pruebas algo que luego se quiera cambiar. Mitigación: nombres explícitos de caracterización y preguntas abiertas.
- **Spec con placeholder en la cabecera.** Si el esquema no se verifica, el spec podría validar un valor incorrecto. Mitigado por el paso 0.
- **Sin revalidación de sesión.** Un token vencido o revocado deja al usuario en el dashboard con error genérico, sin cerrar sesión automáticamente. Es un comportamiento actual que el spec no cubre.
- **Sesión por pestaña.** Al cerrar la pestaña se pierde la sesión; es el comportamiento deseado, pero implica volver a autenticarse.

## Rollback

- Los cambios previstos son de documentación y pruebas. No hay cambios de runtime, esquema de datos ni migraciones.
- Rollback: revertir el commit o PR de la HU (`git revert`). Las pruebas añadidas se eliminan con el mismo cambio.
- Si un refactor futuro cambia las claves de `sessionStorage`, el rollback consiste en restaurarlas. Como la sesión es por pestaña, el impacto se limita a volver a iniciar sesión.

## Preguntas abiertas

1. ¿Un `displayName` o `role` con `null` debe seguir rechazando el login (H-WEB-05)? Mientras no se decida, el diseño mantiene el comportamiento actual.
2. ¿El dashboard debe exigir un usuario válido además del token, en vez de pedir tareas con `owner` vacío?
3. Confirmar el literal de la cabecera `Authorization` antes de cerrar el paso 0.
