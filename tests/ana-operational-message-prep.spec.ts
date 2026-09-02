import {test,expect} from '@playwright/test';

const session={
 access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJlbWFpbCI6ImRpcmVjY2lvbkBmZW5peC50ZXN0IiwiZXhwIjoxOTk5OTk5OTk5fQ.',
 token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-ana-prep-not-real',
 user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'direccion@fenix.test',app_metadata:{},user_metadata:{},created_at:'2026-08-19T00:00:00.000Z'}
};

async function auth(page:any){await page.addInitScript((s:any)=>{localStorage.setItem('fenix-preprod-auth',JSON.stringify(s));localStorage.setItem('fenix-preprod-auth-v2',JSON.stringify(s));localStorage.setItem('fenix-remember-device','true')},session);}
async function common(page:any){
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async(r:any)=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'DIR-TEST',role:'Direccion'})});if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{label:'Inicio',route:'/inicio'},{label:'Contactos',route:'/contactos'},{label:'Agenda',route:'/agenda'}]})});return r.fulfill({status:404,body:'{}'})});
 await page.route('**/functions/v1/fenix-ana-api-test/**',async(r:any)=>{const u=r.request().url();if(u.endsWith('/capabilities'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({capabilities:{can_correct_ana:true,can_view_learning_inbox:false}})});if(u.endsWith('/prepare-message'))return r.fulfill({status:404,contentType:'application/json',body:'{}'});return r.fulfill({status:404,body:'{}'})});
 await page.route('**/functions/v1/fenix-ana-canonical-test/rules**',async(r:any)=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{id:'r1',domain:'Hipotecas',rule:'Confirmar siempre el siguiente paso antes de prometer una fecha.',approved:true,state:'Aprobada'}]})}));
}

test('Ana prepara WhatsApp desde contacto usando contexto real y conocimiento aprobado',async({page})=>{
 await auth(page);await common(page);
 await page.route('**/functions/v1/fenix-notion-runtime-test/clientes/c1',async r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({item:{id:'c1',cliente:'Carmelo Ruiz',estado:'Seguimiento',proxima_accion:'Enviar documentación pendiente'}})}));
 await page.goto('/ana?mode=do&resource=contacto&contact_id=c1&channel=whatsapp');
 await expect(page.getByRole('dialog',{name:'Preparación operativa de Ana'})).toBeVisible();
 await expect(page.getByRole('heading',{name:'WhatsApp preparado por Ana'})).toBeVisible();
 await expect(page.getByText('Carmelo Ruiz')).toBeVisible();
 await expect(page.getByText(/Confirmar siempre el siguiente paso/)).toBeVisible();
 const draft=page.locator('.ana-prep-draft textarea');
 await expect(draft).toHaveValue(/Hola Carmelo/);
 await expect(draft).toHaveValue(/documentación pendiente/i);
 await expect(page.getByText(/Nada se envía automáticamente/)).toBeVisible();
});

test('Ana prepara una tarea seleccionada y detecta canal correo',async({page})=>{
 await auth(page);await common(page);
 await page.route('**/functions/v1/fenix-notion-runtime-test/tareas',async r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{id:'t1',tarea:'Enviar correo de seguimiento a cliente',estado:'Pendiente'}]})}));
 await page.goto('/ana?mode=do&resource=tareas&ids=t1');
 await expect(page.getByRole('heading',{name:'Correo preparado por Ana'})).toBeVisible();
 await expect(page.locator('.ana-prep-draft textarea')).not.toHaveValue('');
 await expect(page.getByText(/Esta pantalla no marca tareas como hechas ni envía comunicaciones/)).toBeVisible();
});
