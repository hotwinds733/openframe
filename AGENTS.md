# AGENTS.md

Operational guide for coding agents working in this repository.
This file consolidates build/lint/test commands, architecture constraints, and style conventions.

## Repository Overview

- Monorepo managed by `pnpm` workspaces (`apps/*`, `packages/*`).
- Main app: `apps/desktop` (Electron + React + Vite + TypeScript).
- Shared schema: `packages/db/schema.ts`.
- Shared AI provider definitions: `packages/providers`.

## Source of Truth / Existing Rules

- Primary project guidance exists in `CLAUDE.md`.
- No Cursor rules found in `.cursor/rules/` or `.cursorrules`.
- No Copilot rules found in `.github/copilot-instructions.md`.
- If these files are later added, treat them as higher-priority supplements to this document.

## Install

- From repo root: `pnpm install`.
- Native deps (`electron`, `better-sqlite3`) are expected by the workspace config.
- `apps/desktop` runs `postinstall` with `electron-rebuild` for `better-sqlite3`.

## Build / Lint / Dev Commands

Run from repo root unless noted.

- Dev app: `pnpm dev`
- Build app: `pnpm build`
- Lint all workspaces: `pnpm lint`
- DB generate (proxied): `pnpm db:generate`
- DB migrate (proxied): `pnpm db:migrate`

Equivalent direct commands inside `apps/desktop`:

- Dev: `pnpm -C apps/desktop dev`
- Build: `pnpm -C apps/desktop build`
- Lint: `pnpm -C apps/desktop lint`
- DB generate: `pnpm -C apps/desktop db:generate`
- DB migrate: `pnpm -C apps/desktop db:migrate`

## Test Commands (Current Reality)

There is currently no dedicated test runner configured (no `test` script, no Vitest/Jest config committed).

Use these validation commands instead:

- Type-check app: `pnpm -C apps/desktop exec tsc --noEmit`
- Lint app: `pnpm -C apps/desktop lint`
- Lint a single file: `pnpm -C apps/desktop exec eslint src/path/to/file.tsx`
- Lint multiple files: `pnpm -C apps/desktop exec eslint electron/foo.ts src/bar.tsx`

If a test framework is introduced later, prefer single-test patterns like:

- `pnpm -C apps/desktop exec vitest path/to/file.test.ts`
- `pnpm -C apps/desktop exec vitest path/to/file.test.ts -t "test name"`

## Single-Change Verification Checklist

For UI/renderer changes:

1. `pnpm -C apps/desktop exec tsc --noEmit`
2. `pnpm -C apps/desktop exec eslint src/path/to/changed-file.tsx`
3. Optionally run `pnpm -C apps/desktop dev` for manual verification.

For Electron/main-process changes:

1. `pnpm -C apps/desktop exec tsc --noEmit`
2. `pnpm -C apps/desktop exec eslint electron/path/to/changed-file.ts`
3. Validate IPC call path end-to-end from renderer.

For schema/migration changes:

1. Edit `packages/db/schema.ts`
2. Run `pnpm -C apps/desktop db:generate`
3. Commit schema change + generated files in `apps/desktop/electron/migrations/`
4. Run `pnpm -C apps/desktop exec tsc --noEmit`

## Architecture Rules Agents Must Follow

- Renderer must not access DB/filesystem directly.
- All renderer-side persistence goes through `window.*API` exposed in `electron/preload.ts`.
- Add new entities through full chain:
  1) `packages/db/schema.ts`
  2) `apps/desktop/electron/handlers/*.ts`
  3) `apps/desktop/electron/preload.ts`
  4) `apps/desktop/electron/electron-env.d.ts`
  5) `apps/desktop/src/db/*_collection.ts` and UI usage
- Handler SQL uses raw `better-sqlite3` (`getRawDb()`), not Drizzle ORM query builder.
- Do not manually edit generated router file `apps/desktop/src/routeTree.gen.ts`.

## TypeScript and Data Shape Conventions

- TS is `strict`; keep code type-safe without `any` shortcuts.
- Prefer explicit interfaces/types for IPC payloads and DB rows.
- Keep persisted DB field names in `snake_case` (e.g., `project_id`, `created_at`).
- Keep UI-only/transient values in `camelCase`.
- Use narrow string unions for enums (example: character `gender`, `age`).
- Normalize external/AI values before writing to DB.

## Imports and Module Organization

- Follow existing import grouping pattern:
  1) framework/library imports
  2) workspace/package imports
  3) local relative imports
- Use `import type` for type-only imports where practical.
- Keep imports stable and minimal; remove unused imports promptly.

## Formatting and Readability

- Match existing style in repo:
  - single quotes
  - no semicolons
  - 2-space indentation
  - trailing commas where valid
- Keep functions focused; extract helpers when logic repeats.
- Prefer early returns for guard clauses.
- Avoid adding comments unless code is non-obvious.

## Naming Conventions

- React components: `PascalCase` (`StudioWorkspace.tsx`).
- Functions/variables: `camelCase`.
- DB/IPC row fields: `snake_case`.
- File names in `src/db`: existing pattern is `*_collection.ts`; keep consistent.
- Handler registration functions: `registerXHandlers`.

## Error Handling and UX

- Wrap async IPC/AI calls in `try/catch`.
- Prefer user-facing error messages via i18n keys, not raw exception dumps.
- Preserve existing behavior on failure (do not partially mutate local state silently).
- For destructive actions, require user confirmation (`window.confirm`) in UI flows.
- Keep queue/task status transitions explicit (`queued` -> `running` -> terminal state).

## i18n Rules

- Locale files: `apps/desktop/src/i18n/locales/en.ts` and `zh.ts`.
- Add keys to both files in the same change.
- Keep key structure aligned under the same namespace (`projectLibrary.*`, etc.).

## AI / Media Specific Notes

- Image generation supports text prompt or multimodal `{ text, images }` prompt object.
- Ensure IPC-safe serialization for binary image references (number arrays across bridge).
- Use project/category/style context in generation prompts when relevant.
- Keep scene-only prompts free from unintended character injection when required.

## Database / Migration Notes

- Migrations live in `apps/desktop/electron/migrations/`.
- Prefer idempotent migration SQL where startup compatibility matters.
- App runtime DB lives under Electron userData path; avoid hardcoded absolute DB paths.

## Agent Workflow Expectations

- Make minimal, scoped changes; avoid broad refactors unless asked.
- Do not revert unrelated dirty worktree changes.
- Before committing, inspect `git diff` and ensure no accidental edits.
- When done, report:
  - what changed
  - why
  - verification commands run
  - any follow-up needed
