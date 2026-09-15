import {test,expect} from '@playwright/test';

const fakeSession={
  access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJlbWFpbCI6ImRpcmVjY2lvbkBmZW5peC50ZXN0IiwiZXhwIjoxOTk5OTk5OTk5fQ.c2ln',
  token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-direction-not-real',
  user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'direccion@fenix.test',app_metadata:{},user_metadata:{full_name:'Belén Muñoz',actor_code:'DIR-TEST',role:'Direccion'},created_at:'2026-08-19T00:00:00.000Z'}
};

const navigation={items:[
  {label:'Inicio',route:'/inicio'},{label:'Expedientes',route:'/expedientes'},{label:'Bancos',route:'/bancos'},
  {label:'Contactos',route:'/contactos'},{label:'Inmobiliarias',route:'/inmobiliarias'},{label:'Tasaciones',route:'/tasaciones'},
  {label:'Firmas',route:'/firmas'},{label:'Documentación',route:'/documentacion'},{label:'Financieros',route:'/financieros'},
  {label:'Visitadores',route:'/visitadores'},{label:'Obras Nuevas',route:'/obras-nuevas'},{label:'Herencias',route:'/herencias'},
  {label:'Agenda',route:'/agenda'},{label:'Economía',route:'/economia'},{label:'Informes',route:'/informes'},
  {label:'Notarías',route:'/notarias'},{label:'Registros de la Propiedad',route:'/registros-propiedad'},
  {label:'Comunicaciones',route:'/comunicaciones'},{label:'Notificaciones',route:'/notificaciones'}
]};

function currentMonthIso(day:number,hour=10){
 const now=new Date();
 const yyyy=now.getFullYear();
 const mm=String(now.getMonth()+1).padStart(2,'0');
 return `${yyyy}-${mm}-${String(day).padStart(2,'0')}T${String(hour).padStart(2,'0')}:00:00`;
}

