import {expect,test} from '@playwright/test';

const session={
 access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWFhYWEiLCJleHAiOjE5OTk5OTk5OTk5fQ.',
 token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-only-not-real',
 user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'direccion@fenix.test',app_metadata:{},user_metadata:{},created_at:'2026-09-15T00:00:00.000Z'}
};
test.beforeEach(async({page})=>{
 await page.addInitScript(s=>{
  localStorage.setItem('fenix-prod-auth-v1',JSON.stringify(s));
  localStorage.setItem('fenix-remember-device','true');
  sessionStorage.setItem('fenix-session-active','1');
 },session);
});
test('Una caída del Gateway no se disfraza con un falso Inicio ni menú vacío',async({page})=>{
 await page.route('**/functions/v1/fenix-app-gateway/**',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false,error:'upstream_unavailable'})}));
 await page.goto('/inicio');
 await expect(page.getByText('No se ha podido cargar tu perfil o el menú autorizado')).toBeVisible();
 await expect(page.getByRole('button',{name:'Reintentar conexión'})).toBeVisible();
 await expect(page.getByText('Acceso centralizado')).toHaveCount(0);
});
test('Al recuperar el Gateway vuelve el panel de Dirección y el menú autorizado',async({page})=>{
 let restored=false;
 await page.route('**/functions/v1/fenix-app-gateway/**',route=>{
  const url=route.request().url();
  if(!restored)return route.fulfill({status:503,contentType:'application/json',body:'{"ok":false}'});
  const json=(body:unknown)=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  if(url.endsWith('/session/context'))return json({actor_code:'CARLOS-ADMIN',role:'Direccion',display_name:'Carlos'});
  if(url.endsWith('/navigation'))return json({items:[{label:'Inicio',route:'/inicio'},{label:'Expedientes',route:'/expedientes'},{label:'Bancos',route:'/bancos'},{label:'Contactos',route:'/contactos'},{label:'Inmobiliarias',route:'/inmobiliarias'},{label:'Financieros',route:'/financieros'},{label:'Economía',route:'/economia'},{label:'Comunicaciones',route:'/comunicaciones'}]});
  if(url.endsWith('/expedientes'))return json({items:[]});
  if(url.endsWith('/tareas'))return json({items:[]});
  if(url.endsWith('/personal'))return json({items:[]});
  if(url.endsWith('/firmas'))return json({items:[]});
  return route.fulfill({status:404,contentType:'application/json',body:'{"ok":false}'});
 });
 await page.goto('/inicio');
 await expect(page.getByRole('button',{name:'Reintentar conexión'})).toBeVisible();
 restored=true;
 await page.getByRole('button',{name:'Reintentar conexión'}).click();
 await expect(page.getByText('Resumen operativo de tu ámbito autorizado.')).toBeAttached();
 const diagnostics=await page.evaluate(()=>{
   const el=Array.from(document.querySelectorAll('p')).find(x=>x.textContent?.includes('Resumen operativo de tu ámbito autorizado.'));
   const css=el?getComputedStyle(el):null;
   const parent=el?.closest('.dir-shell');
   const menu=Array.from(document.querySelectorAll('nav button')).map(x=>(x.textContent||'').trim());
   return{visible:!!el&&!!el.getClientRects().length,style:css?{display:css.display,visibility:css.visibility,opacity:css.opacity}:null,parentStyle:parent?{display:getComputedStyle(parent).display,visibility:getComputedStyle(parent).visibility}:null,menu,body:document.body.textContent?.slice(0,600)};
 });
 console.log('RECOVERY_VISIBILITY_DIAGNOSTIC',JSON.stringify(diagnostics));
 await expect(page.getByText('Resumen operativo de tu ámbito autorizado.')).toBeVisible();
 await expect(page.getByText('Acceso centralizado')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Expedientes',exact:true}).first()).toBeVisible();
});
