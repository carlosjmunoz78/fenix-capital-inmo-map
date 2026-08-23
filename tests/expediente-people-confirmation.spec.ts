import {test,expect} from '@playwright/test';

const fakeSession={access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJleHAiOjE5OTk5OTk5OTl9.',token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-exp-people-not-real',user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'qa@fenix.test',app_metadata:{},user_metadata:{actor_code:'DIR-TEST'},created_at:'2026-08-23T00:00:00.000Z'}};
const id='aaaaaaaa111141118111bbbbbbbbbbbb';

async function boot(page:any){
 await page.addInitScript(session=>{localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));localStorage.setItem('fenix-remember-device','true');},fakeSession);
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'DIR-TEST',role:'Direccion'})});if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{label:'Inicio',route:'/inicio'},{label:'Expedientes',route:'/expedientes'}]})});return r.fulfill({status:404,body:'{}'});});
 await page.route(`**/functions/v1/fenix-notion-runtime-test/expedientes/${id}`,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({source:'notion_canonical',item:{id,expediente:'QA PERSONAS',cliente:'QA PERSONAS',fase:'Entrada'}})}));
 await page.route(`**/functions/v1/fenix-expediente-assistant-test/expedientes/${id}/advice`,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,status:200,action:'Completar intervinientes',why:'Faltan datos',people:{count:0,titulares:0,avalistas:0,missing_data:0,missing_docs:0,items:[]},execution_modes:{ana:false,help:true,manual:true},channels:{}})}));
 await page.route('**/functions/v1/fenix-memory-api-test/context',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[]})}));
 await page.route('**/functions/v1/fenix-ana-api-test/capabilities',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({capabilities:{can_ana_execute:false,can_ana_help:true,can_manual_execute:true,can_upload_evidence:false,can_correct_ana:true,can_view_learning_inbox:false}})}));
}

test('añadir interviniente exige revisar y confirmar; editar invalida preview',async({page},testInfo)=>{
 if(!testInfo.project.name.includes('desktop'))test.skip();
 await boot(page);
 let creates=0;
 await page.route(`**/functions/v1/fenix-notion-runtime-test/expedientes/${id}/compradores`,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({count:0,titulares:0,avalistas:0,items:[]})}));
 await page.route(`**/functions/v1/fenix-comprador-action-test/expedientes/${id}/compradores`,r=>{creates++;return r.fulfill({status:201,contentType:'application/json',body:JSON.stringify({ok:true,id:'p-new'})});});
 await page.goto(`/expedientes/${id}`);
 await page.getByRole('button',{name:'Añadir persona'}).click();
 const panel=page.getByLabel('Personas de la operación');
 await panel.getByText('Añadir interviniente',{exact:true}).waitFor();
 await panel.locator('label').filter({hasText:'Nombre'}).locator('input').fill('María');
 await panel.locator('label').filter({hasText:'DNI / NIE'}).locator('input').fill('12345678Z');
 await panel.getByTestId('add-person-primary').click();
 expect(creates).toBe(0);
 await expect(panel.getByTestId('create-person-preview')).toBeVisible();
 await panel.locator('label').filter({hasText:'Apellidos'}).locator('input').fill('Prueba');
 await expect(panel.getByTestId('create-person-preview')).toHaveCount(0);
 expect(creates).toBe(0);
 await panel.getByTestId('add-person-primary').click();
 await expect(panel.getByTestId('create-person-preview')).toBeVisible();
 await expect(panel.getByTestId('add-person-primary')).toContainText('Confirmar y añadir');
 await panel.getByTestId('add-person-primary').click();
 await expect.poll(()=>creates).toBe(1);
 await expect(page.getByText('Persona añadida al expediente y auditada.',{exact:true})).toBeVisible();
});
