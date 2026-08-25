import { test, expect } from '@playwright/test';

const fakeSession={
  access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJkZGQxMTExMS0xMTExLTQxMTEtODExMS0xMTExMTExMTExMTEiLCJlbWFpbCI6ImRpcmVjdGlvbkBmZW5peC50ZXN0IiwiZXhwIjoxOTk5OTk5OTk5fQ.',
  token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-direction-real-shape',
  user:{id:'ddd11111-1111-4111-8111-111111111111',aud:'authenticated',role:'authenticated',email:'direction@fenix.test',app_metadata:{},user_metadata:{},created_at:'2026-08-22T00:00:00.000Z'}
};

const nav={items:[
  {label:'Inicio',route:'/inicio',resource:'Inicio App'},
  {label:'Expedientes',route:'/expedientes',resource:'Expedientes'},
  {label:'Financieros',route:'/financieros',resource:'Financieros'},
  {label:'Visitadores',route:'/visitadores',resource:'Visitadores'},
  {label:'Economía',route:'/economia',resource:'Economía'},
  {label:'Informes',route:'/informes',resource:'Informes'}
]};

test('Inicio Dirección acepta la forma real {ok,context} y arranca con calculadora cerrada',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await page.addInitScript(session=>{
    localStorage.setItem('fenix-preprod-auth-v2',JSON.stringify(session));
    localStorage.setItem('fenix-remember-device','true');
  },fakeSession);
  await page.route('**/functions/v1/fenix-app-gateway-test/**',route=>{
    const url=route.request().url();
    if(url.endsWith('/session/context'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,context:{actor_code:'DIR-TEST',role:'Dirección',display_name:'Dirección'}})});
    if(url.endsWith('/navigation'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(nav)});
    return route.fulfill({status:404,contentType:'application/json',body:'{}'});
  });
  await page.route('**/functions/v1/fenix-notion-runtime-test/**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[]})}));
  await page.route('**/functions/v1/fenix-kpi-api-test/**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({})}));
  await page.goto('/inicio');
  await expect(page.locator('.dir-shell')).toBeVisible();
  await expect(page.locator('.app-shell')).toHaveCount(0);
  await expect(page.getByText('Usuario',{exact:true})).toHaveCount(0);
  await expect(page.getByRole('region',{name:'Calculadora Hipotecaria'})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Calculadora'})).toBeVisible();
});
