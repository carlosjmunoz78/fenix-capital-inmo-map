import {test,expect} from '@playwright/test';

const fakeSession={
 access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJlbWFpbCI6InFhYUBmZW5peC50ZXN0IiwiZXhwIjoxOTk5OTk5OTk5fQ.',
 token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-task-create-not-real',
 user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'qa@fenix.test',app_metadata:{},user_metadata:{},created_at:'2026-08-22T00:00:00.000Z'}
};

async function boot(page:any,role:'Direccion'|'Financiero'='Direccion'){
 await page.addInitScript((session:any)=>{window.localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));window.localStorage.setItem('fenix-remember-device','true');},fakeSession);
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async (r:any)=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:role==='Direccion'?'DIR-TEST':'FIN-A',role})});if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{label:'Inicio',route:'/inicio'},{label:'Agenda',route:'/agenda'}]})});if(u.endsWith('/personal'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{actor_code:'FIN-A',name:'Financiero A',role:'Financiero'}],pending_profiles:0})});if(u.endsWith('/visitadores'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{actor_code:'VIS-A',nombre:'Visitador A',rol:'Visitador'}]})});return r.fulfill({status:404,body:'{}'});});
 await page.route('**/functions/v1/fenix-notion-runtime-test/tareas/nueva',r=>r.fulfill({status:404,contentType:'application/json',body:'{}'}));
}

test.describe('Fénix PRE-PROD · alta canónica de tareas',()=>{
 test('Dirección revisa y crea una tarea con responsable explícito',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await boot(page,'Direccion');
  let posted:any=null;
  await page.route('**/functions/v1/fenix-notion-actions-test/tareas/create',async r=>{posted=JSON.parse(r.request().postData()||'{}');return r.fulfill({status:201,contentType:'application/json',body:JSON.stringify({ok:true,id:'aaaaaaaa-1111-4111-8111-cccccccccccc',destino:'/tareas/aaaaaaaa-1111-4111-8111-cccccccccccc'})});});
  await page.goto('/tareas/nueva');
  await expect(page.getByRole('heading',{name:'Nueva tarea'})).toBeVisible();
  await page.getByLabel('Tarea').fill('Llamar al cliente');
  await page.getByLabel('Responsable').selectOption('FIN-A');
  await page.getByLabel('Criticidad').selectOption('Importante');
  await page.getByLabel('Fecha límite').fill('2026-08-25');
  await expect(page.getByRole('button',{name:'Confirmar y crear'})).toHaveCount(0);
  await page.getByRole('button',{name:'Revisar antes de crear'}).click();
  await expect(page.getByText('Estado inicial: Pendiente',{exact:true})).toBeVisible();
  await expect(page.getByText('Responsable: Financiero A',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Confirmar y crear'}).click();
  await expect(page.getByText('Tarea creada en la fuente canónica y auditada.')).toBeVisible();
  expect(posted).toEqual({tarea:'Llamar al cliente',id_trabajador_operativo:'FIN-A',criticidad:'Importante',fecha_limite:'2026-08-25'});
 });

 test('Financiero crea solo para su propia identidad operativa',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await boot(page,'Financiero');
  let posted:any=null;
  await page.route('**/functions/v1/fenix-notion-actions-test/tareas/create',async r=>{posted=JSON.parse(r.request().postData()||'{}');return r.fulfill({status:201,contentType:'application/json',body:JSON.stringify({ok:true,id:'bbbbbbbb-1111-4111-8111-cccccccccccc',destino:'/tareas/bbbbbbbb-1111-4111-8111-cccccccccccc'})});});
  await page.goto('/tareas/nueva');
  await page.getByLabel('Tarea').fill('Revisar documentación');
  await expect(page.getByLabel('Responsable')).toHaveValue('FIN-A');
  await expect(page.getByLabel('Responsable')).toHaveAttribute('readonly','');
  await page.getByRole('button',{name:'Revisar antes de crear'}).click();
  await page.getByRole('button',{name:'Confirmar y crear'}).click();
  expect(posted.id_trabajador_operativo).toBe('FIN-A');
 });
});
