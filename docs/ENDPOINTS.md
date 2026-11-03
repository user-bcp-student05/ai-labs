# Contrato HTTP — API FastAPI

## Alcance y URL base

Esta sección documenta el contrato comprobado de la API de tareas y requerimientos. En desarrollo local, la URL base es `http://localhost:8000` (README.md). El contrato y los ejemplos se derivan de `api/app/routes.py`, `api/app/models.py`, `api/app/security.py`, `api/app/service.py` y `api/app/requirement_service.py`; las respuestas de ejemplo se comprobaron con `TestClient`.

La API valida tokens JWT firmados con HS256. El emisor debe compartir el secreto configurado como `API_TOKEN_SECRET`; la API no permite autenticar si el secreto falta o tiene menos de 32 bytes. El cambio del emisor queda fuera del alcance de esta entrega, por lo que el login actual no genera todavía tokens compatibles. Los ejemplos de esta sección son únicamente para el laboratorio local y no se deben exponer a redes no confiables.

## Autenticación común

Todos los endpoints requieren el header:

```http
Authorization: Bearer <token>
```

El token debe ser JWT firmado con HS256 e incluir los claims `sub` (identidad), `role` y `exp` (expiración Unix en segundos futura). La firma se valida usando `API_TOKEN_SECRET`, que debe contener al menos 32 bytes. La API no valida `issuer` ni `audience` porque todavía no existe un contrato acordado para esos claims. La identidad usada para autorizar recursos es `sub`; el valor `role` no concede permisos adicionales.

Para generar un token local de ejemplo y reutilizarlo como `$TOKEN` en los comandos `curl` siguientes:

```bash
TOKEN="$(python -c 'import jwt,os,time; print(jwt.encode({"sub":"student","role":"STUDENT","exp":int(time.time())+3600}, os.environ["API_TOKEN_SECRET"], algorithm="HS256"))')"
```

El esquema `Bearer` es obligatorio. Los tokens Base64 legados sin firma son rechazados.

Los errores de autenticación tienen HTTP 401 y este cuerpo:

```json
{"detail":"Invalid token"}
```

Ocurre si falta el header, el token tiene firma inválida, está malformado, expiró o no contiene los claims requeridos. Si `API_TOKEN_SECRET` no está configurado correctamente, la API responde HTTP 503 con `{"detail":"Authentication is not configured"}`.

---

## `GET /api/tasks`

### 1. Qué hace

Lista las tareas del usuario autenticado, ordenadas por identificador ascendente.

### 2. Autenticación

Requiere `Authorization: Bearer <token>` como se describe arriba.

### 3. Request

No tiene body. Parámetro query:

| Campo/parámetro | Tipo | Obligatorio | Descripción |
|---|---|---:|---|
| `owner` | string | No | Si se omite o está vacío, se usa el `username` del token. Si se proporciona, debe coincidir con esa identidad; de otro modo responde 403. |

Ejemplo completo:

```bash
curl -i "http://localhost:8000/api/tasks?owner=student" \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Response exitosa

HTTP **200 OK**. El resultado es una lista; puede ser vacía.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | integer | Identificador de la tarea en SQLite. |
| `title` | string | Título. |
| `description` | string | Descripción. |
| `status` | string | Estado de la tarea. |
| `owner` | string | Propietario, que en esta API es el usuario autenticado. |
| `priority` | string | Prioridad. |
| `createdAt` | string | Fecha/hora que genera SQLite con `datetime('now')`. |

Ejemplo comprobado con los registros iniciales:

```json
[
  {
    "id": 1,
    "title": "Refactor login",
    "description": "Separar responsabilidades en frontend",
    "status": "TODO",
    "owner": "student",
    "priority": "HIGH",
    "createdAt": "2026-11-02 22:19:49"
  },
  {
    "id": 2,
    "title": "Review API",
    "description": "Revisar seguridad de endpoints",
    "status": "IN_PROGRESS",
    "owner": "student",
    "priority": "MEDIUM",
    "createdAt": "2026-11-02 22:19:49"
  }
]
```

La fecha y los identificadores dependen de la base de datos local; los dos registros de ejemplo aparecen cuando la tabla se inicializa vacía.

### 5. Respuestas de error

| Código | Cuándo ocurre | Ejemplo de cuerpo |
|---|---|---|
| 401 | Falta el token o es inválido/expirado. | `{"detail":"Invalid token"}` |
| 403 | `owner` no vacío no coincide con el `username` del token. | `{"detail":"Forbidden"}` |
| 500 | Error interno no manejado, por ejemplo una falla de SQLite. | Respuesta `text/plain`: `Internal Server Error`. |

### 6. Notas de seguridad

La consulta usa siempre la identidad autenticada. El parámetro `owner` se conserva por compatibilidad, pero ya no permite consultar las tareas de otra identidad. La API exige un token firmado; el emisor todavía debe alinearse con este formato.

---

## `POST /api/tasks`

### 1. Qué hace

Crea una tarea asociada al usuario autenticado.

### 2. Autenticación

Requiere `Authorization: Bearer <token>` como se describe arriba.

### 3. Request

Body JSON:

| Campo/parámetro | Tipo | Obligatorio | Descripción |
|---|---|---:|---|
| `title` | string | No | Título; default `""`. |
| `description` | string | No | Descripción; default `""`. |
| `status` | string | No | Estado; default `"TODO"`. |
| `priority` | string | No | Prioridad; default `"MEDIUM"`. |
| `owner` | string o null | No | Si se omite, se asigna el usuario autenticado. Si se proporciona, debe coincidir con él. Un `null` explícito se convierte en el texto `"None"` y normalmente resulta en 403. |

Los valores enviados en estos campos se convierten a texto antes de procesarse (incluido un `null` explícito, que se convierte en `"None"`). El endpoint no define enumeraciones de valores válidos para estado o prioridad.

Ejemplo completo:

```bash
curl -i -X POST "http://localhost:8000/api/tasks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Draft API contract",
    "description": "Document task endpoints",
    "status": "TODO",
    "priority": "HIGH"
  }'
