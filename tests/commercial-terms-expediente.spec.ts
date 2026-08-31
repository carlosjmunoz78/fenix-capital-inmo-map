import {test,expect} from '@playwright/test';

const fakeSession={access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJleHAiOjE5OTk5OTk5OTl9.',token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-commercial-terms-not-real',user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'direccion@fenix.test',app_metadata:{},user_metadata:{},created_at:'2026-08-29T00:00:00.000Z'}};
const id='aaaaaaaa111141118111bbbbbbbbbbbb';

test('expediente propone tarifa vigente y Dirección puede guardar una negociación distinta',async({page},testInfo)=>{
 if(!testInfo.project.name.includes('desktop'))test.skip();
 await page.addInitScript(session=>{localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));localStorage.setItem('fenix-remember-device','true')},fakeSession);
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'DIR-QA',role:'Direccion'})});if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{label:'Inicio',route:'/inicio'},{label:'Expedientes',route:'/expedientes'},{label:'Economía',route:'/economia'}]})});return r.fulfill({status:404,body:'{}'})});
 const item={id,expediente:'EXP QA COMERCIAL',cliente:'Cliente QA',fase:'Análisis',importe_hipoteca:150000,origen:'Inmobiliaria'};
 await page.route(`**/functions/v1/fenix-notion-runtime-test/expedientes/${id}`,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({source:'notion_canonical',item})}));
 await page.route(`**/functions/v1/fenix-notion-runtime-test/expedientes/${id}/compradores`,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[]})}));
 await page.route('**/functions/v1/fenix-ana-api-test/capabilities',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,capabilities:{can_ana_execute:false,can_ana_help:true,can_manual_execute:true,can_upload_evidence:true,can_correct_ana:true,can_view_learning_inbox:true}})}));
 let writes=0,lastBody:any=null;
 await page.route(`**/functions/v1/fenix-notion-actions-test/expedientes/${id}/action`,async r=>{writes++;lastBody=r.request().postDataJSON();return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true})})});
 await page.goto(`/expedientes/${id}`);
 const panel=page.getByTestId('exp-commercial-terms');await expect(panel).toBeVisible();
 await expect(panel.getByText('Tarifa recomendada: 3.500 € + IVA',{exact:true})).toBeVisible();
 await expect(panel.getByLabel('Honorarios acordados')).toHaveValue('3500');
 await expect(panel.getByLabel('Comisión inmobiliaria')).toHaveValue('1100');
 await panel.getByLabel('Honorarios acordados').fill('3000');
 await panel.getByLabel('Comisión inmobiliaria').fill('900');
 await panel.getByRole('button',{name:'Revisar cambios'}).click();
 expect(writes).toBe(0);
 await expect(panel.getByText('Se guardarán 3.000 € de honorarios y 900 € de comisión.',{exact:true})).toBeVisible();
 await panel.getByRole('button',{name:'Confirmar y guardar'}).click();
 await expect.poll(()=>writes).toBe(1);
 expect(lastBody).toMatchObject({action:'update',changes:{honorarios_finales_eur:3000,comision_inmobiliaria_eur:900}});
 await expect(panel.getByText('Importes guardados en la operación canónica. CEREBRO y Economía usarán estos valores.',{exact:true})).toBeVisible();
});
