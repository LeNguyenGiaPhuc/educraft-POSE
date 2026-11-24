# Test files

All automated tests live under this folder so the application source folders stay focused on runtime code.

- `tests/backend/src`: backend unit tests that follow the backend module structure.
- `tests/backend/tests`: backend HTTP, integration, and shared test setup files.
- `tests/frontend/src`: frontend unit and Node tests that follow the frontend feature structure.
- `tests/frontend/test`: frontend tooling/configuration tests.

Run the suites from their package folders:

```text
cd backend && npm test
cd backend && npm run test:integration
cd frontend && npm run test
```
