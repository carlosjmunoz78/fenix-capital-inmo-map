import { test, expect } from '@playwright/test';

const prodSession={
 access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWFhIiwiZW1haWwiOiJkaXJlY3Rpb25AZmVuaXgudGVzdCIsImV4cCI6MTk5OTk5OTk5OX0.c2ln',
 token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-prod-shaped-not-real',
 user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'direction@fenix.test',app_metadata:{},user_metadata:{full_name:'Belén Muñoz'},created_at:'2026-09-15T00:00:00.000Z'}
};

const nav={items:[{label:'Inicio',route:'/inicio'},{label:'Expedientes',route:'/expedientes'},{label:'Agenda',route:'/agenda'},{label:'Documentación',route:'/documentacion'},{label:'Bancos',route:'/bancos'}]};
const expedientes=Array.from({length:6},(_,i)=>({expediente_code:`EXP-${i+1}`,cliente:`Cliente ${i+1}`,stage:'En curso',is_active:true}));
const tareas=Array.from({length:6},(_,i)=>({id:`TASK-${i+1}`,task_code:`TASK-${i+1}`,tarea:`Tarea ${i+1}`,estado:'Pendiente',completada:false}));

async function seed(page:any){
 await page.addInitScript((session:any)=>{
  localStorage.setItem('fenix-prod-auth-v1',JSON.stringify(session));
  localStorage.setItem('fenix-remember-device','true');
  sessionStorage.setItem('fenix-session-active','1');
 },prodSession);
 await page.route('http://127.0.0.1:54321/auth/v1/**',async(route:any)=>{
  const u=route.request().url();
  if(u.includes('/user'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(prodSession.user)});
  if(u.includes('/token'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(prodSession)});
  return route.fulfill({status:200,contentType:'application/json',body:'{}'});
 });
}
async function gateway(page:any){
 await page.route('**/functions/v1/fenix-app-gateway/**',async(route:any)=>{
  const u=route.request().url(),method=route.request().method();
  if(u.endsWith('/session/context'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({actor_code:'DIR-TEST',role:'Direccion'})});
  if(u.endsWith('/navigation'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(nav)});
  if(u.endsWith('/expedientes')&&method==='GET')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:expedientes})});
  if(u.endsWith('/tareas')&&method==='GET')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:tareas})});
  if(method!=='GET')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,status:200,updated:6})});
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[]})});
 });
 await page.route('**/functions/v1/fenix-notion-runtime/**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[]})}));
 await page.route('**/functions/v1/fenix-ana-api/**',async route=>{
  const body=route.request().postDataJSON?.()??{};
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,answer:`Ana: revisar capacidad de pago antes de enviar a banco. ${body?.message||''}`})});
 });
}

