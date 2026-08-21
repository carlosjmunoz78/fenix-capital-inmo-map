import {test,expect} from '@playwright/test';

const fakeSession={
 access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJlbWFpbCI6ImRpcmVjY2lvbkBmZW5peC50ZXN0IiwiZXhwIjoxOTk5OTk5OTk5fQ.',
 token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-inmo-not-real',
 user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'direccion@fenix.test',app_metadata:{},user_metadata:{},created_at:'2026-08-19T00:00:00.000Z'}
};
const items=[
 {id:'aaaaaaaa111141118111bbbbbbbbbbbb',inmobiliaria:'ADAIX LUCENA',localidad:'Lucena',estado:'Activa',proximo_contacto_b2b:'2026-08-24'},
 {id:'bbbbbbbb111141118111cccccccccccc',inmobiliaria:'PRUEBA INMO',localidad:'Córdoba',estado:'En proceso'},
 {id:'cccccccc111141118111dddddddddddd',inmobiliaria:'PENDIENTE',localidad:'Córdoba',estado:'Sin llamar'}
];

test.describe('Fénix PRE-PROD · contrato visual Inmobiliarias',()=>{
 test('usa datos canónicos, KPIs derivados y patrón B2B maestro',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await page.setViewportSize({width:1600,height:900});
  await page.addInitScript(session=>{window.localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));window.localStorage.setItem('fenix-remember-device','true');},fakeSession);
  await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'DIR-TEST',role:'Direccion'})});if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{label:'Inicio',route:'/inicio'},{label:'Inmobiliarias',route:'/inmobiliarias'}]})});return r.fulfill({status:404,body:'{}'});});
  await page.route('**/functions/v1/fenix-notion-runtime-test/inmobiliarias',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({source:'notion_canonical',items})}));
  await page.goto('/inmobiliarias');
  await expect(page.getByRole('heading',{name:'Inmobiliarias',exact:true}).first()).toBeVisible();
  await expect(page.getByText('COLABORACIÓN B2B')).toBeVisible();
  await expect(page.getByText('ANA · EN ESTA PANTALLA')).toBeVisible();
  await expect(page.getByText('Datos vivos')).toBeVisible();
  await expect(page.getByText('EN FUENTE')).toBeVisible();
  await expect(page.getByText('ACTIVAS')).toBeVisible();
  await expect(page.getByText('EN PROCESO')).toBeVisible();
  await expect(page.getByText('SIN LLAMAR')).toBeVisible();
  await expect(page.getByText('DISTRIBUCIÓN POR LOCALIDAD')).toBeVisible();
  await expect(page.getByText('Prioridad comercial')).toBeVisible();
  await expect(page.getByText('ADAIX LUCENA')).toBeVisible();
  await expect(page.getByText('Fuente canónica Notion')).toBeVisible();
  await expect(page.getByText(/\bPRO\b/)).toHaveCount(0);
  const shot=await page.screenshot({fullPage:true});
  await testInfo.attach('inmobiliarias-master-1600',{body:shot,contentType:'image/png'});
 });
});
