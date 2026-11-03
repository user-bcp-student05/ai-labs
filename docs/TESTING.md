# Pruebas — API FastAPI

## Alcance y matriz de casos

Los casos se derivan de [ENDPOINTS.md](./ENDPOINTS.md). La suite usa `TestClient`,
una base SQLite y un directorio de carga temporales por prueba; las llamadas al
servicio de salud y los fallos internos se simulan para que los resultados sean
deterministas.

| Endpoint | Caso | Tipo | Resultado esperado |
|---|---|---|---|
| Todas las rutas protegidas | JWT HS256 válido con claims `sub`, `role` y `exp` | Autenticación | La solicitud se procesa con la identidad `sub`. |
| Todas las rutas protegidas | Token ausente, inválido, expirado, alterado o en formato Base64 legado | Error de autenticación | HTTP 401 `{"detail":"Invalid token"}`. |
| Todas las rutas protegidas | `API_TOKEN_SECRET` ausente o menor de 32 bytes | Error de configuración | HTTP 503 `{"detail":"Authentication is not configured"}`. |
| `GET /api/tasks` | Lista inicial del usuario autenticado y conserva los campos del contrato | Camino feliz | HTTP 200; lista de tareas con `id`, `title`, `description`, `status`, `owner`, `priority` y `createdAt`. |
| `GET /api/tasks` | `owner` vacío; solicitud con token ausente | Borde / error | HTTP 200 usando la identidad; sin autenticación, HTTP 401 `{"detail":"Invalid token"}`. |
| `GET /api/tasks` | Intento de leer tareas de otro `owner` | Error de autorización | HTTP 403 `{"detail":"Forbidden"}`. |
| `GET /api/tasks` | Falla simulada de persistencia | Error interno | HTTP 500, texto `Internal Server Error`, sin detalles internos. |
| `POST /api/tasks` | Alta válida y alta con los defaults del body vacío | Camino feliz / borde | HTTP 201; respuesta con la tarea y defaults `title=""`, `description=""`, `status="TODO"`, `priority="MEDIUM"`. |
| `POST /api/tasks` | `owner` de otra identidad; token ausente; body que no es objeto JSON | Error | HTTP 403 `{"detail":"Forbidden"}`; HTTP 401 `{"detail":"Invalid token"}`; HTTP 422 de validación. |
| `POST /api/tasks` | Falla simulada de persistencia | Error interno | HTTP 500, texto `Internal Server Error`, sin detalles internos. |
| `GET /api/summary` | Conteos del usuario autenticado y exclusión de tareas `DONE`/`ARCHIVED` de `highPriorityOpen` | Camino feliz / borde | HTTP 200 con `owner`, `total`, `byStatus` y `highPriorityOpen` conforme al contrato. |
| `GET /api/summary` | `owner` vacío; intento de consultar otro `owner`; token ausente | Borde / error | HTTP 200 usando la identidad; HTTP 403 ante otra identidad; HTTP 401 sin autenticación. |
| `GET /api/summary` | Falla simulada de persistencia | Error interno | HTTP 500, texto `Internal Server Error`, sin detalles internos. |
| `POST /api/requirements` | Carga válida | Camino feliz | HTTP 201; `owner`, `fileName`, `storedAt` y `size` coinciden con la carga. |
| `POST /api/requirements` | Archivo vacío sin extensión; archivo de 1 MiB | Borde observado | HTTP 201; tamaño reportado como 0 y 1 MiB respectivamente. El tamaño de 1 MiB es una muestra, **no** un límite máximo documentado o implementado. |
| `POST /api/requirements` | Multipart malformado; falta el campo `file`; falta autenticación | Error | HTTP 400 `{"detail":"There was an error parsing the body"}`; HTTP 422 por campo requerido; HTTP 401 `{"detail":"Invalid token"}`. |
| `POST /api/requirements` | Falla simulada al guardar | Error interno | HTTP 500, texto `Internal Server Error`, sin detalles internos. |
| `GET /api/backend-health` | Upstream responde correctamente; upstream responde 503; body UTF-8 vacío | Camino feliz / borde | HTTP 200; `requestedBy`, `status` y `body` reflejan al usuario y la respuesta upstream, incluso si `status` upstream es 503. |
| `GET /api/backend-health` | Error HTTP de urllib3 o body no UTF-8; token ausente | Error upstream / error HTTP | En los dos errores upstream capturados: HTTP 200 con `status: 0` y body genérico. Sin autenticación: HTTP 401 `{"detail":"Invalid token"}`. |
| `GET /api/backend-health` | Excepción no manejada distinta de los errores upstream capturados | Error interno | HTTP 500, texto `Internal Server Error`, sin detalles internos. |

El caso de lectura cruzada es `test_rejects_requested_owner_override`: comprueba
el rechazo para `GET /api/tasks`, `GET /api/summary` y `POST /api/tasks`. Así se
verifica que el token determina la identidad y no se puede leer o atribuir una
tarea a otro propietario.

## Código de los tests

El código ejecutable completo, incluidos los casos de camino feliz, borde,
autenticación, autorización y error de cada ruta, se mantiene en
[api/tests/test_api.py](../api/tests/test_api.py). Esa es la fuente de verdad
para evitar mantener una copia documental distinta de los tests. Funciones
añadidas para los casos que faltaban:

