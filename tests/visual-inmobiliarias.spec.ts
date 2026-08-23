import {test,expect} from '@playwright/test';

const fakeSession={
 access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJlbWFpbCI6ImRpcmVjY2lvbkBmZW5peC50ZXN0IiwiZXhwIjoxOTk5OTk5OTk5fQ.',
 token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-inmo-not-real',
 user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'direccion@fenix.test',app_metadata:{},user_metadata:{},created_at:'2026-08-19T00:00:00.000Z'}
};
const items=[
 {id:'aaaaaaaa111141118111bbbbbbbbbbbb',inmobiliaria:'ADAIX LUCENA',localidad:'Lucena',estado:'Activa',proximo_contacto_b2b:'2026-08-24'},
 {id:'bbbbbbbb111141118111cccccccccccc',inmobiliaria:'PRUEBA INMO',localidad:'Córdoba',estado:'En proceso'},
 {id:'cccccccc111141118111dddddddddddd',inmobiliaria:'PENDIENTE',localidad:'Córdoba',estado:'Sin llamar'}
];

async function mockInmo(page:any){
 await page.addInitScript((session:any)=>{window.localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));window.localStorage.setItem('fenix-remember-device','true');},fakeSession);
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async (r:any)=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'DIR-TEST',role:'Direccion'})});if(u.endsWith('/navigation'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{label:'Inicio',route:'/inicio'},{label:'Inmobiliarias',route:'/inmobiliarias'}]})});if(u.endsWith('/ana/correcciones'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[]})});return r.fulfill({status:404,body:'{}'});});
 await page.route('**/functions/v1/fenix-notion-runtime-test/inmobiliarias',(r:any)=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({source:'notion_canonical',items})}));
}

test.describe('Fénix PRE-PROD · contrato visual Inmobiliarias',()=>{
 test('usa datos canónicos, Ana viva, KPIs y gráficos B2B reales',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await page.setViewportSize({width:1600,height:900});
  await mockInmo(page);
  await page.goto('/inmobiliarias');
  await expect(page.getByRole('heading',{name:'Inmobiliarias',exact:true}).first()).toBeVisible();
  await expect(page.getByText('COLABORACIÓN B2B',{exact:true})).toBeVisible();
  await expect(page.getByText('ANA · LECTURA VIVA DE INMOBILIARIAS',{exact:true})).toBeVisible();
  await expect(page.locator('[data-testid="inmo-ana-live-summary"]')).toContainText('1 inmobiliarias con señal explícita de primer contacto pendiente');
  await expect(page.getByText('Datos vivos',{exact:true})).toBeVisible();
  await expect(page.getByText('EN FUENTE',{exact:true})).toBeVisible();
  await expect(page.getByText('ACTIVAS',{exact:true})).toBeVisible();
  await expect(page.getByText('EN PROCESO',{exact:true})).toBeVisible();
  await expect(page.getByText('SIN LLAMAR',{exact:true})).toBeVisible();
  await expect(page.getByText('RANKING POR LOCALIDAD',{exact:true})).toBeVisible();
  await expect(page.getByText('DISTRIBUCIÓN POR ESTADO',{exact:true})).toBeVisible();
  await expect(page.locator('[data-testid="inmo-locality-chart"] .inmo-bar-row')).toHaveCount(2);
  await expect(page.locator('[data-testid="inmo-state-chart"] .inmo-bar-row')).toHaveCount(3);
  await expect(page.getByText('ADAIX LUCENA',{exact:true})).toBeVisible();
  await expect(page.getByText('Fuente canónica Notion',{exact:true})).toBeVisible();
  await expect(page.getByText(/\bPRO\b/)).toHaveCount(0);
  const correction=page.locator('.inmo-correct');
  const hero=page.locator('.inmo-ana-hero');
  const correctionBox=await correction.boundingBox();
  const anaCopyBox=await page.locator('.inmo-ana-body').boundingBox();
  expect((correctionBox?.y||0)).toBeGreaterThan((anaCopyBox?.y||0)+(anaCopyBox?.height||0)-10);
  const shot=await page.screenshot({fullPage:true});
  await testInfo.attach('inmobiliarias-master-1600',{body:shot,contentType:'image/png'});
 });

 test('traslada a Ana la corrección y el motivo sin perder contexto',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await mockInmo(page);
  await page.goto('/inmobiliarias');
  await page.getByPlaceholder('Qué cambiarías...').fill('No priorizar por antigüedad');
  await page.getByPlaceholder('Motivo de la corrección').fill('Primero debe revisarse la criticidad');
  await page.getByRole('button',{name:'Preparar para revisión'}).click();
  await expect(page).toHaveURL(/\/ana\?/);
  await expect(page.getByText('Contexto: inmobiliaria',{exact:true})).toBeVisible();
  await expect(page.getByLabel('¿Qué sugirió Ana?')).toHaveValue('No priorizar por antigüedad');
  await expect(page.getByLabel('¿Por qué no debe hacerse así?')).toHaveValue('Primero debe revisarse la criticidad');
 });
});
