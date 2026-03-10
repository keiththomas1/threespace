# ThreeSpace — Repository Guide for Claude

## Repo Structure

```
threespace/
  app/      # Core library (published as `threespace` on npm)
  demo/     # Next.js demo app (consumes app/ via local file link)
```

## Packages

### `app/` — Library

- Build: `cd app && npm run build`
- Typecheck: `cd app && npm run typecheck`
- Output goes to `app/dist/` — never edit files there directly.

### `demo/` — Demo App

- Dev server: `cd demo && npm run dev`
- Build (static export): `cd demo && npm run build`
- The demo depends on the local `app/` package via `"threespace": "file:../app"`. **Run `npm run build` in `app/` first** before running or building the demo so it picks up the latest changes.

## Branching

- `main` — stable, production-ready
- Feature branches: branch from `main`, PR back to `main`
- The `github-pages-action` branch is reserved for CI/GitHub Pages deployment — do not use it for feature work.

## App Package Coding Standards

@app/CLAUDE.md
