import {test,expect} from '@playwright/test';

const fakeSession={
  access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJlbWFpbCI6ImRpcmVjY2lvbkBmZW5peC50ZXN0IiwiZXhwIjoxOTk5OTk5OTk5fQ.',
  token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-direction-not-real',
  user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'direccion@fenix.test',app_metadata:{},user_metadata:{full_name:'Belén Muñoz'},created_at:'2026-08-19T00:00:00.000Z'}
};

const navigation={items:[
  {label:'Inicio',route:'/inicio'},{label:'Expedientes',route:'/expedientes'},{label:'Bancos',route:'/bancos'},
  {label:'Contactos',route:'/contactos'},{label:'Inmobiliarias',route:'/inmobiliarias'},{label:'Tasaciones',route:'/tasaciones'},
  {label:'Firmas',route:'/firmas'},{label:'Documentación',route:'/documentacion'},{label:'Financieros',route:'/financieros'},
  {label:'Visitadores',route:'/visitadores'},{label:'Economía',route:'/economia'},{label:'Agenda',route:'/agenda'},{label:'Informes',route:'/informes'},
  {label:'Notarías',route:'/notarias'},{label:'Avisos',route:'/notificaciones'},{label:'Comunicaciones',route:'/comunicaciones'},
  {label:'Buscar',route:'/buscar'}
]};

test.describe('Fénix PRE-PROD · contrato visual Inicio Dirección',()=>{
  test('Inicio conserva patrón maestro, usa datos canónicos y genera evidencia visual',async({page},testInfo)=>{
    if(!testInfo.project.name.includes('desktop'))test.skip();
    await page.addInitScript(session=>{window.localStorage.setItem('fenix-preprod-auth',JSON.stringify(session));window.localStorage.setItem('fenix-remember-device','true');},fakeSession);
    await page.route('**/functions/v1/fenix-app-gateway-test/**',async route=>{
      const u=route.request().url();
      if(u.endsWith('/session/context'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'DIR-TEST',role:'Direccion'})});
      if(u.endsWith('/navigation'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(navigation)});
      if(u.endsWith('/personal'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[],pending_profiles:5})});
      return route.fulfill({status:404,contentType:'application/json',body:'{}'});
    });
    await page.route('**/functions/v1/fenix-notion-runtime-test/expedientes',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({source:'notion_canonical',items:[{id:'e1',estado:'En curso',riesgo:'Alto'},{id:'e2',fase:'Tasación',riesgo:'Bajo'},{id:'e3',estado:'Firmado'}]})}));
    await page.route('**/functions/v1/fenix-notion-runtime-test/firmas',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({source:'notion_canonical',items:[{id:'f1',estado:'Programada',fecha_hora_firma:'2026-08-25T10:00:00'},{id:'f2',estado:'Firmada',fecha_hora_firma:'2026-08-20T12:00:00'}]})}));
    await page.route('**/functions/v1/fenix-notion-runtime-test/tareas',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({source:'notion_canonical',items:[{id:'t1',tarea:'Revisar expediente prioritario',estado:'Pendiente',fecha_limite:'2026-08-22',completada:false},{id:'t2',tarea:'Tarea ya cerrada',estado:'Completada',fecha_limite:'2026-08-21',completada:true}]})}));
    await page.goto('/inicio');
    await expect(page.locator('.dir-shell')).toBeVisible();
    await expect(page.getByRole('button',{name:'Inicio Fénix Capital'})).toBeVisible();
    await expect(page.getByText('Hola Belén, buenos días')).toBeVisible();
    await expect(page.getByRole('button',{name:/Abrir chat con Ana/})).toBeVisible();
    await expect(page.locator('.dir-person-photo')).toBeVisible();
    await expect(page.locator('.dir-help-avatar')).toBeVisible();
    await expect(page.getByText('Revisar expediente prioritario',{exact:true})).toBeVisible();
    const kpis=page.locator('.dir-kpis');
    await expect(kpis.getByText('2',{exact:true}).first()).toBeVisible();
    await expect(kpis.getByText('1',{exact:true})).toHaveCount(2);
    await expect(page.getByText('ACCESOS RÁPIDOS')).toBeVisible();
    await expect(page.getByRole('button',{name:'Inmobiliarias',exact:true}).last()).toBeVisible();
    await expect(page.getByRole('region',{name:'Calculadora Hipotecaria'})).toBeVisible();
    await expect(page.getByText(/\bPRO\b/)).toHaveCount(0);
    const sidebar=page.locator('.dir-sidebar');
    await expect(sidebar).toBeVisible();
    for(const label of ['Inmobiliarias','Notarías','Avisos','Comunicaciones','Buscar'])await expect(sidebar.getByRole('button',{name:label,exact:true})).toBeVisible();
    await expect(page.getByRole('button',{name:'Buscador avanzado',exact:true})).toBeVisible();
    await expect(page.locator('.dir-topbar')).toBeVisible();
    const priorityBox=await page.locator('.dir-priority-card').boundingBox();
    const kpiBox=await page.locator('.dir-kpi').first().boundingBox();
    expect(priorityBox?.height||0).toBeGreaterThanOrEqual(380);
    expect(kpiBox?.height||0).toBeGreaterThanOrEqual(125);
    const shot=await page.screenshot({fullPage:true});
    await testInfo.attach('inicio-direccion-qa',{body:shot,contentType:'image/png'});
  });
});