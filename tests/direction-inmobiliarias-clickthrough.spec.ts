import {test,expect} from '@playwright/test';

const fakeSession={
  access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJlbWFpbCI6ImRpcmVjY2lvbkBmZW5peC50ZXN0IiwiZXhwIjoxOTk5OTk5OTk5fQ.',
  token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-clickthrough-not-real',
  user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'direccion@fenix.test',app_metadata:{},user_metadata:{full_name:'Belén Muñoz'},created_at:'2026-08-23T00:00:00.000Z'}
};

const navigation={items:[
 {label:'Inicio',route:'/inicio'},{label:'Expedientes',route:'/expedientes'},{label:'Bancos',route:'/bancos'},
 {label:'Contactos',route:'/contactos'},{label:'Inmobiliarias',route:'/inmobiliarias'},{label:'Tasaciones',route:'/tasaciones'},
 {label:'Firmas',route:'/firmas'},{label:'Documentación',route:'/documentacion'},{label:'Financieros',route:'/financieros'},
 {label:'Visitadores',route:'/visitadores'},{label:'Economía',route:'/economia'},{label:'Agenda',route:'/agenda'},
 {label:'Informes',route:'/informes'},{label:'Notarías',route:'/notarias'},{label:'Avisos',route:'/notificaciones'},
 {label:'Comunicaciones',route:'/comunicaciones'},{label:'Buscar',route:'/buscar'}
]};

test('clic real desde Inicio abre Inmobiliarias y conserva cabecera fija con tema',async({page},testInfo)=>{
 if(!testInfo.project.name.includes('desktop'))test.skip();
 await page.addInitScript(session=>{localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));localStorage.setItem('fenix-remember-device','true');},fakeSession);
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'DIR-TEST',role:'Direccion'})});if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(navigation)});if(u.endsWith('/personal'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[],pending_profiles:0})});return r.fulfill({status:404,body:'{}'});});
 await page.route('**/functions/v1/fenix-notion-runtime-test/expedientes',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[]})}));
 await page.route('**/functions/v1/fenix-notion-runtime-test/firmas',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[]})}));
 await page.route('**/functions/v1/fenix-notion-runtime-test/tareas',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[]})}));
 await page.route('**/functions/v1/fenix-notion-runtime-test/inmobiliarias',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{id:'inmo-qa-1',inmobiliaria:'Inmobiliaria QA',localidad:'Córdoba',estado:'Activa'}]})}));
 await page.goto('/inicio');
 const homeTop=page.locator('.dir-topbar');
 await expect(homeTop).toBeVisible();
 await expect(homeTop.getByRole('button',{name:'Cambiar tema'})).toBeVisible();
 const before=await homeTop.boundingBox();
 await page.locator('.dir-sidebar .dir-nav').getByRole('button',{name:'Inmobiliarias',exact:true}).click();
 await expect(page).toHaveURL(/\/inmobiliarias$/);
 await expect(page.locator('.inmo-root')).toBeVisible();
 await expect(page.getByRole('heading',{name:'Inmobiliarias',exact:true})).toBeVisible();
 await expect(page.getByText('Inmobiliaria QA',{exact:true})).toBeVisible();
 const opsTop=page.locator('.inmo-root .ops-top');
 await expect(opsTop).toBeVisible();
 await expect(opsTop.getByRole('button',{name:'Cambiar tema'})).toBeVisible();
 await page.locator('.ops-main').evaluate(el=>{el.scrollTop=900});
 const after=await opsTop.boundingBox();
 expect(after?.y).toBe(before?.y ?? 0);
});
