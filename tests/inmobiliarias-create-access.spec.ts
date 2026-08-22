import {test,expect} from '@playwright/test';

function fakeSession(actorCode:string,email:string){return{access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJleHAiOjE5OTk5OTk5OTl9.',token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-inmo-access-not-real',user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email,app_metadata:{},user_metadata:{actor_code:actorCode},created_at:'2026-08-22T00:00:00.000Z'}};}
async function boot(page:any,actorCode:string,role:string){
 await page.addInitScript(({session})=>{localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));}, {session:fakeSession(actorCode,`${actorCode.toLowerCase()}@fenix.test`)});
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async(r:any)=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:actorCode,role})});if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{label:'Inicio',route:'/inicio'},{label:'Inmobiliarias',route:'/inmobiliarias'}]})});if(u.endsWith('/visitadores'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[]})});return r.fulfill({status:404,body:'{}'});});
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

 test('Visitador crea solo por el endpoint B2B canónico, nunca por legacy',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await boot(page,'VIS-A','Visitador');
  let b2bHits=0,legacyHits=0;
  await page.route('**/functions/v1/fenix-b2b-actions-test/inmobiliarias/create',async r=>{b2bHits++;return r.fulfill({status:201,contentType:'application/json',body:JSON.stringify({ok:true,id:'qa-vis-a',destino:'/inmobiliarias/qa-vis-a'})});});
  await page.route('**/functions/v1/fenix-notion-actions-test/inmobiliarias/create',async r=>{legacyHits++;return r.fulfill({status:500,contentType:'application/json',body:JSON.stringify({ok:false,error:'legacy_must_not_be_called'})});});
  await page.goto('/inmobiliarias/nueva');
  await page.getByLabel('Inmobiliaria').fill('QA Inmobiliaria VIS-A');
  await page.getByRole('button',{name:'Revisar antes de crear'}).click();
  await page.getByRole('button',{name:'Confirmar y crear'}).click();
  await expect.poll(()=>b2bHits).toBe(1);
  expect(legacyHits).toBe(0);
  await expect(page.getByText('Inmobiliaria creada en la fuente canónica y auditada.')).toBeVisible();
 });

 test('Dirección conserva el alta legacy mientras Visitador queda fuera',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await boot(page,'DIR-TEST','Direccion');
  let b2bHits=0,legacyHits=0;
  await page.route('**/functions/v1/fenix-b2b-actions-test/inmobiliarias/create',async r=>{b2bHits++;return r.fulfill({status:500,contentType:'application/json',body:JSON.stringify({ok:false,error:'b2b_must_not_be_called'})});});
  await page.route('**/functions/v1/fenix-notion-actions-test/inmobiliarias/create',async r=>{legacyHits++;return r.fulfill({status:201,contentType:'application/json',body:JSON.stringify({ok:true,id:'qa-dir',destino:'/inmobiliarias/qa-dir'})});});
  await page.goto('/inmobiliarias/nueva');
  await page.getByLabel('Inmobiliaria').fill('QA Inmobiliaria Dirección');
  await page.getByRole('button',{name:'Revisar antes de crear'}).click();
  await page.getByRole('button',{name:'Confirmar y crear'}).click();
  await expect.poll(()=>legacyHits).toBe(1);
  expect(b2bHits).toBe(0);
 });
});
