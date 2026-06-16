<!-- .github/copilot-instructions.md - guidance for AI coding agents -->

# Quick instructions for AI code agents

This repo is a monorepo with backend (Node/Express/TypeScript) and frontend (React + Vite + TypeScript) arranged using DDD/hexagonal patterns. Use the notes below to be productive immediately.

Keep this short and concrete — reference files are included so you can open them for more details.

1. High-level architecture

- Backend: DDD / Hexagonal. Key entry: `backend/src/infrastructure/express/server.ts`.
  - Domain: `backend/src/domain/*` (entities, value-objects, repository interfaces).
  - Application: `backend/src/application/use-cases/*` (orchestration and business flows).
  - Infrastructure: `backend/src/infrastructure/*` (controllers, persistence adapters, Express wiring).
- Frontend: React modules (per-domain). Start at `frontend/src/modules/finances` and `frontend/src/core/api` (HTTP client wrappers like `financeApi.ts`, `authApi.ts`).

2. Coding conventions and patterns (explicit)

- Language: code identifiers in English; internal comments can be Spanish. Commits are in Spanish.
- Import aliases: `@modules/`, `@shared/`, `@core/`, `@domain/`, `@infrastructure/` — prefer them when adding new files.
- Keep controllers thin: validate request → call use-case → map response. See `backend/src/infrastructure/controllers/*Controller.ts`.
- Repositories are defined as interfaces in `domain/repositories` and implemented under `infrastructure/persistence` (InMemory + Sqlite versions). When adding persistence, implement the repo interface.
- Value objects encapsulate domain primitives (e.g., `Amount`, `TransactionId`) — change domain types here, not in controllers.

3. Developer workflows and commands (what to run)

- Install all: `npm run install:all` (root).
- Run both in dev: `npm run dev` (root).
- Backend only (dev): `npm run dev:backend` (root) or `cd backend && npm run dev`. Entrypoint: `backend/src/infrastructure/express/server.ts`.
- Frontend only (dev): `npm run dev:frontend` (root) or `cd frontend && npm run dev`.
- Tests backend: `npm run test:backend` (root) or `cd backend && npm test`.

4. Release & CI notes agents should respect

- Releasing is automated: see `.agent/workflows/release-to-master.md` and `.github/workflows/release-pr.yml` (workflow triggers). Follow Conventional Commits to ensure correct semver bumps.
- The bot may push version bumps to `develop` — avoid creating conflicting commits in that flow.

5. Project-specific conventions (non-obvious)

- Dates use `Europe/Madrid` timezone and months are navigable up to `currentMonth + 1` (see `.agent/rules/project-overview.md`).
- Categories are stored in Spanish in DB; frontend maps/display translations (look for `tCategory()` usages in `frontend/src/modules`).
- Use `InMemory*` repositories for fast tests and CI-friendly unit/integration tests.
- Do not add `console.log` in production code; use existing utilities under `shared/utils` if logging is needed.

6. Where to look for quick examples

- Add a new API endpoint: `backend/src/infrastructure/controllers/TransactionController.ts` + matching use-case in `application/use-cases` + repo impl in `infrastructure/persistence`.
- Frontend module pattern: `frontend/src/modules/finances/` → `domain/`, `application/`, `infrastructure/`, `ui/`.
- HTTP client usage: `frontend/src/core/api/financeApi.ts` and `authApi.ts`.

7. Safety & limits for automated edits

- Prefer small, incremental changes (one logical change per PR). Respect Conventional Commits.
- Don't change environment secrets; update `.env.example` only if adding new env variables.
- Don't modify `.agent/*` rules or workflows unless the change is explicitly about automation; those are source-of-truth for release flows.

8. If adding tests

- Backend uses Jest (`backend/jest.config.js`). Use `InMemory` repo implementations for unit tests and `Sqlite` only for integration tests where necessary.
- Frontend uses Jest + React Testing Library + Cypress for E2E. See `frontend/setupTests.ts` and `frontend/cypress`.

9. Quick file references (open these first)

- `README.md` (root) — overall project structure and commands
- `backend/ONBOARDING.md` — step-by-step backend setup
- `.agent/rules/project-overview.md` — design decisions and conventions
- `.agent/workflows/release-to-master.md` — release automation details

If anything above is unclear or you need more examples (specific files to open or patterns to follow), ask and I'll add targeted snippets or expand sections.
