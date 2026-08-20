import { test, expect } from '@playwright/test';

const fakeSessionA = {
  access_token: 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJlbWFpbCI6InFhYUBmZW5peC50ZXN0IiwiZXhwIjoxOTk5OTk5OTk5fQ.',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: 1999999999,
  refresh_token: 'qa-refresh-a-not-real',
  user: {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', aud: 'authenticated', role: 'authenticated', email: 'qaa@fenix.test', app_metadata: {}, user_metadata: {}, created_at: '2026-08-19T00:00:00.000Z'
  }
};

const fakeSessionB = {
  ...fakeSessionA,
  access_token: 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJiYmJiYmJiYi1iYmJiLTRiYmItOGJiYi1iYmJiYmJiYmJiYmIiLCJlbWFpbCI6InFhYkBmZW5peC50ZXN0IiwiZXhwIjoxOTk5OTk5OTk5fQ.',
  refresh_token: 'qa-refresh-b-not-real',
  user: { ...fakeSessionA.user, id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', email: 'qab@fenix.test' }
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

test.describe('Fénix app shell + calculadora', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(session => {
      if (!window.localStorage.getItem('fenix-preprod-auth')) {
        window.localStorage.setItem('fenix-preprod-auth', JSON.stringify(session));
      }
      window.localStorage.setItem('fenix-remember-device', 'true');
    }, fakeSessionA);

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
    await page.route('**/auth/v1/logout**', route => route.fulfill({ status: 204, body: '' }));

    await page.goto('/');
    await expect(page.getByRole('region', { name: 'Calculadora Hipotecaria PRO' })).toBeVisible();
    await expect(page).toHaveURL(/\/inicio$/);
  });

  test('theme toggles and persists in session', async ({ page }) => {
    const root = page.locator('html');
    await expect(root).toHaveAttribute('data-theme', 'light');
    await page.getByRole('button', { name: 'Cambiar tema' }).click();
    await expect(root).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await expect(root).toHaveAttribute('data-theme', 'dark');
  });

  test('calculator computes reference case locally', async ({ page }) => {
    await expect(page.getByText('421,60 €')).toBeVisible();
    await expect(page.getByText('Simulación orientativa. No implica aprobación bancaria.')).toBeVisible();
  });

  test('calculator minimize and restore preserves inputs', async ({ page }) => {
    const amount = page.getByLabel('Importe €');
    await amount.fill('135000');
    await page.getByRole('button', { name: 'Minimizar calculadora' }).click();
    await expect(page.getByRole('region', { name: 'Calculadora Hipotecaria PRO' })).toHaveClass(/minimized/);
    await page.getByRole('button', { name: 'Minimizar calculadora' }).click();
    await expect(amount).toHaveValue('135000');
  });

  test('calculator close and launcher restore', async ({ page }) => {
    await page.getByRole('button', { name: 'Cerrar calculadora' }).click();
    await expect(page.getByRole('region', { name: 'Calculadora Hipotecaria PRO' })).toHaveCount(0);
    await page.getByRole('button', { name: /Calculadora PRO/ }).click();
    await expect(page.getByRole('region', { name: 'Calculadora Hipotecaria PRO' })).toBeVisible();
  });

  test('navigation is sourced from authorized backend response without exposing actor codes', async ({ page }) => {
    await expect(page.locator('.nav-item', { hasText: 'Expedientes' })).toHaveCount(1);
    await expect(page.locator('.nav-item', { hasText: 'Bancos' })).toHaveCount(1);
    await expect(page.locator('.topbar p')).toHaveText('Financiero');
    await expect(page.getByText('QA-BROWSER')).toHaveCount(0);
    await expect(page.getByText(/PRE-PROD|AUTH TEST|CAL-001|JWT \+ RBAC|RUTA INTERNA/)).toHaveCount(0);
  });

  test('router back-forward preserves calculator state', async ({ page }, testInfo) => {
    if (!testInfo.project.name.includes('desktop')) test.skip();
    const amount = page.getByLabel('Importe €');
    await amount.fill('135000');
    await page.getByRole('button', { name: 'Expedientes' }).click();
    await expect(page).toHaveURL(/\/expedientes$/);
    await expect(page.locator('.topbar h1')).toHaveText('Expedientes');
    await page.getByRole('button', { name: 'Bancos' }).click();
    await expect(page).toHaveURL(/\/bancos$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/expedientes$/);
    await expect(amount).toHaveValue('135000');
    await page.goBack();
    await expect(page).toHaveURL(/\/inicio$/);
    await expect(amount).toHaveValue('135000');
  });

  test('logout clears user A calculator before user B session', async ({ page }, testInfo) => {
    if (!testInfo.project.name.includes('desktop')) test.skip();
    await page.getByLabel('Importe €').fill('135000');
    await expect.poll(()=>page.evaluate(()=>window.sessionStorage.getItem('fenix-calc:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'))).not.toBeNull();
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page.getByRole('heading', { name: 'Acceso seguro' })).toBeVisible();
    expect(await page.evaluate(()=>window.sessionStorage.getItem('fenix-calc:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'))).toBeNull();
    await page.evaluate(session => {
      window.localStorage.setItem('fenix-preprod-auth', JSON.stringify(session));
      window.localStorage.setItem('fenix-remember-device', 'true');
    }, fakeSessionB);
    await page.reload();
    await expect(page.getByLabel('Importe €')).toHaveValue('100000');
    expect(await page.evaluate(()=>window.sessionStorage.getItem('fenix-calc:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'))).toBeNull();
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