import {test,expect} from '@playwright/test';

const fakeSession={
  access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJlbWFpbCI6ImRpcmVjY2lvbkBmZW5peC50ZXN0IiwiZXhwIjoxOTk5OTk5OTk5fQ.',
  token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-global-topbar-not-real',
  user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'direccion@fenix.test',app_metadata:{},user_metadata:{full_name:'Carlos Muñoz'},created_at:'2026-08-19T00:00:00.000Z'}
};
const routes=['/inicio','/expedientes','/bancos','/contactos','/inmobiliarias','/tasaciones','/firmas','/documentacion','/financieros','/visitadores','/economia','/agenda','/informes','/notarias','/notificaciones','/comunicaciones','/visitas','/buscar?q=ca'];
const navigation={items:routes.map(route=>({label:route.split('?')[0].split('/').pop()||'Inicio',route:route.split('?')[0]}))};

test.describe('Fénix PRE-PROD · topbar transversal única',()=>{
 test('Inicio y módulos operativos comparten el mismo contrato superior',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await page.addInitScript(session=>{window.localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));window.localStorage.setItem('fenix-remember-device','true');},fakeSession);
  await page.route('**/functions/v1/**',async route=>{
   const u=route.request().url();
   if(u.includes('/session/context'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'CARLOS-ADMIN',role:'Direccion',display_name:'Carlos Muñoz'})});
   if(u.includes('/navigation'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(navigation)});
   if(u.includes('/personal'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[],pending_profiles:0})});
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[],reports:[]})});
  });
  for(const route of routes){
   await page.goto(route);
   const top=route==='/inicio'?page.locator('.dir-topbar'):page.locator('.ops-top');
   await expect(top,`topbar visible en ${route}`).toBeVisible();
   await expect(top.getByRole('button',{name:'Buscador avanzado'})).toBeVisible();
   await expect(top.getByRole('button',{name:'Buscar',exact:true})).toBeVisible();
   await expect(top.getByRole('button',{name:'Cambiar tema'})).toBeVisible();
   await expect(top.getByRole('button',{name:'Cerrar sesión'})).toBeVisible();
   const box=await top.boundingBox();expect(box?.height||0,`altura topbar ${route}`).toBeGreaterThanOrEqual(72);expect(box?.height||0,`altura topbar ${route}`).toBeLessThanOrEqual(76);
   if(route==='/inicio'){
    await expect(top.locator('.dir-user-copy strong')).toHaveText('Carlos Muñoz');
    await expect(top.locator('.dir-user-copy span')).toHaveText(/Direccion|Dirección/);
   }else{
    await expect(top.locator('.ops-profile-copy strong')).toHaveText('Carlos Muñoz');
    await expect(top.locator('.ops-profile-copy small')).toHaveText(/Direccion|Dirección/);
   }
  }
 });
});
