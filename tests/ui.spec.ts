import { test, expect } from '@playwright/test';

const fakeSession = {
  access_token: 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJlbWFpbCI6InFhQGZlbml4LnRlc3QiLCJleHAiOjE5OTk5OTk5OTl9.',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: 1999999999,
  refresh_token: 'qa-refresh-not-real',
  user: {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'qa@fenix.test',
    app_metadata: {},
    user_metadata: {},
    created_at: '2026-08-19T00:00:00.000Z'
  }
};

const nav = {
  items: [
    { label: 'Inicio', route: '/inicio', resource: 'Inicio App' },
    { label: 'Expedientes', route: '/expedientes', resource: 'Expedientes' },
    { label: 'Bancos', route: '/bancos', resource: 'Bancos' },
    { label: 'Documentación', route: '/documentacion', resource: 'Documentación' },
    { label: 'Agenda/Tareas', route: '/tareas', resource: 'Tareas' }
  ]
};

test.describe('Fénix PRE-PROD shell + CAL-001', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(session => {
      window.localStorage.setItem('fenix-preprod-auth', JSON.stringify(session));
    }, fakeSession);

    await page.route('**/functions/v1/fenix-app-api-test/**', async route => {
      const url = route.request().url();
      if (url.endsWith('/session/context')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ actor_code: 'QA-BROWSER', role: 'Financiero' }) });
      }
      if (url.endsWith('/navigation')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(nav) });
      }
      return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
    });

    await page.goto('/');
    await expect(page.getByRole('region', { name: 'Calculadora Hipotecaria PRO' })).toBeVisible();
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

  test('navigation is sourced from authorized backend response', async ({ page }) => {
    await expect(page.locator('.nav-item', { hasText: 'Expedientes' })).toHaveCount(1);
    await expect(page.locator('.nav-item', { hasText: 'Bancos' })).toHaveCount(1);
    await expect(page.getByText('QA-BROWSER · Financiero')).toBeVisible();
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