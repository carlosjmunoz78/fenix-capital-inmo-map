import { test, expect } from '@playwright/test';

const directionSession = {
  access_token: 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJkZGQxMTExMS0xMTExLTQxMTEtODExMS0xMTExMTExMTExMTEiLCJlbWFpbCI6ImRpcmVjdGlvbkBmZW5peC50ZXN0IiwiZXhwIjoxOTk5OTk5OTk5fQ.',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: 1999999999,
  refresh_token: 'qa-direction-refresh-not-real',
  user: {
    id: 'ddd11111-1111-4111-8111-111111111111',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'direction@fenix.test',
    app_metadata: {},
    user_metadata: {
      actor_code: 'DIR-TEST',
      fenix_test_actor: 'DIR-TEST',
      fenix_test_identity: true,
      environment: 'PREPROD_TEST'
    },
    created_at: '2026-08-22T00:00:00.000Z'
  }
};

test('authenticated DIR-TEST keeps Direction UI if context gateway is temporarily unavailable', async ({ page }, testInfo) => {
  await page.addInitScript(session => {
    window.localStorage.setItem('fenix-preprod-auth', JSON.stringify(session));
    window.localStorage.setItem('fenix-remember-device', 'true');
  }, directionSession);

  await page.route('**/functions/v1/fenix-app-gateway-test/**', async route => {
    await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ ok: false }) });
  });

  await page.goto('/');

  await expect(page).toHaveURL(/\/inicio$/);
  await expect(page.getByText('Hola Belén, buenos días', { exact: false })).toBeVisible();
  await expect(page.getByText('Usuario', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Calculadora Hipotecaria' })).toBeVisible();
  await expect(page.getByText(/\bPRO\b/)).toHaveCount(0);

  const advanced = page.getByRole('button', { name: 'Buscador avanzado' });
  if (testInfo.project.name.includes('mobile')) await expect(advanced).toBeHidden();
  else await expect(advanced).toBeVisible();
});
