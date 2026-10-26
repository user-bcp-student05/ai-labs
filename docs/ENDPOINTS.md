# Contrato HTTP observado — web

Este documento describe lo que la aplicación Angular implementa actualmente.
Se deriva del código frontend; no representa una confirmación del backend ni
una prueba de integración con servicios reales. Las URLs base provienen de
`web/src/environments/environment.ts`.

## POST /auth/login

### 1. Quién lo llama

`LoginComponent` llama a `AuthService.login()`, que realiza la solicitud HTTP.
El endpoint completo configurado es `http://localhost:8080/auth/login`.

### 2. Qué envía

| Parte | Campo | Valor / requisito |
|---|---|---|
| Método | — | `POST` |
| Header | `Content-Type` | `application/json` |
| Body | `username` | String introducido en el formulario; no vacío después de quitar espacios para validación. |
| Body | `password` | String introducido en el formulario; no vacío después de quitar espacios para validación. |
| Body | `client` | Siempre `angular-workshop`. |
| Timeout | — | 5000 ms, aplicado mediante `AbortSignal.timeout`. |

Ejemplo con las credenciales ficticias del laboratorio documentadas en
`README.md`:

```http
POST /auth/login HTTP/1.1
Host: localhost:8080
Content-Type: application/json

{
  "username": "student",
  "password": "Workshop123!",
  "client": "angular-workshop"
}
```

### 3. Qué espera recibir en éxito

Se considera éxito cualquier estado HTTP para el que `Response.ok` sea `true`
(rango 200–299), seguido de un cuerpo JSON que pase la validación del cliente.
El código no exige un estado 200 específico.

| Campo | Tipo | Requisito |
|---|---|---|
| `token` | string | Obligatorio y no vacío. |
| `user` | objeto | Obligatorio. |
| `user.username` | string | Obligatorio. |
| `user.displayName` | string | Opcional; si aparece, debe ser string. |
| `user.role` | string | Opcional; si aparece, debe ser string. |

Ejemplo de forma aceptada (el token es solo un marcador, no una credencial):

```json
{
  "token": "<token-devuelto-por-el-backend>",
  "user": {
    "username": "student",
    "displayName": "Workshop Student",
    "role": "STUDENT"
  }
}
```

Si la respuesta valida, la UI guarda token y usuario mediante
`SessionService`, guarda las preferencias locales y navega a `/dashboard`.

### 4. Cómo reacciona ante errores

| Caso | Comportamiento del cliente | Resultado visible |
|---|---|---|
| Usuario vacío o compuesto solo por espacios | No envía la solicitud. | `Ingrese un usuario.` |
| Contraseña vacía o compuesta solo por espacios | No envía la solicitud. | `Ingrese una contraseña.` |
| Estado HTTP fuera del rango 200–299 (incluido 401) | `requestJson` rechaza la operación; la UI no interpreta el cuerpo de error. | `No se pudo autenticar. Intente de nuevo.` |
| Timeout de 5 segundos | La señal aborta la solicitud y el error se captura en el componente. | `No se pudo autenticar. Intente de nuevo.` |
| Error de red u otra excepción de `fetch` | El error se captura en el componente; no se distingue de otros errores de transporte. | `No se pudo autenticar. Intente de nuevo.` |
| JSON inválido o cuerpo que no puede analizarse | `requestJson` rechaza la operación. | `No se pudo autenticar. Intente de nuevo.` |
| JSON válido pero sin token no vacío, sin `user` válido o con tipos no aceptados | `AuthService` devuelve `null`; el componente no guarda sesión ni navega. | `El backend respondió sin token.` |
| Excepción al guardar sesión/preferencias o navegar | La excepción cae en el mismo `catch` del login. | `No se pudo autenticar. Intente de nuevo.` |

En los errores capturados por el componente se escribe el objeto de error en
la consola; no se muestra el detalle del backend al usuario. El botón vuelve a
habilitarse al terminar la operación.

### 5. Notas de seguridad

- Los errores HTTP y de transporte se presentan con texto genérico, no con el
  mensaje devuelto por el backend.
- Los mensajes de la UI usan interpolación Angular; no se usa `[innerHTML]`
  para renderizar datos dinámicos.
- `SessionService` guarda token y usuario en `sessionStorage` bajo las claves
  `workshop_token` y `workshop_user`. Esto limita la persistencia a la sesión
  de la pestaña, pero sigue siendo accesible a JavaScript del mismo origen y
  no equivale a una cookie HttpOnly.
- La contraseña solo forma parte del body del login; no se persiste en el
  almacenamiento de sesión por este flujo.

## GET /api/tasks

### 1. Quién lo llama

`DashboardComponent` obtiene token y usuario de `SessionService` y llama a
`TasksService.getTasks(owner, token)`. El endpoint completo configurado es
`http://localhost:8000/api/tasks`.

