import {test,expect} from '@playwright/test';

const fakeSession={access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJleHAiOjE5OTk5OTk5OTl9.',token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-module-nav-not-real',user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'qa@fenix.test',app_metadata:{},user_metadata:{actor_code:'DIR-TEST'},created_at:'2026-08-23T00:00:00.000Z'}};
const directionNav=[{label:'Inicio',route:'/inicio'},{label:'Expedientes',route:'/expedientes'},{label:'Bancos',route:'/bancos'},{label:'Contactos',route:'/contactos'},{label:'Inmobiliarias',route:'/inmobiliarias'},{label:'Tasaciones',route:'/tasaciones'},{label:'Firmas',route:'/firmas'},{label:'Documentación',route:'/documentacion'},{label:'Financieros',route:'/financieros'},{label:'Visitadores',route:'/visitadores'},{label:'Agenda',route:'/agenda'},{label:'Economía',route:'/economia'},{label:'Informes',route:'/informes'},{label:'Notarías',route:'/notarias'},{label:'Notificaciones',route:'/notificaciones'},{label:'Comunicaciones',route:'/comunicaciones'},{label:'Buscar',route:'/buscar'}];
const visitadorNav=[{label:'Inicio',route:'/inicio'},{label:'Inmobiliarias',route:'/inmobiliarias'},{label:'Contactos',route:'/contactos'},{label:'Visitas',route:'/visitas'},{label:'Agenda',route:'/agenda'},{label:'Documentación',route:'/documentacion'},{label:'Informes',route:'/informes'},{label:'Notificaciones',route:'/notificaciones'},{label:'Buscar',route:'/buscar'}];

async function auth(page:any,role:'Direccion'|'Visitador',navItems:any[],navigationStatus=200){
 await page.addInitScript(session=>{localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));localStorage.setItem('fenix-remember-device','true');},fakeSession);
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:role==='Direccion'?'DIR-TEST':'VIS-A',role})});if(u.endsWith('/navigation'))return r.fulfill({status:navigationStatus,contentType:'application/json',body:navigationStatus===200?JSON.stringify({items:navItems}):JSON.stringify({error:'navigation_unavailable'})});return r.fulfill({status:404,body:'{}'});});
}

test.describe('Fénix PRE-PROD · módulos con navegación autorizada completa',()=>{
 test('Visitador ve en Visitas exactamente su menú autorizado',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await auth(page,'Visitador',visitadorNav);
  await page.route('**/functions/v1/fenix-visitas-api-test/visitas',r=>r.fulfill({status:200,contentType:'application/json',body:'{"items":[]}'}));
  await page.goto('/visitas');
  const menu=page.locator('.visitas-root .ops-side nav');
  await expect(menu.getByRole('button',{name:'Visitas',exact:true})).toBeVisible();
  await expect(menu.getByRole('button',{name:'Inmobiliarias',exact:true})).toBeVisible();
  await expect(menu.getByRole('button',{name:'Documentación',exact:true})).toBeVisible();
  await expect(menu.getByRole('button',{name:'Bancos',exact:true})).toHaveCount(0);
  await expect(menu.getByRole('button',{name:'Comunicaciones',exact:true})).toHaveCount(0);
 });

 test('fallo de navigation en Visitas queda fail-closed solo Inicio',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await auth(page,'Visitador',visitadorNav,500);
  await page.route('**/functions/v1/fenix-visitas-api-test/visitas',r=>r.fulfill({status:200,contentType:'application/json',body:'{"items":[]}'}));
  await page.goto('/visitas');
  const menu=page.locator('.visitas-root .ops-side nav');
  await expect(menu.getByRole('button',{name:'Inicio',exact:true})).toBeVisible();
  await expect(menu.getByRole('button',{name:'Visitas',exact:true})).toHaveCount(0);
 });

 test('Dirección ve menú global completo dentro de Comunicaciones',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await auth(page,'Direccion',directionNav);
  await page.route('**/functions/v1/fenix-communications-gateway-test/comunicaciones',r=>r.fulfill({status:200,contentType:'application/json',body:'{"items":[]}'}));
  await page.goto('/comunicaciones');
  const menu=page.locator('.ops-root .ops-side nav').last();
  await expect(menu.getByRole('button',{name:'Comunicaciones',exact:true})).toBeVisible();
  await expect(menu.getByRole('button',{name:'Bancos',exact:true})).toBeVisible();
  await expect(menu.getByRole('button',{name:'Financieros',exact:true})).toBeVisible();
  await expect(menu.getByRole('button',{name:'Notarías',exact:true})).toBeVisible();
 });
});
