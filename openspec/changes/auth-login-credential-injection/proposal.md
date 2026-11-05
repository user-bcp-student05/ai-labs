# Propuesta: proteger la autenticacion del login

## Referencia

- GitHub Issue [#23: H-AUTH-01 Usar consultas parametrizadas en el login de auth](https://github.com/user-bcp-student05/ai-labs/issues/23)
- Componente: `auth/`

## Por que importa

El Issue reporta que credenciales con contenido que altera la consulta pueden permitir iniciar sesion sin conocer la contrasena. Esto puede conceder acceso sin autenticar al usuario y comprometer la confidencialidad e integridad de las operaciones posteriores.

## Alcance

- Evitar que el contenido de `username` o `password` cambie la interpretacion de las credenciales durante `POST /auth/login`.
- Conservar el acceso exitoso con credenciales validas y el rechazo de credenciales no validas.
- Verificar de forma observable los casos de autenticacion exitosa y los intentos reportados en el Issue.

## Fuera de alcance

- Cambios a otros endpoints, componentes o repositorios.
- Redisenar el formato o ciclo de vida del token.
- Cambiar el almacenamiento o la politica de contrasenas.
- Cambios de arquitectura, configuracion, dependencias o manejo general de errores que no sean necesarios para el comportamiento comprometido por el Issue.
- Crear tareas de implementacion en esta etapa.

## Comportamiento que debe preservarse

El Issue solicita conservar el contrato de `POST /auth/login`: credenciales validas responden HTTP 200 e incluyen `user.username` y `token`; credenciales rechazadas responden HTTP 401 y no devuelven `token`.

`docs/ENDPOINTS.md` actualmente documenta endpoints de la API FastAPI y no contiene una especificacion de `POST /auth/login`. Por tanto, no hay en ese archivo un contrato de login con el que comparar estos escenarios. Esta propuesta no cambia el contrato: usa como referencia de preservacion los criterios observables del Issue #23 y deja registrada la brecha documental.

## Resultado esperado

Una solicitud de login solo autentica cuando los valores recibidos corresponden a credenciales validas; las entradas con sintaxis destinada a alterar la consulta no permiten iniciar sesion. El formato y resultado observable de los casos validos y rechazados permanecen como los describe el Issue.