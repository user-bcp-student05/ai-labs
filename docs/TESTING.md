# Pruebas y evidencia — web

## Alcance

Estas pruebas verifican el flujo Angular contra respuestas HTTP simuladas con
`fetch`. No conectan con los servicios reales ni confirman el contrato del
backend. El contrato de referencia es el observado en
[`ENDPOINTS.md`](./ENDPOINTS.md). Los casos de campos opcionales de tareas con
valor `null` quedan fuera hasta aclarar el contrato; H-WEB-05 permanece
Pendiente en `HALLAZGOS.md`.

## Matriz de casos

| flujo | caso | tipo | resultado esperado |
|---|---|---|---|
| Login → dashboard → tareas | Login válido seguido de respuesta válida de tareas | Camino feliz | Envía el payload documentado, guarda token/usuario en sesión, navega a `/dashboard`, envía `owner` y autorización, presenta tareas visibles y finaliza carga. |
| Login | Usuario vacío o solo espacios | Borde | No envía solicitud; muestra `Ingrese un usuario.` |
| Login | Contraseña vacía o solo espacios | Borde | No envía solicitud; muestra `Ingrese una contraseña.` |
| Login | HTTP 2xx con respuesta sin token válido | Borde | No guarda sesión ni navega; muestra `El backend respondió sin token.` |
| Login | Servicio de autenticación devuelve HTTP 503 | Error | El servicio rechaza con error genérico; la UI muestra `No se pudo autenticar. Intente de nuevo.` |
| Login | Servicio inaccesible (rechazo de `fetch`) | Error | El componente muestra el mensaje genérico, sin exponer el detalle de transporte. |
| Login | Timeout configurado de 5000 ms | Error | El servicio pasa una señal creada con 5000 ms; al simular el rechazo por timeout, la UI presenta el mensaje genérico. |
| Login | HTTP 401 | Error | El servicio rechaza la respuesta no-2xx con error genérico; no se usa el cuerpo de error del backend en la UI. |
| Login | HTTP 2xx con JSON inválido | Error | El parser rechaza la respuesta y la UI muestra el mensaje genérico. |
| Tareas | Token Bearer inválido; backend devuelve HTTP 401 | Error | El servicio rechaza la respuesta; el dashboard termina carga y muestra `No se pudo cargar el dashboard.` |
| Tareas | Servicio inaccesible (rechazo de `fetch`) | Error | El servicio rechaza; el dashboard presenta el error genérico y deja de cargar. |
| Tareas | HTTP 2xx con JSON inválido | Error | El parser rechaza; el dashboard presenta el error genérico. |
| Tareas | HTTP 2xx con cuerpo que no es array de tareas | Error | El servicio rechaza la respuesta inesperada; el dashboard presenta el error genérico. |
| Tareas | Array vacío | Borde | Se acepta como respuesta válida; el dashboard finaliza la carga sin tareas visibles. |
| Sesión / dashboard | No hay token | Borde | No consulta tareas y navega a `/login`. |

## Código de las pruebas

### Camino feliz integrado

Prueba real de los componentes y servicios, con el transporte de red simulado:
`web/src/app/auth-flow.spec.ts:48`.

```ts
it('logs in, stores the session, and loads the user tasks', async () => {
  const user = { username: 'student', displayName: 'Workshop Student', role: 'STUDENT' };
  const tasks = [{
    title: 'Workshop task',
    description: 'Observed task',
    owner: 'student',
    priority: 'HIGH',
    status: 'TODO'
  }];
  fetchMock
    .mockResolvedValueOnce(new Response(JSON.stringify({ token: 'test-access-token', user }), {
      status: 200
    }))
    .mockResolvedValueOnce(new Response(JSON.stringify(tasks), { status: 200 }));

  const sessionService = new SessionService();
  const login = new LoginComponent(
    router as unknown as Router,
    new AuthService(),
    sessionService
  );
  login.username = 'student';
  login.password = 'test-password';

  await login.login();

  expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  expect(sessionService.getToken()).toBe('test-access-token');
  expect(sessionService.getUser()).toEqual(user);

  const dashboard = new DashboardComponent(
    router as unknown as Router,
    changeDetector as ChangeDetectorRef,
    zone as unknown as NgZone,
    new TasksService(),
    sessionService
  );
  await dashboard.ngOnInit();

  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(fetchMock.mock.calls[1][0]).toBe('http://localhost:8000/api/tasks?owner=student');
  expect(fetchMock.mock.calls[1][1]).toEqual({
    headers: { Authorization: 'Bearer test-access-token' }
  });
  expect(dashboard.visibleTasks.map((task) => task.title)).toEqual(['Workshop task']);
  expect(dashboard.loading).toBe(false);
});
```

### Borde de login y errores de autenticación

