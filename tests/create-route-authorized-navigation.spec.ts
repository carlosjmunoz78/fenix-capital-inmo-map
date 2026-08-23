import {test,expect} from '@playwright/test';

const fakeSession={access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJleHAiOjE5OTk5OTk5OTl9.',token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-create-route-nav-not-real',user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'qa@fenix.test',app_metadata:{},user_metadata:{actor_code:'DIR-TEST'},created_at:'2026-08-23T00:00:00.000Z'}};
const inmoId='aaaaaaaa-1111-4111-8111-bbbbbbbbbbbb';
const directionNav=[{label:'Inicio',route:'/inicio'},{label:'Expedientes',route:'/expedientes'},{label:'Bancos',route:'/bancos'},{label:'Contactos',route:'/contactos'},{label:'Inmobiliarias',route:'/inmobiliarias'},{label:'Tasaciones',route:'/tasaciones'},{label:'Firmas',route:'/firmas'},{label:'Documentación',route:'/documentacion'},{label:'Financieros',route:'/financieros'},{label:'Visitadores',route:'/visitadores'},{label:'Agenda',route:'/agenda'},{label:'Economía',route:'/economia'},{label:'Informes',route:'/informes'},{label:'Notarías',route:'/notarias'},{label:'Comunicaciones',route:'/comunicaciones'}];
const visitadorNav=[{label:'Inicio',route:'/inicio'},{label:'Inmobiliarias',route:'/inmobiliarias'},{label:'Contactos',route:'/contactos'},{label:'Visitas',route:'/visitas'},{label:'Agenda',route:'/agenda'},{label:'Documentación',route:'/documentacion'}];

async function boot(page:any,role:'Direccion'|'Visitador',items:any[],navigationStatus=200){
 await page.addInitScript(session=>{localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));localStorage.setItem('fenix-remember-device','true');},fakeSession);
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:role==='Direccion'?'DIR-TEST':'VIS-A',role})});if(u.endsWith('/navigation'))return r.fulfill({status:navigationStatus,contentType:'application/json',body:navigationStatus===200?JSON.stringify({items}):JSON.stringify({error:'navigation_unavailable'})});if(u.endsWith('/personal'))return r.fulfill({status:200,contentType:'application/json',body:'{"items":[]}'});return r.fulfill({status:404,body:'{}'});});
}

test.describe('Fénix PRE-PROD · navegación global en altas',()=>{
 test('Nuevo expediente conserva el menú global de Dirección',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await boot(page,'Direccion',directionNav);
  await page.goto('/expedientes/nuevo');
  const menu=page.locator('aside.create-auth-nav nav');
  await expect(menu.getByRole('button',{name:'Expedientes',exact:true})).toBeVisible();
  await expect(menu.getByRole('button',{name:'Bancos',exact:true})).toBeVisible();
  await expect(menu.getByRole('button',{name:'Inmobiliarias',exact:true})).toBeVisible();
  await expect(menu.getByRole('button',{name:'Comunicaciones',exact:true})).toBeVisible();
  await expect(menu.getByRole('button',{name:'Expedientes',exact:true})).toHaveClass(/active/);
  await expect(page.getByRole('heading',{name:'Nuevo expediente',exact:true})).toBeVisible();
 });

 test('Alta de contacto B2B conserva solo menú autorizado de Visitador',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await boot(page,'Visitador',visitadorNav);
  await page.goto(`/inmobiliarias/${inmoId}/contactos/nuevo`);
  const menu=page.locator('aside.create-auth-nav nav');
  await expect(menu.getByRole('button',{name:'Inmobiliarias',exact:true})).toBeVisible();
  await expect(menu.getByRole('button',{name:'Visitas',exact:true})).toBeVisible();
  await expect(menu.getByRole('button',{name:'Bancos',exact:true})).toHaveCount(0);
  await expect(menu.getByRole('button',{name:'Financieros',exact:true})).toHaveCount(0);
  await expect(menu.getByRole('button',{name:'Inmobiliarias',exact:true})).toHaveClass(/active/);
 });

 test('si navigation falla en una alta el overlay queda solo con Inicio',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await boot(page,'Direccion',directionNav,500);
  await page.goto('/contactos/nuevo');
  const menu=page.locator('aside.create-auth-nav nav');
  await expect(menu.getByRole('button',{name:'Inicio',exact:true})).toBeVisible();
  await expect(menu.getByRole('button',{name:'Contactos',exact:true})).toHaveCount(0);
  await expect(menu.getByRole('button',{name:'Comunicaciones',exact:true})).toHaveCount(0);
 });
});
