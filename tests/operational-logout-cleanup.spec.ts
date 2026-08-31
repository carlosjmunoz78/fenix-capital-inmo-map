import {test,expect} from '@playwright/test';

const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const session={
 access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJlbWFpbCI6ImZpbkBmZW5peC50ZXN0IiwiZXhwIjoxOTk5OTk5OTk5fQ.',
 token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-operational-logout-not-real',
 user:{id:uid,aud:'authenticated',role:'authenticated',email:'fin@fenix.test',app_metadata:{},user_metadata:{full_name:'Elena Ruiz'},created_at:'2026-08-19T00:00:00.000Z'}
};

test('logout operativo limpia solo el estado de calculadora del usuario actual',async({page},testInfo)=>{
 if(!testInfo.project.name.includes('desktop'))test.skip();
 await page.addInitScript(({session,uid})=>{
   localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));
   localStorage.setItem('fenix-remember-device','true');
   sessionStorage.setItem('fenix-session-active','1');
   sessionStorage.setItem(`fenix-calc:${uid}`,'{"open":true}');
   sessionStorage.setItem('fenix-calc:other-user','{"open":true}');
 },{session,uid});
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{
   const u=r.request().url();
   if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'FIN-A',role:'Financiero'})});
   if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:['/inicio','/financieros']})});
   if(u.endsWith('/personal'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[],pending_profiles:0})});
   return r.fulfill({status:404,contentType:'application/json',body:'{}'});
 });
 await page.goto('/financieros');
 const logout=page.getByRole('button',{name:'Cerrar sesión'}).last();
 await expect(logout).toBeVisible();
 await page.waitForTimeout(50);
 await logout.dispatchEvent('pointerdown');
 await expect.poll(()=>page.evaluate(uid=>({
   current:sessionStorage.getItem(`fenix-calc:${uid}`),
   active:sessionStorage.getItem('fenix-session-active'),
   other:sessionStorage.getItem('fenix-calc:other-user')
 }),uid)).toEqual({current:null,active:null,other:'{"open":true}'});
});
