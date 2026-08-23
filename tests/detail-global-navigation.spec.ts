import {test,expect} from '@playwright/test';

const fakeSession={access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJleHAiOjE5OTk5OTk5OTl9.',token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-detail-global-nav-not-real',user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'qa@fenix.test',app_metadata:{},user_metadata:{actor_code:'DIR-TEST'},created_at:'2026-08-23T00:00:00.000Z'}};
const id='aaaaaaaa-1111-4111-8111-bbbbbbbbbbbb';
const directionNav=[{label:'Inicio',route:'/inicio'},{label:'Expedientes',route:'/expedientes'},{label:'Contactos',route:'/contactos'},{label:'Inmobiliarias',route:'/inmobiliarias'},{label:'Tasaciones',route:'/tasaciones'},{label:'Firmas',route:'/firmas'},{label:'Documentación',route:'/documentacion'},{label:'Agenda',route:'/agenda'},{label:'Notarías',route:'/notarias'}];
const visitadorNav=[{label:'Inicio',route:'/inicio'},{label:'Inmobiliarias',route:'/inmobiliarias'},{label:'Contactos',route:'/contactos'},{label:'Visitas',route:'/visitas'},{label:'Agenda',route:'/agenda'},{label:'Documentación',route:'/documentacion'}];

async function auth(page:any,navigationStatus=200,role='Direccion',navItems=directionNav){
 await page.addInitScript(session=>{localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));localStorage.setItem('fenix-remember-device','true');},fakeSession);
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:role==='Visitador'?'VIS-A':'DIR-TEST',role})});if(u.endsWith('/navigation'))return r.fulfill({status:navigationStatus,contentType:'application/json',body:navigationStatus===200?JSON.stringify({items:navItems}):JSON.stringify({error:'navigation_unavailable'})});return r.fulfill({status:404,body:'{}'});});
}

test.describe('Fénix PRE-PROD · navegación global en fichas dedicadas',()=>{
 test('detalle operativo mantiene menú global autorizado',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await auth(page);
  await page.route(`**/functions/v1/fenix-notion-runtime-test/tareas/${id}`,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({item:{id,tarea:'Tarea QA',estado:'Pendiente'}})}));
  await page.route('**/functions/v1/fenix-app-gateway-test/personal',r=>r.fulfill({status:200,contentType:'application/json',body:'{"items":[]}'}));
  await page.route('**/functions/v1/fenix-app-gateway-test/visitadores',r=>r.fulfill({status:200,contentType:'application/json',body:'{"items":[]}'}));
  await page.goto(`/tareas/${id}`);
  const menu=page.locator('.ops-side nav');
  await expect(menu.getByRole('button',{name:'Agenda',exact:true})).toBeVisible();
  await expect(menu.getByRole('button',{name:'Inmobiliarias',exact:true})).toBeVisible();
  await expect(menu.getByRole('button',{name:'Notarías',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Tarea QA',exact:true})).toBeVisible();
 });

 test('detalle operativo falla cerrado si navigation no responde',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await auth(page,500);
  await page.route(`**/functions/v1/fenix-notion-runtime-test/tareas/${id}`,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({item:{id,tarea:'Tarea QA',estado:'Pendiente'}})}));
  await page.goto(`/tareas/${id}`);
  const menu=page.locator('.ops-side nav');
  await expect(menu.getByRole('button',{name:'Inicio',exact:true})).toBeVisible();
  await expect(menu.getByRole('button',{name:'Agenda',exact:true})).toHaveCount(0);
  await expect(menu.getByRole('button',{name:'Inmobiliarias',exact:true})).toHaveCount(0);
 });

 test('ficha de notaría usa navegación autorizada y conserva Notarías activa',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await auth(page);
  await page.route(`**/functions/v1/fenix-notarias-runtime-test/notarias/${id}`,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({item:{id,notaria:'Notaría QA',localidad:'Córdoba'}})}));
  await page.goto(`/notarias/${id}`);
  const menu=page.locator('.ops-side nav');
  await expect(menu.getByRole('button',{name:'Notarías',exact:true})).toBeVisible();
  await expect(menu.getByRole('button',{name:'Inmobiliarias',exact:true})).toBeVisible();
  await expect(menu.getByRole('button',{name:'Notarías',exact:true})).toHaveClass(/active/);
 });

 test('contacto B2B mantiene exactamente el menú autorizado del Visitador',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await auth(page,200,'Visitador',visitadorNav);
  await page.route(`**/functions/v1/fenix-b2b-actions-test/contactos/${id}`,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({item:{id,nombre:'Ana',apellidos:'QA',contacto:'Ana QA',cargo:'Gerencia',email:'',telefono:'',activo:true,inmobiliaria_id:id},inmobiliaria:{id,nombre:'Inmo QA',localidad:'Córdoba'}})}));
  await page.goto(`/contactos-b2b/${id}`);
  const menu=page.locator('.ops-side nav');
  await expect(menu.getByRole('button',{name:'Inmobiliarias',exact:true})).toBeVisible();
  await expect(menu.getByRole('button',{name:'Visitas',exact:true})).toBeVisible();
  await expect(menu.getByRole('button',{name:'Notarías',exact:true})).toHaveCount(0);
  await expect(menu.getByRole('button',{name:'Expedientes',exact:true})).toHaveCount(0);
  await expect(page.getByRole('heading',{name:'Ana QA',exact:true})).toBeVisible();
 });
});