test.describe('App real · cinco flujos sobre runtime PROD local aislado',()=>{
 test('Expedientes selecciona 4, 5 y todos sin abrir y ejecuta cambio masivo real',async({page})=>{
  await seed(page);await gateway(page);await page.goto('/expedientes');
  const rows=page.locator('[data-testid="expediente-row"]');await expect(rows).toHaveCount(6);
  const checks=page.locator('[data-testid="expediente-select"]');
  for(let i=0;i<4;i++)await checks.nth(i).check();
  await expect(page.getByText(/4 seleccionad/i)).toBeVisible();
  await checks.nth(4).check();await expect(page.getByText(/5 seleccionad/i)).toBeVisible();
  await page.getByTestId('expedientes-select-all').check();await expect(page.getByText(/6 seleccionad/i)).toBeVisible();
  await page.getByRole('button',{name:/cambiar etapa/i}).click();
  await page.getByRole('button',{name:/confirmar/i}).click();
  await expect(page.getByText(/actualizad/i)).toBeVisible();
 });

 test('Tareas selecciona 4, 5 y todas sin abrir y ejecuta acción masiva real',async({page})=>{
  await seed(page);await gateway(page);await page.goto('/agenda');
  const checks=page.locator('[data-testid="task-select"]');await expect(checks).toHaveCount(6);
  for(let i=0;i<4;i++)await checks.nth(i).check();await expect(page.getByText(/4 seleccionad/i)).toBeVisible();
  await checks.nth(4).check();await expect(page.getByText(/5 seleccionad/i)).toBeVisible();
  await page.getByTestId('tasks-select-all').check();await expect(page.getByText(/6 seleccionad/i)).toBeVisible();
  await page.getByRole('button',{name:/completar/i}).click();await page.getByRole('button',{name:/confirmar/i}).click();
  await expect(page.getByText(/actualizad|completad/i)).toBeVisible();
 });

 test('Expediente muestra fichas desplegables por participante y sus documentos vinculados',async({page})=>{
  await seed(page);await gateway(page);
  await page.route('**/functions/v1/fenix-expediente-people/**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{person_id:'P-1',nombre:'María Compradora',rol:'Comprador',documents:[{id:'D-1',nombre:'Nómina agosto.pdf'}]}]})}));
  await page.goto('/expedientes/EXP-1');
  await expect(page.getByText('María Compradora',{exact:true})).toBeVisible();
  await page.getByText('María Compradora',{exact:true}).click();
  await expect(page.getByText('Nómina agosto.pdf',{exact:true})).toBeVisible();
 });

 test('Hablar con Ana conserva tema oscuro y devuelve conversación dentro del panel',async({page})=>{
  await seed(page);await gateway(page);await page.goto('/agenda');
  await page.getByRole('button',{name:'Cambiar tema'}).click();
  await page.locator('.fenix-audio-launcher').click();
  const panel=page.locator('.fenix-ana-panel');await expect(panel).toBeVisible();
  const input=panel.locator('textarea,input').first();await input.fill('¿Qué reviso antes de enviar a banco?');
  await panel.getByRole('button',{name:/enviar/i}).click();
  await expect(panel.locator('.fenix-ana-bubble.ana')).toContainText('revisar capacidad de pago antes de enviar a banco');
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 });

 test('Flotantes mantienen micro, calculadora y chat en vertical, alineados y con el mismo estilo',async({page})=>{
  await seed(page);await gateway(page);await page.goto('/agenda');
  const controls=[page.locator('.fenix-audio-launcher'),page.locator('.calc-launcher:not(.fenix-chat-launcher-restored)'),page.locator('.fenix-chat-launcher-restored')];
  for(const control of controls)await expect(control).toBeVisible();
  const boxes=await Promise.all(controls.map(control=>control.boundingBox()));expect(boxes.every(Boolean)).toBeTruthy();
  const [micro,calc,chat]=boxes as NonNullable<(typeof boxes)[number]>[];
  expect(micro.y).toBeLessThan(calc.y);expect(calc.y).toBeLessThan(chat.y);
  const gaps=[calc.y-(micro.y+micro.height),chat.y-(calc.y+calc.height)];
  const styles=await Promise.all(controls.map(control=>control.evaluate(el=>{const s=getComputedStyle(el);return{width:s.width,height:s.height,right:s.right,background:s.backgroundColor,borderRadius:s.borderRadius}})));
  for(const gap of gaps){expect(gap).toBeGreaterThan(0);expect(gap).toBeLessThanOrEqual(18)}
  expect(Math.abs(gaps[0]-gaps[1])).toBeLessThanOrEqual(18);
  expect(Math.max(...boxes.map(x=>x!.x))-Math.min(...boxes.map(x=>x!.x))).toBeLessThanOrEqual(1);
  expect(new Set(styles.map(style=>style.background)).size).toBe(1);
  for(const style of styles){
    expect(style.width).toBe('46px');expect(style.height).toBe('46px');expect(style.borderRadius).toBe('50%');
    const rgb=style.background.match(/\d+/g)?.map(Number)??[];
    expect(rgb[0]).toBe(255);expect(rgb[1]).toBeGreaterThanOrEqual(88);expect(rgb[1]).toBeLessThanOrEqual(95);expect(rgb[2]).toBeGreaterThanOrEqual(0);expect(rgb[2]).toBeLessThanOrEqual(32);
  }
 });
});