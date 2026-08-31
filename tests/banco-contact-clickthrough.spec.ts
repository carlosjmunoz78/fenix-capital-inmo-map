import {test,expect} from '@playwright/test';

const fakeSession={access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJub25lIiwidHlwIjoiSldUIn0.',token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-bank-contact-click-not-real',user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'qa@fenix.test',app_metadata:{},user_metadata:{actor_code:'DIR-TEST'},created_at:'2026-08-29T00:00:00.000Z'}};

test('ficha de banco abre la ficha del contacto bancario vinculado',async({page},testInfo)=>{
 if(!testInfo.project.name.includes('desktop'))test.skip();
 await page.addInitScript(session=>{localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));localStorage.setItem('fenix-remember-device','true')},fakeSession);
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'DIR-TEST',role:'Direccion'})});if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{label:'Inicio',route:'/inicio'},{label:'Bancos',route:'/bancos'}]})});if(u.endsWith('/bancos'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{id:'bank-1',nombre:'Banco QA'}]})});return r.fulfill({status:404,body:'{}'})});
 await page.route('**/functions/v1/fenix-notion-runtime-test/contactos-bancarios',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{id:'contact-1',nombre:'Persona Banco QA',banco:'Banco QA',cargo:'Gestor'}]})}));
 await page.goto('/bancos/bank-1');
 const row=page.locator('#contactos-banco .banco-contact-list article').first();
 await expect(row).toHaveAttribute('role','link');
 await row.click();
 await expect(page).toHaveURL(/\/bancos\/contactos\/contact-1$/);
});
