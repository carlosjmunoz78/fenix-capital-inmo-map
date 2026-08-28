import {test,expect} from '@playwright/test';

const fakeSession={access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJleHAiOjE5OTk5OTk5OTl9.',token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-canonical-not-real',user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'qa@fenix.test',app_metadata:{},user_metadata:{actor_code:'DIR-TEST'},created_at:'2026-08-23T00:00:00.000Z'}};

async function boot(page:any){
 await page.addInitScript(session=>{localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));localStorage.setItem('fenix-remember-device','true');},fakeSession);
 await page.route('**/functions/v1/fenix-ana-api-test/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({capabilities:{can_ana_help:true,can_manual_execute:true,can_upload_evidence:false,can_correct_ana:true,can_view_learning_inbox:false,ana_execute_requires_action_context:true}})}));
 await page.route('**/functions/v1/fenix-ana-canonical-test/**',async r=>{
   expect(r.request().url()).toContain('domain=Inmobiliarias%20B2B');
   return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,domain:'Inmobiliarias B2B',canonical_only:true,items:[{id:'rule-1',domain:'Inmobiliarias B2B',rule:'Conservar siempre trazabilidad del origen antes de reutilizar el conocimiento.',source:'CEREBRO/QA',confidence:100,exception:false,test:true,approved:true,state:'Aplicada',date:'2026-08-28'}]})});
 });
}

test.describe('Fénix PRE-PROD · consumo canónico de Ana',()=>{
 test('Ana consulta y muestra reglas canónicas del dominio al ayudar',async({page},testInfo)=>{
   if(!testInfo.project.name.includes('desktop'))test.skip();
   await boot(page);
   await page.goto('/inmobiliarias');
   await page.getByRole('button',{name:'Ana · asistente contextual'}).click().catch(()=>{});
   const aside=page.getByLabel('Ana · asistente contextual');
   if(await aside.getAttribute('class').then((v:string|null)=>!(v||'').includes('open')))await aside.locator('button').first().click();
   await aside.getByRole('button',{name:'Ayúdame'}).click();
   await expect(page.getByTestId('ana-canonical-help')).toContainText('Conocimiento canónico aplicado · Inmobiliarias B2B');
   await expect(page.getByTestId('ana-canonical-help')).toContainText('Conservar siempre trazabilidad del origen antes de reutilizar el conocimiento.');
 });
});
