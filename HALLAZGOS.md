# Hallazgos

## Contrato observado de API (no acordado)

No existe `docs/ENDPOINTS.md`. El comportamiento de partida se observó en la implementación antes de separar sus capas; queda pendiente acordar y validar el contrato antes de nuevas modificaciones.

| Método y ruta | Contrato observado |
|---|---|
| `GET /api/tasks` | Requiere `Authorization`; acepta `owner` opcional y, si falta, usa el usuario del token. Devuelve una lista con `id`, `title`, `description`, `status`, `owner`, `priority` y `createdAt`. `owner` enviado por el cliente sustituía al del token. |
| `POST /api/tasks` | Requiere `Authorization`; recibe `title`, `description`, `status`, `priority` y `owner`, con defaults observados. Devuelve la tarea con HTTP 201; el cliente podía indicar `owner`. |
| `GET /api/summary` | Requiere `Authorization`; acepta `owner` opcional y devuelve `owner`, `total`, `byStatus` y `highPriorityOpen`. |
| `POST /api/requirements` | Requiere `Authorization`; recibe `file` multipart y responde HTTP 201 con `owner`, `fileName`, `storedAt` y `size`. |
| `GET /api/backend-health` | Requiere `Authorization`; consulta `AUTH_HEALTH_URL` o `http://localhost:8080/q/health` y devuelve `requestedBy`, `status` y `body`. Ante una excepción devuelve estado `0` y el texto de la excepción. |

Flujo de token observado antes de la refactorización: Base64 con `username`, `role`, expiración y un secreto fijo; no verificaba firma, emisor ni audiencia (`api/app/main.py:14-26` en la versión observada).

Persistencia observada antes de la refactorización: `create_app` abría SQLite, creaba `tasks` y cargaba tres registros cuando la tabla estaba vacía; las rutas compartían la conexión (`api/app/main.py:29-43`, `api/app/main.py:67-105` en la versión observada).

Carga observada antes de la refactorización: se configuraba el directorio con `WORKSHOP_UPLOAD_DIR` o `./uploads`, se componía la ruta con el nombre recibido y se escribía el archivo leído completo, sin controles visibles de nombre, extensión ni tamaño (`api/app/main.py:29-33`, `api/app/main.py:107-112` en la versión observada).

## Matriz de seguimiento

La matriz conserva la evidencia de discovery; los estados reflejan la implementación actual. El estado de aprobación humana quedó confirmado antes de implementar y está registrado en `PLAN.md`.

| id | componente | hallazgo | tipo | explicacion | evidencia (archivo:linea) | severidad | estado |
|---|---|---|---|---|---|---|---|
| H-API-01 | api | Token Base64 con secreto embebido | Vulnerabilidad | El contenido solo está codificado, el secreto está fijado en el código y no se validan firma, emisor ni audiencia; un token fabricado puede aceptarse si satisface el formato y la expiración. | api/app/main.py:14, api/app/main.py:17-26 | alta | Pendiente |
| H-API-02 | api | Autorización de tareas controlada por `owner` del cliente | Vulnerabilidad | La identidad del token no limitaba la lectura, el resumen ni la creación: un cliente autenticado podía seleccionar otro propietario y consultar o atribuirle tareas. | api/app/main.py:68-71, api/app/main.py:78-84, api/app/main.py:91-94 | alta | Resuelto |
| H-API-03 | api | Consultas SQL construidas por concatenación | Vulnerabilidad | Filtros e inserciones incorporaban valores recibidos del cliente directamente en SQL; entradas con sintaxis SQL podían alterar consultas y operaciones sobre la base de datos. | api/app/main.py:70-71, api/app/main.py:84-87, api/app/main.py:93 | alta | Resuelto |
| H-API-04 | api | Carga de archivos usa directamente `file.filename` | Vulnerabilidad | El nombre se unía al directorio y se escribía sin normalización ni controles de extensión o tamaño; nombres manipulados podían escapar del directorio previsto y archivos grandes consumir memoria y disco. | api/app/main.py:107-112 | alta | Pendiente |
| H-API-05 | api | Dependencias `urllib3 2.5.0` y `python-multipart 0.0.21` | Sugerencia | `urllib3 2.5.0` tenía advisories corregidos en versiones posteriores; `python-multipart 0.0.21` precedía correcciones de traversal y DoS. Se actualizaron ambos paquetes y las pruebas multipart pasaron. | api/requirements.txt:4-5 | media | Resuelto |
| H-API-06 | api | Rutas, persistencia, reglas y serialización concentradas en un archivo | Refactor | La configuración de SQLite, autenticación, SQL, reglas de resumen, serialización y endpoints convivían en `main.py`, dificultando probar y cambiar cada responsabilidad aisladamente. | api/app/main.py:17-127 | baja | Resuelto |
| H-API-07 | api | Tipado crudo, excepciones amplias, lógica anidada y duplicación | Refactor | Los payloads y respuestas usaban `dict[str, Any]`, había capturas generales y errores crudos, cálculo de prioridad anidado y proyección SQL repetida; esto reducía validación y claridad. | api/app/main.py:17-26, api/app/main.py:56-68, api/app/main.py:70, api/app/main.py:78, api/app/main.py:87, api/app/main.py:91-104, api/app/main.py:117-121 | baja | Resuelto |

## Seguimiento de corrección — api

| id | componente | estado actual | nota de resolución o pendiente |
|---|---|---|---|
| H-API-01 | api | Pendiente | El error de autenticación ahora es 401 genérico, pero el token sigue siendo Base64 legado (`api/app/security.py:14-22`). Falta acordar algoritmo, issuer, audience, claims y mecanismo de clave con el emisor antes de implementar JWT real. |
| H-API-02 | api | Resuelto | Listado, resumen y alta se autorizan con la identidad verificada; un `owner` distinto recibe 403 (`api/app/service.py:27-45`, `api/app/service.py:49-72`). |
| H-API-03 | api | Resuelto | Filtros, inserción y recuperación de filas usan parámetros SQLite; los valores con apóstrofes se tratan como literales (`api/app/repository.py:38-70`, `api/app/repository.py:73-78`). |
| H-API-04 | api | Pendiente | La carga válida conserva el contrato, pero aún guarda con el nombre recibido y lee todo el archivo (`api/app/requirement_service.py:12-19`). Falta acordar allowlist de extensiones y tamaño máximo. |
| H-API-05 | api | Resuelto | Se actualizaron los pins a `urllib3==2.8.0` y `python-multipart==0.0.33`, superando las versiones corregidas para los advisories revisados; GitHub Advisory API devolvió `[]` para esas versiones (`api/requirements.txt:4-5`). |
| H-API-06 | api | Resuelto | Se separaron configuración, rutas, modelos, reglas, persistencia y carga en módulos del componente (`api/app/main.py:18-49`, `api/app/routes.py:22-68`, `api/app/repository.py:23-99`, `api/app/service.py:23-94`, `api/app/models.py:7-55`). |
| H-API-07 | api | Resuelto | Requests/responses tienen modelos Pydantic tipados, el resumen evita anidamiento profundo y los errores no exponen el texto crudo de health (`api/app/models.py:7-55`, `api/app/service.py:49-94`, `api/app/security.py:21-24`). |
