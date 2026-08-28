import {test,expect} from '@playwright/test';

const fakeSession={access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJleHAiOjE5OTk5OTk5OTl9.',token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-canonical-not-real',user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'qa@fenix.test',app_metadata:{},user_metadata:{actor_code:'DIR-TEST'},created_at:'2026-08-23T00:00:00.000Z'}};

async function boot(page:any){
 await page.addInitScript(session=>{localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));localStorage.setItem('fenix-remember-device','true');},fakeSession);
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{
   const u=r.request().url();
   if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'DIR-TEST',role:'Direccion'})});
   if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:['/inicio','/inmobiliarias']})});
   return r.fulfill({status:404,contentType:'application/json',body:'{}'});
 });
 await page.route('**/functions/v1/fenix-notion-runtime-test/inmobiliarias',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{id:'INMO-QA-1',nombre:'Inmobiliaria QA',localidad:'Córdoba',estado:'Activa',proxima_accion:'Seguimiento'}]})}));
 await page.route('**/functions/v1/fenix-ana-api-test/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({capabilities:{can_ana_help:true,can_manual_execute:true,can_upload_evidence:false,can_correct_ana:true,can_view_learning_inbox:false,ana_execute_requires_action_context:true}})}));
 await page.route('**/functions/v1/fenix-ana-canonical-test/**',async r=>{
   expect(r.request().url()).toContain('domain=Inmobiliarias%20B2B');
   return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,domain:'Inmobiliarias B2B',canonical_only:true,items:[{id:'rule-1',domain:'Inmobiliarias B2B',rule:'TEST F3.5: en una aportación B2B, conservar siempre trazabilidad del origen antes de reutilizar el conocimiento.',source:'CEREBRO/QA',confidence:100,exception:false,test:true,approved:true,state:'Aplicada',date:'2026-08-28'}]})});
 });
}

test.describe('Fénix PRE-PROD · consumo canónico de Ana',()=>{
 test('la Ana visible de Inmobiliarias incorpora la regla canónica del dominio',async({page},testInfo)=>{
   if(!testInfo.project.name.includes('desktop'))test.skip();
   await boot(page);
   await page.goto('/inmobiliarias');
   const summary=page.getByTestId('inmo-ana-live-summary');
   await expect(summary).toBeVisible();
   await expect(summary).toContainText('Criterio canónico vigente:');
   await expect(summary).toContainText('conservar siempre trazabilidad del origen antes de reutilizar el conocimiento.');
 });
});
