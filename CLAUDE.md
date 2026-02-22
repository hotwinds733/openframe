# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Run from the repo root unless noted otherwise.

```bash
# Development
pnpm dev               # Start Electron app with Vite dev server

# Build
pnpm build             # TypeScript check + Vite build + electron-builder

# Lint
pnpm lint              # ESLint across all packages

# Database (run from apps/desktop/)
pnpm db:generate       # Generate Drizzle migration from schema changes
pnpm db:migrate        # Apply pending migrations
```

After changing `packages/db/schema.ts`, always run `pnpm db:generate` from `apps/desktop/` to produce the SQL migration file, then commit both the schema change and the generated files under `electron/migrations/`.

## Architecture

### Monorepo Layout

```
apps/desktop/          # Electron application
  electron/            # Main process (Node.js)
  src/                 # Renderer process (React)
packages/db/           # Shared Drizzle schema (schema.ts only)
```

### Electron IPC Pattern

All database and filesystem access from the renderer goes through a strict IPC bridge:

1. **`packages/db/schema.ts`** — Drizzle table definitions (source of truth for DB shape)
2. **`apps/desktop/electron/handlers/*.ts`** — Main-process IPC handlers using raw `better-sqlite3` SQL (not Drizzle ORM queries)
3. **`apps/desktop/electron/preload.ts`** — `contextBridge` exposes typed APIs on `window` (`settingsAPI`, `genresAPI`, `categoriesAPI`, `thumbnailsAPI`)
4. **`apps/desktop/electron/electron-env.d.ts`** — `Window` interface declarations for all exposed APIs
5. **`apps/desktop/src/db/*Collection.ts`** — TanStack DB collections that sync via the preload APIs and provide reactive state to React

When adding a new data entity, this chain must be updated end-to-end in order.

### TanStack DB Collections

Collections follow the pattern in `settingsCollection.ts` / `genresCollection.ts`:
- `sync.sync()` loads all rows from the IPC API on mount and calls `markReady()`
- `onInsert` / `onUpdate` / `onDelete` persist mutations back to the main process and call `confirmSync()` to commit the optimistic update
- Use `useLiveQuery(collection)` in components to get reactive `{ data }` arrays

### Routing

TanStack Router with file-based routing. The route tree is auto-generated into `src/routeTree.gen.ts` by the Vite plugin — do not edit it manually. Add new pages by creating files in `src/routes/`. The filename determines the URL path (e.g. `genres.tsx` → `/genres`).

### Database

- **Location at runtime:** `~/.openframe/app.db`
- **Migrations folder:** `apps/desktop/electron/migrations/` (dev) / `extraResources/migrations/` (packaged)
- Drizzle `migrate()` runs automatically at app startup
- Handlers use `getRawDb()` (returns the raw `better-sqlite3` instance) for all SQL — not the Drizzle ORM query builder
- Thumbnails are stored as files under `~/.openframe/thumbnails/`; only the file path is stored in the DB

### i18n

Locale files are in `src/i18n/locales/en.ts` and `zh.ts` as typed `as const` objects. Both files must be kept in sync whenever new translation keys are added.
