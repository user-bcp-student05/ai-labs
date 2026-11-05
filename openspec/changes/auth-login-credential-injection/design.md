# Design

## Context

`POST /auth/login` is implemented by `AuthResource`. It validates that the request, `username`, and `password` are present, delegates credential lookup to `LegacyDatabase.findByCredentials`, and creates the existing token only when a user is returned. `LegacyDatabase` uses SQLite through JDBC; its current lookup builds SQL by concatenating both credential values. The database URL is selected through `AUTH_DB_URL`, with a local-file default.

The existing Quarkus integration test covers a successful login only. The approved requirements are in `specs/auth-login/spec.md`; the proposal records that `docs/ENDPOINTS.md` does not document this endpoint, so Issue #23 supplies the protected login outcomes for this change.

## Goals / Non-Goals

**Goals:**

- Prevent either credential value from changing the meaning of the lookup query.
- Preserve the existing endpoint and successful response/token flow.
- Prove rejection for the two specified input cases through the HTTP endpoint.
- Keep the change local to the auth credential lookup and its tests.

**Non-Goals:**

- Redesigning authentication layers, token format, password storage, or error handling.
- Changing the database schema, user records, endpoint payload, or other components.
- Addressing the separate security limitations of plaintext passwords or the legacy token.

## Protected Contracts

- Keep `POST /auth/login` and the existing JSON request compatibility, including the `username` and `password` fields.
- Valid fixture credentials continue to return HTTP 200 with `user.username` and a non-null `token`; do not change token creation or the other current success-response fields.
- Invalid credentials, including the two specified input cases, return HTTP 401 and no `token`.
- Leave current null/blank request validation and its HTTP 400 behavior in `AuthResource` unchanged. The issue does not request changing those responses.
- `docs/ENDPOINTS.md` has no login contract to preserve; no behavior change beyond the Issue's acceptance criteria is intended.

## Components Affected

| Area | Planned effect |
| --- | --- |
| `auth/src/main/java/.../LegacyDatabase.java` | Limit the functional change to credential lookup. |
| `auth/src/test/java/.../AuthResourceTest.java` | Add endpoint-level characterization and regression coverage. |
| `openspec/changes/auth-login-credential-injection/` | Record this design; no other component or general document changes. |

`AuthResource` and `LegacyTokenUtil` are protected boundaries, not planned implementation targets.

## Decisions

### Keep the fix at the credential lookup boundary

Use JDBC parameter binding for both values in `LegacyDatabase.findByCredentials`. This keeps responsibility in the existing persistence boundary, uses the current SQLite/JDBC stack, and avoids changing resource response mapping or token behavior. Manual escaping or input-pattern rejection was considered but is not selected: escaping is easy to get wrong, while rejecting credential characters would impose a new input policy not required by the spec. An ORM or new dependency is unnecessary for this one lookup.

### Preserve the existing HTTP and token flow

Keep request validation, the `UserRecord` mapping, the 401 response, and token issuance unchanged. The issue concerns how credentials are looked up, not a broader authentication redesign. This also keeps the change reviewable and reversible within `auth/`.

### Characterize the endpoint before changing the lookup

Use `AuthResourceTest` through the Quarkus HTTP endpoint rather than relying only on a repository-level test. Before changing `LegacyDatabase`, retain and run the successful-login characterization, and add checks for ordinary invalid credentials and the existing 400 behavior for missing/blank required values. Then add the two regression cases from the spec and confirm that they fail against the vulnerable lookup before applying the fix.

For the username case, pair the specified username input with the valid fixture password; for the password case, pair the valid fixture username with the specified password input. Assert HTTP 401 and absence of `token` in both cases. The valid counterpart makes each test sensitive to a query whose logic has been altered, rather than merely testing a pair of incorrect credentials.

Run tests from `auth/` with `AUTH_DB_URL` set before starting Maven to point at an isolated temporary SQLite database. This avoids relying on or modifying the default local database file. No production data migration is needed.

## Incremental Strategy

1. Add characterization assertions for the current valid-login response, ordinary invalid credentials, and existing missing/blank credential validation; run the auth tests against an isolated database.
2. Add the username and password regression cases with the valid counterpart described above. Verify that each demonstrates the defect before changing the lookup.
3. Make the smallest change in `LegacyDatabase.findByCredentials` to bind the two credential values, leaving `AuthResource` and token generation unchanged.
4. Run the full test suite from `auth/`, confirm all specified response assertions, and check the repository's coverage target for modified code. Keep existing quality gates enabled.
5. Review the final diff to ensure functional changes and tests remain within `auth/`; the only non-auth change for this task is this OpenSpec design artifact.

## Risks / Trade-offs

- **The default SQLite file can retain state between runs** -> Set `AUTH_DB_URL` before the Maven process starts and use a disposable test database; verify the valid fixture login before interpreting rejection results.
- **A parameterized lookup does not address plaintext password storage or the legacy token's security properties** -> Keep those issues explicitly out of scope and do not describe this change as a complete authentication hardening.
- **Database lookup errors are currently converted to a null user by the existing code** -> Do not broaden error handling in this change; ensure the test database is available and the success characterization passes so infrastructure failure cannot masquerade as the expected 401 cases.
- **The login endpoint is absent from `docs/ENDPOINTS.md`** -> Treat the approved Issue and OpenSpec scenarios as the behavior baseline for this change; record the documentation gap without expanding this task into general documentation edits.

## Rollback

No schema or persistent-data migration is introduced. If the bounded lookup change causes a release-blocking regression, reverting that change is mechanically straightforward and requires no data restoration. Because reverting also restores the reported injection risk, treat such a rollback as temporary, record the security exposure, and do not weaken or remove the regression tests as a substitute for a fix.