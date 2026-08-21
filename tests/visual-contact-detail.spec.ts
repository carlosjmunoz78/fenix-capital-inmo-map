import {test,expect} from '@playwright/test';

const fakeSession={
 access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJlbWFpbCI6ImRpcmVjY2lvbkBmZW5peC50ZXN0IiwiZXhwIjoxOTk5OTk5OTk5fQ.',
 token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-contact-detail-not-real',
 user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'direccion@fenix.test',app_metadata:{},user_metadata:{},created_at:'2026-08-19T00:00:00.000Z'}
};
const id='aaaaaaaa111141118111bbbbbbbbbbbb';
const item={id,cliente:'CARMELO',estado:'Formalizado',tipo:'Titular',relacion:'Cliente',expedientes:[{id:'exp-1'}],telefono:'600000000',email:'carmelo@example.test'};

test.describe('Fénix PRE-PROD · ficha maestra de Contacto',()=>{
 test('muestra identidad, relación y siguiente paso sin inventar datos',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await page.setViewportSize({width:1600,height:900});
  await page.addInitScript(session=>{window.localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));window.localStorage.setItem('fenix-remember-device','true');},fakeSession);
  await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'DIR-TEST',role:'Direccion'})});if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{label:'Inicio',route:'/inicio'},{label:'Contactos',route:'/contactos'}]})});return r.fulfill({status:404,body:'{}'});});
  await page.route(`**/functions/v1/fenix-notion-runtime-test/clientes/${id}`,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({source:'notion_canonical',item})}));
  await page.goto(`/contactos/${id}`);
  await expect(page.getByText('FICHA DE CONTACTO')).toBeVisible();
  await expect(page.getByRole('heading',{name:'CARMELO',exact:true}).first()).toBeVisible();
  await expect(page.getByText('IDENTIDAD Y RELACIÓN')).toBeVisible();
  await expect(page.getByText('SIGUIENTE PASO')).toBeVisible();
  await expect(page.getByText('Formalizado').first()).toBeVisible();
  await expect(page.getByText('No existe una próxima acción registrada. Ana no completará el dato por suposición.')).toBeVisible();
  await expect(page.getByRole('button',{name:'Preparar WhatsApp'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Preparar correo'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Crear tarea'})).toBeVisible();
  await expect(page.getByText(/\bPRO\b/)).toHaveCount(0);
  const shot=await page.screenshot({fullPage:true});
  await testInfo.attach('ficha-contacto-master-1600',{body:shot,contentType:'image/png'});
 });
});
