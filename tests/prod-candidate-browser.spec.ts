import { test, expect } from '@playwright/test';

const fakeProdSession = {
  access_token: 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJlbWFpbCI6InFhYUBmZW5peC50ZXN0IiwiZXhwIjoxOTk5OTk5OTk5fQ.',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: 1999999999,
  refresh_token: 'qa-prod-refresh-not-real',
  user: {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'qaa@fenix.test',
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

// This browser smoke is meaningful only against the already-built PROD bundle.
// Keeping it out of the PRE-PROD browser pass prevents a false failure caused by
// the intentionally different auth namespace and `-test` function routing.
test.skip(process.env.FENIX_QA_PROD_CANDIDATE !== '1', 'Runs only against the exact PROD candidate bundle');

test('exact PROD candidate boots with PROD auth namespace and canonical function routes', async ({ page }) => {
  const functionRequests: string[] = [];
  page.on('request', request => {
    const url = request.url();
    if (url.includes('/functions/v1/')) functionRequests.push(url);
  });

  await page.addInitScript(session => {
    window.localStorage.setItem('fenix-prod-auth-v1', JSON.stringify(session));
    window.localStorage.setItem('fenix-remember-device', 'true');
  }, fakeProdSession);

  await page.route('**/functions/v1/fenix-app-gateway/**', async route => {
    const url = route.request().url();
    if (url.endsWith('/session/context')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ actor_code: 'QA-PROD-CANDIDATE', role: 'Financiero' })
      });
    }
    if (url.endsWith('/navigation')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(nav) });
    }
    return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
  });

  await page.route('**/functions/v1/fenix-notion-runtime/expedientes', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [] }) })
  );
  await page.route('**/auth/v1/logout**', route => route.fulfill({ status: 204, body: '' }));

  await page.goto('/');
  await expect(page).toHaveURL(/\/inicio$/);
  await expect(page.locator('.role-home')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Calculadora' })).toBeVisible();
  await expect(page.locator('.role-home .ops-profile strong')).toHaveText('Financiero');

  expect(functionRequests.some(url => url.includes('/functions/v1/fenix-app-gateway/'))).toBeTruthy();
  expect(functionRequests.every(url => !/\/functions\/v1\/[A-Za-z0-9_-]+-test(?:\/|$)/.test(url))).toBeTruthy();

  const storage = await page.evaluate(() => ({
    prod: window.localStorage.getItem('fenix-prod-auth-v1'),
    preprod: window.localStorage.getItem('fenix-preprod-auth-v2')
  }));
  expect(storage.prod).not.toBeNull();
  expect(storage.preprod).toBeNull();
});
