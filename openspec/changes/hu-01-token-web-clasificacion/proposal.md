# Proposal

## Why

[GitHub Issue #25 (HU-01)](https://github.com/user-bcp-student05/ai-labs/issues/25) confirms that the findings matrix has no pending finding about the web authentication token: H-WEB-01 is resolved, while H-WEB-05 concerns optional fields containing `null`. Because the token is part of the documented login and task-request contract, recording that current behavior as an explicit specification helps prevent unsupported token changes without inventing a remediation.

## What Changes

- Add a verifiable specification of the existing web token contract documented in `docs/ENDPOINTS.md`.
- Preserve the documented `/auth/login` and `/api/tasks` behavior, including the accepted non-empty token, session behavior, and bearer authorization.
- Make no functional code, endpoint, payload, token-format, expiry, or revocation changes; Issue #25 does not authorize them.
- Do not reclassify H-WEB-01 or H-WEB-05 or claim either as an unresolved token finding.

## Capabilities

### New Capabilities

- `web-auth-session`: Observable web behavior for accepting and using the authentication token across login and authenticated task requests.

### Modified Capabilities

None.

## Impact

- Adds an OpenSpec capability specification under `openspec/changes/hu-01-token-web-clasificacion/specs/`.
- Uses `docs/ENDPOINTS.md` as the behavior baseline. No application code, API contract, dependencies, or backend systems are changed.
