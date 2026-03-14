# Contributing to ThreeSpace

This guide covers everything you need to contribute to ThreeSpace — architecture, coding conventions, development workflow, and common pitfalls. It applies equally to human contributors and AI contributors.

---

## Getting Started

### Repo Structure

```
threespace/
  app/      # Core library (published as `threespace` on npm)
  demo/     # Next.js demo app (consumes app/ via local file link)
```

### Clone and Install

```bash
git clone https://github.com/keiththomas1/threespace.git
cd threespace

# Install library dependencies
cd app && npm install

# Install demo dependencies
cd ../demo && npm install
```

---

## Development Workflow

### Building the Library

Building isn't needed to run the demo because the demo runs via a local file link but it's good for sanity checks.

```bash
cd app
npm run build       # outputs to app/dist/ via tsup (ESM + CJS + .d.ts)
npm run typecheck   # tsc --noEmit, no output — just type validation
```

Never edit files in `app/dist/` directly — they are generated and will be overwritten.

### Running the Demo

```bash
cd demo
npm run dev         # starts Next.js dev server at http://localhost:3000
```

**Important:** The demo depends on `app/` via `"threespace": "file:../app"`. Always run `npm run build` in `app/` first so the demo picks up the latest changes.

---

## Branching & PRs

- `main` — stable, production-ready. All PRs target this branch.
- Feature branches: branch from `main`, open a PR back to `main`. Please pre-pend branch name with `feature/` or `bugfix/`.
- The `github-pages-action` branch is reserved for CI/GitHub Pages deployment — do not use it for feature work.

---

## Architecture Overview

### 1. Dual Component Model

Every scene object has two representations:

- **Editor Component** (extends `BaseComponent` → extends `THREE.Object3D`)
  - Rich property editing UI via `editorProperties`
  - Override `propertyChanged()` to respond to UI changes
  - Override `setupEditorProperties()` to declare editable properties
  - Lives in `scripts/editor/components/`

- **Player Component** (`PlayerComponent` → extends `THREE.Object3D`)
  - Minimal runtime wrapper
  - Stores serialized `ComponentProperties`
  - No editing UI — only click callbacks and update loops
  - Lives in `scripts/player/components/`

When adding a new scene object type, implement **both** sides.

### 2. Factory Pattern

Complex object construction goes in `ComponentFactory` (static methods only). Do not put complex initialization logic inside component constructors. Constructors should remain thin — call a factory or a private `init()` method.

### 3. Observer via Direct Callbacks

There is no event emitter library. Parent-child signaling uses direct callback properties:

```typescript
// Declaration
private onSomething: (value: string) => void = () => {};

// Setter
public set OnSomething(callback: (value: string) => void) {
  this.onSomething = callback;
}

// Invocation
this.onSomething(value);
```

Always initialize callback properties to a no-op `() => {}` so callers never need to null-check.

### 4. Static Utilities

Stateless helpers live as **static methods** on utility classes — never as standalone functions scattered in files:

- `SharedUtils` - utils shared between both player and editor
- `PlayerUtils` — player serialization helpers, color/vector conversions
- `ThreeUtilities` — Three.js-specific helpers (dispose, material swaps)

Add new helpers to the appropriate existing utility class. If no fitting class exists, create a new one with a clear, single responsibility.

---

## Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Files | camelCase matching class name | `baseComponent.ts` |
| Classes / Interfaces | PascalCase | `BaseComponent`, `ThreeSpacePlayer` |
| Public methods | PascalCase | `public DoThis()`, `public get Thing()` |
| Private methods | camelCase | `private loadModel = () => {}`, `private set something()` |
| Members | camelCase | `private camera: THREE.Camera;` |
| Constants | UPPER_SNAKE_CASE | `SCHEMA_VERSION`, `DEFAULT_MATRIX_ARRAY` |
| Enums | PascalCase type, PascalCase members | `ComponentType.AmbientLight` |

---

## TypeScript Conventions

- **Const Preferred**: Use `const` everywhere possible for variables that never are updated.
- **Interface-first**: Define the data shape as an interface before implementing it. All serializable data must have a corresponding interface in `playerDefinitions.ts` or a colocated definitions file.
- **Avoid `any`**: Use specific types or `unknown` with type guards.
- **Enums for discriminated types**: Use enums (not string unions) for `ComponentType`, `LightType`, etc., so exhaustive checks are possible.
- **Readonly where stable**: Mark properties that should not be reassigned after construction as `readonly`.
- **Arrow function properties for callbacks**: Prefer `private foo = () => {}` over `private foo() {}` when the method is passed as a callback, to avoid `this` binding issues.

---

## Serialization Rules

