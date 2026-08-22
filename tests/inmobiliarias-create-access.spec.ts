import {test,expect} from '@playwright/test';

function fakeSession(actorCode:string,email:string){return{access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJleHAiOjE5OTk5OTk5OTl9.',token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-inmo-access-not-real',user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email,app_metadata:{},user_metadata:{actor_code:actorCode},created_at:'2026-08-22T00:00:00.000Z'}};}
async function boot(page:any,actorCode:string,role:string){
 await page.addInitScript(({session})=>{localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));}, {session:fakeSession(actorCode,`${actorCode.toLowerCase()}@fenix.test`)});
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async(r:any)=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:actorCode,role})});if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{label:'Inicio',route:'/inicio'},{label:'Inmobiliarias',route:'/inmobiliarias'}]})});return r.fulfill({status:404,body:'{}'});});
 await page.route('**/functions/v1/fenix-notion-runtime-test/inmobiliarias',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[]})}));
}

test.describe('Fénix PRE-PROD · acceso a nueva inmobiliaria por rol',()=>{
 for(const [actor,role] of [['DIR-TEST','Direccion'],['VIS-A','Visitador']] as const){
  test(`${role} ve el acceso de alta B2B`,async({page},testInfo)=>{
   if(!testInfo.project.name.includes('desktop'))test.skip();
   await boot(page,actor,role);await page.goto('/inmobiliarias');
   const cta=page.getByTestId('new-inmobiliaria-access');
   await expect(cta).toBeVisible();
   await cta.dispatchEvent('click');
   await expect(page).toHaveURL(/\/inmobiliarias\/nueva$/);
  });
 }
 test('Financiero no ve el acceso de alta B2B',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await boot(page,'FIN-A','Financiero');await page.goto('/inmobiliarias');
  await expect(page.getByTestId('new-inmobiliaria-access')).toHaveCount(0);
 });
});
