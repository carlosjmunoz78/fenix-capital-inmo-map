import {test,expect} from '@playwright/test';

const fakeSession={access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJleHAiOjE5OTk5OTk5OTl9.',token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-fixed-shell-not-real',user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'qa@fenix.test',app_metadata:{},user_metadata:{actor_code:'DIR-TEST'},created_at:'2026-08-23T00:00:00.000Z'}};

const navigation=[
 {label:'Inicio',route:'/inicio'},{label:'Expedientes',route:'/expedientes'},{label:'Bancos',route:'/bancos'},{label:'Contactos',route:'/contactos'},{label:'Inmobiliarias',route:'/inmobiliarias'},{label:'Tasaciones',route:'/tasaciones'},{label:'Firmas',route:'/firmas'},{label:'Documentación',route:'/documentacion'},{label:'Financieros',route:'/financieros'},{label:'Visitadores',route:'/visitadores'},{label:'Agenda',route:'/agenda'},{label:'Economía',route:'/economia'},{label:'Informes',route:'/informes'},{label:'Notarías',route:'/notarias'},{label:'Notificaciones',route:'/notificaciones'},{label:'Comunicaciones',route:'/comunicaciones'},{label:'Buscar',route:'/buscar'}
];

test('menú izquierdo y barra superior permanecen fijos mientras solo desplaza el workspace',async({page},testInfo)=>{
 if(!testInfo.project.name.includes('desktop'))test.skip();
 await page.addInitScript(session=>{localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));localStorage.setItem('fenix-remember-device','true');},fakeSession);
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'DIR-TEST',role:'Direccion'})});if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:navigation})});return r.fulfill({status:404,body:'{}'});});
 const items=Array.from({length:90},(_,i)=>({id:`aaaaaaaa-1111-4111-8111-${String(i).padStart(12,'0')}`,inmobiliaria:`Inmo QA ${i+1}`,localidad:'Córdoba',estado:'Activa'}));
 await page.route('**/functions/v1/fenix-notion-runtime-test/inmobiliarias',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items})}));
 await page.goto('/inmobiliarias');
 await expect(page.getByRole('heading',{name:'Inmobiliarias',exact:true})).toBeVisible();
 const side=page.locator('.ops-side');const top=page.locator('.ops-top');const main=page.locator('.ops-main');
 const sideBefore=await side.boundingBox();const topBefore=await top.boundingBox();
 expect(sideBefore).not.toBeNull();expect(topBefore).not.toBeNull();
 await main.evaluate(el=>{el.scrollTop=1200});
 await expect.poll(()=>main.evaluate(el=>el.scrollTop)).toBeGreaterThan(500);
 const sideAfter=await side.boundingBox();const topAfter=await top.boundingBox();
 expect(Math.round(sideAfter!.y)).toBe(Math.round(sideBefore!.y));
 expect(Math.round(topAfter!.y)).toBe(Math.round(topBefore!.y));
 expect(Math.round(sideAfter!.x)).toBe(Math.round(sideBefore!.x));
 await expect(page.locator('.ops-side nav').getByRole('button',{name:'Inmobiliarias',exact:true})).toBeVisible();
});
