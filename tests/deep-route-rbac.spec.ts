import {test,expect} from '@playwright/test';

function fakeSession(actorCode:string,email:string){return{access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJleHAiOjE5OTk5OTk5OTl9.',token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-deep-route-not-real',user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email,app_metadata:{},user_metadata:{actor_code:actorCode},created_at:'2026-08-23T00:00:00.000Z'}};}

async function auth(page:any,actorCode:string,role:string,navItems:Array<{label:string;route:string}>,navigationStatus=200){
 await page.addInitScript(({session})=>{localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));localStorage.setItem('fenix-remember-device','true');}, {session:fakeSession(actorCode,`${actorCode.toLowerCase()}@fenix.test`)});
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async(r:any)=>{
  const u=r.request().url();
  if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:actorCode,role})});
  if(u.endsWith('/navigation'))return r.fulfill({status:navigationStatus,contentType:'application/json',body:JSON.stringify(navigationStatus===200?{items:navItems}:{error:'navigation unavailable'})});
  return r.fulfill({status:404,body:'{}'});
 });
}

const visitorNav=[{label:'Inicio',route:'/inicio'},{label:'Inmobiliarias',route:'/inmobiliarias'},{label:'Agenda',route:'/agenda'},{label:'Visitas',route:'/visitas'}];
const financeNav=[{label:'Inicio',route:'/inicio'},{label:'Expedientes',route:'/expedientes'},{label:'Bancos',route:'/bancos'},{label:'Agenda',route:'/agenda'},{label:'Documentación',route:'/documentacion'}];

test.describe('Fénix PRE-PROD · deep routes + RBAC fail-closed',()=>{
 test('URL profunda conocida no amplía permisos: el backend local conserva el 403',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await auth(page,'VIS-A','Visitador',visitorNav);
  const id='11111111-1111-4111-8111-111111111111';
  await page.route(`**/functions/v1/fenix-notarias-runtime-test/notarias/${id}`,r=>r.fulfill({status:403,contentType:'application/json',body:JSON.stringify({ok:false,error:'forbidden'})}));
  await page.goto(`/notarias/${id}`);
  await expect(page).toHaveURL(new RegExp(`/notarias/${id}$`));
  await expect(page.getByText('Tu perfil no tiene acceso a esta notaría.')).toBeVisible();
  await expect(page.locator('.profile-card')).toHaveCount(0);
 });

 test('ruta profunda autorizada conserva URL tras refresh',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await auth(page,'FIN-A','Financiero',financeNav);
  await page.route('**/functions/v1/fenix-notion-runtime-test/**',r=>r.fulfill({status:403,contentType:'application/json',body:JSON.stringify({error:'forbidden'})}));
  await page.goto('/expedientes/EXP-QA-DEEP');
  await expect(page).toHaveURL(/\/expedientes\/EXP-QA-DEEP$/);
  await page.reload();
  await expect(page).toHaveURL(/\/expedientes\/EXP-QA-DEEP$/);
 });

 test('alias profundo de tarea sigue siendo una ruta conocida',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await auth(page,'VIS-A','Visitador',visitorNav);
  await page.route('**/functions/v1/fenix-notion-runtime-test/**',r=>r.fulfill({status:403,contentType:'application/json',body:JSON.stringify({error:'forbidden'})}));
  await page.goto('/tareas/TASK-QA-1');
  await expect(page).toHaveURL(/\/tareas\/TASK-QA-1$/);
 });

 test('fallo de navigation no inventa menú ni desmonta el shell autorizado',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await auth(page,'DIR-QA','Direccion',[{label:'Inicio',route:'/inicio'}],500);
  await page.route('**/functions/v1/fenix-notion-runtime-test/tareas',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[]})}));
  await page.goto('/agenda');
  await expect(page).toHaveURL(/\/agenda$/);
  const nav=page.locator('.ops-side nav');
  await expect(nav.getByRole('button')).toHaveCount(1);
  await expect(nav.getByRole('button',{name:'Inicio',exact:true})).toBeVisible();
 });

 test('ruta desconocida autenticada no cae en shell genérico',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await auth(page,'DIR-QA','Direccion',[{label:'Inicio',route:'/inicio'}]);
  await page.goto('/admin-inventado');
  await expect(page).toHaveURL(/\/inicio$/);
 });
});