### 2. Qué envía

| Parte | Campo | Valor / requisito |
|---|---|---|
| Método | — | `GET` |
| Header | `Authorization` | Esquema `Bearer` seguido por el token leído de `sessionStorage`. |
| Query | `owner` | `username` de `UserProfile`; `URLSearchParams` codifica el valor. |
| Body | — | No se envía body. |
| Timeout | — | El código no configura un timeout específico para esta solicitud. |

Ejemplo para el usuario ficticio `student`. El valor del header se representa
como expresión para no incluir un token:

```http
GET /api/tasks?owner=student HTTP/1.1
Host: localhost:8000
Authorization: "Bearer " + token-de-sessionStorage
```

### 3. Qué espera recibir en éxito

Se considera éxito cualquier estado HTTP para el que `Response.ok` sea `true`
(rango 200–299), seguido de un cuerpo JSON que sea un array. Un array vacío es
válido.

| Campo | Tipo | Requisito |
|---|---|---|
| raíz | array de objetos | Obligatorio. |
| `title` | string | Obligatorio en cada objeto. |
| `status` | string | Obligatorio en cada objeto. |
| `description` | string | Opcional; si aparece, debe ser string. |
| `owner` | string | Opcional; si aparece, debe ser string. |
| `priority` | string | Opcional; si aparece, debe ser string. |

Ejemplo de respuesta aceptada:

```json
[
  {
    "title": "Preparar requerimiento",
    "description": "Revisar el flujo de aprobación",
    "owner": "student",
    "priority": "HIGH",
    "status": "TODO"
  }
]
```

El dashboard conserva la lista recibida en `tasks`, excluye de
`visibleTasks` los elementos cuyo estado sea exactamente `ARCHIVED`, agrega
una etiqueta derivada de prioridad y owner, y muestra las tareas restantes.

### 4. Cómo reacciona ante errores

| Caso | Comportamiento del cliente | Resultado visible |
|---|---|---|
| No hay token en `SessionService` | No envía la solicitud; navega a `/login`. | Se muestra la pantalla de login. |
| Estado HTTP fuera del rango 200–299, incluido un token rechazado por el backend (por ejemplo 401) | `requestJson` rechaza; el dashboard captura el error. No distingue el estado ni analiza el body. | `No se pudo cargar el dashboard.` |
| Error de red, fallo de `fetch` o abortado externamente | El dashboard captura el error; no hay timeout propio configurado en esta solicitud. | `No se pudo cargar el dashboard.` |
| JSON inválido o cuerpo no analizable | `requestJson` rechaza y el dashboard captura el error. | `No se pudo cargar el dashboard.` |
| JSON válido que no es array, o con elemento sin `title`/`status` string | `TasksService` lanza un error genérico y el dashboard lo captura. | `No se pudo cargar el dashboard.` |
| Campo opcional presente con tipo distinto de string, incluido `null` | La validación rechaza la lista completa; el dashboard captura el error. | `No se pudo cargar el dashboard.` |
| Array vacío | Se trata como respuesta válida. | El dashboard deja de cargar y presenta la lista vacía. |

En los errores se registra el objeto de error en la consola; la UI presenta el
mensaje genérico y deja el estado de carga. El comportamiento de campos
opcionales `null` está sujeto a confirmación del contrato del backend; el
cliente actual los rechaza cuando están presentes.

### 5. Notas de seguridad

- La solicitud envía el token en la cabecera `Authorization`; no se añade a la
  URL.
- El token se lee del `sessionStorage` centralizado en `SessionService`. Como
  cualquier almacenamiento web accesible desde JavaScript, no protege frente
  a código malicioso ejecutado en el mismo origen.
- El valor `owner` se codifica como parámetro de query. El cliente lo deriva
  del usuario guardado; este comportamiento por sí solo no confirma que el
  backend autorice el owner contra la identidad del token.
- No se usa `[innerHTML]` para mostrar el contenido de error.

## Preguntas abiertas de contrato

- ¿Qué estados HTTP concretos y qué cuerpos de error publica cada backend?
  El frontend solo discrimina `Response.ok` frente a no-2xx.
- ¿Los campos opcionales de tareas pueden ser `null`? El cliente actual los
  rechaza; el contrato backend no está disponible en este repositorio.
- ¿Qué formato, expiración y semántica de revocación tiene el token? El
  frontend solo exige un string no vacío y no implementa renovación.
- ¿Debe el backend autorizar `owner` contra el usuario autenticado, o el
  comportamiento actual de query refleja un contrato deliberado?
- No hay solicitud HTTP de logout en este flujo: el cierre de sesión elimina
  las claves locales y navega a `/login`.
