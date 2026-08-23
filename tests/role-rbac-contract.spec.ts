import {test,expect} from '@playwright/test';

const fakeSession={
  access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJlbWFpbCI6InFhYUBmZW5peC50ZXN0IiwiZXhwIjoxOTk5OTk5OTk5fQ.',
  token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-rbac-not-real',
  user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'qa-rbac@fenix.test',app_metadata:{},user_metadata:{},created_at:'2026-08-19T00:00:00.000Z'}
};

type RoleCase={actor:string;role:string;allowedRoute:string;allowedEndpoint:string;allowedPayload:unknown;deniedRoute:string;deniedEndpoint:string};

const cases:RoleCase[]=[
  {actor:'DIR-TEST',role:'Direccion',allowedRoute:'/expedientes',allowedEndpoint:'expedientes',allowedPayload:{items:[{id:'11111111-1111-4111-8111-111111111111',expediente:'QA DIR EXP',fase:'Estudio'}]},deniedRoute:'',deniedEndpoint:''},
  {actor:'FIN-A',role:'Financiero',allowedRoute:'/expedientes',allowedEndpoint:'expedientes',allowedPayload:{items:[{id:'22222222-2222-4222-8222-222222222222',expediente:'QA FIN-A EXP',fase:'Estudio'}]},deniedRoute:'',deniedEndpoint:''},
  {actor:'FIN-B',role:'Financiero',allowedRoute:'/expedientes',allowedEndpoint:'expedientes',allowedPayload:{items:[{id:'33333333-3333-4333-8333-333333333333',expediente:'QA FIN-B EXP',fase:'Estudio'}]},deniedRoute:'',deniedEndpoint:''},
  {actor:'VIS-A',role:'Visitador',allowedRoute:'/inmobiliarias',allowedEndpoint:'inmobiliarias',allowedPayload:{items:[{id:'44444444-4444-4444-8444-444444444444',inmobiliaria:'QA VIS-A INMO',estado:'Activa'}]},deniedRoute:'/expedientes',deniedEndpoint:'expedientes'},
  {actor:'VIS-B',role:'Visitador',allowedRoute:'/inmobiliarias',allowedEndpoint:'inmobiliarias',allowedPayload:{items:[{id:'55555555-5555-4555-8555-555555555555',inmobiliaria:'QA VIS-B INMO',estado:'Activa'}]},deniedRoute:'/expedientes',deniedEndpoint:'expedientes'}
];

function navigationFor(role:string){
  if(role==='Visitador')return[{label:'Inicio',route:'/inicio'},{label:'Inmobiliarias',route:'/inmobiliarias'},{label:'Contactos',route:'/contactos'},{label:'Visitas',route:'/visitas'},{label:'Agenda',route:'/agenda'},{label:'Documentación',route:'/documentacion'},{label:'Informes',route:'/informes'},{label:'Notificaciones',route:'/notificaciones'},{label:'Buscar',route:'/buscar'}];
  if(role==='Financiero')return[{label:'Inicio',route:'/inicio'},{label:'Expedientes',route:'/expedientes'},{label:'Bancos',route:'/bancos'},{label:'Contactos',route:'/contactos'},{label:'Inmobiliarias',route:'/inmobiliarias'},{label:'Documentación',route:'/documentacion'},{label:'Firmas',route:'/firmas'},{label:'Tasaciones',route:'/tasaciones'},{label:'Agenda',route:'/agenda'},{label:'Informes',route:'/informes'},{label:'Notarías',route:'/notarias'},{label:'Notificaciones',route:'/notificaciones'},{label:'Buscar',route:'/buscar'}];
  return[{label:'Inicio',route:'/inicio'},{label:'Expedientes',route:'/expedientes'},{label:'Bancos',route:'/bancos'},{label:'Contactos',route:'/contactos'},{label:'Inmobiliarias',route:'/inmobiliarias'},{label:'Tasaciones',route:'/tasaciones'},{label:'Firmas',route:'/firmas'},{label:'Documentación',route:'/documentacion'},{label:'Financieros',route:'/financieros'},{label:'Visitadores',route:'/visitadores'},{label:'Agenda',route:'/agenda'},{label:'Economía',route:'/economia'},{label:'Informes',route:'/informes'},{label:'Notarías',route:'/notarias'},{label:'Notificaciones',route:'/notificaciones'},{label:'Comunicaciones',route:'/comunicaciones'},{label:'Buscar',route:'/buscar'}];
}

