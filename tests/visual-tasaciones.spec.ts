import {test,expect} from '@playwright/test';

const fakeSession={
 access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJlbWFpbCI6ImRpcmVjY2lvbkBmZW5peC50ZXN0IiwiZXhwIjoxOTk5OTk5OTk5fQ.',
 token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-tas-not-real',
 user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'direccion@fenix.test',app_metadata:{},user_metadata:{},created_at:'2026-08-19T00:00:00.000Z'}
};
const items=[
 {id:'aaaaaaaa-1111-4111-8111-bbbbbbbbbbbb',direccion:'Av. de la Libertad 12',estado:'Informe emitido',tasadora:'Tinsa',fecha_informe:'2026-08-20',valor_tasacion:210000,pdf:'informe.pdf'},
 {id:'bbbbbbbb-1111-4111-8111-cccccccccccc',direccion:'Calle Córdoba 8',estado:'Pendiente visita',tasadora:'Gesvalt',fecha_visita:'2026-08-24'},
 {id:'cccccccc-1111-4111-8111-dddddddddddd',direccion:'Plaza Nueva 3',estado:'Solicitada'}
];

test.describe('Fénix PRE-PROD · contrato visual Tasaciones',()=>{
 test('usa fuente canónica y no inventa valores ausentes',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await page.setViewportSize({width:1600,height:900});
  await page.addInitScript(session=>{window.localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));window.localStorage.setItem('fenix-remember-device','true');},fakeSession);
  await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'DIR-TEST',role:'Direccion'})});if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{label:'Inicio',route:'/inicio'},{label:'Tasaciones',route:'/tasaciones'}]})});return r.fulfill({status:404,body:'{}'});});
  await page.route('**/functions/v1/fenix-notion-runtime-test/tasaciones',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({source:'notion_canonical',items})}));
  await page.goto('/tasaciones');
  const root=page.locator('.tas-root');
  await expect(root).toBeVisible();
  await expect(root.getByRole('heading',{name:'Tasaciones',exact:true})).toBeVisible();
  await expect(root.getByText('ANA · EN ESTA PANTALLA')).toBeVisible();
  await expect(root.getByText('Datos vivos')).toBeVisible();
  await expect(root.getByText('EN FUENTE',{exact:true})).toBeVisible();
  await expect(root.getByText('CON INFORME',{exact:true})).toBeVisible();
  await expect(root.getByText('PENDIENTES',{exact:true})).toBeVisible();
  await expect(root.getByText('CONTROL DOCUMENTAL',{exact:true})).toBeVisible();
  await expect(root.getByText('Av. de la Libertad 12',{exact:true})).toBeVisible();
  await expect(root.getByText('210.000 €',{exact:true})).toBeVisible();
  await expect(root.getByText('No disponible',{exact:true}).first()).toBeVisible();
  await expect(root.getByText('Fuente canónica Notion',{exact:true})).toBeVisible();
  await expect(root.getByText(/\bPRO\b/)).toHaveCount(0);
  const shot=await root.screenshot();
  await testInfo.attach('tasaciones-master-1600',{body:shot,contentType:'image/png'});
 });
});
