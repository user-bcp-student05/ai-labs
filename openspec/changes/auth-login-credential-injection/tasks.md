# Tasks

## 1. Caracterizacion antes del cambio

- [x] 1.1 Ampliar `AuthResourceTest` para comprobar login valido (`200`, `user.username` y `token`), credenciales ordinarias invalidas (`401`, sin `token`) y la validacion HTTP 400 existente para credenciales requeridas ausentes o en blanco; ejecutar la prueba desde `auth/` con `AUTH_DB_URL` apuntando a una base SQLite temporal y confirmar esos resultados antes de cambiar el lookup.
- [x] 1.2 Agregar los dos escenarios del Issue a `AuthResourceTest`: entrada indicada en `username` con la contrasena valida y entrada indicada en `password` con el usuario valido; comprobar que cada caso espera `401` y ausencia de `token`, y ejecutar la prueba desde `auth/` antes de implementar para confirmar que ambos casos reproducen el comportamiento vulnerable.

## 2. Correccion del lookup

- [x] 2.1 Cambiar solo `LegacyDatabase.findByCredentials` para enlazar `username` y `password` como parametros JDBC, conservando el mapeo de `UserRecord`; ejecutar `AuthResourceTest` desde `auth/` con una base SQLite temporal y comprobar que pasan los escenarios de caracterizacion y los dos casos de rechazo del Issue.

## 3. Validacion del componente

- [x] 3.1 Ejecutar `mvn test` desde `auth/` con `AUTH_DB_URL` aislado y confirmar que toda la suite pasa, incluidos HTTP 200 para credenciales validas y HTTP 401 sin `token` para ambas entradas especificadas.
- [x] 3.2 Ejecutar `mvn verify` desde `auth/` y revisar el reporte JaCoCo para comprobar la meta de cobertura de al menos 85% del codigo modificado, sin desactivar quality gates.
- [x] 3.3 Revisar el diff final desde la raiz y confirmar que los cambios funcionales y pruebas se limitan a `auth/`, sin cambios a `AuthResource`, emision del token, otros componentes ni documentos generales. Diff revisado desde la raiz: cambios funcionales y pruebas solo en `auth/` (`LegacyDatabase.java`, `AuthResourceTest.java`); `docs/TESTING.md` incluye la evidencia de caracterizacion de H-AUTH-01 (tarea 1). Diff aprobado por revision humana, segun indicacion del usuario.