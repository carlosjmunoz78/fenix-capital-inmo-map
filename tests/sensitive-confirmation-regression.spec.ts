import {test,expect} from '@playwright/test';

const fakeSession={access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJlbWFpbCI6InFhQGZlbml4LnRlc3QiLCJleHAiOjE5OTk5OTk5OTk5fQ.',token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-sensitive-confirm-not-real',user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'qa@fenix.test',app_metadata:{},user_metadata:{actor_code:'DIR-TEST'},created_at:'2026-08-23T00:00:00.000Z'}};

async function boot(page:any,role='Direccion'){
 await page.addInitScript((session:any)=>{localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));localStorage.setItem('fenix-remember-device','true');},fakeSession);
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async(r:any)=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:role==='Direccion'?'DIR-TEST':'FIN-A',role})});if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{label:'Inicio',route:'/inicio'},{label:'Contactos',route:'/contactos'},{label:'Expedientes',route:'/expedientes'},{label:'Inmobiliarias',route:'/inmobiliarias'},{label:'Agenda',route:'/agenda'}]})});if(u.endsWith('/personal'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{actor_code:'FIN-A',name:'Financiero A',role:'Financiero'}]})});if(u.endsWith('/visitadores'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{actor_code:'VIS-A',nombre:'Visitador A',rol:'Visitador'}]})});return r.fulfill({status:404,body:'{}'});});
 await page.route('**/functions/v1/fenix-ana-api-test/capabilities',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({capabilities:{show_ana_execute:true,can_ana_execute:true,ana_execute_requires_action_context:true,can_ana_help:true,can_manual_execute:true,can_upload_evidence:false,can_correct_ana:true,can_view_learning_inbox:false}})}));
 await page.route('**/functions/v1/fenix-comprador-action-test/expedientes/*/compradores',r=>r.fulfill({status:201,contentType:'application/json',body:JSON.stringify({ok:true,id:'ffffffff-1111-4111-8111-ffffffffffff'})}));
}

test.describe('Fénix PRE-PROD · confirmación sensible transversal',()=>{
 test('alta de contacto no escribe antes de confirmar y editar invalida la preview',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();await boot(page);let posts=0;
  await page.route('**/functions/v1/fenix-notion-actions-test/clientes/create',r=>{posts++;return r.fulfill({status:201,contentType:'application/json',body:JSON.stringify({ok:true,id:'aaaaaaaa-1111-4111-8111-dddddddddddd'})});});
  await page.goto('/contactos/nuevo');await page.getByLabel('Nombre').fill('María');await page.getByRole('button',{name:'Revisar antes de crear'}).click();expect(posts).toBe(0);await expect(page.getByRole('button',{name:'Confirmar y crear'})).toBeVisible();await page.getByLabel('Apellidos').fill('Segura');await expect(page.getByRole('button',{name:'Confirmar y crear'})).toHaveCount(0);expect(posts).toBe(0);await page.getByRole('button',{name:'Revisar antes de crear'}).click();await page.getByRole('button',{name:'Confirmar y crear'}).click();await expect.poll(()=>posts).toBe(1);
 });
 test('alta de expediente exige doble paso antes del POST',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();await boot(page);let posts=0;
  await page.route('**/functions/v1/fenix-notion-actions-test/expedientes/create',r=>{posts++;return r.fulfill({status:201,contentType:'application/json',body:JSON.stringify({ok:true,id:'bbbbbbbb-1111-4111-8111-dddddddddddd'})});});
  await page.goto('/expedientes/nuevo');await page.getByLabel('Nombre').fill('Cliente Seguro');await page.getByRole('button',{name:'Revisar antes de crear'}).click();expect(posts).toBe(0);await page.getByRole('button',{name:'Confirmar y crear'}).click();await expect.poll(()=>posts).toBe(1);
 });
 test('alta de inmobiliaria exige preview y confirmación',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();await boot(page);let posts=0;
  await page.route('**/functions/v1/fenix-notion-actions-test/inmobiliarias/create',r=>{posts++;return r.fulfill({status:201,contentType:'application/json',body:JSON.stringify({ok:true,id:'cccccccc-1111-4111-8111-dddddddddddd'})});});
  await page.goto('/inmobiliarias/nueva');await page.getByLabel('Inmobiliaria').fill('Inmo Segura');await page.getByRole('button',{name:'Revisar antes de crear'}).click();expect(posts).toBe(0);await page.getByRole('button',{name:'Confirmar y crear'}).click();await expect.poll(()=>posts).toBe(1);
 });
 test('alta de tarea exige responsable explícito y confirmación',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();await boot(page);let posts=0;
  await page.route('**/functions/v1/fenix-notion-actions-test/tareas/create',r=>{posts++;return r.fulfill({status:201,contentType:'application/json',body:JSON.stringify({ok:true,id:'dddddddd-1111-4111-8111-dddddddddddd'})});});
  await page.goto('/tareas/nueva');await page.getByLabel('Tarea').fill('Revisar expediente');await expect(page.getByRole('button',{name:'Revisar antes de crear'})).toBeDisabled();await page.getByLabel('Responsable').selectOption('FIN-A');await page.getByRole('button',{name:'Revisar antes de crear'}).click();expect(posts).toBe(0);await page.getByRole('button',{name:'Confirmar y crear'}).click();await expect.poll(()=>posts).toBe(1);
 });
 test('edición de registro operativo no escribe hasta confirmar',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();await boot(page);let posts=0;const id='eeeeeeee-1111-4111-8111-dddddddddddd';
  await page.route(`**/functions/v1/fenix-notion-runtime-test/tareas/${id}`,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({item:{id,tarea:'Tarea segura',estado:'Pendiente',criticidad:'Normal'}})}));await page.route(`**/functions/v1/fenix-notion-actions-test/tareas/${id}/action`,r=>{posts++;return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true})});});await page.goto(`/tareas/${id}`);await page.getByLabel('Estado').selectOption('En curso');await page.getByRole('button',{name:'Revisar antes de guardar'}).click();expect(posts).toBe(0);await page.getByLabel('Criticidad').selectOption('Importante');await expect(page.getByRole('button',{name:'Confirmar y guardar'})).toHaveCount(0);expect(posts).toBe(0);await page.getByRole('button',{name:'Revisar antes de guardar'}).click();await page.getByRole('button',{name:'Confirmar y guardar'}).click();await expect.poll(()=>posts).toBe(1);
 });
 test('Ana universal no ofrece ejecución directa sin contexto de acción específico',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();await boot(page);await page.route('**/functions/v1/fenix-notion-runtime-test/contactos',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[]})}));await page.goto('/contactos');const ana=page.getByLabel('Ana · asistente contextual');await ana.getByRole('button',{name:/Ana/}).first().dispatchEvent('click');const execute=ana.getByRole('button',{name:'Que lo haga Ana'});await expect(execute).toBeDisabled();
 });
});
