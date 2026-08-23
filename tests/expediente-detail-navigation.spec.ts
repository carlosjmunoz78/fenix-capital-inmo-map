import {test,expect} from '@playwright/test';

const id='aaaaaaaa111141118111bbbbbbbbbbbb';
const fakeSession={access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJleHAiOjE5OTk5OTk5OTl9.',token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-exp-detail-nav-not-real',user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'qa@fenix.test',app_metadata:{},user_metadata:{actor_code:'FIN-A'},created_at:'2026-08-23T00:00:00.000Z'}};

async function boot(page:any,navigationStatus=200){
 await page.addInitScript(session=>{localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));localStorage.setItem('fenix-remember-device','true');},fakeSession);
 const nav=[{label:'Inicio',route:'/inicio'},{label:'Expedientes',route:'/expedientes'},{label:'Bancos',route:'/bancos'},{label:'Contactos',route:'/contactos'},{label:'Inmobiliarias',route:'/inmobiliarias'},{label:'Documentación',route:'/documentacion'},{label:'Firmas',route:'/firmas'},{label:'Tasaciones',route:'/tasaciones'},{label:'Agenda',route:'/agenda'}];
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'FIN-A',role:'Financiero'})});if(u.endsWith('/navigation'))return r.fulfill({status:navigationStatus,contentType:'application/json',body:navigationStatus===200?JSON.stringify({items:nav}):JSON.stringify({error:'navigation_unavailable'})});return r.fulfill({status:404,body:'{}'});});
 await page.route(`**/functions/v1/fenix-notion-runtime-test/expedientes/${id}`,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({source:'notion_canonical',item:{id,expediente:'Expediente QA',cliente:'Cliente QA',fase:'Estudio'}})}));
 await page.route(`**/functions/v1/fenix-notion-runtime-test/expedientes/${id}/compradores`,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[],count:0,titulares:0,avalistas:0})}));
 await page.route(`**/functions/v1/fenix-expediente-assistant-test/expedientes/${id}/advice`,r=>r.fulfill({status:403,contentType:'application/json',body:'{}'}));
}

test.describe('Fénix PRE-PROD · ficha expediente con navegación global',()=>{
 test('Financiero ve exactamente su menú autorizado y no Comunicaciones',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await boot(page);
  await page.goto(`/expedientes/${id}`);
  const menu=page.locator('aside.detail-auth-nav nav');
  await expect(menu.getByRole('button',{name:'Expedientes',exact:true})).toBeVisible();
  await expect(menu.getByRole('button',{name:'Inmobiliarias',exact:true})).toBeVisible();
  await expect(menu.getByRole('button',{name:'Comunicaciones',exact:true})).toHaveCount(0);
  await expect(menu.getByRole('button',{name:'Financieros',exact:true})).toHaveCount(0);
  await expect(page.getByRole('heading',{name:'Expediente QA',exact:true})).toBeVisible();
 });

 test('fallo de navigation deja únicamente Inicio en la ficha',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await boot(page,500);
  await page.goto(`/expedientes/${id}`);
  const menu=page.locator('aside.detail-auth-nav nav');
  await expect(menu.getByRole('button',{name:'Inicio',exact:true})).toBeVisible();
  await expect(menu.getByRole('button',{name:'Expedientes',exact:true})).toHaveCount(0);
  await expect(menu.getByRole('button',{name:'Comunicaciones',exact:true})).toHaveCount(0);
 });

 test('menú autorizado permanece fijo al desplazar la ficha',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await boot(page);
  await page.goto(`/expedientes/${id}`);
  const side=page.locator('aside.detail-auth-nav');const main=page.locator('.detail-exp-main');
  const before=await side.boundingBox();expect(before).not.toBeNull();
  await main.evaluate(el=>{el.scrollTop=900});
  const after=await side.boundingBox();expect(after).not.toBeNull();
  expect(Math.round(after!.x)).toBe(Math.round(before!.x));
  expect(Math.round(after!.y)).toBe(Math.round(before!.y));
 });
});
