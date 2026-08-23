import {test,expect} from '@playwright/test';

const session={
 access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJlbWFpbCI6ImRpcmVjY2lvbkBmZW5peC50ZXN0IiwiZXhwIjoxOTk5OTk5OTk5fQ.',
 token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-direction-states-not-real',
 user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'direccion@fenix.test',app_metadata:{},user_metadata:{full_name:'Carlos Muñoz'},created_at:'2026-08-19T00:00:00.000Z'}
};

async function boot(page:any,statuses:Record<string,number>,delay=0){
 await page.addInitScript(s=>{localStorage.setItem('fenix-preprod-auth',JSON.stringify(s));localStorage.setItem('fenix-remember-device','true');},session);
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'CARLOS-ADMIN',role:'Dirección'})});if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:['/inicio','/expedientes','/firmas','/agenda']})});if(u.endsWith('/personal'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[]})});return r.fulfill({status:404,contentType:'application/json',body:'{}'});});
 await page.route('**/functions/v1/fenix-notion-runtime-test/**',async r=>{if(delay)await new Promise(res=>setTimeout(res,delay));const u=r.request().url();const key=u.includes('/expedientes')?'expedientes':u.includes('/firmas')?'firmas':u.includes('/tareas')?'tareas':'other';const status=statuses[key]??200;return r.fulfill({status,contentType:'application/json',body:JSON.stringify({items:[]})});});
 await page.goto('/inicio');
 await expect(page.locator('.dir-shell')).toBeVisible();
}

test.describe('Fénix PRE-PROD · estados de fuentes Dirección',()=>{
 test('muestra loading mientras las fuentes canónicas siguen pendientes',async({page},testInfo)=>{if(!testInfo.project.name.includes('desktop'))test.skip();await boot(page,{},350);const state=page.getByTestId('direction-source-state');await expect(state).toHaveAttribute('data-state','loading');await expect(state).toContainText('Cargando fuentes canónicas');await expect(state).toBeHidden({timeout:3000});});
 test('distingue 403 y mantiene ocultos los datos no autorizados',async({page},testInfo)=>{if(!testInfo.project.name.includes('desktop'))test.skip();await boot(page,{expedientes:403,firmas:200,tareas:200});const state=page.getByTestId('direction-source-state');await expect(state).toHaveAttribute('data-state','forbidden');await expect(state).toContainText('Expedientes');await expect(state).toContainText('no autorizado');});
 test('distingue fallo técnico de un 403',async({page},testInfo)=>{if(!testInfo.project.name.includes('desktop'))test.skip();await boot(page,{expedientes:200,firmas:503,tareas:200});const state=page.getByTestId('direction-source-state');await expect(state).toHaveAttribute('data-state','error');await expect(state).toContainText('Firmas');await expect(state).toContainText('no disponible');});
 test('con todas las fuentes 200 no muestra aviso degradado',async({page},testInfo)=>{if(!testInfo.project.name.includes('desktop'))test.skip();await boot(page,{expedientes:200,firmas:200,tareas:200});await expect(page.getByTestId('direction-source-state')).toHaveCount(0);});
});