Los casos de campos vacíos y respuesta sin token están en
`web/src/app/login/login.component.spec.ts:42`,
`web/src/app/login/login.component.spec.ts:51` y
`web/src/app/login/login.component.spec.ts:80`; sus expectativas incluyen que
no se envíe login para campos vacíos y que una respuesta nula no navegue. Las
pruebas del servicio están en `web/src/app/services/auth.service.spec.ts`.

```ts
it('requires a username before sending a request', async () => {
  component.username = ' ';

  await component.login();

  expect(component.message).toBe('Ingrese un usuario.');
  expect(authService.login).not.toHaveBeenCalled();
});

it('requires a password before sending a request', async () => {
  component.username = 'student';
  component.password = ' ';

  await component.login();

  expect(component.message).toBe('Ingrese una contraseña.');
  expect(authService.login).not.toHaveBeenCalled();
});

it('shows a message when the response has no valid token', async () => {
  authService.login.mockResolvedValue(null);
  component.username = 'student';
  component.password = 'test-password';

  await component.login();

  expect(component.message).toBe('El backend respondió sin token.');
  expect(router.navigate).not.toHaveBeenCalled();
});
```

Los siguientes casos de
`web/src/app/login/login.component.spec.ts:91` prueban la respuesta de UI ante
caídas y expiraciones sin depender del contenido del error:

```ts
it.each([
  ['authentication service unavailable', new TypeError('Failed to fetch')],
  ['authentication timeout', new DOMException('The operation timed out', 'TimeoutError')]
])('shows a generic message for %s', async (_case, error) => {
  authService.login.mockRejectedValue(error);
  component.username = 'student';
  component.password = 'test-password';
  vi.spyOn(console, 'error').mockImplementation(() => undefined);

  await component.login();

  expect(component.message).toBe('No se pudo autenticar. Intente de nuevo.');
  expect(component.busy).toBe(false);
});
```

```ts
it('rejects when the authentication request times out', async () => {
  const timeoutSignal = new AbortController().signal;
  const timeoutSpy = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(timeoutSignal);
  fetchMock.mockRejectedValue(new DOMException('The operation timed out', 'TimeoutError'));

  await expect(service.login({
    username: 'student',
    password: 'test-password',
    client: 'angular-workshop'
  })).rejects.toThrow('The operation timed out');

  expect(timeoutSpy).toHaveBeenCalledWith(5000);
  expect(fetchMock).toHaveBeenCalledWith(
    'http://localhost:8080/auth/login',
    expect.objectContaining({ signal: timeoutSignal })
  );
});
```

HTTP 401 se prueba en `web/src/app/services/tasks.service.spec.ts:57`:

```ts
it('rejects an invalid bearer token with a generic user-facing error', async () => {
  fetchMock.mockResolvedValue(new Response(JSON.stringify({
    detail: 'invalid token'
  }), { status: 401 }));

  await expect(service.getTasks('student', 'invalid-test-token'))
    .rejects.toThrow('No se pudo cargar el dashboard.');
});
```

El mensaje visible del dashboard ante el token rechazado se prueba usando los
servicios reales en `web/src/app/auth-flow.spec.ts:96`:

```ts
it('shows a generic dashboard error when the backend rejects the bearer token', async () => {
  fetchMock.mockResolvedValue(new Response(JSON.stringify({
    detail: 'invalid token'
  }), { status: 401 }));

  const sessionService = new SessionService();
  sessionService.save('invalid-test-token', { username: 'student' });
  const dashboard = new DashboardComponent(
    router as unknown as Router,
    changeDetector as ChangeDetectorRef,
    zone as unknown as NgZone,
    new TasksService(),
    sessionService
  );
  vi.spyOn(console, 'error').mockImplementation(() => undefined);

  await dashboard.ngOnInit();

  expect(dashboard.error).toBe('No se pudo cargar el dashboard.');
  expect(dashboard.loading).toBe(false);
});
```

### Ejemplos adicionales de servicio no disponible

`web/src/app/services/auth.service.spec.ts:58` comprueba el 503 y
`web/src/app/login/login.component.spec.ts` verifica la traducción de fallos de
red y timeout a un mensaje genérico:

```ts
it('returns a generic user-facing error when the authentication service is unavailable', async () => {
  fetchMock.mockResolvedValue(new Response('', { status: 503 }));

  await expect(service.login({
    username: 'student',
    password: 'test-password',
    client: 'angular-workshop'
  })).rejects.toThrow('No se pudo autenticar. Intente de nuevo.');
});
```

## Comandos y ejecuciones reales

Todos los comandos de npm se ejecutan con directorio de trabajo
`ai-labs/web/`. La validación TypeScript independiente reportó estos resultados
el 2026-10-26:

