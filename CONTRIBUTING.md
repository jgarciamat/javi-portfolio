# Contributing

Short guide for contributors to this repo.

1.  Branching
    - Work on `develop` branch. Create feature branches from `develop`.

2.  Commits
    - Use Conventional Commits: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`, `ci:`.
    - Breaking changes: use `feat!:` or `BREAKING CHANGE` in body.

3.  Pull Requests
    - Use the PR template. The release automation reads commit messages to compute version bumps and generate changelogs.
    - Preserve manual release notes under `<!-- changelog:end -->` in PR body.

4.  Tests & CI
    - Run backend tests: `npm run test:backend` (from root) or `cd backend && npm test`.
    - Run frontend tests: `npm run test:frontend` (from root) or `cd frontend && npm test`.
    - CI runs lint, typecheck and tests on PRs.

5.  Releases
    - The release workflow bumps `frontend/package.json` version automatically and generates changelog on PR `develop -> master`.
    - Do not create conflicting commits in `develop` during release; allow `github-actions[bot]` to push version bump.
    6.  Hooks (husky + lint-staged)
        - After installing deps, run `npm run prepare` in each workspace (backend, frontend) or run at root if you add root-level package.json. This installs the git hooks.
        - `lint-staged` will auto-run `eslint --fix` on staged files. If you need to bypass hooks for a single commit: `git commit --no-verify`.

    7.  Database helpers
        - Initialize DB: `cd backend && npm run db:init`
        - Reset DB (deletes sqlite file and re-inits): `cd backend && npm run db:reset`
        - Apply migrations: `cd backend && npm run db:migrate` (the migrations runner stores applied migrations in `migrations` table)

    8.  Pre-push checks
        - A pre-push hook runs a quick backend test suite before allowing push. If you want to skip it for a single push: `git push --no-verify`.

        Root helper (new)
        - You can now run from the repo root:
          - `npm run install:all` — installs dependencies for backend and frontend
          - `npm run prepare:all` — runs `husky install` in both workspaces to set up hooks

        Formatting - This repo uses Prettier. A `.prettierrc` is provided at the repo root. - Hooks will run `prettier --write` automatically on staged files. You can run it manually:
        ```bash # frontend
        cd frontend
        npx prettier --write "src/\*_/_.{ts,tsx,js,jsx}"

                 # backend
                 cd backend
                 npx prettier --write "src/**/*.ts"
                 ```

              CI formatting check
                 - The CI workflow runs `prettier --check` on PRs. Ensure your files are formatted before opening a PR to avoid CI failures.
