import {test,expect} from '@playwright/test';

const id='aaaaaaaa111141118111bbbbbbbbbbbb';
const fakeSession={access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJleHAiOjE5OTk5OTk5OTl9.',token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-exp-followup-not-real',user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'qa@fenix.test',app_metadata:{},user_metadata:{actor_code:'DIR-TEST'},created_at:'2026-08-23T00:00:00.000Z'}};

async function boot(page:any){
 await page.addInitScript(session=>{localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));localStorage.setItem('fenix-remember-device','true');},fakeSession);
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'DIR-TEST',role:'Direccion'})});if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{label:'Inicio',route:'/inicio'},{label:'Expedientes',route:'/expedientes'},{label:'Inmobiliarias',route:'/inmobiliarias'},{label:'Agenda',route:'/agenda'}]})});return r.fulfill({status:404,body:'{}'});});
 await page.route(`**/functions/v1/fenix-notion-runtime-test/expedientes/${id}`,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({source:'notion_canonical',item:{id,expediente:'Expediente seguimiento QA',cliente:'Cliente QA',fase:'Estudio'}})}));
 await page.route(`**/functions/v1/fenix-notion-runtime-test/expedientes/${id}/compradores`,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[],count:0,titulares:0,avalistas:0})}));
 await page.route(`**/functions/v1/fenix-expediente-assistant-test/expedientes/${id}/advice`,r=>r.fulfill({status:403,contentType:'application/json',body:'{}'}));
}

test('seguimiento de expediente no escribe antes de la confirmación y editar invalida preview',async({page},testInfo)=>{
 if(!testInfo.project.name.includes('desktop'))test.skip();
 await boot(page);let posts=0;
 await page.route(`**/functions/v1/fenix-notion-actions-test/expedientes/${id}/action`,r=>{posts++;return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'});});
 await page.goto(`/expedientes/${id}`);
 const block=page.locator('#seguimiento-contextual');
 await expect(block).toBeVisible();
 await block.locator('textarea').fill('Llamar mañana con documentación preparada');
 await block.getByRole('button',{name:'Guardar seguimiento',exact:true}).click();
 expect(posts).toBe(0);
 const dialog=page.getByRole('dialog',{name:'Vista previa del seguimiento'});
 await expect(dialog).toBeVisible();
 await expect(dialog.getByText('Llamar mañana con documentación preparada',{exact:true})).toBeVisible();
 await dialog.getByRole('button',{name:'Volver',exact:true}).click();
 await block.locator('textarea').fill('Llamar el jueves con documentación preparada');
 await block.getByRole('button',{name:'Guardar seguimiento',exact:true}).click();
 expect(posts).toBe(0);
 await expect(dialog.getByText('Llamar el jueves con documentación preparada',{exact:true})).toBeVisible();
 await dialog.getByRole('button',{name:'Confirmar y guardar',exact:true}).click();
 await expect.poll(()=>posts).toBe(1);
});
