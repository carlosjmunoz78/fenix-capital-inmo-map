import {test,expect} from '@playwright/test';

const fakeSession={access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJlbWFpbCI6InFhQGZlbml4LnRlc3QiLCJleHAiOjE5OTk5OTk5OTl9.',token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-shell-isolation-not-real',user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'qa@fenix.test',app_metadata:{},user_metadata:{actor_code:'FIN-A'},created_at:'2026-08-19T00:00:00.000Z'}};

async function seed(page:any){
 await page.addInitScript((s:any)=>{localStorage.setItem('fenix-preprod-auth',JSON.stringify(s));localStorage.setItem('fenix-remember-device','true')},fakeSession);
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async(r:any)=>{
  const u=r.request().url();
  if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,context:{actor_code:'FIN-A',role:'Financiero',active:true}})});
  if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,items:[{label:'Inicio',route:'/inicio'},{label:'Expedientes',route:'/expedientes'},{label:'Agenda',route:'/agenda'}]})});
  return r.fulfill({status:404,contentType:'application/json',body:'{}'});
 });
}

test('Fénix PRE-PROD · ficha expediente monta un solo chrome y conserva recorrido visible',async({page},testInfo)=>{
 if(!testInfo.project.name.includes('desktop'))test.skip();
 await seed(page);
 await page.route('**/functions/v1/fenix-detail-api-test/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,expediente:{expediente_code:'EXP-QA-001',cliente_alias:'QA',fase:'Tasación'}})}));
 await page.goto('/expedientes/EXP-QA-001');
 await expect(page.locator('.detail-exp-root')).toBeVisible();
 await expect(page.getByText('Cartera hipotecaria autorizada para tu perfil.')).toHaveCount(0);
 await expect(page.locator('.app-shell > .sidebar')).toBeHidden();
 await expect(page.locator('.app-shell > .main')).toBeHidden();
 await expect(page.locator('.detail-exp-root .ops-top:visible')).toHaveCount(1);
 await expect(page.locator('aside.detail-auth-nav:visible')).toHaveCount(1);
 const journey=page.getByTestId('expediente-journey');
 await expect(journey).toBeVisible();
 await expect(journey).toContainText('RECORRIDO DEL EXPEDIENTE');
 await expect(journey).toContainText('Tasación');
 await expect(journey).toContainText('ANA ·');
});

test('Fénix PRE-PROD · una ficha de tarea no monta también Agenda genérica',async({page},testInfo)=>{
 if(!testInfo.project.name.includes('desktop'))test.skip();
 await seed(page);
 await page.goto('/tareas/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
 await expect(page.getByText('Fuente canónica Notion · acciones limitadas por rol y propietario.')).toBeVisible();
 await expect(page.getByText('Tareas, vencimientos y trabajo asignado.')).toHaveCount(0);
});
