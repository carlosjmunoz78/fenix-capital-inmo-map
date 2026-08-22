import {test,expect} from '@playwright/test';

const fakeSession={
 access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJlbWFpbCI6InFhYUBmZW5peC50ZXN0IiwiZXhwIjoxOTk5OTk5OTk5fQ.',
 token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-contact-create-not-real',
 user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'qa@fenix.test',app_metadata:{},user_metadata:{},created_at:'2026-08-22T00:00:00.000Z'}
};
async function boot(page:any,role:'Direccion'|'Financiero'|'Visitador'='Direccion'){
 await page.addInitScript((session:any)=>{window.localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));window.localStorage.setItem('fenix-remember-device','true');},fakeSession);
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async(r:any)=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:role==='Direccion'?'DIR-TEST':role==='Financiero'?'FIN-A':'VIS-A',role})});if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{label:'Inicio',route:'/inicio'},{label:'Contactos',route:'/contactos'}]})});if(u.endsWith('/personal'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{actor_code:'FIN-A',name:'Financiero A',role:'Financiero'}],pending_profiles:0})});return r.fulfill({status:404,body:'{}'});});
}

test.describe('Fénix PRE-PROD · alta canónica de contactos',()=>{
 test('Dirección puede crear sin inventar asignación y con preview obligatorio',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();await boot(page,'Direccion');let posted:any=null;
  await page.route('**/functions/v1/fenix-notion-actions-test/clientes/create',async r=>{posted=JSON.parse(r.request().postData()||'{}');return r.fulfill({status:201,contentType:'application/json',body:JSON.stringify({ok:true,id:'aaaaaaaa-1111-4111-8111-dddddddddddd',destino:'/contactos/aaaaaaaa-1111-4111-8111-dddddddddddd'})});});
  await page.goto('/contactos/nuevo');await expect(page.getByRole('heading',{name:'Nuevo contacto'})).toBeVisible();
  await page.getByLabel('Nombre').fill('María');await page.getByLabel('Apellidos').fill('Prueba');await page.getByLabel('Email').fill('maria@example.test');
  await expect(page.getByLabel('Responsable financiero')).toHaveValue('');await page.getByRole('button',{name:'Revisar antes de crear'}).click();
  await expect(page.getByText('Responsable: Sin asignar',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Confirmar y crear'}).click();
  await expect(page.getByText('Contacto creado en la fuente canónica y auditado.')).toBeVisible();expect(posted.id_financiero_operativo).toBe('');expect(posted.nombre).toBe('María');
 });
 test('Financiero crea el contacto para su propia identidad',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();await boot(page,'Financiero');let posted:any=null;
  await page.route('**/functions/v1/fenix-notion-actions-test/clientes/create',async r=>{posted=JSON.parse(r.request().postData()||'{}');return r.fulfill({status:201,contentType:'application/json',body:JSON.stringify({ok:true,id:'bbbbbbbb-1111-4111-8111-dddddddddddd'})});});
  await page.goto('/contactos/nuevo');await page.getByLabel('Nombre').fill('Cliente propio');await expect(page.getByLabel('Responsable financiero')).toHaveValue('FIN-A');await page.getByRole('button',{name:'Revisar antes de crear'}).click();await page.getByRole('button',{name:'Confirmar y crear'}).click();expect(posted.id_financiero_operativo).toBe('FIN-A');
 });
 test('un duplicado no se vuelve a crear',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();await boot(page,'Direccion');
  await page.route('**/functions/v1/fenix-notion-actions-test/clientes/create',r=>r.fulfill({status:409,contentType:'application/json',body:JSON.stringify({ok:false,error:'duplicate_contact',existing_id:'cccccccc-1111-4111-8111-dddddddddddd',destino:'/contactos/cccccccc-1111-4111-8111-dddddddddddd'})}));
  await page.goto('/contactos/nuevo');await page.getByLabel('Nombre').fill('Ya existe');await page.getByLabel('Teléfono').fill('600123123');await page.getByRole('button',{name:'Revisar antes de crear'}).click();await page.getByRole('button',{name:'Confirmar y crear'}).click();await expect(page.getByText('Ya existe un contacto con ese email o teléfono. No se ha creado un duplicado.')).toBeVisible();await expect(page.getByRole('button',{name:'Abrir contacto existente'})).toBeVisible();
 });
 test('Visitador no recibe formulario de alta de cliente',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();await boot(page,'Visitador');await page.goto('/contactos/nuevo');await expect(page.getByText('Tu perfil no puede crear contactos de cliente.')).toBeVisible();await expect(page.getByRole('button',{name:'Revisar antes de crear'})).toHaveCount(0);
 });
});
