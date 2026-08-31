import {test,expect} from '@playwright/test';

const fakeSession={access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJlbWFpbCI6ImRpcmVjY2lvbkBmZW5peC50ZXN0IiwiZXhwIjoxOTk5OTk5OTk5fQ.',token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-bank-detail-not-real',user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'direccion@fenix.test',app_metadata:{},user_metadata:{},created_at:'2026-08-19T00:00:00.000Z'}};
const bank={id:'bank-qa-1',nombre:'BANCO QA',perfil_clientes:'Primera vivienda con criterio informado',admite_100:true,doble_garantia:false,tipo_fijo:'Informado por fuente',bonificaciones:'Nómina'};
const contact={id:'contact-bank-1',nombre:'Persona Banco QA',cargo:'Gestor',banco:'BANCO QA',sucursal:'Córdoba',email:'gestor@example.test'};

test.describe('Fénix PRE-PROD · ficha de Banco',()=>{
 test('muestra criterios y contactos solo desde fuentes autorizadas',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await page.setViewportSize({width:1600,height:900});
  await page.addInitScript(session=>{window.localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));window.localStorage.setItem('fenix-remember-device','true');},fakeSession);
  await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'DIR-TEST',role:'Direccion'})});if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{label:'Inicio',route:'/inicio'},{label:'Bancos',route:'/bancos'}]})});if(u.endsWith('/bancos'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[bank]})});return r.fulfill({status:404,body:'{}'});});
  await page.route('**/functions/v1/fenix-notion-runtime-test/contactos-bancarios',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({source:'notion_canonical',items:[contact]})}));
  await page.goto('/bancos/bank-qa-1');
  const root=page.locator('.banco-detail-root');
  await expect(root).toBeVisible();
  await expect(root.getByText('FICHA DE BANCO',{exact:true})).toBeVisible();
  await expect(root.getByRole('heading',{level:1,name:'BANCO QA',exact:true})).toBeVisible();
  await expect(root.getByText('Primera vivienda con criterio informado',{exact:true})).toBeVisible();
  await expect(root.getByText('Persona Banco QA',{exact:true})).toBeVisible();
  await expect(root.getByText('No informado',{exact:true}).first()).toBeVisible();
  await expect(root.getByText(/\bPRO\b/)).toHaveCount(0);
  const shot=await root.screenshot();
  await testInfo.attach('ficha-banco-master-1600',{body:shot,contentType:'image/png'});
 });
});
