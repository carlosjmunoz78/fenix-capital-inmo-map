import { test, expect } from '@playwright/test';

test.describe('Fénix PRE-PROD shell + CAL-001', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('COM-THEME-001 toggles and persists in session', async ({ page }) => {
    const root = page.locator('html');
    await expect(root).toHaveAttribute('data-theme', 'light');
    await page.getByRole('button', { name: 'Cambiar tema' }).click();
    await expect(root).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await expect(root).toHaveAttribute('data-theme', 'dark');
  });

  test('CAL-001 computes reference case locally', async ({ page }) => {
    const panel = page.getByRole('region', { name: 'Calculadora Hipotecaria PRO' });
    await expect(panel).toBeVisible();
    await expect(page.getByText('421,60 €')).toBeVisible();
    await expect(page.getByText('Simulación matemática. No implica aprobación bancaria ni sustituye validación de Belén.')).toBeVisible();
  });

  test('CAL-001 minimize and restore preserves inputs', async ({ page }) => {
    const amount = page.getByLabel('Importe €');
    await amount.fill('135000');
    await page.locator('.calc-actions button').first().click();
    await expect(page.getByRole('region', { name: 'Calculadora Hipotecaria PRO' })).toHaveClass(/minimized/);
    await page.locator('.calc-actions button').first().click();
    await expect(amount).toHaveValue('135000');
  });

  test('CAL-001 close and launcher restore', async ({ page }) => {
    await page.locator('.calc-actions button').nth(1).click();
    await expect(page.getByRole('region', { name: 'Calculadora Hipotecaria PRO' })).toHaveCount(0);
    await page.getByRole('button', { name: /Calculadora PRO/ }).click();
    await expect(page.getByRole('region', { name: 'Calculadora Hipotecaria PRO' })).toBeVisible();
  });

  test('mobile keeps theme control and calculator usable', async ({ page }, testInfo) => {
    if (!testInfo.project.name.includes('mobile')) test.skip();
    await expect(page.getByRole('button', { name: 'Cambiar tema' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Calculadora Hipotecaria PRO' })).toBeVisible();
    await expect(page.locator('.sidebar')).toBeHidden();
  });

  test('tablet collapses sidebar without hiding app controls', async ({ page }, testInfo) => {
    if (!testInfo.project.name.includes('tablet')) test.skip();
    await expect(page.getByRole('button', { name: 'Cambiar tema' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Calculadora Hipotecaria PRO' })).toBeVisible();
    await expect(page.locator('.sidebar')).toBeVisible();
  });
});