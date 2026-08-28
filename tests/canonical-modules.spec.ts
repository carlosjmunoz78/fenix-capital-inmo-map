import { test, expect } from '@playwright/test';

const fakeSession={
  access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJlbWFpbCI6InFhYUBmZW5peC50ZXN0IiwiZXhwIjoxOTk5OTk5OTk5fQ.',
  token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-not-real',
  user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'qa@fenix.test',app_metadata:{},user_metadata:{},created_at:'2026-08-19T00:00:00.000Z'}
};

const nav={items:[
  {label:'Inicio',route:'/inicio'},{label:'Expedientes',route:'/expedientes'},{label:'Contactos',route:'/contactos'},
  {label:'Inmobiliarias',route:'/inmobiliarias'},{label:'Tasaciones',route:'/tasaciones'},{label:'Firmas',route:'/firmas'},
  {label:'Documentación',route:'/documentacion'},{label:'Agenda',route:'/agenda'}
]};

async function boot(page:any,role='Direccion'){
  await page.addInitScript(session=>{window.localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));window.localStorage.setItem('fenix-remember-device','true');},fakeSession);
  await page.route('**/functions/v1/fenix-app-gateway-test/**',async route=>{
    const u=route.request().url();
    if(u.endsWith('/session/context'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:role==='Direccion'?'DIR-TEST':'FIN-A',role})});
    if(u.endsWith('/navigation'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(nav)});
    return route.fulfill({status:404,contentType:'application/json',body:'{}'});
  });
}

test.describe('Fénix PRE-PROD · módulos canónicos',()=>{
  const cases=[
    ['/expedientes','expedientes',{items:[{id:'11111111-1111-4111-8111-111111111111',expediente:'QA EXP',fase:'Estudio'}]}],
    ['/contactos','clientes',{items:[{id:'22222222-2222-4222-8222-222222222222',cliente:'QA CLIENTE',estado:'Nuevo'}]}],
    ['/inmobiliarias','inmobiliarias',{items:[{id:'33333333-3333-4333-8333-333333333333',inmobiliaria:'QA INMO',estado:'Activa'}]}],
    ['/tasaciones','tasaciones',{items:[{id:'44444444-4444-4444-8444-444444444444',appraisal_code:'TAS-QA',estado:'Pendiente'}]}],
    ['/firmas','firmas',{items:[{id:'55555555-5555-4555-8555-555555555555',firma_code:'FIR-QA',estado:'Programada'}]}],
    ['/documentacion','documentos',{items:[{id:'66666666-6666-4666-8666-666666666666',document_code:'DOC-QA',title:'Documento QA'}]}],
    ['/agenda','tareas',{items:[{id:'77777777-7777-4777-8777-777777777777',tarea_code:'TAR-QA',estado:'Pendiente'}]}]
  ] as const;

  for(const [route,endpoint,payload] of cases){
    test(`${route} usa runtime canónico y muestra datos vivos`,async({page},testInfo)=>{
      if(!testInfo.project.name.includes('desktop'))test.skip();
      await boot(page);
      let hits=0;
      await page.route(`**/functions/v1/fenix-notion-runtime-test/${endpoint}`,r=>{hits++;return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(payload)});});
      await page.goto(route);
      const modernStatus=route==='/expedientes'||route==='/contactos'||route==='/inmobiliarias';
      await expect(page.getByText(modernStatus?'Datos actualizados':'Datos vivos')).toBeVisible();
      if(route!=='/inmobiliarias'&&route!=='/contactos')await expect(page.getByText('Fuente canónica Notion')).toBeVisible();
      if(route==='/contactos')await expect(page.getByText('QA CLIENTE')).toBeVisible();
      if(route==='/inmobiliarias')await expect(page.getByText('QA INMO')).toBeVisible();
      expect(hits).toBe(1);
    });
  }

  test('403 canónico se presenta como aislamiento correcto y sin filas',async({page},testInfo)=>{
    if(!testInfo.project.name.includes('desktop'))test.skip();
    await boot(page,'Financiero');
    await page.route('**/functions/v1/fenix-notion-runtime-test/inmobiliarias',r=>r.fulfill({status:403,contentType:'application/json',body:JSON.stringify({ok:false,error:'forbidden'})}));
    await page.goto('/inmobiliarias');
    await expect(page.getByText('Tu perfil no tiene acceso a este módulo o registro.')).toBeVisible();
    await expect(page.locator('tbody tr')).toHaveCount(0);
  });

  test('contactos bancarios se leen desde fuente canónica propia',async({page},testInfo)=>{
    if(!testInfo.project.name.includes('desktop'))test.skip();
    await boot(page);
    await page.route('**/functions/v1/fenix-notion-runtime-test/contactos-bancarios',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{id:'88888888-8888-4888-8888-888888888888',nombre:'QA BANCO',cargo:'Director'}]})}));
    await page.goto('/bancos/contactos');
    await expect(page.getByRole('heading',{name:'Contactos bancarios'})).toBeVisible();
    await expect(page.getByText('QA BANCO')).toBeVisible();
    await expect(page.getByText('Fuente canónica Notion')).toBeVisible();
  });
});