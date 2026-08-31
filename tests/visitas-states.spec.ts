import {test,expect,Page} from '@playwright/test';

const session={access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJlbWFpbCI6InZpc2l0YWRvckBmZW5peC50ZXN0IiwiZXhwIjoxOTk5OTk5OTk5fQ.',token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-visitas-states-not-real',user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'visitador@fenix.test',app_metadata:{},user_metadata:{full_name:'Visitador QA'},created_at:'2026-08-19T00:00:00.000Z'}};

async function seed(page:Page){await page.addInitScript(s=>{localStorage.setItem('fenix-preprod-auth',JSON.stringify(s));localStorage.setItem('fenix-remember-device','true')},session);}
async function appRoutes(page:Page,navigationStatus=200){await page.route('**/functions/v1/fenix-app-gateway-test/**',r=>{const u=r.request().url();if(u.endsWith('/navigation'))return r.fulfill({status:navigationStatus,contentType:'application/json',body:navigationStatus===200?JSON.stringify({items:['/inicio','/inmobiliarias','/visitas','/agenda']}):'{}'});if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'VIS-A',role:'Visitador'})});return r.fulfill({status:404,body:'{}'});});}

test('Visitas distingue loading y vacío autorizado',async({page},testInfo)=>{
 if(!testInfo.project.name.includes('desktop'))test.skip();
 await seed(page);await appRoutes(page);
 await page.route('**/functions/v1/fenix-visitas-api-test/visitas',async r=>{await new Promise(res=>setTimeout(res,350));return r.fulfill({status:200,contentType:'application/json',body:'{"items":[]}'});});
 await page.goto('/visitas');
 await expect(page.getByTestId('visitas-loading')).toBeVisible();
 await expect(page.getByTestId('visitas-empty')).toBeVisible();
 await expect(page.locator('.ops-table-card')).toHaveCount(0);
});

test('Visitas 403 no expone formularios ni datos y navegación cae solo a Inicio',async({page},testInfo)=>{
 if(!testInfo.project.name.includes('desktop'))test.skip();
 await seed(page);await appRoutes(page,500);
 await page.route('**/functions/v1/fenix-visitas-api-test/visitas',r=>r.fulfill({status:403,contentType:'application/json',body:'{}'}));
 await page.goto('/visitas');
 await expect(page.getByTestId('visitas-forbidden')).toContainText('no tiene acceso');
 await expect(page.getByRole('button',{name:'Revisar antes de registrar'})).toHaveCount(0);
 await expect(page.locator('.ops-table-card')).toHaveCount(0);
 const menu=page.locator('.visitas-root .ops-side nav');
 await expect(menu.getByRole('button')).toHaveCount(1);
 await expect(menu.getByRole('button',{name:'Inicio',exact:true})).toBeVisible();
});

test('Visitas separa error técnico y fallo de red sin dejar datos stale',async({page},testInfo)=>{
 if(!testInfo.project.name.includes('desktop'))test.skip();
 await seed(page);await appRoutes(page);
 await page.route('**/functions/v1/fenix-visitas-api-test/visitas',r=>r.fulfill({status:503,contentType:'application/json',body:'{}'}));
 await page.goto('/visitas');
 await expect(page.getByTestId('visitas-error')).toHaveText('No se pudieron cargar las gestiones.');
 await expect(page.locator('.ops-table-card')).toHaveCount(0);
 await page.unroute('**/functions/v1/fenix-visitas-api-test/visitas');
 await page.route('**/functions/v1/fenix-visitas-api-test/visitas',r=>r.abort('failed'));
 await page.reload();
 await expect(page.getByTestId('visitas-error')).toHaveText('No se pudo conectar con las gestiones autorizadas.');
 await expect(page.getByTestId('visitas-loading')).toHaveCount(0);
 await expect(page.locator('.ops-table-card')).toHaveCount(0);
});
