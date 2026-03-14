# Playwright Tests — Guide for Claude

This document describes the structure, conventions, and patterns for the Playwright e2e test suite in the `playwright/` package.

---

## Overview

These tests run against the `demo/` Next.js app (localhost:3000). The `webServer` config in `playwright.config.ts` starts `next dev` automatically before the suite runs, and reuses an existing server if one is already running locally.

**WebGL requirement:** Most meaningful tests (canvas rendering, editor UI) require WebGL. Headless Chromium does not support WebGL, so `npm test` will likely fail or produce false negatives on canvas/editor assertions. Use headed mode for local development — see Running Tests below.

---

## Running Tests

```bash
cd playwright

npm test              # headless — navigation/HTTP tests pass; WebGL tests will fail
npm run test:headed   # headed Chromium — all tests pass; use this for local dev
npm run test:ui       # Playwright interactive UI — best for debugging individual tests
npm run report        # open the last HTML report
```

---

## File Structure

```
playwright/
  playwright.config.ts   # Base URL, webServer config, browser projects
  tests/
    navigation.spec.ts   # HTTP status checks (no WebGL needed)
    home.spec.ts         # Home page smoke tests (WebGL needed for canvas assertions)
    editor.spec.ts       # Editor smoke tests (WebGL needed for canvas + UI assertions)
```

---

## Test Conventions

### File naming

One spec file per page or feature area. Name files `<area>.spec.ts`.

### Grouping

Wrap related tests in a `test.describe` block named after the page or feature:

```typescript
test.describe('Editor page', () => {
  test('renders the object toolbar', async ({ page }) => { ... });
});
```

### Waiting for elements

The editor and player initialize asynchronously after mount. Always use `expect(...).toBeVisible()` with an explicit timeout rather than `page.waitForTimeout`. The standard timeouts used in this suite are:

- Navigation / static content: no explicit timeout needed (Playwright default 5 s)
- Canvas / Three.js render: `{ timeout: 10_000 }`
- Editor DOM (created after `ThreeSpaceEditor` mounts): `{ timeout: 15_000 }`

### Targeting the Three.js canvas

The editor page has multiple `<canvas>` elements (Three.js scene, orbit gizmo, color picker). Always target the Three.js canvas specifically to avoid strict-mode violations:

```typescript
// Correct
const canvas = page.locator('canvas[data-engine]');

// Wrong — matches all canvases on the editor page
const canvas = page.locator('canvas');
```

### Targeting editor UI elements

The editor builds its DOM imperatively via `editorDom.ts`. Elements use stable `id` attributes defined in `editorIds.ts`. Prefer ID selectors over class or role selectors for editor-injected elements:

```typescript
await expect(page.locator('#ts-import-toolbar')).toBeVisible({ timeout: 15_000 });
await expect(page.locator('#ts-object-toolbar')).toBeVisible({ timeout: 15_000 });
await expect(page.locator('#ts-properties-window-parent')).toBeVisible({ timeout: 15_000 });
```

### Targeting demo/React UI elements

The demo uses Next.js CSS Modules. Class names are hashed at build time, so avoid selecting by exact class name. Prefer:

- Accessible role + name: `page.getByRole('button', { name: 'Demo Scenes' })`
- Partial class match (only if no role is available): `page.locator('[class*="visualCarouselItem"]')`

### Console error assertions

The "loads without errors" tests capture console errors and page errors:

```typescript
const consoleErrors: string[] = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (err) => consoleErrors.push(err.message));

await page.goto('/editor');
expect(consoleErrors).toEqual([]);
```

Note: in headless mode these tests will fail because Three.js logs a WebGL context error to the console. Run headed or filter known WebGL messages if you need these to pass in CI without a GPU.

---

## Adding a New Test File

1. Create `tests/<area>.spec.ts`.
2. Import from `@playwright/test` only — no other test libraries.
3. Group tests under a `test.describe` block.
4. Follow the selector and timeout conventions above.
5. Run with `npm run test:headed` to verify locally before committing.

## Adding Screenshot Tests

Screenshot tests use `toHaveScreenshot()`. They require a baseline to be generated on the first run:

```typescript
test('home page matches snapshot', async ({ page }) => {
  await page.goto('/');
  await page.locator('canvas[data-engine]').waitFor({ state: 'visible', timeout: 10_000 });
  await expect(page).toHaveScreenshot('home.png');
});
```

Run `npm run test:headed -- --update-snapshots` to generate or update baselines. Snapshots are stored under `tests/<area>.spec.ts-snapshots/` and should be committed to the repository.
