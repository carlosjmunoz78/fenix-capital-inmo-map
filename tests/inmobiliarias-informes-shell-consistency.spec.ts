import {test,expect} from '@playwright/test';

const fakeSession={access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJleHAiOjE5OTk5OTk5OTl9.',token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-shell-not-real',user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'direccion@fenix.test',app_metadata:{},user_metadata:{full_name:'Belén Muñoz'},created_at:'2026-08-23T00:00:00.000Z'}};
const navigation={items:[{label:'Inicio',route:'/inicio'},{label:'Expedientes',route:'/expedientes'},{label:'Bancos',route:'/bancos'},{label:'Contactos',route:'/contactos'},{label:'Inmobiliarias',route:'/inmobiliarias'},{label:'Tasaciones',route:'/tasaciones'},{label:'Firmas',route:'/firmas'},{label:'Documentación',route:'/documentacion'},{label:'Financieros',route:'/financieros'},{label:'Visitadores',route:'/visitadores'},{label:'Economía',route:'/economia'},{label:'Agenda',route:'/agenda'},{label:'Informes',route:'/informes'},{label:'Notarías',route:'/notarias'},{label:'Avisos',route:'/notificaciones'},{label:'Comunicaciones',route:'/comunicaciones'},{label:'Buscar',route:'/buscar'}]};

async function labels(page:any){return page.locator('.ops-root .ops-side nav button').allTextContents();}

test('Inmobiliarias abre arriba y mantiene exactamente el mismo menú al pasar a Informes',async({page},testInfo)=>{
 if(!testInfo.project.name.includes('desktop'))test.skip();
 await page.addInitScript(session=>{localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));localStorage.setItem('fenix-remember-device','true');},fakeSession);
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'DIR-TEST',role:'Direccion'})});if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(navigation)});return r.fulfill({status:404,body:'{}'});});
 await page.route('**/functions/v1/fenix-notion-runtime-test/inmobiliarias',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{id:'inmo-1',inmobiliaria:'Inmo visible',localidad:'Córdoba',estado:'Activa'}]})}));
 await page.route('**/functions/v1/fenix-reports-api-test/reports',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[]})}));
 await page.goto('/inmobiliarias');
 await expect(page.getByRole('heading',{name:'Inmobiliarias',exact:true})).toBeVisible();
 const main=page.locator('.inmo-root .ops-main');
 await expect.poll(()=>main.evaluate(el=>el.scrollTop)).toBe(0);
 const inmoLabels=await labels(page);
 expect(inmoLabels).toEqual(navigation.items.map(x=>x.label));
 await page.locator('.inmo-root .ops-side nav').getByRole('button',{name:'Informes',exact:true}).click();
 await expect(page).toHaveURL(/\/informes$/);
 await expect(page.getByRole('heading',{name:'Informes',exact:true})).toBeVisible();
 await expect.poll(()=>page.locator('.informes-root .ops-main').evaluate(el=>el.scrollTop)).toBe(0);
 const reportLabels=await labels(page);
 expect(reportLabels).toEqual(inmoLabels);
});
