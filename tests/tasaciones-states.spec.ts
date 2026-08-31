import {test,expect,Page} from '@playwright/test';

const session={
 access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJlbWFpbCI6ImRpcmVjY2lvbkBmZW5peC50ZXN0IiwiZXhwIjoxOTk5OTk5OTk5fQ.',
 token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-tas-states-not-real',
 user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'direccion@fenix.test',app_metadata:{},user_metadata:{full_name:'Belén'},created_at:'2026-08-19T00:00:00.000Z'}
};

async function seed(page:Page){await page.addInitScript(s=>{localStorage.setItem('fenix-preprod-auth',JSON.stringify(s));localStorage.setItem('fenix-remember-device','true');},session);}
async function gateway(page:Page,navigationStatus=200){
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{
  const u=r.request().url();
  if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'DIR-TEST',role:'Direccion'})});
  if(u.endsWith('/navigation'))return r.fulfill({status:navigationStatus,contentType:'application/json',body:navigationStatus===200?JSON.stringify({items:[{label:'Inicio',route:'/inicio'},{label:'Tasaciones',route:'/tasaciones'}]}):'{}'});
  return r.fulfill({status:404,contentType:'application/json',body:'{}'});
 });
}

test.describe('Fénix PRE-PROD · estados Tasaciones dedicado',()=>{
 test('muestra loading explícito y después vacío 200 sin KPIs stale',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await seed(page);await gateway(page);
  await page.route('**/functions/v1/fenix-notion-runtime-test/tasaciones',async r=>{await new Promise(resolve=>setTimeout(resolve,450));return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[]})});});
  await page.goto('/tasaciones');
  await expect(page.getByTestId('tas-loading')).toBeVisible();
  await expect(page.getByText('TASACIONES',{exact:true})).toHaveCount(0);
  await expect(page.getByTestId('tas-empty')).toBeVisible();
  await expect(page.getByTestId('tas-loading')).toHaveCount(0);
  await expect(page.getByText('TASACIONES',{exact:true})).toBeVisible();
 });

 test('distingue 403 y 5xx sin mostrar filas devueltas por error',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await seed(page);await gateway(page);
  await page.route('**/functions/v1/fenix-notion-runtime-test/tasaciones',r=>r.fulfill({status:403,contentType:'application/json',body:'{}'}));
  await page.goto('/tasaciones');
  await expect(page.getByTestId('tas-forbidden')).toContainText('Tu perfil no tiene acceso');
  await expect(page.locator('.tas-table')).toHaveCount(0);

  await page.unroute('**/functions/v1/fenix-notion-runtime-test/tasaciones');
  await page.route('**/functions/v1/fenix-notion-runtime-test/tasaciones',r=>r.fulfill({status:500,contentType:'application/json',body:JSON.stringify({items:[{id:'NO-DEBE-VERSE',direccion:'Fila stale'}]})}));
  await page.reload();
  await expect(page.getByTestId('tas-error')).toContainText('No se pudo leer la fuente canónica de Tasaciones.');
  await expect(page.getByText('Fila stale')).toHaveCount(0);
  await expect(page.locator('.tas-table')).toHaveCount(0);
 });

 test('rechazo de red termina loading y muestra error técnico',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await seed(page);await gateway(page);
  await page.route('**/functions/v1/fenix-notion-runtime-test/tasaciones',r=>r.abort('failed'));
  await page.goto('/tasaciones');
  await expect(page.getByTestId('tas-error')).toContainText('No se pudo conectar con la fuente canónica de Tasaciones.');
  await expect(page.getByTestId('tas-loading')).toHaveCount(0);
  await expect(page.locator('.tas-table')).toHaveCount(0);
 });

 test('fallo de navigation queda fail-closed solo con Inicio',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await seed(page);await gateway(page,500);
  await page.route('**/functions/v1/fenix-notion-runtime-test/tasaciones',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[]})}));
  await page.goto('/tasaciones');
  const nav=page.locator('.ops-side nav');
  await expect(nav.getByRole('button',{name:'Inicio',exact:true})).toBeVisible();
  await expect(nav.getByRole('button')).toHaveCount(1);
  await expect(nav.getByRole('button',{name:'Expedientes',exact:true})).toHaveCount(0);
 });
});
