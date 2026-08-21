import {test,expect} from '@playwright/test';

const fakeSession={
 access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJlbWFpbCI6InFhYUBmZW5peC50ZXN0IiwiZXhwIjoxOTk5OTk5OTk5fQ.',
 token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-exp-not-real',
 user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'direccion@fenix.test',app_metadata:{},user_metadata:{},created_at:'2026-08-19T00:00:00.000Z'}
};
const rows=[
 {id:'11111111-1111-4111-8111-111111111111',expediente:'Expediente QA 1',fase:'Estudio',cliente:'Cliente QA 1',proxima_accion:'2026-08-24',estado:'Activo'},
 {id:'22222222-2222-4222-8222-222222222222',expediente:'Expediente QA 2',fase:'Banco',cliente:'Cliente QA 2',proxima_accion:'2026-08-25',estado:'Activo'}
];

test.describe('Fénix PRE-PROD · contrato visual Expedientes',()=>{
 test('Expedientes mantiene patrón maestro, datos canónicos y navegación a ficha',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await page.setViewportSize({width:1600,height:900});
  await page.addInitScript(session=>{window.localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));window.localStorage.setItem('fenix-remember-device','true');},fakeSession);
  await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'DIR-TEST',role:'Direccion'})});if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{label:'Inicio',route:'/inicio'},{label:'Expedientes',route:'/expedientes'},{label:'Bancos',route:'/bancos'},{label:'Contactos',route:'/contactos'},{label:'Inmobiliarias',route:'/inmobiliarias'},{label:'Tasaciones',route:'/tasaciones'},{label:'Firmas',route:'/firmas'},{label:'Documentación',route:'/documentacion'},{label:'Agenda',route:'/agenda'}]})});return r.fulfill({status:404,body:'{}'});});
  await page.route('**/functions/v1/fenix-notion-runtime-test/expedientes',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:rows})}));
  await page.goto('/expedientes');
  await expect(page.getByRole('heading',{name:'Expedientes',exact:true})).toBeVisible();
  await expect(page.getByText('Fuente canónica Notion')).toBeVisible();
  await expect(page.getByText('2 registros')).toBeVisible();
  await expect(page.getByText('Expediente QA 1')).toBeVisible();
  await expect(page.locator('.ops-side')).toBeVisible();
  await expect(page.locator('.ops-top')).toBeVisible();
  await expect(page.getByRole('button',{name:'Cambiar tema'})).toBeVisible();
  await expect(page.getByText(/\bPRO\b/)).toHaveCount(0);
  const shot=await page.screenshot({fullPage:true});
  await testInfo.attach('expedientes-qa-1600',{body:shot,contentType:'image/png'});
  await page.getByText('Expediente QA 1').click();
  await expect(page).toHaveURL(/\/expedientes\/11111111-1111-4111-8111-111111111111$/);
 });
});
