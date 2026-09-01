import {test,expect} from '@playwright/test';

const fakeSession={access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJleHAiOjE5OTk5OTk5OTl9.',token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-create-route-nav-not-real',user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'qa@fenix.test',app_metadata:{},user_metadata:{actor_code:'DIR-TEST'},created_at:'2026-08-23T00:00:00.000Z'}};
const inmoId='aaaaaaaa-1111-4111-8111-bbbbbbbbbbbb';
const directionNav=[{label:'Inicio',route:'/inicio'},{label:'Expedientes',route:'/expedientes'},{label:'Bancos',route:'/bancos'},{label:'Contactos',route:'/contactos'},{label:'Inmobiliarias',route:'/inmobiliarias'},{label:'Tasaciones',route:'/tasaciones'},{label:'Firmas',route:'/firmas'},{label:'Documentación',route:'/documentacion'},{label:'Financieros',route:'/financieros'},{label:'Visitadores',route:'/visitadores'},{label:'Obras Nuevas',route:'/obras-nuevas'},{label:'Herencias',route:'/herencias'},{label:'Agenda',route:'/agenda'},{label:'Economía',route:'/economia'},{label:'Informes',route:'/informes'},{label:'Notarías',route:'/notarias'},{label:'Registros de la Propiedad',route:'/registros-propiedad'},{label:'Comunicaciones',route:'/comunicaciones'},{label:'Notificaciones',route:'/notificaciones'},{label:'Visitas',route:'/visitas'}];
const visitadorNav=[{label:'Inicio',route:'/inicio'},{label:'Inmobiliarias',route:'/inmobiliarias'},{label:'Contactos',route:'/contactos'},{label:'Visitas',route:'/visitas'},{label:'Agenda',route:'/agenda'},{label:'Documentación',route:'/documentacion'}];

async function boot(page:any,role:'Direccion'|'Visitador',items:any[],navigationStatus=200){
 await page.addInitScript(session=>{localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));localStorage.setItem('fenix-remember-device','true');},fakeSession);
 await page.route('**/functions/v1/fenix-app-gateway-test/**',async r=>{const u=r.request().url();if(u.endsWith('/session/context'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:role==='Direccion'?'DIR-TEST':'VIS-A',role})});if(u.endsWith('/navigation'))return r.fulfill({status:navigationStatus,contentType:'application/json',body:navigationStatus===200?JSON.stringify({items}):JSON.stringify({error:'navigation_unavailable'})});if(u.endsWith('/personal'))return r.fulfill({status:200,contentType:'application/json',body:'{"items":[]}'});if(u.endsWith('/visitadores'))return r.fulfill({status:200,contentType:'application/json',body:'{"items":[]}'});return r.fulfill({status:404,body:'{}'});});
}