- **Transforms**: Always serialize as a flat `number[]` (16-element `Matrix4` array). Never serialize `THREE.Vector3` or `THREE.Quaternion` directly.
- **Colors**: Use `SerializableColor` (`{ r, g, b }`) — never `THREE.Color` in JSON.
- **Vectors**: Use `SerializableVector3` (`{ x, y, z }`) — never `THREE.Vector3` in JSON.
- Conversion utilities live in `PlayerUtils`. Use them; do not inline color/vector conversion logic.

---

## DRY Principles

- **No copy-paste component properties**: Common property patterns (transform, action, credit) are defined once in `BaseComponent.DEFAULT_PROPERTIES` and merged in subclasses — extend, don't duplicate.
- **No repeated Three.js boilerplate**: If a Three.js pattern appears more than once (e.g., material disposal, recursive mesh traversal), it belongs in `ThreeUtilities`.
- **No magic strings**: All repeated string values (material names, layer names, event keys) must be constants in `constants.ts`.
- **No inline conversion logic**: Always route through `SharedUtils`, `PlayerUtils` or `ThreeUtilities` for type conversions.

---

## State Management

- **No global state library** (no Redux, Zustand, etc.). State is owned by the class that creates it.
- Editor state lives in `ThreeSpaceEditor` (component array, current selection, scene config).
- Player state is read-only at runtime — loaded from a `PlayerProperties` JSON object.
- Inter-class communication uses the callback pattern described in Architecture Overview above.

---

## File & Module Organization

- Every directory that exports multiple things has an `index.ts` that re-exports the public API.
- Implementation details stay non-exported; only stable public APIs go in `index.ts`.
- Do not cross-import between `player/` and `editor/` internals. Shared types live in `player/utils/playerDefinitions.ts` (the player is the "smaller" package that the editor depends on, not vice versa).

---

## Build & Tooling

- GLSL shaders are inlined at build time via a custom esbuild plugin — import them as raw strings.
- CSS is also inlined via esbuild plugin — import component CSS directly in the TypeScript file.
- External peer dependencies (three, animejs, a-color-picker, dom-to-image) must remain in `peerDependencies` and in the `external` list in `tsup.config.ts`.

---

## End-to-End Tests (Playwright)

The `playwright/` package contains a Playwright e2e suite that runs against the demo app.

### Setup

```bash
cd playwright
npm install
npx playwright install chromium
```

### Running Tests

```bash
npm run test:headed   # headed Chromium — all tests pass; use this for local development
npm run test:ui       # Playwright interactive UI — best for debugging
npm run report        # open the last HTML report
npm test              # headless (some tests expected to fail) — HTTP/navigation tests pass
```

> **WebGL requirement:** Most tests (canvas rendering, editor UI) need WebGL. Headless Chromium does not support WebGL, so `npm test` will likely fail on those assertions. Always use `npm run test:headed` when developing or verifying locally.

### How it works

The `webServer` config in `playwright.config.ts` starts `cd demo && npm run dev` automatically before the suite runs, and reuses an existing server if one is already up on port 3000. The demo in turn depends on the built `app/` package, so run `cd app && npm run build` if you have made library changes before running the tests.

### Adding tests

See `playwright/CLAUDE.md` for conventions on file structure, selectors, timeouts, and screenshot tests.

---

## What NOT to Do

- Do not create standalone utility functions at module scope — add them to an appropriate static utility class.
- Do not add new global state — extend the owning class.
- Do not duplicate serialization/conversion logic — extend `PlayerUtils`.
- Do not use string literals where an enum member exists.
- Do not export implementation details from `index.ts` files — only expose the public API surface.
- Do not add dependencies without updating `peerDependencies` and the `external` list in `tsup.config.ts`.

---

## Adding a New Component Type

Follow this checklist when introducing a new scene object type:

1. **Define the enum member** — add the new type to `ComponentType` in `playerDefinitions.ts`.
2. **Define the interface** — add any component-specific properties to a new interface in `playerDefinitions.ts` (or a colocated definitions file). Extend `ComponentProperties` as needed.
3. **Implement the Editor Component** — create `scripts/editor/components/<name>Component.ts` extending `BaseComponent`. Override `setupEditorProperties()` and `propertyChanged()`.
4. **Implement the Player Component** — create (or extend) the player-side representation in `scripts/player/components/`. Keep it minimal — no UI, only runtime behavior.
5. **Add factory support** — if construction is non-trivial, add a static factory method in `ComponentFactory`.
6. **Register in `ComponentManager`** — ensure the component manager knows how to instantiate the new type.
7. **Export via `index.ts`** — add the new public types/classes to the relevant `index.ts` files.
8. **Serialize correctly** — use `PlayerUtils` for all color, vector, and transform conversions. Never inline conversion logic.
9. **Build and typecheck** — run `cd app && npm run build && npm run typecheck` before opening a PR.
