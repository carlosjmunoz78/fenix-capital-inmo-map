import {test,expect} from '@playwright/test';

const fakeSession={
 access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJlbWFpbCI6InFhYUBmZW5peC50ZXN0IiwiZXhwIjoxOTk5OTk5OTk5fQ.',
 token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-record-not-real',
 user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'qa@fenix.test',app_metadata:{},user_metadata:{},created_at:'2026-08-19T00:00:00.000Z'}
};
const id='aaaaaaaa-1111-4111-8111-bbbbbbbbbbbb';
async function boot(page:any,role='Direccion'){
 await page.addInitScript((session:any)=>{window.localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));window.localStorage.setItem('fenix-remember-device','true');},fakeSession);
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async (r:any)=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:role==='Direccion'?'DIR-TEST':'FIN-A',role})});if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{label:'Inicio',route:'/inicio'},{label:'Agenda',route:'/agenda'},{label:'Documentación',route:'/documentacion'},{label:'Tasaciones',route:'/tasaciones'},{label:'Firmas',route:'/firmas'}]})});if(u.endsWith('/personal'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{actor_code:'FIN-A',name:'Financiero A',role:'Financiero'}],pending_profiles:0})});if(u.endsWith('/visitadores'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{actor_code:'VIS-A',nombre:'Visitador A',rol:'Visitador'}]})});return r.fulfill({status:404,body:'{}'});});
}

test.describe('Fénix PRE-PROD · acciones contextuales operativas',()=>{
 const cases=[
  {route:`/tareas/${id}`,endpoint:'tareas',name:'Tarea QA',payload:{id,tarea:'Tarea QA',estado:'Pendiente'},field:'Estado',option:'En curso',change:'estado'},
  {route:`/documentacion/${id}`,endpoint:'documentos',name:'Documento QA',payload:{id,documento:'Documento QA',estado:'Recibido'},field:'Estado',option:'Revisado',change:'estado'},
  {route:`/tasaciones/${id}`,endpoint:'tasaciones',name:'Tasación QA',payload:{id,tasacion:'Tasación QA',estado:'Solicitada'},field:'Estado',option:'Visita programada',change:'estado'},
  {route:`/firmas/${id}`,endpoint:'firmas',name:'Firma QA',payload:{id,firma:'Firma QA',estado:'Pendiente FEIN'},field:'Estado',option:'FEIN recibida',change:'estado'}
 ] as const;
 for(const c of cases){
  test(`${c.endpoint}: preview obligatorio y confirmación auditada`,async({page},testInfo)=>{
   if(!testInfo.project.name.includes('desktop'))test.skip();
   await boot(page);
   await page.route(`**/functions/v1/fenix-notion-runtime-test/${c.endpoint}/${id}`,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({source:'notion_canonical',item:c.payload})}));
   await page.route(`**/functions/v1/fenix-notion-runtime-test/${c.endpoint}`,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[c.payload]})}));
   let posted:any=null;
   await page.route(`**/functions/v1/fenix-notion-actions-test/${c.endpoint}/${id}/action`,async r=>{posted=JSON.parse(r.request().postData()||'{}');return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,updated:['Estado']})});});
   await page.goto(c.route);
   await expect(page.getByRole('heading',{name:c.name})).toBeVisible();
   await page.getByLabel(c.field).selectOption({label:c.option});
   await expect(page.getByRole('button',{name:'Confirmar y guardar'})).toHaveCount(0);
   await page.getByRole('button',{name:'Revisar antes de guardar'}).click();
   await expect(page.getByText('Vista previa',{exact:true})).toBeVisible();
   await page.getByRole('button',{name:'Confirmar y guardar'}).click();
   await expect(page.getByText('Cambios guardados y auditados en Notion.')).toBeVisible();
   expect(posted.action).toBe('update');expect(posted.changes[c.change]).toBe(c.option);
  });
 }
 test('Dirección puede trasladar una tarea con preview y escritura auditada',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await boot(page,'Direccion');
  const payload={id,tarea:'Tarea reasignable',estado:'Pendiente',id_trabajador_operativo:'FIN-B'};
  await page.route(`**/functions/v1/fenix-notion-runtime-test/tareas/${id}`,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({source:'notion_canonical',item:payload})}));
  await page.route('**/functions/v1/fenix-notion-runtime-test/tareas',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[payload]})}));
  let posted:any=null;
  await page.route(`**/functions/v1/fenix-notion-actions-test/tareas/${id}/action`,async r=>{posted=JSON.parse(r.request().postData()||'{}');return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,updated:['ID trabajador operativo']})});});
  await page.goto(`/tareas/${id}`);
  await expect(page.getByRole('heading',{name:'Tarea reasignable'})).toBeVisible();
  await expect(page.getByLabel('Trasladar tarea a')).toBeVisible();
  await page.getByLabel('Trasladar tarea a').selectOption('FIN-A');
  await expect(page.getByRole('button',{name:'Confirmar y guardar'})).toHaveCount(0);
  await page.getByRole('button',{name:'Revisar antes de guardar'}).click();
  await expect(page.getByText('Id Trabajador Operativo: FIN-A',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Confirmar y guardar'}).click();
  await expect(page.getByText('Cambios guardados y auditados en Notion.')).toBeVisible();
  expect(posted.action).toBe('update');
  expect(posted.changes.id_trabajador_operativo).toBe('FIN-A');
 });
 test('Financiero no ve control de traslado de tarea',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await boot(page,'Financiero');
  const payload={id,tarea:'Tarea propia',estado:'Pendiente',id_trabajador_operativo:'FIN-A'};
  await page.route(`**/functions/v1/fenix-notion-runtime-test/tareas/${id}`,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({source:'notion_canonical',item:payload})}));
  await page.goto(`/tareas/${id}`);
  await expect(page.getByRole('heading',{name:'Tarea propia'})).toBeVisible();
  await expect(page.getByLabel('Trasladar tarea a')).toHaveCount(0);
 });
 test('403 de detalle operativo no expone formulario de escritura',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await boot(page,'Financiero');
  await page.route(`**/functions/v1/fenix-notion-runtime-test/tasaciones/${id}`,r=>r.fulfill({status:403,contentType:'application/json',body:JSON.stringify({ok:false,error:'forbidden'})}));
  await page.route('**/functions/v1/fenix-notion-runtime-test/tasaciones',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[]})}));
  await page.goto(`/tasaciones/${id}`);
  await expect(page.getByText('Tu perfil no puede abrir este registro.')).toBeVisible();
  await expect(page.getByRole('button',{name:'Revisar antes de guardar'})).toHaveCount(0);
 });
});
