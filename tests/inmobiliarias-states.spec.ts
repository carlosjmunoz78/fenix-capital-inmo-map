import {test,expect,Page} from '@playwright/test';

const session={
 access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJlbWFpbCI6InZpc2l0YWRvckBmZW5peC50ZXN0IiwiZXhwIjoxOTk5OTk5OTk5fQ.',
 token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-inmo-states-not-real',
 user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'visitador@fenix.test',app_metadata:{},user_metadata:{full_name:'Visitador QA'},created_at:'2026-08-19T00:00:00.000Z'}
};

async function seed(page:Page){await page.addInitScript(s=>{localStorage.setItem('fenix-preprod-auth',JSON.stringify(s));localStorage.setItem('fenix-remember-device','true');},session);}
async function baseRoutes(page:Page,inmos:{status:number;body?:unknown;delay?:number}){
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{
  const u=r.request().url();
  if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'VIS-A',role:'Visitador'})});
  if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:['/inicio','/inmobiliarias']})});
  return r.fulfill({status:404,contentType:'application/json',body:'{}'});
 });
 await page.route('**/functions/v1/fenix-notion-runtime-test/inmobiliarias',async r=>{
  if(inmos.delay)await new Promise(resolve=>setTimeout(resolve,inmos.delay));
  return r.fulfill({status:inmos.status,contentType:'application/json',body:JSON.stringify(inmos.body??{})});
 });
}

test('Inmobiliarias distingue loading y vacío autorizado',async({page},testInfo)=>{
 if(!testInfo.project.name.includes('desktop'))test.skip();
 await seed(page);await baseRoutes(page,{status:200,body:{items:[]},delay:450});
 await page.goto('/inmobiliarias');
 await expect(page.getByTestId('inmo-loading')).toBeVisible();
 await expect(page.getByTestId('inmo-empty')).toHaveCount(0);
 await expect(page.getByTestId('inmo-empty')).toBeVisible();
 await expect(page.getByTestId('inmo-loading')).toHaveCount(0);
});

test('Inmobiliarias diferencia 403 de error técnico',async({page},testInfo)=>{
 if(!testInfo.project.name.includes('desktop'))test.skip();
 await seed(page);await baseRoutes(page,{status:403});
 await page.goto('/inmobiliarias');
 await expect(page.getByTestId('inmo-forbidden')).toContainText('Tu perfil no tiene acceso');
 await expect(page.getByTestId('inmo-error')).toHaveCount(0);

 await page.unroute('**/functions/v1/fenix-notion-runtime-test/inmobiliarias');
 await baseRoutes(page,{status:500});
 await page.reload();
 await expect(page.getByTestId('inmo-error')).toContainText('No se pudo leer la información actualizada de Inmobiliarias.');
 await expect(page.getByTestId('inmo-forbidden')).toHaveCount(0);
});
