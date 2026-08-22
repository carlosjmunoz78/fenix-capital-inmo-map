import {test,expect} from '@playwright/test';

function fakeSession(actorCode:string,email:string){return{access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJleHAiOjE5OTk5OTk5OTl9.',token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-contact-scope-not-real',user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email,app_metadata:{},user_metadata:{actor_code:actorCode},created_at:'2026-08-22T00:00:00.000Z'}};}
const client={id:'aaaaaaaa111141118111bbbbbbbbbbbb',cliente:'Cliente Hipotecario QA',estado:'En seguimiento',expediente:'EXP-QA-1'};
const b2b={id:'bbbbbbbb111141118111cccccccccccc',contacto:'Contacto B2B QA',cargo:'Responsable',inmobiliaria:'Inmo QA',proximo_contacto:'2026-08-26'};

async function auth(page:any,actorCode:string,role:string){
 await page.addInitScript(({session})=>{localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));}, {session:fakeSession(actorCode,`${actorCode.toLowerCase()}@fenix.test`)});
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async(r:any)=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:actorCode,role})});if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{label:'Inicio',route:'/inicio'},{label:'Contactos',route:'/contactos'},{label:'Inmobiliarias',route:'/inmobiliarias'}]})});return r.fulfill({status:404,body:'{}'});});
}

test.describe('Fénix PRE-PROD · Contactos aislados por rol',()=>{
 test('Visitador consulta solo contactos B2B y nunca clientes hipotecarios',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await auth(page,'VIS-A','Visitador');
  let clientes=0,b2bHits=0;
  await page.route('**/functions/v1/fenix-notion-runtime-test/clientes',r=>{clientes++;return r.fulfill({status:500,body:'{}'});});
  await page.route('**/functions/v1/fenix-notion-runtime-test/contactos-inmobiliaria',r=>{b2bHits++;return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[b2b]})});});
  await page.goto('/contactos');
  const row=page.locator('tr').filter({hasText:'Contacto B2B QA'});
  await expect(row).toBeVisible();
  await expect(page.getByText('Cliente Hipotecario QA')).toHaveCount(0);
  expect(clientes).toBe(0);expect(b2bHits).toBe(1);
  await row.dispatchEvent('click');
  await expect(page).toHaveURL(/\/contactos-b2b\//);
 });

 test('Financiero consulta solo clientes hipotecarios y no B2B',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await auth(page,'FIN-A','Financiero');
  let clientes=0,b2bHits=0;
  await page.route('**/functions/v1/fenix-notion-runtime-test/clientes',r=>{clientes++;return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[client]})});});
  await page.route('**/functions/v1/fenix-notion-runtime-test/contactos-inmobiliaria',r=>{b2bHits++;return r.fulfill({status:500,body:'{}'});});
  await page.goto('/contactos');
  await expect(page.getByText('Cliente Hipotecario QA')).toBeVisible();
  await expect(page.getByText('Contacto B2B QA')).toHaveCount(0);
  expect(clientes).toBe(1);expect(b2bHits).toBe(0);
 });

 test('Dirección puede alternar explícitamente de clientes a contactos de inmobiliaria',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await auth(page,'DIR-TEST','Direccion');
  await page.route('**/functions/v1/fenix-notion-runtime-test/clientes',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[client]})}));
  await page.route('**/functions/v1/fenix-notion-runtime-test/contactos-inmobiliaria',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[b2b]})}));
  await page.goto('/contactos');
  await expect(page.getByText('Cliente Hipotecario QA')).toBeVisible();
  const tabs=page.getByTestId('contact-scope-tabs');
  await expect(tabs).toBeVisible();
  await tabs.getByRole('button',{name:'Contactos inmobiliaria'}).dispatchEvent('click');
  await expect(page.getByText('Contacto B2B QA')).toBeVisible();
  await expect(page.getByText('Cliente Hipotecario QA')).toHaveCount(0);
 });
});
