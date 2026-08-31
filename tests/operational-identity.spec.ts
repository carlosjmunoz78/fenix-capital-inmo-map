import {test,expect} from '@playwright/test';

const session={
 access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJlbWFpbCI6ImZpbkBmZW5peC50ZXN0IiwiZXhwIjoxOTk5OTk5OTk5fQ.',
 token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-operational-identity-not-real',
 user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'fin@fenix.test',app_metadata:{},user_metadata:{full_name:'Elena Ruiz'},created_at:'2026-08-19T00:00:00.000Z'}
};

test('shell operativo usa identidad autenticada en perfil superior',async({page},testInfo)=>{
 if(!testInfo.project.name.includes('desktop'))test.skip();
 await page.addInitScript(s=>{localStorage.setItem('fenix-preprod-auth',JSON.stringify(s));localStorage.setItem('fenix-remember-device','true');},session);
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'FIN-A',role:'Financiero'})});if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:['/inicio','/financieros']})});if(u.endsWith('/personal'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[],pending_profiles:0})});return r.fulfill({status:404,contentType:'application/json',body:'{}'});});
 await page.goto('/financieros');
 const profile=page.locator('.ops-profile').filter({has:page.locator('strong')}).last();
 await expect(profile.locator('strong')).toHaveText('Elena Ruiz');
 await expect(profile).toHaveAttribute('data-role','Financiero');
 await expect(profile.locator('.ops-profile-avatar')).toHaveText('ER');
 await expect(profile.getByText('Usuario',{exact:true})).toHaveCount(0);
});
