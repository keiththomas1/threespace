import { test, expect } from '@playwright/test';

test.describe('Home page', () => {
  test('loads without errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      // Ignore network-level 404s (missing optional assets); only catch JS errors.
      if (msg.type() === 'error' && !msg.text().includes('Failed to load resource')) {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await page.goto('/');
    await expect(page).toHaveTitle(/ThreeSpace/);

    expect(consoleErrors).toEqual([]);
  });

  test('renders a canvas element', async ({ page }) => {
    await page.goto('/');
    // Target the Three.js canvas specifically
    const canvas = page.locator('canvas[data-engine]');
    await expect(canvas).toBeVisible({ timeout: 10_000 });
  });

  test('renders the scene carousel open by default', async ({ page }) => {
    await page.goto('/');
    // isOpen defaults to true — the gallery div is immediately visible
    const carouselItem = page.locator('[class*="visualCarouselItem"]').first();
    await expect(carouselItem).toBeVisible({ timeout: 10_000 });
  });

  test('can close and reopen the scene gallery', async ({ page }) => {
    await page.goto('/');
    // Close the gallery with the ✕ button
    const closeButton = page.getByRole('button', { name: '✕' });
    await closeButton.click();
    // "Demo Scenes" button should appear
    const scenesButton = page.getByRole('button', { name: 'Demo Scenes' });
    await expect(scenesButton).toBeVisible({ timeout: 5_000 });
    // Reopen it
    await scenesButton.click();
    const carouselItem = page.locator('[class*="visualCarouselItem"]').first();
    await expect(carouselItem).toBeVisible({ timeout: 5_000 });
  });
});
