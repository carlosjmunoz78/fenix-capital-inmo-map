import {test,expect} from '@playwright/test';

const fakeSession={access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJleHAiOjE5OTk5OTk5OTl9.',token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-exp-knowledge-not-real',user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'qa@fenix.test',app_metadata:{},user_metadata:{actor_code:'DIR-TEST'},created_at:'2026-08-23T00:00:00.000Z'}};
const id='aaaaaaaa111141118111bbbbbbbbbbbb';

async function boot(page:any){
 await page.addInitScript((session:any)=>{localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));localStorage.setItem('fenix-remember-device','true');},fakeSession);
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{
  const u=r.request().url();
  if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'DIR-TEST',role:'Direccion'})});
  if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{label:'Inicio',route:'/inicio'},{label:'Expedientes',route:'/expedientes'}]})});
  return r.fulfill({status:404,contentType:'application/json',body:'{}'});
 });
 await page.route(`**/functions/v1/fenix-notion-runtime-test/expedientes/${id}`,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({source:'notion_canonical',item:{id,expediente:'EXP QA',cliente:'EXP QA',fase:'Tasación',proxima_accion:'Revisar expediente'}})}));
 await page.route(`**/functions/v1/fenix-notion-runtime-test/expedientes/${id}/compradores`,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({count:1,titulares:1,avalistas:0,items:[{id:'p1',nombre:'Cliente QA',rol_operacion:'Titular comprador',documentacion_completa:true,datos_revisados_financiero:true}]})}));
 await page.route('**/functions/v1/fenix-notion-runtime-test/expedientes',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{id,expediente:'EXP QA',cliente:'EXP QA',fase:'Tasación',proxima_accion:'Revisar expediente'}]})}));
 await page.route(`**/functions/v1/fenix-expediente-assistant-test/expedientes/${id}/advice`,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,status:200,action:'Revisar expediente',why:'Hay que validar el siguiente paso con los datos disponibles.',execution_modes:{ana:false,help:true,manual:true},people:{count:1,titulares:1,avalistas:0,missing_data:0,missing_docs:0,items:[{id:'p1',name:'Cliente QA',role:'Titular comprador',docs_complete:true,reviewed:true}]},channels:{}})}));
 await page.route('**/functions/v1/fenix-memory-api-test/context',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,status:200,items:[]})}));
 await page.route('**/functions/v1/fenix-ana-api-test/capabilities',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,capabilities:{can_ana_help:true,can_manual_execute:true,can_upload_evidence:false,can_correct_ana:true,can_view_learning_inbox:false,ana_execute_requires_action_context:true}})}));
 await page.route('**/functions/v1/fenix-ana-canonical-test/**',async r=>{
  expect(r.request().url()).toContain('domain=Hipotecas');
  return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,domain:'Hipotecas',canonical_only:true,exception_policy:'precedent_requires_context_review',items:[{id:'h1',domain:'Hipotecas',rule:'Antes de avanzar tras una tasación, validar la documentación financiera pendiente.',source:'Belén',confidence:100,exception:false,test:false,approved:true,state:'Aplicada',date:'2026-08-28'}],precedents:[{id:'h2',domain:'Hipotecas',rule:'Excepción aislada de banco que no debe aplicarse como regla general.',source:'Belén',confidence:100,exception:true,test:true,approved:true,state:'Aplicada',date:'2026-08-28'}]})});
 });
}

test.describe('Fénix PRE-PROD · conocimiento aprobado en expediente',()=>{
 test('Ana muestra reglas aprobadas de Hipotecas y no reutiliza precedentes como regla',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await boot(page);
  await page.goto(`/expedientes/${id}`);
  const block=page.getByTestId('expediente-ana-learned-criteria');
  await expect(block).toBeVisible();
  await expect(block).toContainText('Antes de avanzar tras una tasación, validar la documentación financiera pendiente.');
  await expect(block).not.toContainText('Excepción aislada de banco que no debe aplicarse como regla general.');
 });
});
