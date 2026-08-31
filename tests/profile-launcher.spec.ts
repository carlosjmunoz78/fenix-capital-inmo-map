import {test,expect} from '@playwright/test';

const fakeSession={
 access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJlbWFpbCI6InFhYUBmZW5peC50ZXN0IiwiZXhwIjoxOTk5OTk5OTk5fQ.',
 token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-profile-launcher-not-real',
 user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'qa-profile@fenix.test',app_metadata:{},user_metadata:{full_name:'Perfil QA'},created_at:'2026-08-19T00:00:00.000Z'}
};

async function boot(page:any){
 await page.addInitScript(session=>{window.localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));window.localStorage.setItem('fenix-remember-device','true');},fakeSession);
 await page.route('**/functions/v1/fenix-app-gateway-test/**',route=>{
  const u=route.request().url();
  if(u.endsWith('/session/context'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'QA-BROWSER',role:'Financiero'})});
  if(u.endsWith('/navigation'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{label:'Inicio',route:'/inicio'},{label:'Contactos',route:'/contactos'}]})});
  return route.fulfill({status:404,contentType:'application/json',body:'{}'});
 });
 await page.route('**/functions/v1/fenix-notion-runtime-test/expedientes',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[]})}));
 await page.route('**/functions/v1/fenix-notion-runtime-test/clientes',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[]})}));
}

test.describe('Fénix PRE-PROD · acceso a Mi perfil desde cabecera',()=>{
 test('identidad del Inicio Financiero abre Mi perfil sin entrada de menú',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await boot(page);
  await page.goto('/inicio');
  const profile=page.locator('.role-home .ops-profile');
  await expect(profile).toBeVisible();
  await expect(profile).toHaveAttribute('aria-label','Abrir mi perfil');
  await profile.click();
  await expect(page).toHaveURL(/\/perfil$/);
  await expect(page.getByRole('heading',{name:'Perfil QA',exact:true})).toBeVisible();
 });

 test('identidad del shell operativo abre el mismo Mi perfil',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await boot(page);
  await page.goto('/contactos');
  const profile=page.locator('.contactos-root .ops-profile');
  await expect(profile).toHaveAttribute('aria-label','Abrir mi perfil');
  await profile.click();
  await expect(page).toHaveURL(/\/perfil$/);
  await expect(page.getByRole('heading',{name:'Perfil QA',exact:true})).toBeVisible();
 });
});