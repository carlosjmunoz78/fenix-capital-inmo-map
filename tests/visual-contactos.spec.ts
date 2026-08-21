import {test,expect} from '@playwright/test';

const fakeSession={
 access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJlbWFpbCI6ImRpcmVjY2lvbkBmZW5peC50ZXN0IiwiZXhwIjoxOTk5OTk5OTk5fQ.',
 token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-contactos-not-real',
 user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'direccion@fenix.test',app_metadata:{},user_metadata:{},created_at:'2026-08-19T00:00:00.000Z'}
};
const items=[
 {id:'aaaaaaaa111141118111bbbbbbbbbbbb',cliente:'CARMelo',estado:'Formalizado',proxima_accion:'2026-08-25',requiere_seguimiento:true},
 {id:'bbbbbbbb111141118111cccccccccccc',cliente:'ANA LUQUE ROMERO MESA',estado:'En seguimiento',requiere_seguimiento:true}
];

test.describe('Fénix PRE-PROD · contrato visual Contactos',()=>{
 test('Contactos usa shell específico, datos canónicos y patrón maestro',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await page.setViewportSize({width:1600,height:900});
  await page.addInitScript(session=>{window.localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));window.localStorage.setItem('fenix-remember-device','true');},fakeSession);
  await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'DIR-TEST',role:'Direccion'})});if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{label:'Inicio',route:'/inicio'},{label:'Contactos',route:'/contactos'},{label:'Expedientes',route:'/expedientes'}]})});return r.fulfill({status:404,body:'{}'});});
  let hits=0;
  await page.route('**/functions/v1/fenix-notion-runtime-test/clientes',r=>{hits++;return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({source:'notion_canonical',items})});});
  await page.goto('/contactos');
  await expect(page.getByRole('heading',{name:'Contactos',exact:true})).toBeVisible();
  await expect(page.getByText('ANA · EN ESTA PANTALLA')).toBeVisible();
  await expect(page.getByText('Datos vivos')).toBeVisible();
  await expect(page.getByText('Fuente canónica Notion')).toBeVisible();
  await expect(page.getByText('CON SEGUIMIENTO')).toBeVisible();
  await expect(page.getByText('FORMALIZADOS')).toBeVisible();
  await expect(page.getByText('SIN PRÓXIMA ACCIÓN')).toBeVisible();
  await expect(page.getByText('CARMelo')).toBeVisible();
  expect(hits).toBe(1);
  await expect(page.getByText(/\bPRO\b/)).toHaveCount(0);
  const shot=await page.screenshot({fullPage:true});
  await testInfo.attach('contactos-master-1600',{body:shot,contentType:'image/png'});
 });
});