async function boot(page:any,c:RoleCase){
  await page.addInitScript(session=>{window.localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));window.localStorage.setItem('fenix-remember-device','true');},fakeSession);
  const navItems=navigationFor(c.role);
  await page.route('**/functions/v1/fenix-app-gateway-test/**',async route=>{
    const u=route.request().url();
    if(u.endsWith('/session/context'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:c.actor,role:c.role})});
    if(u.endsWith('/navigation'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:navItems})});
    return route.fulfill({status:404,contentType:'application/json',body:'{}'});
  });
}

test.describe('Fénix PRE-PROD · contrato RBAC por rol',()=>{
  for(const c of cases){
    test(`${c.actor} recibe solo el ámbito operativo permitido`,async({page},testInfo)=>{
      if(!testInfo.project.name.includes('desktop'))test.skip();
      await boot(page,c);
      await page.route(`**/functions/v1/fenix-notion-runtime-test/${c.allowedEndpoint}`,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(c.allowedPayload)}));
      await page.goto(c.allowedRoute);
      await expect(page.getByText('Datos vivos')).toBeVisible();
      await expect(page.getByText('Fuente canónica Notion')).toBeVisible();
      await expect(page.locator('.ops-profile')).toContainText(c.role);
      if(c.actor==='FIN-A')await expect(page.getByText('QA FIN-A EXP')).toBeVisible();
      if(c.actor==='FIN-B')await expect(page.getByText('QA FIN-B EXP')).toBeVisible();
      if(c.actor==='VIS-A')await expect(page.getByText('QA VIS-A INMO')).toBeVisible();
      if(c.actor==='VIS-B')await expect(page.getByText('QA VIS-B INMO')).toBeVisible();
      if(c.actor==='DIR-TEST')await expect(page.getByText('QA DIR EXP')).toBeVisible();
      const nav=page.locator('.ops-side nav');
      await expect(nav.getByRole('button',{name:'Notificaciones',exact:true})).toBeVisible();
      await expect(nav.getByRole('button',{name:'Mi perfil',exact:true})).toHaveCount(0);
      if(c.role==='Direccion'){
        await expect(nav.getByRole('button',{name:'Economía',exact:true})).toBeVisible();
        await expect(nav.getByRole('button',{name:'Financieros',exact:true})).toBeVisible();
        await expect(nav.getByRole('button',{name:'Visitadores',exact:true})).toBeVisible();
        await expect(nav.getByRole('button',{name:'Comunicaciones',exact:true})).toBeVisible();
        await expect(nav.getByRole('button',{name:'Notarías',exact:true})).toBeVisible();
      }else{
        await expect(nav.getByRole('button',{name:'Economía',exact:true})).toHaveCount(0);
        await expect(nav.getByRole('button',{name:'Financieros',exact:true})).toHaveCount(0);
        await expect(nav.getByRole('button',{name:'Visitadores',exact:true})).toHaveCount(0);
        await expect(nav.getByRole('button',{name:'Comunicaciones',exact:true})).toHaveCount(0);
      }
      if(c.role==='Financiero'){
        await expect(nav.getByRole('button',{name:'Inmobiliarias',exact:true})).toBeVisible();
        await expect(nav.getByRole('button',{name:'Notarías',exact:true})).toBeVisible();
      }
      if(c.role==='Visitador'){
        await expect(nav.getByRole('button',{name:'Bancos',exact:true})).toHaveCount(0);
        await expect(nav.getByRole('button',{name:'Notarías',exact:true})).toHaveCount(0);
      }
    });

    if(c.deniedRoute){
      test(`${c.actor} muestra 403 como aislamiento y no como error de datos`,async({page},testInfo)=>{
        if(!testInfo.project.name.includes('desktop'))test.skip();
        await boot(page,c);
        await page.route(`**/functions/v1/fenix-notion-runtime-test/${c.deniedEndpoint}`,r=>r.fulfill({status:403,contentType:'application/json',body:JSON.stringify({ok:false,error:'forbidden'})}));
        await page.goto(c.deniedRoute);
        await expect(page.getByText('Tu perfil no tiene acceso a este módulo o registro.')).toBeVisible();
        await expect(page.locator('tbody tr')).toHaveCount(0);
      });
    }
  }
});
