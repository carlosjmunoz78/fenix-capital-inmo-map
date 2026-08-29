import {test,expect} from '@playwright/test';

const fakeSession={access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJleHAiOjE5OTk5OTk5OTl9.',token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-bank-create-not-real',user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'qa@fenix.test',app_metadata:{},user_metadata:{actor_code:'DIR-TEST'},created_at:'2026-08-23T00:00:00.000Z'}};
const nav=[{label:'Inicio',route:'/inicio'},{label:'Bancos',route:'/bancos'}];
async function boot(page:any,role='Direccion'){
 await page.addInitScript(session=>{localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));localStorage.setItem('fenix-remember-device','true');},fakeSession);
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:role==='Direccion'?'DIR-TEST':'FIN-A',role})});if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:nav})});return r.fulfill({status:404,body:'{}'});});
}

test('Dirección revisa y confirma antes de crear un banco canónico',async({page},testInfo)=>{
 if(!testInfo.project.name.includes('desktop'))test.skip();await boot(page);let posts=0;let payload:any=null;
 await page.route('**/functions/v1/fenix-bank-actions-test',async r=>{posts++;payload=JSON.parse(r.request().postData()||'{}');return r.fulfill({status:201,contentType:'application/json',body:JSON.stringify({ok:true,status:201,bank_code:'BANK-QA001',bank:{bank_code:'BANK-QA001',nombre:'Banco QA'}})});});
 await page.goto('/bancos/nuevo');await page.getByLabel('Nombre del banco').fill('Banco QA');await page.getByLabel('Localidad').fill('Córdoba');await page.getByLabel('Financiación 100%').selectOption('Sí');await page.getByRole('button',{name:'Revisar antes de crear',exact:true}).click();expect(posts).toBe(0);await expect(page.getByTestId('bank-create-preview')).toContainText('Banco QA');await page.getByRole('button',{name:'Confirmar y crear',exact:true}).click();await expect.poll(()=>posts).toBe(1);expect(payload.nombre).toBe('Banco QA');expect(payload.localidad).toBe('Córdoba');expect(payload.financiacion_100).toBe(true);await expect(page.getByText('Banco creado en la fuente canónica de PRE-PROD.')).toBeVisible();await expect(page.getByRole('button',{name:'Abrir ficha del banco'})).toBeVisible();
});

test('un perfil no Dirección no recibe formulario de alta bancaria',async({page},testInfo)=>{
 if(!testInfo.project.name.includes('desktop'))test.skip();await boot(page,'Financiero');await page.goto('/bancos/nuevo');await expect(page.getByText(/puede consultar Bancos, pero no crear nuevas entidades/i)).toBeVisible();await expect(page.getByLabel('Nombre del banco')).toHaveCount(0);await expect(page.getByRole('button',{name:'Revisar antes de crear',exact:true})).toHaveCount(0);
});
