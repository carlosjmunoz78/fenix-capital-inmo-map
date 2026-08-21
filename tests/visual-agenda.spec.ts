import {test,expect} from '@playwright/test';

const fakeSession={
 access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJlbWFpbCI6ImRpcmVjY2lvbkBmZW5peC50ZXN0IiwiZXhwIjoxOTk5OTk5OTk5fQ.',
 token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-agenda-not-real',
 user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'direccion@fenix.test',app_metadata:{},user_metadata:{},created_at:'2026-08-19T00:00:00.000Z'}
};
const items=[
 {id:'aaaaaaaa-1111-4111-8111-bbbbbbbbbbbb',tarea:'Llamar a cliente',estado:'Pendiente',fecha_limite:'2026-08-24',prioridad:'Alta',responsable:'FIN-A',completada:false},
 {id:'bbbbbbbb-1111-4111-8111-cccccccccccc',tarea:'Revisar documentación',estado:'Completada',fecha_limite:'2026-08-20',prioridad:'Media',responsable:'FIN-A',completada:true},
 {id:'cccccccc-1111-4111-8111-dddddddddddd',tarea:'Seguimiento inmobiliaria',estado:'Pendiente',fecha_limite:'2026-08-23',prioridad:'Alta',responsable:'VIS-A',completada:false}
];

test.describe('Fénix PRE-PROD · contrato visual Agenda',()=>{
 test('muestra tareas canónicas y selección sin escribir datos',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await page.setViewportSize({width:1600,height:900});
  await page.addInitScript(session=>{window.localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));window.localStorage.setItem('fenix-remember-device','true');},fakeSession);
  await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'DIR-TEST',role:'Direccion'})});if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{label:'Inicio',route:'/inicio'},{label:'Agenda',route:'/agenda'}]})});return r.fulfill({status:404,body:'{}'});});
  await page.route('**/functions/v1/fenix-notion-runtime-test/tareas',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({source:'notion_canonical',items})}));
  await page.goto('/agenda');
  const root=page.locator('.agenda-root');
  await expect(root).toBeVisible();
  await expect(root.getByRole('heading',{name:'Agenda',exact:true})).toBeVisible();
  await expect(root.getByText('ANA · EN ESTA PANTALLA')).toBeVisible();
  await expect(root.getByText('Datos vivos')).toBeVisible();
  await expect(root.getByText('EN FUENTE',{exact:true})).toBeVisible();
  await expect(root.getByText('PENDIENTES',{exact:true})).toBeVisible();
  await expect(root.getByText('COMPLETADAS',{exact:true})).toBeVisible();
  await expect(root.getByText('VENCIDAS',{exact:true})).toBeVisible();
  await expect(root.getByText('Llamar a cliente',{exact:true})).toBeVisible();
  await root.getByLabel('Seleccionar Llamar a cliente').check();
  await expect(root.getByText('1 tareas seleccionadas',{exact:true})).toBeVisible();
  await expect(root.getByText('La selección no modifica datos.',{exact:true})).toBeVisible();
  await expect(root.getByText('Fuente canónica Notion',{exact:true})).toBeVisible();
  await expect(root.getByText(/\bPRO\b/)).toHaveCount(0);
  const shot=await root.screenshot();
  await testInfo.attach('agenda-master-1600',{body:shot,contentType:'image/png'});
 });
});
