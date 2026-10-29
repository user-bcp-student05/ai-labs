# Spec Delta

## Purpose

Defines the observable web behavior for accepting an authentication token at login, keeping the resulting session, and using that token for authenticated task requests.

## ADDED Requirements

### Requirement: Login accepts only a non-empty token with a valid user
The web application SHALL treat a login response as valid only when it is a successful HTTP response containing a non-empty string token and a valid user profile.

#### Scenario: Successful login with a valid token
- **WHEN** `POST /auth/login` returns a successful response with a non-empty token and valid user profile
- **THEN** the web application establishes the session and navigates to `/dashboard`

#### Scenario: Successful HTTP response without a valid token
- **WHEN** `POST /auth/login` returns a successful response with a missing or empty token, or an invalid user profile
- **THEN** the web application does not establish a session or navigate to `/dashboard` and shows `El backend respondió sin token.`

### Requirement: The token is used only for authenticated task requests
The web application SHALL send the active session token as a Bearer credential in the `Authorization` header when requesting tasks, and SHALL NOT include the token in the request URL.

#### Scenario: Requesting tasks with an active session
- **WHEN** the dashboard requests `GET /api/tasks` for the active user
- **THEN** the request includes that user's `owner` query parameter and the session token in the `Authorization` Bearer header

#### Scenario: Opening the dashboard without a token
- **WHEN** the dashboard is opened without an active session token
- **THEN** the web application does not request tasks and navigates to `/login`

### Requirement: The web session remains limited to the browser session
The web application SHALL retain the accepted token and user only for the current browser session and SHALL clear both when the user logs out.

#### Scenario: Reloading during the current browser session
- **WHEN** the user reloads the application while the browser session remains active
- **THEN** the current token and user remain available to the web application

#### Scenario: Logging out
- **WHEN** the user logs out
- **THEN** the web application clears the token and user and navigates to `/login`
