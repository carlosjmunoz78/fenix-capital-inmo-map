import {test,expect} from '@playwright/test';

const fakeSession={
 access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJlbWFpbCI6ImRpcmVjY2lvbkBmZW5peC50ZXN0IiwiZXhwIjoxOTk5OTk5OTk5fQ.',
 token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-inmo-detail-not-real',
 user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'direccion@fenix.test',app_metadata:{},user_metadata:{},created_at:'2026-08-19T00:00:00.000Z'}
};
const id='aaaaaaaa111141118111bbbbbbbbbbbb';
const item={id,inmobiliaria:'ADAIX LUCENA',localidad:'Lucena',zona:'Subbética',estado:'Activa',responsable:'VIS-A',telefono:'957000000',email:'lucena@example.test',proximo_contacto_b2b:'2026-08-24',expedientes:[{id:'exp-1'}]};

test.describe('Fénix PRE-PROD · ficha maestra de Inmobiliaria',()=>{
 test('muestra relación B2B, siguiente paso y preview auditado sin inventar datos',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await page.setViewportSize({width:1600,height:900});
  await page.addInitScript(session=>{window.localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));window.localStorage.setItem('fenix-remember-device','true');},fakeSession);
  await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'DIR-TEST',role:'Direccion'})});if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{label:'Inicio',route:'/inicio'},{label:'Inmobiliarias',route:'/inmobiliarias'}]})});return r.fulfill({status:404,body:'{}'});});
  await page.route(`**/functions/v1/fenix-notion-runtime-test/inmobiliarias/${id}`,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({source:'notion_canonical',item})}));
  await page.goto(`/inmobiliarias/${id}`);
  const root=page.locator('.inmo-detail-root');
  await expect(root).toBeVisible();
  await expect(root.getByText('FICHA DE INMOBILIARIA',{exact:true})).toBeVisible();
  await expect(root.getByRole('heading',{name:'ADAIX LUCENA',exact:true})).toBeVisible();
  await expect(root.getByText('RELACIÓN B2B',{exact:true})).toBeVisible();
  await expect(root.getByText('SIGUIENTE PASO',{exact:true})).toBeVisible();
  await expect(root.getByText('2026-08-24',{exact:true})).toBeVisible();
  await expect(root.getByText('FIRMAS VINCULADAS',{exact:true})).toBeVisible();
  await expect(root.getByText('No disponible',{exact:true}).first()).toBeVisible();
  await root.getByLabel('Notas').fill('Seguimiento QA B2B');
  await root.getByRole('button',{name:'Revisar cambios'}).click();
  await expect(root.getByText('Vista previa antes de guardar',{exact:true})).toBeVisible();
  await expect(root.getByRole('button',{name:'Confirmar y guardar'})).toBeVisible();
  await expect(root.getByText(/\bPRO\b/)).toHaveCount(0);
  const shot=await root.screenshot();
  await testInfo.attach('ficha-inmobiliaria-master-1600',{body:shot,contentType:'image/png'});
 });
});
