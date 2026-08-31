import {test,expect} from '@playwright/test';

const id='aaaaaaaa-1111-4111-8111-bbbbbbbbbbbb';
const fakeSession={access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJleHAiOjE5OTk5OTk5OTl9.',token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-inmo-visibility-not-real',user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'qa@fenix.test',app_metadata:{},user_metadata:{actor_code:'DIR-TEST'},created_at:'2026-08-23T00:00:00.000Z'}};

async function boot(page:any,role:'Direccion'|'Financiero'|'Visitador',navigationStatus=200){
 await page.addInitScript(session=>{localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));localStorage.setItem('fenix-remember-device','true');},fakeSession);
 const nav=role==='Visitador'
  ?[{label:'Inicio',route:'/inicio'},{label:'Inmobiliarias',route:'/inmobiliarias'},{label:'Contactos',route:'/contactos'},{label:'Visitas',route:'/visitas'}]
  :[{label:'Inicio',route:'/inicio'},{label:'Expedientes',route:'/expedientes'},{label:'Contactos',route:'/contactos'},{label:'Inmobiliarias',route:'/inmobiliarias'}];
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:role==='Direccion'?'DIR-TEST':role==='Financiero'?'FIN-A':'VIS-A',role})});if(u.endsWith('/navigation'))return r.fulfill({status:navigationStatus,contentType:'application/json',body:navigationStatus===200?JSON.stringify({items:nav}):JSON.stringify({error:'navigation_unavailable'})});return r.fulfill({status:404,body:'{}'});});
}

test.describe('Fénix PRE-PROD · visibilidad Inmobiliarias + navegación de ficha',()=>{
 for(const role of ['Direccion','Financiero','Visitador'] as const){
  test(`${role} ve la sección Inmobiliarias cuando el backend la autoriza`,async({page},testInfo)=>{
   if(!testInfo.project.name.includes('desktop'))test.skip();
   await boot(page,role);
   await page.route('**/functions/v1/fenix-notion-runtime-test/inmobiliarias',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{id,inmobiliaria:'Inmo visible QA',localidad:'Córdoba',estado:'Activa'}]})}));
   await page.goto('/inmobiliarias');
   const nav=page.locator('.ops-side nav');
   await expect(nav.getByRole('button',{name:'Inmobiliarias',exact:true})).toBeVisible();
   await expect(page.getByRole('heading',{name:'Inmobiliarias',exact:true})).toBeVisible();
   await expect(page.getByText('Inmo visible QA',{exact:true})).toBeVisible();
  });
 }

 test('si falla navigation en la ficha de inmobiliaria solo queda Inicio',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await boot(page,'Direccion',500);
  await page.route(`**/functions/v1/fenix-notion-runtime-test/inmobiliarias/${id}`,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({item:{id,inmobiliaria:'Inmo detalle QA',localidad:'Córdoba',estado:'Activa'}})}));
  await page.goto(`/inmobiliarias/${id}`);
  const nav=page.locator('.ops-side nav');
  await expect(nav.getByRole('button',{name:'Inicio',exact:true})).toBeVisible();
  await expect(nav.getByRole('button',{name:'Inmobiliarias',exact:true})).toHaveCount(0);
  await expect(nav.getByRole('button',{name:'Expedientes',exact:true})).toHaveCount(0);
  await expect(page.locator('h1').filter({hasText:'Inmo detalle QA'})).toBeVisible();
 });
});