```

### 4. Response exitosa

HTTP **201 Created**. Devuelve la tarea creada.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | integer | Identificador asignado por SQLite. |
| `title` | string | Título almacenado. |
| `description` | string | Descripción almacenada. |
| `status` | string | Estado almacenado. |
| `owner` | string | `username` autenticado. |
| `priority` | string | Prioridad almacenada. |
| `createdAt` | string | Fecha/hora generada por SQLite. |

Ejemplo comprobado:

```json
{
  "id": 4,
  "title": "Draft API contract",
  "description": "Document task endpoints",
  "status": "TODO",
  "owner": "student",
  "priority": "HIGH",
  "createdAt": "2026-11-02 22:19:49"
}
```

Los valores de `id` y `createdAt` dependen de la base de datos y la hora de creación.

### 5. Respuestas de error

| Código | Cuándo ocurre | Ejemplo de cuerpo |
|---|---|---|
| 401 | Falta el token o es inválido/expirado. | `{"detail":"Invalid token"}` |
| 403 | `owner` indicado no coincide con el `username` del token. | `{"detail":"Forbidden"}` |
| 422 | Falta el body o no es un objeto JSON que Pydantic pueda validar. | `{"detail":[{"type":"model_attributes_type","loc":["body"],"msg":"Input should be a valid dictionary or object to extract fields from","input":[]}]}` |
| 500 | Error interno no manejado, por ejemplo una falla de persistencia. | Respuesta `text/plain`: `Internal Server Error`. |

### 6. Notas de seguridad

El servidor no permite asignar una tarea a otro propietario: la identidad del token determina `owner` y cualquier valor distinto recibe 403. La identidad proviene del claim `sub` del token firmado.

---

## `GET /api/summary`

### 1. Qué hace

Devuelve el total de tareas del usuario autenticado, agrupadas por estado, y el número de tareas abiertas de prioridad alta.

### 2. Autenticación

Requiere `Authorization: Bearer <token>` como se describe arriba.

### 3. Request

No tiene body. Parámetro query:

| Campo/parámetro | Tipo | Obligatorio | Descripción |
|---|---|---:|---|
| `owner` | string | No | Si se omite o está vacío, se usa el `username` del token. Si se proporciona, debe coincidir con esa identidad; de otro modo responde 403. |

Ejemplo completo:

```bash
curl -i "http://localhost:8000/api/summary?owner=student" \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Response exitosa

HTTP **200 OK**.

| Campo | Tipo | Descripción |
|---|---|---|
| `owner` | string | Usuario autenticado. |
| `total` | integer | Total de tareas del usuario. |
| `byStatus` | object de string a integer | Conteo de tareas por cada estado presente. |
| `highPriorityOpen` | integer | Tareas con prioridad `HIGH` cuyo estado no es `DONE` ni `ARCHIVED`. |

Ejemplo comprobado después de crear una tarea:

```json
{
  "owner": "student",
  "total": 3,
  "byStatus": {
    "TODO": 2,
    "IN_PROGRESS": 1
  },
  "highPriorityOpen": 2
}
```

### 5. Respuestas de error

| Código | Cuándo ocurre | Ejemplo de cuerpo |
|---|---|---|
| 401 | Falta el token o es inválido/expirado. | `{"detail":"Invalid token"}` |
| 403 | `owner` no vacío no coincide con el `username` del token. | `{"detail":"Forbidden"}` |
| 500 | Error interno no manejado, por ejemplo una falla de SQLite. | Respuesta `text/plain`: `Internal Server Error`. |

### 6. Notas de seguridad

El resumen consulta solo las tareas del `username` autenticado. `owner` se conserva como parámetro por compatibilidad, pero no puede seleccionar otra identidad.

---

## `POST /api/requirements`

### 1. Qué hace

Guarda un archivo de requerimientos y devuelve metadatos de la carga.

### 2. Autenticación

Requiere `Authorization: Bearer <token>` como se describe arriba.

### 3. Request

Body `multipart/form-data`:

