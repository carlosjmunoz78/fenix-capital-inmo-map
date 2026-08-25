import { test, expect } from '@playwright/test';

function sessionFor(actorCode:string,email:string){return {
  access_token: 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJkZGQxMTExMS0xMTExLTQxMTEtODExMS0xMTExMTExMTExMTEiLCJlbWFpbCI6ImRpcmVjdGlvbkBmZW5peC50ZXN0IiwiZXhwIjoxOTk5OTk5OTk5fQ.',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: 1999999999,
  refresh_token: 'qa-direction-refresh-not-real',
  user: {
    id: 'ddd11111-1111-4111-8111-111111111111',
    aud: 'authenticated',
    role: 'authenticated',
    email,
    app_metadata: {},
    user_metadata: {
      actor_code: actorCode,
      fenix_test_actor: actorCode,
      fenix_test_identity: true,
      environment: 'PREPROD_TEST'
    },
    created_at: '2026-08-22T00:00:00.000Z'
  }
};}

async function assertDirectionFallback(page:any,testInfo:any,session:any){
  await page.addInitScript((s:any) => {
    window.localStorage.setItem('fenix-preprod-auth-v2', JSON.stringify(s));
    window.localStorage.setItem('fenix-remember-device', 'true');
  }, session);

  await page.route('**/functions/v1/fenix-app-gateway-test/**', async (route:any) => {
    await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ ok: false }) });
  });

  await page.goto('/');
  await expect(page).toHaveURL(/\/inicio$/);
  await expect(page.getByRole('region', { name: 'Calculadora Hipotecaria' })).toBeVisible();
  await expect(page.getByText(/\bPRO\b/)).toHaveCount(0);
  const advanced = page.getByRole('button', { name: 'Buscador avanzado' });
  if (testInfo.project.name.includes('mobile')) await expect(advanced).toBeHidden();
  else await expect(advanced).toBeVisible();
}

test('authenticated DIR-TEST keeps Direction UI if context gateway is temporarily unavailable', async ({ page }, testInfo) => {
  await assertDirectionFallback(page,testInfo,sessionFor('DIR-TEST','direction@fenix.test'));
});

test('authenticated CARLOS-ADMIN keeps operational Direction UI if context gateway is unavailable', async ({ page }, testInfo) => {
  await assertDirectionFallback(page,testInfo,sessionFor('CARLOS-ADMIN','carlos-admin@fenix.test'));
  // This test intentionally verifies only the operational Direction fallback.
  // Carlos-only administrative authority is never derived from browser metadata.
});
