# Especificacion: autenticacion del login

## ADDED Requirements

### Requirement: Las credenciales no alteran las reglas de autenticacion

El sistema MUST evaluar `username` y `password` como valores de credenciales. El contenido de esos valores MUST NOT cambiar la logica de autenticacion ni permitir un inicio de sesion sin credenciales validas.

#### Scenario: Credenciales validas

- WHEN se envia `student` y `Workshop123!` a `POST /auth/login`
- THEN la respuesta es HTTP 200
- AND la respuesta incluye `user.username` con valor `student`
- AND la respuesta incluye `token`

#### Scenario: Sintaxis de alteracion en el nombre de usuario

- WHEN se envia `' OR '1'='1` como `username` a `POST /auth/login`
- THEN la respuesta es HTTP 401
- AND la respuesta no incluye `token`

#### Scenario: Sintaxis de alteracion en la contrasena

- WHEN se envia `' OR '1'='1` como `password` a `POST /auth/login`
- THEN la respuesta es HTTP 401
- AND la respuesta no incluye `token`