import { test, expect } from '@playwright/test';

const fakeProdSession = {
  access_token: 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJlbWFpbCI6InFhYUBmZW5peC50ZXN0IiwiZXhwIjoxOTk5OTk5OTk5fQ.',
  token_type: 'bearer', expires_in: 3600, expires_at: 1999999999,
  refresh_token: 'qa-prod-refresh-not-real',
  user: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', aud: 'authenticated', role: 'authenticated', email: 'qaa@fenix.test', app_metadata: {}, user_metadata: {}, created_at: '2026-08-19T00:00:00.000Z' }
};

const nav = { items: [
  { label: 'Inicio', route: '/inicio', resource: 'Inicio App' },
  { label: 'Expedientes', route: '/expedientes', resource: 'Expedientes' },
  { label: 'Bancos', route: '/bancos', resource: 'Bancos' },
  { label: 'Documentación', route: '/documentacion', resource: 'Documentación' },
  { label: 'Agenda/Tareas', route: '/tareas', resource: 'Tareas' }
] };

test.skip(process.env.FENIX_QA_PROD_CANDIDATE !== '1', 'Runs only against the exact PROD candidate bundle');

async function primeProd(page:any){
  await page.addInitScript((session:any) => {
    window.localStorage.setItem('fenix-prod-auth-v1', JSON.stringify(session));
    window.localStorage.setItem('fenix-remember-device', 'true');
  }, fakeProdSession);
  await page.route('**/functions/v1/fenix-app-gateway/**', async (route:any) => {
    const url = route.request().url();
    if (url.endsWith('/session/context')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ actor_code: 'QA-PROD-CANDIDATE', role: 'Financiero' }) });
    if (url.endsWith('/navigation')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(nav) });
    return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
  });
  await page.route('**/functions/v1/fenix-notion-runtime/expedientes', (route:any) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [] }) }));
  await page.route('**/auth/v1/logout**', (route:any) => route.fulfill({ status: 204, body: '' }));
}

function canonicalCalculator(page:any){
  return page.getByLabel('Acciones flotantes').getByRole('button',{name:'Calculadora'});
}

test('exact PROD candidate boots with PROD auth namespace and canonical function routes', async ({ page }) => {
  const functionRequests: string[] = [];
  page.on('request', request => { const url=request.url(); if(url.includes('/functions/v1/')) functionRequests.push(url); });
  await primeProd(page);
  await page.goto('/');
  await expect(page).toHaveURL(/\/inicio$/);
  await expect(page.locator('.role-home')).toBeVisible();
  await expect(canonicalCalculator(page)).toBeVisible();
  await expect(page.locator('.role-home .ops-profile strong')).toHaveText('Financiero');
  expect(functionRequests.some(url => url.includes('/functions/v1/fenix-app-gateway/'))).toBeTruthy();
  expect(functionRequests.every(url => !/\/functions\/v1\/[A-Za-z0-9_-]+-test(?:\/|$)/.test(url))).toBeTruthy();
  const storage = await page.evaluate(() => ({ prod: localStorage.getItem('fenix-prod-auth-v1'), preprod: localStorage.getItem('fenix-preprod-auth-v2') }));
  expect(storage.prod).not.toBeNull(); expect(storage.preprod).toBeNull();
});

test('exact PROD candidate keeps mobile navigation and calculator usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await primeProd(page);
  await page.goto('/expedientes');
  await expect(page.getByRole('heading', { name: 'Expedientes', exact: true })).toBeVisible();
  const menu=page.getByRole('button',{name:'Abrir menú'});
  await expect(menu).toBeVisible();
  await menu.click();
  await expect(page.getByRole('dialog',{name:'Navegación principal'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Cerrar menú'}).first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog',{name:'Navegación principal'})).toHaveCount(0);
  const calculator=canonicalCalculator(page);
  await expect(calculator).toBeVisible();
  await calculator.click();
  await expect(page.getByRole('region',{name:'Calculadora Hipotecaria'})).toBeVisible();
});
