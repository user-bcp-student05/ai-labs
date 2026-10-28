# SPEC-01: Almacenamiento del token de sesión en web

## Fuente
- Hallazgo: H-WEB-01, "Token de sesión en `localStorage`", severidad alta, tipo Vulnerabilidad.
- Evidencia de descubrimiento (historial): `web/src/app/login/login.component.ts:47`; `web/src/app/dashboard/dashboard.component.ts:36`.
- Aprobación: `PLAN.md`, sección "Aprobación humana" (Pedro, 2026/10/26), incluye H-WEB-01.
- Impacto registrado: el token queda accesible a cualquier JavaScript del origen; un fallo de script podría permitir su lectura y reutilización.

## Contexto actual
- `SessionService` (`web/src/app/services/session.service.ts`) guarda token y usuario en `sessionStorage`, no en `localStorage`.
- `LoginComponent` llama a `SessionService.save` tras una respuesta con token; `DashboardComponent` lee token y usuario y llama a `clear` al cerrar sesión.
- Las preferencias permanecen en `localStorage`.
- La matriz marca H-WEB-01 como "Resuelto", pero la nota indica que el token sigue siendo accesible a JavaScript y no equivale a una cookie HttpOnly.

## Problema confirmado
- El token de sesión sigue legible por código JavaScript ejecutado en el origen. El cambio de almacenamiento reduce la persistencia, pero no elimina esa exposición.

## Comportamiento a preservar
- `POST /auth/login` con `username`, `password` y `client`; la respuesta debe seguir aportando `token` y `user`.
- `GET /api/tasks?owner=<username>` con cabecera `Authorization` que use el token de sesión.
- Sin token, el dashboard redirige a `/login`.
- Cerrar sesión elimina token y usuario del almacenamiento de sesión y navega a `/login`, sin solicitud de cierre de sesión al servidor.
- Las rutas `/` y no reconocidas redirigen a `/login`.

## Alcance
- Ubicación y ciclo de vida del token y del usuario en el cliente web.
- Pruebas de caracterización y de comportamiento de `SessionService`, `LoginComponent`, `DashboardComponent` y el flujo de autenticación.

## Fuera de alcance
- Cambios en `auth/` o `api/`, incluido cualquier cambio de formato del token o de su emisión.
- Migración a cookies HttpOnly o a otro mecanismo de sesión del servidor; requiere decisión de contrato no tomada.
- Cierre de sesión en el servidor.
- Hallazgos H-WEB-02 a H-WEB-06 y alertas de dependencias no relacionadas.

## Criterios de aceptación
- Tras un login exitoso, token y usuario se guardan en `sessionStorage` y no en `localStorage`. Verificación: prueba de `SessionService` y de `LoginComponent` que inspeccione ambos almacenamientos.
- Tras cerrar sesión, `getToken()` y `getUser()` devuelven `null`. Verificación: prueba de `SessionService.clear` y de `DashboardComponent`.
- La petición de tareas incluye `Authorization` con el token guardado. Verificación: prueba de `TasksService` que inspeccione la cabecera.
- Sin token, el dashboard redirige a `/login` sin solicitar tareas. Verificación: prueba del dashboard con `getToken` nulo.
- Las preferencias siguen en `localStorage`. Verificación: prueba de `preferences` o del login que compruebe la clave de preferencias.
- Ninguna ruta, payload ni cabecera de `/auth/login` o `/api/tasks` cambia respecto al comportamiento observado. Verificación: prueba de contrato del servicio de autenticación y de tareas.

## Contratos afectados/protegidos
- `POST /auth/login` (entrada `username`, `password`, `client`; salida `token`, `user`).
- `GET /api/tasks?owner=<username>` con cabecera `Authorization`.
- Rutas `/login`, `/dashboard` y redirecciones de `app.routes.ts`.
- Claves de almacenamiento de sesión: cambian de `localStorage` a `sessionStorage`; los usuarios con sesión previa deberán iniciar sesión de nuevo. Requiere confirmación.

## Riesgos, supuestos y preguntas abiertas
- Riesgo: el estado "Resuelto" puede interpretarse como cierre completo del hallazgo, aunque el token sigue accesible a JavaScript. Pendiente de decisión humana.
- Supuesto: `sessionStorage` es aceptable como medida intermedia. No está confirmado.
- Pregunta abierta: ¿el hallazgo se considera cerrado con `sessionStorage` o requiere una solución de servidor (cookie HttpOnly)? Eso cambia el contrato de `POST /auth/login`.
- Pregunta abierta: ¿se acepta que las sesiones existentes en `localStorage` se invaliden al desplegar?
- Pregunta abierta: ¿existe `docs/ENDPOINTS.md` acordado? Hoy no existe; el contrato se deriva del código.
- Pendiente de revisión humana antes de implementar.