| comando / aserción | componente / IDs | directorio | código / resultado | evidencia |
|---|---|---|---|---|
| `npm test -- src/app/auth-flow.spec.ts src/app/login/login.component.spec.ts src/app/services/auth.service.spec.ts src/app/services/tasks.service.spec.ts` | web — H-WEB-01, H-WEB-02, H-WEB-04, H-WEB-05, H-WEB-06 | `web/` | exit code 0; 22/22 pruebas pasaron en 4 archivos. | Ejecución focal antes de la validación completa. |
| `npm run build` | web — H-WEB-01 a H-WEB-06 | `web/` | exit code 0. | Aserción `production-build` de la validación independiente. |
| `npm test` | web — H-WEB-01 a H-WEB-06 | `web/` | exit code 0; Vitest 43/43 pasaron, 0 fallidas, 0 omitidas. | Aserción `tests-pass`. |
| `npm run test:coverage` | web — H-WEB-01 a H-WEB-06 | `web/` | exit code 0. | Aserción `coverage-report`; reporte en `web/coverage/index.html` y `web/coverage/coverage-summary.json`. |
| `npm run start -- --port 4201` + probe `http://localhost:4201/` | web — H-WEB-06 | `web/` | HTTP 200. | Aserción `dev-server-serves-login`; el servidor temporal fue detenido y el puerto 4201 verificado libre. |

Las cuatro aserciones de validación independiente pasaron (4/4). El plan
reproducible está en `web/.tsupgrader/runtime-validation/eval-plan.json`; los
resultados quedan registrados en esta sección.

## Cobertura

Medición con Vitest y provider V8; se usó el resumen de líneas de
`web/coverage/coverage-summary.json`. Para cobertura del código modificado se
sumaron `lines.covered` y `lines.total` de cada archivo de producción de
`web/src/` modificado respecto de `main`; se excluyó `api.models.ts`, que solo
declara tipos y tiene cero líneas ejecutables.

| Alcance | Líneas cubiertas / ejecutables | Cobertura |
|---|---:|---:|
| Código de producción modificado (11 archivos ejecutables) | 301 / 309 | 97.41% |
| Aplicación completa medida por el reporte | 301 / 337 | 89.31% |

La métrica agregada incluye los archivos no modificados de `web/src/`; no debe
interpretarse como cobertura del diff. El umbral de 85% se supera para el
código de producción modificado.

## Fallos, pendientes y pruebas propuestas

### Fallos de pruebas

Ninguna prueba Vitest falló en la ejecución focal o completa. La primera
invocación de `npm test -- ...` se hizo por error desde la raíz y terminó con
ENOENT/código de proceso `-4058` al no encontrar `package.json`; se repitió
desde `web/` y pasó. No fue un fallo de la suite.

### Incidentes operativos corregidos

- Un primer `npm run start` desde la raíz también terminó con ENOENT porque el
  `package.json` está en `web/`.
- El primer arranque desde `web/` no pudo usar el puerto 4200 porque ya estaba
  ocupado. El servidor de esta validación usó el puerto 4201 y respondió HTTP
  200.
- El proceso Angular hijo no terminó automáticamente con la sesión de
  validación. Se identificó por su comando y se detuvo por PID específico; el
  puerto 4201 quedó libre al verificarlo. No se detuvo el proceso que ocupaba
  4200.

### Pendientes

- Los servicios reales no estaban levantados para esta ejecución; login,
  tareas, 503, 401 y fallos de transporte se probaron con `fetch` simulado.
- La señal de timeout se verificó con reloj/signal simulado; no se esperaron
  cinco segundos reales ni se contactó un servidor lento.
- Se intentó preparar una grabación Playwright local de validación de usuario
  vacío. La preparación quedó lista, pero el entorno no expuso el agente
  `JSTS Playwright Spec Author` necesario para ejecutar la grabación. Por
  ello no se afirma una prueba Playwright; se usó el probe HTTP de estado 200
  como alternativa de disponibilidad.
- `docs/ENDPOINTS.md` indica que el cliente rechaza campos opcionales de tareas
  con `null`; el contrato backend no está confirmado. No se creó una prueba
  que acepte ese comportamiento ni se ocultó el riesgo; **H-WEB-05 sigue
  Pendiente** hasta confirmar el contrato y corregir o caracterizar el caso.

### Pruebas propuestas

- Ejecutar un smoke/integración login→tareas contra los servicios reales cuando
  estén disponibles, usando únicamente las credenciales ficticias del
  laboratorio y confirmando los estados/cuerpos del contrato.
- Confirmar con el responsable de API si `description`, `owner` o `priority`
  pueden ser `null`; luego definir una caracterización coherente antes de
  cerrar H-WEB-05.
- Reintentar la grabación Playwright de validación del formulario cuando el
  agente de grabación esté disponible.
