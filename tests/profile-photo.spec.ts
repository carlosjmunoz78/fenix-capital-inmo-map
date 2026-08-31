import {test,expect} from '@playwright/test';

const fakeSession={
 access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJlbWFpbCI6InFhYUBmZW5peC50ZXN0IiwiZXhwIjoxOTk5OTk5OTk5fQ.',
 token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-profile-photo-not-real',
 user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'qa-photo@fenix.test',app_metadata:{},user_metadata:{full_name:'Foto QA',avatar_url:'https://assets.fenix.test/profile-qa.svg'},created_at:'2026-08-19T00:00:00.000Z'}
};

test.describe('Fénix PRE-PROD · foto real de Mi perfil',()=>{
 test('usa avatar_url de la sesión y no genera una foto ficticia',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await page.addInitScript(session=>{window.localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));window.localStorage.setItem('fenix-remember-device','true');},fakeSession);
  await page.route('https://assets.fenix.test/profile-qa.svg',r=>r.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="160" height="160" fill="#ddd"/></svg>'}));
  await page.route('**/functions/v1/fenix-app-gateway-test/**',r=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'FIN-A',role:'Financiero'})});if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{label:'Inicio',route:'/inicio'}]})});return r.fulfill({status:404,body:'{}'});});
  await page.goto('/perfil');
  const root=page.locator('.profile-root');
  const photo=root.getByRole('img',{name:'Foto de Foto QA'});
  await expect(photo).toBeVisible();
  await expect(photo).toHaveAttribute('src','https://assets.fenix.test/profile-qa.svg');
  await expect(root.locator('.profile-avatar-big')).toHaveCount(1);
 });
});
