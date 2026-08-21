import {test,expect} from '@playwright/test';

const fakeSession={
 access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJlbWFpbCI6ImRpcmVjY2lvbkBmZW5peC50ZXN0IiwiZXhwIjoxOTk5OTk5OTk5fQ.',
 token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-detail-not-real',
 user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'direccion@fenix.test',app_metadata:{},user_metadata:{},created_at:'2026-08-19T00:00:00.000Z'}
};
const id='aaaaaaaa111141118111bbbbbbbbbbbb';
const item={id,expediente:'JORGE Y ALEX',cliente:'JORGE Y ALEX',fase:'Tasación',riesgo:'Medio',proxima_accion:'Confirmar documentación pendiente'};

test.describe('Fénix PRE-PROD · ficha maestra de expediente',()=>{
 test('resumen, recorrido y gobierno Ana respetan el patrón maestro sin inventar datos',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await page.setViewportSize({width:1600,height:900});
  await page.addInitScript(session=>{window.localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));window.localStorage.setItem('fenix-remember-device','true');},fakeSession);
  await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'DIR-TEST',role:'Direccion'})});if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{label:'Inicio',route:'/inicio'},{label:'Expedientes',route:'/expedientes'}]})});return r.fulfill({status:404,body:'{}'});});
  await page.route(`**/functions/v1/fenix-notion-runtime-test/expedientes/${id}`,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({source:'notion_canonical',item})}));
  await page.route('**/functions/v1/fenix-notion-runtime-test/expedientes',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[item]})}));
  await page.goto(`/expedientes/${id}`);
  await expect(page.getByText('FICHA MAESTRA')).toBeVisible();
  await expect(page.getByRole('heading',{name:'JORGE Y ALEX',exact:true})).toBeVisible();
  await expect(page.getByText('RECORRIDO DEL EXPEDIENTE')).toBeVisible();
  await expect(page.locator('.detail-phase-track small').filter({hasText:'Tasación'})).toBeVisible();
  await expect(page.getByText('SITUACIÓN ACTUAL')).toBeVisible();
  await expect(page.getByRole('heading',{name:'Datos económicos'})).toBeVisible();
  await expect(page.getByText('Los campos sin fuente conectada se muestran vacíos, nunca inventados.')).toBeVisible();
  await expect(page.getByRole('heading',{name:'Confirmar documentación pendiente',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:/Que lo haga Ana/})).toBeVisible();
  await expect(page.getByRole('button',{name:/Ayúdame/})).toBeVisible();
  await expect(page.getByRole('button',{name:/Lo hago yo/})).toBeVisible();
  await expect(page.getByText(/\bPRO\b/)).toHaveCount(0);
  const shot=await page.screenshot({fullPage:true});
  await testInfo.attach('ficha-expediente-master-1600',{body:shot,contentType:'image/png'});
 });
});
