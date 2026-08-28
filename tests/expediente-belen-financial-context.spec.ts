import {test,expect} from '@playwright/test';

const fakeSession={access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJleHAiOjE5OTk5OTk5OTl9.',token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-belen-financial-not-real',user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'qa@fenix.test',app_metadata:{},user_metadata:{actor_code:'DIR-TEST'},created_at:'2026-08-23T00:00:00.000Z'}};
const id='aaaaaaaa111141118111bbbbbbbbbbbb';

async function boot(page:any){
 await page.addInitScript((session:any)=>{localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));localStorage.setItem('fenix-remember-device','true');},fakeSession);
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{
  const u=r.request().url();
  if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'DIR-TEST',role:'Direccion'})});
  if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{label:'Inicio',route:'/inicio'},{label:'Expedientes',route:'/expedientes'}]})});
  return r.fulfill({status:404,contentType:'application/json',body:'{}'});
 });
 await page.route(`**/functions/v1/fenix-notion-runtime-test/expedientes/${id}`,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({source:'notion_canonical',item:{id,expediente:'EXP QA',cliente:'EXP QA',fase:'Tasación',proxima_accion:'Revisar tasación'}})}));
 await page.route(`**/functions/v1/fenix-notion-runtime-test/expedientes/${id}/compradores`,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({count:1,titulares:1,avalistas:0,items:[{id:'p1',nombre:'Cliente QA',rol_operacion:'Titular comprador',documentacion_completa:true,datos_revisados_financiero:true}]})}));
 await page.route('**/functions/v1/fenix-notion-runtime-test/expedientes',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{id,expediente:'EXP QA',cliente:'EXP QA',fase:'Tasación',proxima_accion:'Revisar tasación'}]})}));
 await page.route(`**/functions/v1/fenix-expediente-assistant-test/expedientes/${id}/advice`,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,status:200,action:'Revisar tasación',why:'Hay que comprobar el siguiente paso.',evidence:{phase:'Tasación'},execution_modes:{ana:false,help:true,manual:true},people:{count:1,titulares:1,avalistas:0,missing_data:0,missing_docs:0,items:[{id:'p1',name:'Cliente QA',role:'Titular comprador',situacion_laboral:'Indefinido',docs_complete:true,reviewed:true}]},channels:{}})}));
 await page.route('**/functions/v1/fenix-belen-financial-context-test/context',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,status:200,source:'Base Maestra Belén · Motor financiero CEREBRO',source_page_id:'3be81b1a-756d-81b6-a75f-cb6bbe842766',snapshot_date:'2026-08-25',authority:'Belén',baseline:[{id:'BEL-TAS-001',category:'Tasación',text:'Pre-tasación con nota simple y fotos.',requires_belen:true}],approved_rules:[{id:'FIN-APP-001',category:'Proceso',text:'Regla financiera aprobada de prueba.',condition:'expediente en fase de tasación',confidence:100,version:'1'}],approved_count:1,requires_belen_gate:true})}));
 await page.route('**/functions/v1/fenix-memory-api-test/context',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,status:200,items:[]})}));
 await page.route('**/functions/v1/fenix-ana-api-test/capabilities',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,capabilities:{can_ana_help:true,can_manual_execute:true,can_upload_evidence:false,can_correct_ana:true,can_view_learning_inbox:false,ana_execute_requires_action_context:true}})}));
 await page.route('**/functions/v1/fenix-ana-canonical-test/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,items:[]})}));
 await page.route(`**/functions/v1/fenix-bank-ranking-test/expedientes/${id}/ranking`,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,status:200,ranking:[]})}));
}

test.describe('Fénix PRE-PROD · contexto financiero Belén',()=>{
 test('distingue guía operativa de reglas financieras aprobadas',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await boot(page);
  await page.goto(`/expedientes/${id}`);
  const block=page.getByTestId('expediente-belen-financial-context');
  await expect(block).toBeVisible();
  const guidance=page.getByTestId('belen-financial-guidance');
  const approved=page.getByTestId('belen-financial-approved-rules');
  await expect(guidance).toContainText('GUÍA OPERATIVA · BASE MAESTRA BELÉN');
  await expect(guidance).toContainText('No convierte por sí sola una experiencia operativa en una regla automática.');
  await expect(guidance.locator('[data-knowledge-id="BEL-TAS-001"]')).toBeVisible();
  await expect(approved).toContainText('REGLAS FINANCIERAS APROBADAS');
  await expect(approved.locator('[data-knowledge-id="FIN-APP-001"]')).toContainText('Regla financiera aprobada de prueba.');
 });
});
