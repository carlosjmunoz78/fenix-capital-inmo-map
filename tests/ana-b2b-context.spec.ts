import {test,expect} from '@playwright/test';

const contactId='bbbbbbbb-1111-4111-8111-cccccccccccc';
const inmoId='aaaaaaaa-1111-4111-8111-bbbbbbbbbbbb';
const fakeSession={access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJleHAiOjE5OTk5OTk5OTl9.',token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-ana-b2b-not-real',user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'vis-a@fenix.test',app_metadata:{},user_metadata:{actor_code:'VIS-A'},created_at:'2026-08-22T00:00:00.000Z'}};

test('Ana conserva contacto B2B como scope propio y habilita evidencia solo tras gate',async({page},testInfo)=>{
 if(!testInfo.project.name.includes('desktop'))test.skip();
 await page.addInitScript(session=>{localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));localStorage.setItem('fenix-remember-device','true');},fakeSession);
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'VIS-A',role:'Visitador',zone_code:'ZONE-A'})});if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{label:'Inicio',route:'/inicio'},{label:'Contactos',route:'/contactos'},{label:'Inmobiliarias',route:'/inmobiliarias'}]})});return r.fulfill({status:404,body:'{}'});});
 await page.route('**/functions/v1/fenix-b2b-actions-test/contactos/**',async r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,status:200,item:{id:contactId,nombre:'Contacto',apellidos:'B2B',contacto:'Contacto B2B',cargo:'Responsable',email:'',telefono:'',activo:true,inmobiliaria_id:inmoId},inmobiliaria:{id:inmoId,nombre:'Inmo QA',localidad:'Córdoba'}})}));
 await page.route('**/functions/v1/fenix-ana-api-test/capabilities',async r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({capabilities:{can_ana_execute:false,can_ana_help:true,can_manual_execute:true,can_upload_evidence:true,can_correct_ana:true,can_view_learning_inbox:false}})}));
 let scopeBody:any=null;
 await page.route('**/functions/v1/fenix-evidence-api-test/scope',async r=>{scopeBody=JSON.parse(r.request().postData()||'{}');return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,status:200})});});
 await page.goto(`/contactos-b2b/${contactId}`);
 await expect(page.getByText('Contacto B2B',{exact:true}).first()).toBeVisible();
 await expect.poll(()=>scopeBody).not.toBeNull();
 expect(scopeBody).toEqual({origin_type:'contacto_b2b',origin_code:contactId});
 const ana=page.getByRole('complementary',{name:'Ana · asistente contextual'});
 await ana.getByRole('button',{name:/Ana/}).first().click();
 const upload=ana.getByRole('button',{name:'Subir evidencia'});
 await expect(upload).toBeEnabled();
 await ana.getByRole('button',{name:'Ana se ha equivocado'}).click();
 await expect(page).toHaveURL(new RegExp(`/ana\\?scope_type=contacto_b2b&scope_code=${contactId.replaceAll('-','\\-')}$`));
});
