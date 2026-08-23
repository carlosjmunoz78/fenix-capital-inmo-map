import {test,expect} from '@playwright/test';

const session={
 access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJiYmJiYmJiYi1iYmJiLTRiYmItOGJiYi1iYmJiYmJiYmJiYmIiLCJlbWFpbCI6ImRpckBmZW5peC50ZXN0IiwiZXhwIjoxOTk5OTk5OTk5fQ.',
 token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-advanced-search-not-real',
 user:{id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',aud:'authenticated',role:'authenticated',email:'dir@fenix.test',app_metadata:{},user_metadata:{full_name:'Carlos Muñoz'},created_at:'2026-08-19T00:00:00.000Z'}
};

test('Dirección conserva Búsqueda avanzada aunque el perfil muestre nombre autenticado',async({page},testInfo)=>{
 if(!testInfo.project.name.includes('desktop'))test.skip();
 await page.addInitScript(s=>{localStorage.setItem('fenix-preprod-auth',JSON.stringify(s));localStorage.setItem('fenix-remember-device','true');},session);
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'CARLOS-ADMIN',role:'Direccion'})});if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:['/inicio','/financieros','/buscar']})});if(u.endsWith('/personal'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[],pending_profiles:0})});return r.fulfill({status:404,contentType:'application/json',body:'{}'});});
 await page.goto('/financieros');
 const profile=page.locator('.ops-profile').last();
 await expect(profile.locator('strong')).toHaveText('Carlos Muñoz');
 await expect(profile).toHaveAttribute('data-role','Direccion');
 await expect(page.getByRole('button',{name:'Búsqueda avanzada'})).toBeVisible();
 await page.getByRole('button',{name:'Búsqueda avanzada'}).click();
 await expect(page).toHaveURL(/\/buscar$/);
});

test('Financiero no recibe Búsqueda avanzada',async({page},testInfo)=>{
 if(!testInfo.project.name.includes('desktop'))test.skip();
 const fin={...session,user:{...session.user,id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',user_metadata:{full_name:'Elena Ruiz'}}};
 await page.addInitScript(s=>{localStorage.setItem('fenix-preprod-auth',JSON.stringify(s));localStorage.setItem('fenix-remember-device','true');},fin);
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'FIN-A',role:'Financiero'})});if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:['/inicio','/financieros']})});if(u.endsWith('/personal'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[],pending_profiles:0})});return r.fulfill({status:404,contentType:'application/json',body:'{}'});});
 await page.goto('/financieros');
 await expect(page.locator('.ops-profile').last().locator('strong')).toHaveText('Elena Ruiz');
 await expect(page.getByRole('button',{name:'Búsqueda avanzada'})).toHaveCount(0);
});
