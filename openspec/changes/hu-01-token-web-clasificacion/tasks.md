# Tasks: hu-01-token-web-clasificacion

Componente: **web** (`web/`). Unidad de trabajo del producto: GitHub Issue #25 (HU-01).
Alcance: caracterizar el contrato del token en login, sesión y solicitud de tareas. Sin cambios funcionales de producción, sin tocar `auth/` ni `api/`.

Comando de validación (desde la raíz de ai-labs): `python tools/lab.py test web`. Ejecuta en `web/`: `npm test`, `npm run test:coverage` y `npm run build`.

## Bloqueadas por decisión humana

Estas tareas no se ejecutan hasta que se responda la decisión correspondiente en `design.md`.

- [ ] **B-1** Decidir si `displayName` o `role` con `null` deben seguir rechazando el login (H-WEB-05). Mientras no se decida, no se cambia `isUserProfile`.
- [ ] **B-2** Decidir si el dashboard debe exigir un usuario válido además del token, en lugar de pedir tareas con `owner` vacío.
- [ ] **B-3** Confirmar el literal de la cabecera `Authorization` (`Bearer` según `docs/ENDPOINTS.md`, línea 114). Desbloquea la tarea 1.2.

## 1. Corrección del spec (documentación)

- [x] **1.1** Revisar `specs/web-auth-session/spec.md` y localizar los marcadores `******` en el requisito de autorización y en su escenario.
- [ ] **1.2** Tras B-3, reemplazar el marcador por el esquema confirmado. Verificación: `Grep` de `******` en el spec no devuelve resultados.
- [ ] **1.3** Confirmar que el spec no requiere cambios de comportamiento: contrastar cada escenario con `design.md`.

## 2. Auditoría de cobertura (sin cambios de código)

- [x] **2.1** Para cada escenario del spec, registrar en `design.md` (tabla de caracterización) si la cobertura es explícita, implícita o ausente. Solo actualizar la columna de acción, no la de comportamiento.
- [x] **2.2** Leer el contenido de las pruebas marcadas como "verificar" en `design.md`:
  - `login/login.component.spec.ts` (token vacío y perfil inválido a nivel de componente).
  - `models/api.guards.spec.ts` (si incluye `null` en opcionales).
  - `dashboard/dashboard.component.spec.ts` (si aserta que no hay llamada HTTP sin token).
  - `services/tasks.service.spec.ts` (si aserta que la URL no contiene el token).

## 3. Pruebas de caracterización (antes de cualquier cambio funcional)

Cada prueba nueva se nombra como caracterización del comportamiento actual. Ninguna debe fallar contra el código actual; si falla, parar y reportar (paso 4 de `design.md`).

- [x] **3.1** Login con token vacío: no guarda sesión, no navega, muestra `El backend respondió sin token.`. Archivo: `auth-flow.spec.ts` (con `AuthService` real; `login/login.component.spec.ts` solo cubre `null`). Si ya existe, omitir.
- [x] **3.2** Login con perfil inválido (`user` sin `username` string): mismo resultado que 3.1. Archivo: `auth-flow.spec.ts`. Si ya existe, omitir.
- [x] **3.3** Login con `displayName: null` se rechaza con el mensaje de token. Archivo: `models/api.guards.spec.ts` (+ flujo en `auth-flow.spec.ts`). Caracteriza H-WEB-05 sin cambiar la regla.
- [x] **3.4** La URL de `GET /api/tasks` no contiene el token; la cabecera `Authorization` sí. Archivo: `services/tasks.service.spec.ts`. Añadir aserción explícita si falta.
- [x] **3.5** Dashboard sin token: no llama a `fetch` y navega a `/login`. Archivo: `auth-flow.spec.ts` (servicios reales; `dashboard.component.spec.ts` ya asertaba que no se piden tareas). Añadir aserción si falta.
- [x] **3.6** Recarga conserva token y usuario: una nueva instancia de `SessionService` lee lo guardado por otra. Archivo: `services/session.service.spec.ts`.
- [x] **3.7** Token presente con usuario inválido: el dashboard pide tareas con `owner` vacío. Archivo: `dashboard/dashboard.component.spec.ts`. Nombrar como caracterización y referenciar B-2.
- [x] **3.8** Ejecutar `python tools/lab.py test web`. Verificación: todas las pruebas pasan y la cobertura de los archivos modificados es ≥ 85 %.

## 4. Implementación incremental

No aplica en esta fase. Solo se habilita si una decisión de B-1 o B-2 pide cambiar comportamiento.

- [ ] **4.1** Si B-1 cambia la regla de `null`: un solo cambio en `models/api.guards.ts`, con la prueba 3.3 actualizada y explícita. Sin cambios en el mensaje de error.
- [ ] **4.2** Si B-2 exige usuario válido en el dashboard: un solo cambio en `dashboard/dashboard.component.ts`, con prueba nueva que cubra la redirección o el mensaje acordado. Actualizar 3.7.
- [ ] **4.3** Tras cada cambio de 4.x: repetir 3.8 y confirmar que las pruebas de caracterización de los demás escenarios siguen pasando.

## 5. Verificación final

- [x] **5.1** Ejecutar `python tools/lab.py test web` desde la raíz de ai-labs. Registrar el resultado (pasó o falló) con el comando exacto.
- [x] **5.2** Confirmar que el cambio no toca `auth/`, `api/` ni la reclasificación de hallazgos en `HALLAZGOS.md`.
- [ ] **5.3** Confirmar que `git status` solo muestra archivos de `web/` y de `openspec/changes/hu-01-token-web-clasificacion/`.
- [ ] **5.4** Revisión humana y aprobación antes de integrar. No hay push ni PR durante el Día 1; el cierre es local en las ramas `day1/prompting`, `main` y `checkpoint/day1`.

## Fuera de alcance

- Cambios de formato, expiración o revocación del token (backend `auth/`).
- Cookie HttpOnly o cambios de almacenamiento.
- Validación del token contra el backend al cargar el dashboard.
- Reclasificar H-WEB-01 o H-WEB-05 en `HALLAZGOS.md`.
- Refactorizaciones de componentes o servicios no requeridas por B-1 o B-2.
- Cambios en `auth/`, `api/` o en el código de otros componentes.
