# ThreeSpace App — Contributor Guide for Claude

This document describes the architecture, coding conventions, and patterns used in the `app` package. Follow these strictly when adding or modifying code.

---

## Project Overview

ThreeSpace is a TypeScript library for embedding interactive 3D scenes. It exposes three entry points:

- `threespace` — root re-export of player + editor
- `threespace/player` — lightweight runtime renderer (`ThreeSpacePlayer`)
- `threespace/editor` — full-featured scene editor (`ThreeSpaceEditor`)

The library wraps Three.js and builds to both ESM and CJS via `tsup`.

---

## Directory Structure

```
app/
  scripts/
    index.ts                    # Root export (re-exports player + editor)
    player/
      index.ts                  # Player public API
      threeSpacePlayer.ts       # Main player class
      components/
        playerComponent.ts      # Lightweight runtime component
      utils/
        playerDefinitions.ts    # Shared interfaces & enums
        playerUtils.ts          # Static utility/conversion methods
      actionManager.ts          # Handles component click actions
    editor/
      index.ts                  # Editor public API
      ThreeSpaceEditor.ts       # Main editor class
      components/
        baseComponent.ts        # Abstract base for all editor components
        lightComponent.ts       # Concrete component example
        cameraComponent.ts
        modelComponent.ts
        ...
      utils/
        constants.ts            # Shared constants (UPPER_SNAKE_CASE)
        threeUtilities.ts       # Three.js-specific helpers
      componentManager.ts       # Manages component lifecycle in editor
      componentFactory.ts       # Factory for creating complex objects
  public/                       # Static assets (models, textures)
  tsup.config.ts                # Build configuration
  tsconfig.json
  package.json
```

---

## Core Architectural Patterns

### 1. Dual Component Model

Every scene object has two representations:

- **Editor Component** (extends `BaseComponent` → extends `THREE.Object3D`)
  - Rich property editing UI via `editorProperties` and `playerProperties`
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

- `PlayerUtils` — serialization helpers, color/vector conversions
- `ThreeUtilities` — Three.js-specific helpers (dispose, material swaps)

Add new helpers to the appropriate existing utility class. If no fitting class exists, create a new one with a clear, single responsibility.

---

## Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Classes | PascalCase | `BaseComponent`, `ThreeSpacePlayer` |
| Files | camelCase matching class name | `baseComponent.ts` |
| Methods / properties | camelCase | `propertyChanged()`, `sceneProperties` |
| Private methods (arrow fn) | camelCase with `private` | `private loadModel = () => {}` |
| Public getters/setters | PascalCase | `get Canvas()`, `set Muted()` |
| Constants (module-level) | UPPER_SNAKE_CASE | `SCHEMA_VERSION`, `DEFAULT_MATRIX_ARRAY` |
| Enums | PascalCase type, PascalCase members | `ComponentType.AmbientLight` |
| Interfaces | PascalCase, no `I` prefix | `PlayerProperties`, `SceneProperties` |

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
- **No inline conversion logic**: Always route through `PlayerUtils` or `ThreeUtilities` for type conversions.

---

## State Management

- **No global state library** (no Redux, Zustand, etc.). State is owned by the class that creates it.
- Editor state lives in `ThreeSpaceEditor` (component array, current selection, scene config).
- Player state is read-only at runtime — loaded from a `PlayerProperties` JSON object.
- Inter-class communication uses the callback pattern described above.

---

## File & Module Organization

- Every directory that exports multiple things has an `index.ts` that re-exports the public API.
- Implementation details stay non-exported; only stable public APIs go in `index.ts`.
- Do not cross-import between `player/` and `editor/` internals. Shared types live in `player/utils/playerDefinitions.ts` (the player is the "smaller" package that the editor depends on, not vice versa).

---

## Build & Tooling

- Build: `npm run build` (tsup, produces ESM + CJS + `.d.ts`)
- Typecheck: `npm run typecheck` (tsc --noEmit, no emit)
- GLSL shaders are inlined at build time via a custom esbuild plugin — import them as raw strings.
- CSS is also inlined via esbuild plugin — import component CSS directly in the TypeScript file.
- External peer dependencies (three, animejs, a-color-picker, dom-to-image) must remain in `peerDependencies` and in the `external` list in `tsup.config.ts`.

---

## What NOT to Do

- Do not put business logic in constructors — use `init()` methods or factory methods.
- Do not create standalone utility functions at module scope — add them to an appropriate static utility class.
- Do not add new global state — extend the owning class.
- Do not duplicate serialization/conversion logic — extend `PlayerUtils`.
- Do not use string literals where an enum member exists.
- Do not export implementation details from `index.ts` files — only expose the public API surface.
- Do not add dependencies without updating `peerDependencies` and the `external` list in `tsup.config.ts`.
