import {test,expect} from '@playwright/test';

const session={
 access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJiYmJiYmJiYi1iYmJiLTRiYmItOGJiYi1iYmJiYmJiYmJiYmIiLCJlbWFpbCI6ImRpckBmZW5peC50ZXN0IiwiZXhwIjoxOTk5OTk5OTk5fQ.',
 token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-advanced-search-not-real',
 user:{id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',aud:'authenticated',role:'authenticated',email:'dir@fenix.test',app_metadata:{},user_metadata:{full_name:'Carlos Muñoz'},created_at:'2026-08-19T00:00:00.000Z'}
};

async function boot(page:any,role:string,name:string){
 const s={...session,user:{...session.user,user_metadata:{full_name:name}}};
 await page.addInitScript((value:any)=>{localStorage.setItem('fenix-preprod-auth',JSON.stringify(value));localStorage.setItem('fenix-remember-device','true');},s);
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:role==='Direccion'?'CARLOS-ADMIN':'FIN-A',role})});if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:['/inicio','/financieros','/buscar']})});if(u.endsWith('/personal'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[],pending_profiles:0})});return r.fulfill({status:404,contentType:'application/json',body:'{}'});});
 await page.goto('/financieros');
}

test('Dirección conserva Buscador avanzado con identidad autenticada',async({page},testInfo)=>{
 if(!testInfo.project.name.includes('desktop'))test.skip();await boot(page,'Direccion','Carlos Muñoz');
 const profile=page.locator('.ops-profile').last();await expect(profile.locator('.ops-profile-copy strong')).toHaveText('Carlos Muñoz');await expect(profile.locator('.ops-profile-copy small')).toHaveText('Direccion');
 await expect(page.getByRole('button',{name:'Buscador avanzado'})).toBeVisible();await page.getByRole('button',{name:'Buscador avanzado'}).click();await expect(page).toHaveURL(/\/buscar$/);
});

test('Financiero usa el mismo Buscador avanzado transversal',async({page},testInfo)=>{
 if(!testInfo.project.name.includes('desktop'))test.skip();await boot(page,'Financiero','Elena Ruiz');
 const profile=page.locator('.ops-profile').last();await expect(profile.locator('.ops-profile-copy strong')).toHaveText('Elena Ruiz');await expect(profile.locator('.ops-profile-copy small')).toHaveText('Financiero');
 await expect(page.getByRole('button',{name:'Buscador avanzado'})).toBeVisible();
});
