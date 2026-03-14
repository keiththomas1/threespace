import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('home page responds with 200', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
  });

  test('editor page responds with 200', async ({ page }) => {
    const response = await page.goto('/editor');
    expect(response?.status()).toBe(200);
  });

  test('unknown route returns 404', async ({ page }) => {
    const response = await page.goto('/does-not-exist');
    expect(response?.status()).toBe(404);
  });
});