test.describe('Fénix PRE-PROD · contrato visual Inicio Dirección',()=>{
 test('Inicio conserva patrón maestro, identidad real, KPIs canónicos y tema persistente',async({page},testInfo)=>{
  if(!testInfo.project.name.includes('desktop'))test.skip();
  test.setTimeout(20_000);
  const pageErrors:string[]=[];
  const failedRequests:string[]=[];
  const apiRequests:string[]=[];
  page.on('pageerror',e=>pageErrors.push(String(e?.message||e)));
  page.on('requestfailed',r=>failedRequests.push(`${r.method()} ${r.url()} :: ${r.failure()?.errorText||'failed'}`));
  page.on('request',r=>{if(r.url().includes('/functions/v1/')||r.url().includes('/auth/v1/'))apiRequests.push(`${r.method()} ${r.url()}`)});

  await page.addInitScript(session=>{
   const raw=JSON.stringify(session);
   localStorage.setItem('fenix-preprod-auth-v2',raw);
   localStorage.setItem('fenix-preprod-auth',raw);
   localStorage.setItem('fenix-remember-device','true');
   sessionStorage.setItem('fenix-session-active','1');
  },fakeSession);

  await page.route('http://127.0.0.1:54321/auth/v1/**',async route=>{
   const u=route.request().url();
   if(u.includes('/user'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fakeSession.user)});
   if(u.includes('/token'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fakeSession)});
   return route.fulfill({status:200,contentType:'application/json',body:'{}'});
  });
  await page.route('**/functions/v1/fenix-app-gateway-test/**',async route=>{
   const u=route.request().url();
   if(u.endsWith('/session/context'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'DIR-TEST',role:'Direccion'})});
   if(u.endsWith('/navigation'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(navigation)});
   if(u.endsWith('/personal'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[],pending_profiles:5})});
   if(u.endsWith('/expedientes'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,status:200,items:[{expediente_code:'e1',stage:'En curso',riesgo:'Alto',is_active:true},{expediente_code:'e2',stage:'Tasación',riesgo:'Bajo',is_active:true},{expediente_code:'e3',stage:'Firmado',is_active:false}]})});
   if(u.endsWith('/firmas'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,status:200,items:[{id:'f1',estado:'Programada',fecha_hora_firma:currentMonthIso(25,10)},{id:'f2',estado:'Firmada',fecha_hora_firma:currentMonthIso(20,12)}]})});
   if(u.endsWith('/tareas'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,status:200,items:[{id:'t1',tarea:'Revisar expediente prioritario',estado:'Pendiente',fecha_limite:currentMonthIso(22).slice(0,10),completada:false},{id:'t2',tarea:'Tarea ya cerrada',estado:'Completada',fecha_limite:currentMonthIso(21).slice(0,10),completada:true},{id:'t3',tarea:'Tarea cancelada',estado:'Cancelada',fecha_limite:currentMonthIso(21).slice(0,10),completada:false}]})});
   if(u.endsWith('/bancos'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,status:200,items:[]})});
   return route.fulfill({status:404,contentType:'application/json',body:'{}'});
  });
  await page.route('**/functions/v1/fenix-notion-runtime-test/**',async route=>{
   const u=route.request().url();
   if(u.endsWith('/tareas'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[]})});
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[]})});
  });
  await page.route('**/functions/v1/fenix-ana-api-test/**',async route=>{
   const u=route.request().url();
   if(u.endsWith('/capabilities'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,items:[],capabilities:[]})});
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true})});
  });

  await page.goto('/inicio',{waitUntil:'domcontentloaded',timeout:5000});
  try{
   await page.waitForSelector('.dir-shell',{state:'visible',timeout:7000});
  }catch(error){
   throw new Error(`Direction did not mount; url=${page.url()} requests=${JSON.stringify(apiRequests)} pageErrors=${JSON.stringify(pageErrors)} failed=${JSON.stringify(failedRequests)} cause=${String(error)}`);
  }

  expect(pageErrors,`browser errors: ${pageErrors.join(' | ')}`).toEqual([]);
  await expect(page.getByRole('button',{name:'Inicio Fénix Capital'})).toBeVisible();
  await expect(page.locator('.dir-priority-copy h1')).toContainText('Belén');
  await expect(page.locator('.dir-user-copy strong')).toHaveText('Belén Muñoz');
  const attention=page.getByTestId('direction-attention-today');
  await expect(attention).toBeVisible();
  await expect(attention.getByText('Revisar expediente prioritario',{exact:true})).toBeVisible();
  await expect(attention.getByText('Tarea cancelada',{exact:true})).toHaveCount(0);
  const kpis=page.locator('.dir-kpis');
  await expect(kpis.getByRole('button',{name:/EXPEDIENTES\s+EN CURSO/i}).locator('strong')).toHaveText('2');
  await expect(kpis.getByRole('button',{name:/FIRMAS\s+ESTE MES/i}).locator('strong')).toHaveText('1');
  await expect(kpis.getByRole('button',{name:/FIRMADOS\s+ESTE MES/i}).locator('strong')).toHaveText('1');
  await expect(kpis.getByRole('button',{name:/EN RIESGO/i}).locator('strong')).toHaveText('1');
  const sidebar=page.locator('.dir-sidebar');
  await expect(sidebar).toBeVisible();
  for(const label of ['Inmobiliarias','Obras Nuevas','Herencias','Notarías','Registros de la Propiedad','Comunicaciones','Notificaciones'])await expect(sidebar.getByRole('button',{name:label,exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Buscador avanzado',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Calculadora'})).toBeVisible();
  const brand=page.locator('.dir-brand strong');
  expect(await brand.evaluate(el=>getComputedStyle(el).color)).toBe('rgb(17, 17, 17)');
  await page.getByRole('button',{name:'Cambiar tema'}).click();
  expect(await brand.evaluate(el=>getComputedStyle(el).color)).toBe('rgb(255, 255, 255)');
  expect(await page.evaluate(()=>sessionStorage.getItem('fenix-theme'))).toBe('dark');
  expect(await page.evaluate(()=>localStorage.getItem('fenix-theme'))).toBe('dark');
  const shot=await page.screenshot({fullPage:true});
  await testInfo.attach('inicio-direccion-premium-qa',{body:shot,contentType:'image/png'});
 });
});
