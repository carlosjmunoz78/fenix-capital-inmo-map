import {test,expect} from '@playwright/test';

const fakeSession={access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJiYmJiYmJiYi1iYmJiLTRiYmItOGJiYi1iYmJiYmJiYmJiYmIiLCJlbWFpbCI6InZpc2l0YWRvckBmZW5peC50ZXN0IiwiZXhwIjoxOTk5OTk5OTk5fQ.',token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-not-real',user:{id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',aud:'authenticated',role:'authenticated',email:'visitador@fenix.test',app_metadata:{},user_metadata:{actor_code:'VIS-A'},created_at:'2026-08-22T00:00:00.000Z'}};
const contactId='aaaaaaaa-1111-4111-8111-bbbbbbbbbbbb';
const inmoId='cccccccc-2222-4222-8222-dddddddddddd';

test.describe('Fénix PRE-PROD · Visitador contacto B2B',()=>{
 test('abre y edita solo mediante gate B2B',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await page.addInitScript(session=>{localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));},fakeSession);
  await page.route('**/functions/v1/fenix-app-gateway-test/session/context',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'VIS-A',role:'Visitador',zone_code:'CORDOBA-A'})}));
  await page.route(`**/functions/v1/fenix-b2b-actions-test/contactos/${contactId}`,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,status:200,item:{id:contactId,nombre:'Carlos',apellidos:'Prueba',contacto:'Carlos Prueba',cargo:'Agente',email:'carlos@example.test',telefono:'600000001',activo:true,inmobiliaria_id:inmoId},inmobiliaria:{id:inmoId,nombre:'Inmo QA',localidad:'Córdoba'}})}));
  await page.route(`**/functions/v1/fenix-b2b-actions-test/contactos/${contactId}/update`,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,status:200,id:contactId,destino:`/contactos-b2b/${contactId}`})}));
  await page.goto(`/contactos-b2b/${contactId}`);
  await expect(page.getByRole('heading',{name:'Carlos Prueba'})).toBeVisible();
  await expect(page.getByText('Inmo QA · Córdoba')).toBeVisible();
  await expect(page.getByText('Visitador')).toBeVisible();
  const cargo=page.getByLabel('Cargo');await cargo.fill('Responsable comercial');
  await page.getByRole('button',{name:'Revisar cambios'}).click();
  await expect(page.getByText('Vista previa')).toBeVisible();
  await page.getByRole('button',{name:'Confirmar cambios'}).click();
  await expect(page.getByText('Contacto B2B actualizado dentro de tu ámbito autorizado.')).toBeVisible();
 });
});