test.describe('Fénix PRE-PROD · navegación global en altas',()=>{
 test('Nuevo expediente conserva el menú global de Dirección',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await boot(page,'Direccion',directionNav);
  await page.goto('/expedientes/nuevo');
  const menu=page.locator('aside.create-auth-nav nav');
  await expect(menu.getByRole('button',{name:'Expedientes',exact:true})).toBeVisible();
  await expect(menu.getByRole('button',{name:'Bancos',exact:true})).toBeVisible();
  await expect(menu.getByRole('button',{name:'Inmobiliarias',exact:true})).toBeVisible();
  await expect(menu.getByRole('button',{name:'Comunicaciones',exact:true})).toBeVisible();
  await expect(menu.getByRole('button',{name:'Expedientes',exact:true})).toHaveClass(/active/);
  await expect(page.getByRole('heading',{name:'Nuevo expediente',exact:true})).toBeVisible();
 });

 test('todas las altas conocidas usan el mismo menú autorizado y activan su módulo padre',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await boot(page,'Direccion',directionNav);
  const routes:Array<[string,string]>=[
   ['/expedientes/nuevo','Expedientes'],
   ['/contactos/nuevo','Contactos'],
   ['/inmobiliarias/nueva','Inmobiliarias'],
   ['/bancos/nuevo','Bancos'],
   ['/tareas/nueva','Agenda'],
   ['/documentacion/nuevo','Documentación'],
   ['/firmas/nuevo','Firmas'],
   ['/notarias/nueva','Notarías'],
   ['/registros-propiedad/nuevo','Registros de la Propiedad'],
   ['/herencias/nuevo','Herencias'],
   ['/obras-nuevas/nuevo','Obras Nuevas'],
   ['/visitas/nueva','Visitas']
  ];
  for(const [route,label] of routes){
   await page.goto(route);
   const menu=page.locator('aside.create-auth-nav nav');
   await expect(menu.getByRole('button',{name:'Inicio',exact:true}),route).toBeVisible();
   await expect(menu.getByRole('button',{name:label,exact:true}),route).toBeVisible();
   await expect(menu.getByRole('button',{name:label,exact:true}),route).toHaveClass(/active/);
   await expect(menu.getByRole('button',{name:'Comunicaciones',exact:true}),route).toBeVisible();
  }
 });

 test('todas las altas conservan el menú oscuro cuando la app está en oscuro',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await page.addInitScript(()=>{sessionStorage.setItem('fenix-theme','dark');localStorage.setItem('fenix-theme','dark');});
  await boot(page,'Direccion',directionNav);
  for(const route of ['/expedientes/nuevo','/bancos/nuevo','/contactos/nuevo','/inmobiliarias/nueva','/documentacion/nuevo','/firmas/nuevo','/tareas/nueva','/notarias/nueva','/registros-propiedad/nuevo','/herencias/nuevo','/obras-nuevas/nuevo','/visitas/nueva']){
   await page.goto(route);
   await expect(page.locator('html'),route).toHaveAttribute('data-theme','dark');
   const sidebar=page.locator('aside.create-auth-nav.ops-side');
   await expect(sidebar,route).toBeVisible();
   const appearance=await sidebar.evaluate(el=>({background:getComputedStyle(el).backgroundColor,color:getComputedStyle(el).color}));
   expect(appearance.background,route).toBe('rgb(32, 32, 35)');
   expect(appearance.color,route).toBe('rgb(242, 242, 244)');
  }
 });

 test('las altas muestran una sola cabecera compartida igual que Inicio',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await boot(page,'Direccion',directionNav);
  for(const route of ['/tareas/nueva','/expedientes/nuevo','/contactos/nuevo','/documentacion/nuevo','/firmas/nuevo','/bancos/nuevo','/herencias/nuevo','/obras-nuevas/nuevo']){
   await page.goto(route);
   const headers=page.locator('.ops-root > .ops-main > .ops-top');
   await expect(headers,route).toHaveCount(1);
   await expect(headers,route).toBeVisible();
   await expect(headers.getByPlaceholder('Buscar expediente, cliente, banco, inmobiliaria...'),route).toBeVisible();
  }
 });

 test('Nueva firma usa el bloque superior canónico de Ana y no la carcasa genérica',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await boot(page,'Direccion',directionNav);
  await page.goto('/firmas/nuevo');
  await expect(page.getByRole('heading',{name:'Nueva firma',exact:true})).toBeVisible();
  const ana=page.getByTestId('firma-create-ana-canonical');
  await expect(ana).toBeVisible();
  await expect(ana.getByText('ANA · NUEVA FIRMA',{exact:true})).toBeVisible();
  await expect(ana.locator('.inmo-next > button')).toHaveCount(3);
  await expect(page.locator('.app-shell')).toBeHidden();
 });

 test('Alta de contacto B2B conserva solo menú autorizado de Visitador',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await boot(page,'Visitador',visitadorNav);
  await page.goto(`/inmobiliarias/${inmoId}/contactos/nuevo`);
  const menu=page.locator('aside.create-auth-nav nav');
  await expect(menu.getByRole('button',{name:'Inmobiliarias',exact:true})).toBeVisible();
  await expect(menu.getByRole('button',{name:'Visitas',exact:true})).toBeVisible();
  await expect(menu.getByRole('button',{name:'Bancos',exact:true})).toHaveCount(0);
  await expect(menu.getByRole('button',{name:'Financieros',exact:true})).toHaveCount(0);
  await expect(menu.getByRole('button',{name:'Inmobiliarias',exact:true})).toHaveClass(/active/);
 });

 test('si navigation falla en una alta el overlay queda solo con Inicio',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  await boot(page,'Direccion',directionNav,500);
  await page.goto('/contactos/nuevo');
  const menu=page.locator('aside.create-auth-nav nav');
  await expect(menu.getByRole('button',{name:'Inicio',exact:true})).toBeVisible();
  await expect(menu.getByRole('button',{name:'Contactos',exact:true})).toHaveCount(0);
  await expect(menu.getByRole('button',{name:'Comunicaciones',exact:true})).toHaveCount(0);
 });
});
