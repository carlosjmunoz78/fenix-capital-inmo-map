import {test,expect,Page} from '@playwright/test';

const session={
 access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJlbWFpbCI6ImZpbkBmZW5peC50ZXN0IiwiZXhwIjoxOTk5OTk5OTk5fQ.',
 token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-fin-states-not-real',
 user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'fin@fenix.test',app_metadata:{},user_metadata:{full_name:'Elena Ruiz'},created_at:'2026-08-19T00:00:00.000Z'}
};

async function seed(page:Page){
 await page.addInitScript(s=>{localStorage.setItem('fenix-preprod-auth',JSON.stringify(s));localStorage.setItem('fenix-remember-device','true');},session);
}
async function baseRoutes(page:Page,personal:{status:number;body?:unknown;delay?:number},navigationStatus=200){
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{
  const u=r.request().url();
  if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'DIR-TEST',role:'Direccion'})});
  if(u.endsWith('/navigation'))return r.fulfill({status:navigationStatus,contentType:'application/json',body:JSON.stringify(navigationStatus===200?{items:['/inicio','/financieros']}:{})});
  if(u.endsWith('/personal')){
   if(personal.delay)await new Promise(resolve=>setTimeout(resolve,personal.delay));
   return r.fulfill({status:personal.status,contentType:'application/json',body:JSON.stringify(personal.body??{})});
  }
  return r.fulfill({status:404,contentType:'application/json',body:'{}'});
 });
}

test('Financieros distingue loading y vacío autorizado',async({page},testInfo)=>{
 if(!testInfo.project.name.includes('desktop'))test.skip();
 await seed(page);await baseRoutes(page,{status:200,body:{items:[],pending_profiles:0},delay:450});
 await page.goto('/financieros');
 await expect(page.getByTestId('financieros-loading')).toHaveText('Cargando equipo financiero autorizado…');
 await expect(page.getByText('Sin financieros visibles')).toHaveCount(0);
 await expect(page.getByTestId('financieros-empty')).toBeVisible();
 await expect(page.getByText('No hay perfiles completos para este ámbito o filtro.')).toBeVisible();
});

test('Financieros diferencia 403 de error técnico y falla cerrado en navegación',async({page},testInfo)=>{
 if(!testInfo.project.name.includes('desktop'))test.skip();
 await seed(page);await baseRoutes(page,{status:403},500);
 await page.goto('/financieros');
 await expect(page.getByTestId('financieros-forbidden')).toHaveText('Tu perfil no tiene acceso a este módulo.');
 await expect(page.getByTestId('financieros-error')).toHaveCount(0);
 const nav=page.locator('.ops-side nav');
 await expect(nav.getByRole('button',{name:'Inicio',exact:true})).toBeVisible();
 await expect(nav.getByRole('button')).toHaveCount(1);
 await expect(page.locator('.fin-kpis')).toHaveCount(0);
 await expect(page.locator('.fin-grid article')).toHaveCount(0);

 await page.unroute('**/functions/v1/fenix-app-gateway-test/**');
 await baseRoutes(page,{status:500});
 await page.reload();
 await expect(page.getByTestId('financieros-error')).toHaveText('No se pudo cargar el equipo financiero autorizado.');
 await expect(page.getByTestId('financieros-forbidden')).toHaveCount(0);
});

test('Financieros limpia datos y termina loading ante fallo de red',async({page},testInfo)=>{
 if(!testInfo.project.name.includes('desktop'))test.skip();
 await seed(page);
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{await r.abort('failed');});
 await page.goto('/financieros');
 await expect(page.getByTestId('financieros-error')).toHaveText('No se pudo conectar con el equipo financiero autorizado.');
 await expect(page.getByTestId('financieros-loading')).toHaveCount(0);
 await expect(page.locator('.fin-kpis')).toHaveCount(0);
 await expect(page.locator('.fin-grid article')).toHaveCount(0);
 const nav=page.locator('.ops-side nav');
 await expect(nav.getByRole('button',{name:'Inicio',exact:true})).toBeVisible();
 await expect(nav.getByRole('button')).toHaveCount(1);
});
