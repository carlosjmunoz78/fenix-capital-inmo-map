import {test,expect} from '@playwright/test';

const fakeSession={access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJleHAiOjE5OTk5OTk5OTl9.',token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-ana-domain-routing-not-real',user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'qa@fenix.test',app_metadata:{},user_metadata:{actor_code:'DIR-TEST'},created_at:'2026-08-28T00:00:00.000Z'}};

async function boot(page:any){
 await page.addInitScript(session=>{localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));localStorage.setItem('fenix-remember-device','true');},fakeSession);
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{
   const u=r.request().url();
   if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'DIR-TEST',role:'Direccion'})});
   if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{label:'Inicio',route:'/inicio'},{label:'Notarías',route:'/notarias'},{label:'Registros de la Propiedad',route:'/registros-propiedad'},{label:'Economía',route:'/economia'}]})});
   return r.fulfill({status:404,contentType:'application/json',body:'{}'});
 });
 await page.route('**/functions/v1/fenix-ana-api-test/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({capabilities:{can_ana_help:true,can_manual_execute:true,can_upload_evidence:false,can_correct_ana:true,can_view_learning_inbox:false,ana_execute_requires_action_context:true}})}));
 await page.route('**/functions/v1/fenix-notarias-runtime-test/notarias',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,source:'notion_canonical',items:[]})}));
 await page.route('**/functions/v1/fenix-notion-runtime-test/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({source:'notion_canonical',items:[]})}));
}

test.describe('Fénix PRE-PROD · rutas de conocimiento de Ana',()=>{
 test('Notarías y Registros consultan Hipotecas; Economía consulta Finanzas',async({page},testInfo)=>{
   if(!testInfo.project.name.includes('desktop'))test.skip();
   await boot(page);
   const domains:string[]=[];
   await page.route('**/functions/v1/fenix-ana-canonical-test/**',async r=>{
     const u=new URL(r.request().url());
     domains.push(u.searchParams.get('domain')||'');
     return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,items:[]})});
   });

   await page.goto('/notarias');
   await expect.poll(()=>domains.includes('Hipotecas')).toBe(true);

   domains.length=0;
   await page.goto('/registros-propiedad');
   await expect.poll(()=>domains.includes('Hipotecas')).toBe(true);

   domains.length=0;
   await page.goto('/economia');
   await expect.poll(()=>domains.includes('Finanzas')).toBe(true);
 });
});