| Campo/parámetro | Tipo | Obligatorio | Descripción |
|---|---|---:|---|
| `file` | archivo binario (`UploadFile`) | Sí | Archivo que se guarda en el directorio configurado por `WORKSHOP_UPLOAD_DIR`, o `./uploads` si no se define. |

Ejemplo completo, suponiendo que `requirements.md` existe en el directorio actual:

```bash
curl -i -X POST "http://localhost:8000/api/requirements" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@requirements.md;type=text/markdown"
```

### 4. Response exitosa

HTTP **201 Created**.

| Campo | Tipo | Descripción |
|---|---|---|
| `owner` | string | `username` autenticado. |
| `fileName` | string | Nombre recibido del archivo. |
| `storedAt` | string | Ruta construida en el servidor a partir del directorio de carga y el nombre recibido. |
| `size` | integer | Número de bytes leídos y escritos. |

Ejemplo completo suponiendo `WORKSHOP_UPLOAD_DIR=C:\workshop\uploads`; la ruta devuelta depende de la configuración y del sistema operativo:

```json
{
  "owner": "student",
  "fileName": "requirements.md",
  "storedAt": "C:\\workshop\\uploads\\requirements.md",
  "size": 19
}
```

### 5. Respuestas de error

| Código | Cuándo ocurre | Ejemplo de cuerpo |
|---|---|---|
| 401 | Falta el token o es inválido/expirado. | `{"detail":"Invalid token"}` |
| 400 | El parser multipart detecta un body malformado. | `{"detail":"There was an error parsing the body"}` |
| 422 | Falta el campo `file` o el body no puede analizarse como multipart. | `{"detail":[{"type":"missing","loc":["body","file"],"msg":"Field required","input":null}]}` |
| 500 | Error interno no manejado al leer o escribir el archivo. | Respuesta `text/plain`: `Internal Server Error`. |

### 6. Notas de seguridad

El código actual no valida ni normaliza el nombre, no limita extensión ni tamaño, lee el contenido completo en memoria y utiliza el nombre recibido para construir la ruta. No asumas que los archivos están restringidos a una extensión o tamaño. La política segura está pendiente de acuerdo (`H-API-04`); no uses esta carga con datos sensibles ni en una red no confiable.

---

## `GET /api/backend-health`

### 1. Qué hace

Consulta el endpoint de salud del servicio de autenticación configurado para la API.

### 2. Autenticación

Requiere `Authorization: Bearer <token>` como se describe arriba.

### 3. Request

No recibe parámetros ni body. El servidor usa `AUTH_HEALTH_URL`; si no está definida, consulta `http://localhost:8080/q/health`.

Ejemplo completo:

```bash
curl -i "http://localhost:8000/api/backend-health" \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Response exitosa

HTTP **200 OK** para una respuesta del servicio upstream, incluso si su código no es 200.

| Campo | Tipo | Descripción |
|---|---|---|
| `requestedBy` | string | `username` autenticado que hizo la consulta. |
| `status` | integer | Código HTTP recibido del servicio upstream; `0` si la solicitud falló por un error HTTP de urllib3 o el body no se pudo decodificar como UTF-8. |
| `body` | string | Body upstream decodificado como UTF-8; ante los errores anteriores contiene el mensaje genérico indicado. |

Ejemplo comprobado con transporte de prueba:

```json
{
  "requestedBy": "student",
  "status": 200,
  "body": "{\"status\":\"UP\"}"
}
```

Si falla la conexión de salud o la decodificación UTF-8, el endpoint sigue respondiendo HTTP 200 con:

```json
{
  "requestedBy": "student",
  "status": 0,
  "body": "Backend health check failed"
}
```

### 5. Respuestas de error

| Código | Cuándo ocurre | Ejemplo de cuerpo |
|---|---|---|
| 401 | Falta el token o es inválido/expirado. | `{"detail":"Invalid token"}` |
| 500 | Excepción no manejada distinta de los errores HTTP de urllib3 y decodificación UTF-8 que el servicio captura. | Respuesta `text/plain`: `Internal Server Error`. |

Un error de conexión upstream no produce por sí mismo HTTP 5xx de esta API; se representa con HTTP 200 y `status: 0` en el JSON.

### 6. Notas de seguridad

`AUTH_HEALTH_URL` se lee de configuración del servidor, no de parámetros del cliente. El cuerpo de error de la API es genérico; los detalles de la excepción se registran en el log del servidor. La identidad proviene del token firmado.

---

## Preguntas abiertas

- **H-API-01:** El verificador API-only requiere HS256 y los claims `sub`, `role` y `exp`, pero el emisor aún no se ha actualizado ni se han acordado `issuer`/`audience`. El login actual no es interoperable con este verificador hasta que se coordine ese cambio.
- **H-API-04:** ¿Qué extensiones y tamaño máximo se permitirán para archivos, y qué política de nombre de almacenamiento se acordará?
- La ubicación absoluta en `storedAt` depende de `WORKSHOP_UPLOAD_DIR`, sistema operativo y directorio de trabajo.
