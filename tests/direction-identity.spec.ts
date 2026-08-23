import {test,expect} from '@playwright/test';

const baseSession={
 access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJlbWFpbCI6ImRpcmVjY2lvbkBmZW5peC50ZXN0IiwiZXhwIjoxOTk5OTk5OTk5fQ.',
 token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-direction-identity-not-real'
};

async function boot(page:any,fullName?:string){
 const session={...baseSession,user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'direccion@fenix.test',app_metadata:{},user_metadata:fullName?{full_name:fullName}:{},created_at:'2026-08-19T00:00:00.000Z'}};
 await page.addInitScript(s=>{localStorage.setItem('fenix-preprod-auth',JSON.stringify(s));localStorage.setItem('fenix-remember-device','true');},session);
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'CARLOS-ADMIN',role:'Dirección'})});if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:['/inicio','/expedientes','/bancos']})});if(u.endsWith('/personal'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[]})});return r.fulfill({status:404,contentType:'application/json',body:'{}'});});
 await page.route('**/functions/v1/fenix-notion-runtime-test/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[]})}));
 await page.goto('/inicio');
 await expect(page.locator('.dir-shell')).toBeVisible();
}

test.describe('Fénix PRE-PROD · identidad de Dirección',()=>{
 test('CARLOS-ADMIN usa identidad autenticada y nunca hereda Belén',async({page},testInfo)=>{if(!testInfo.project.name.includes('desktop'))test.skip();await boot(page,'Carlos Muñoz');const root=page.locator('.dir-shell');await expect(root.locator('.dir-user-copy strong')).toHaveText('Carlos Muñoz');await expect(root.locator('.dir-user-copy span')).toHaveText('Dirección');await expect(root.locator('.dir-priority-copy h1')).toContainText('Hola Carlos');await expect(root.getByText(/Belén Muñoz|Hola Belén/)).toHaveCount(0);});
 test('sin nombre autenticado no inventa identidad personal',async({page},testInfo)=>{if(!testInfo.project.name.includes('desktop'))test.skip();await boot(page);const root=page.locator('.dir-shell');await expect(root.locator('.dir-user-copy strong')).toHaveText('Dirección');await expect(root.locator('.dir-priority-copy h1')).toHaveText('Buenos días 👋');await expect(root.getByText(/Belén Muñoz|Hola Belén/)).toHaveCount(0);});
});
