import { test, expect } from '@playwright/test';

test.describe('Editor page', () => {
  test('loads without errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await page.goto('/editor');
    await expect(page).toHaveTitle(/ThreeSpace.*Editor/i);

    expect(consoleErrors).toEqual([]);
  });

  test('renders a canvas element', async ({ page }) => {
    await page.goto('/editor');
    // Target the Three.js canvas specifically; the editor also has gizmo + color picker canvases
    const canvas = page.locator('canvas[data-engine]');
    await expect(canvas).toBeVisible({ timeout: 10_000 });
  });

  test('renders the import toolbar', async ({ page }) => {
    await page.goto('/editor');
    await expect(page.locator('#ts-import-toolbar')).toBeVisible({ timeout: 15_000 });
  });

  test('renders the object toolbar', async ({ page }) => {
    await page.goto('/editor');
    await expect(page.locator('#ts-object-toolbar')).toBeVisible({ timeout: 15_000 });
  });

  test('renders the properties window', async ({ page }) => {
    await page.goto('/editor');
    await expect(page.locator('#ts-properties-window-parent')).toBeVisible({ timeout: 15_000 });
  });
});
