import {test,expect} from '@playwright/test';

const session={
 access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJiYmJiYmJiYi1iYmJiLTRiYmItOGJiYi1iYmJiYmJiYmJiYmIiLCJlbWFpbCI6ImRpckBmZW5peC50ZXN0IiwiZXhwIjoxOTk5OTk5OTk5fQ.',
 token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-visitadores-states-not-real',
 user:{id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',aud:'authenticated',role:'authenticated',email:'dir@fenix.test',app_metadata:{},user_metadata:{full_name:'Carlos Muñoz'},created_at:'2026-08-19T00:00:00.000Z'}
};

async function seed(page:any){
 await page.addInitScript((s:any)=>{localStorage.setItem('fenix-preprod-auth',JSON.stringify(s));localStorage.setItem('fenix-remember-device','true');},session);
}

test('Visitadores muestra carga explícita y luego vacío autorizado',async({page},testInfo)=>{
 if(!testInfo.project.name.includes('desktop'))test.skip();
 await seed(page);
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{
  const u=r.request().url();
  if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'DIR-TEST',role:'Direccion'})});
  if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:['/inicio','/visitadores']})});
  if(u.endsWith('/visitadores')){await new Promise(res=>setTimeout(res,350));return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[],pending_profiles:0})});}
  return r.fulfill({status:404,contentType:'application/json',body:'{}'});
 });
 await page.goto('/visitadores');
 await expect(page.getByText('Consultando únicamente el equipo autorizado para tu sesión.')).toBeVisible();
 await expect(page.getByText('Sin perfiles visibles')).toBeVisible();
});

test('Visitadores distingue 403 de error de carga',async({page},testInfo)=>{
 if(!testInfo.project.name.includes('desktop'))test.skip();
 await seed(page);
 let denied=true;
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{
  const u=r.request().url();
  if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'FIN-A',role:'Financiero'})});
  if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:['/inicio']})});
  if(u.endsWith('/visitadores'))return r.fulfill({status:denied?403:503,contentType:'application/json',body:'{}'});
  return r.fulfill({status:404,contentType:'application/json',body:'{}'});
 });
 await page.goto('/visitadores');
 await expect(page.getByText('Tu perfil no tiene acceso a este módulo.')).toBeVisible();
 denied=false;
 await page.reload();
 await expect(page.getByText('No se pudo cargar el equipo de visitadores.')).toBeVisible();
});