```text
test_empty_task_payload_uses_documented_defaults
test_empty_owner_query_uses_authenticated_identity
test_uploads_empty_file_without_extension
test_uploads_one_megabyte_without_a_configured_size_limit
test_malformed_multipart_returns_documented_bad_request
test_missing_requirement_file_returns_documented_validation_error
test_task_endpoints_return_generic_internal_server_error
test_requirement_write_failure_returns_generic_internal_server_error
test_unhandled_backend_health_error_returns_generic_internal_server_error
test_backend_health_preserves_upstream_error_status_in_success_response
test_backend_health_decode_failure_returns_documented_unavailable_response
test_all_endpoints_reject_missing_authentication
test_task_creation_rejects_non_object_body
test_rejects_tampered_token
test_rejects_expired_token
test_rejects_missing_or_invalid_identity_claims
test_rejects_legacy_unsigned_token
test_reports_missing_token_secret_as_configuration_error
```

La suite también conserva los tests previos de contrato, SQL con apóstrofes,
autorización por identidad y respuesta genérica de health. Los fallos de
persistencia, filesystem y upstream se inyectan en los tests; no se usan
servicios externos ni credenciales reales.

## Ejecuciones y cobertura

Todas las ejecuciones de esta sección corresponden a **componente `api`** y
verifican los contratos relacionados con **H-API-01 a H-API-07**. Las pruebas
asociadas de forma directa a los hallazgos de seguridad pendientes son
H-API-01 (firma y claims del token, rechazo del formato legado y configuración
fallida) y H-API-04 (comportamiento actual de carga).

| Momento | Comando | Directorio | Código de salida | Resultado |
|---|---|---|---:|---|
| Base, antes de añadir casos | `& .\.venv\Scripts\python.exe -m pytest --cov=app --cov-branch --cov-report=term-missing` | `api/` | 0 | 11 pasaron; cobertura global reportada como 97% redondeada por pytest-cov. |
| Suite ampliada | `& .\.venv\Scripts\python.exe -m pytest --cov=app --cov-branch --cov-report=term-missing --cov-fail-under=85` | `api/` | 0 | 31 pasaron, 1 advertencia de deprecación de Starlette; cobertura global exacta 97.42%; gate 85% aprobado. |
| Implementación H-API-01 | `python tools/lab.py test api` | raíz `ai-labs/` | 0 | 37 pasaron; cobertura global 97.56%; `app/security.py` 100%; gate 85% aprobado. Una advertencia de deprecación de Starlette. |
| Higiene del diff | `git diff --check` | raíz `ai-labs/` | 0 | Sin errores de whitespace. |

**Método de medición:** pytest-cov/coverage.py sobre `app`, con ramas habilitadas
(`--cov=app --cov-branch`); el reporte incluye statements y ramas, no mide el
código de tests. En la ejecución final el reporte total fue 224 statements,
3 no cubiertos, 22 ramas y 3 parciales. La cobertura branch-aware fue
**240/246 elementos = 97.56%** (221/224 statements cubiertos; las ramas se
incluyen en el total calculado por coverage.py).

**Cobertura del código modificado:** `api/app/security.py` quedó completamente
cubierto (100% con ramas habilitadas); la cobertura global de `api/` fue 97.56%, ambas por encima del
umbral de 85%. La ejecución actual no valida interoperabilidad con el emisor
de tokens, que permanece fuera del alcance API-only.

## Fallos, pendientes y pruebas propuestas

### Fallos observados

- Ningún test falló en la ejecución final.
- La ejecución final emitió una advertencia de deprecación de
  `starlette.testclient` sobre `anyio.abc.BlockingPortal`; no impidió la suite.

### Pendientes

- **H-API-01:** la API ahora exige HS256 con `sub`, `role` y `exp`, pero el
  emisor sigue fuera de alcance y no genera este formato. El flujo integrado de
  login no es interoperable hasta coordinar el cambio. `issuer` y `audience`
  tampoco se validan porque siguen sin contrato acordado.
- **H-API-04:** la API todavía no define ni aplica extensiones permitidas,
  tamaño máximo o normalización del nombre. Los tests de archivo sin extensión
  y de 1 MiB registran el comportamiento actual; no representan una garantía de
  carga segura. No se ha probado traversal de rutas ni se ha asignado un límite
  de tamaño arbitrario.

### Pruebas propuestas, no ejecutadas

- Tras coordinar H-API-01 con el emisor: prueba de interoperabilidad con su
  token firmado, claims acordados y rotación de claves. emisor: token con firma inválida, issuer y
  audience incorrectos, expiración y claims obligatorios.
- Tras acordar H-API-04: normalización de nombres, rechazo de extensiones no
  permitidas y pruebas justo por debajo, en y por encima del máximo de bytes.

## Documentos consultados

- `README.md`
- `RETO.md`
- `docs/GOOD_PRACTICES.md`
- `HALLAZGOS.md`
- `PLAN.md`
- `docs/ENDPOINTS.md`
- `api/tests/test_api.py`
- `api/app/routes.py`, `api/app/models.py`, `api/app/security.py`,
  `api/app/service.py`, `api/app/repository.py` y
  `api/app/requirement_service.py`
