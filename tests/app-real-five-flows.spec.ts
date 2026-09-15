import {expect,test,type Page, type Route} from '@playwright/test';

const fakeSession={
 access_token:'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJzdWIiOiJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiLCJlbWFpbCI6ImRpcmVjY2lvbkBmZW5peC50ZXN0IiwiZXhwIjoxOTk5OTk5OTk5fQ.',
 token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-real-five-not-real',
 user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',aud:'authenticated',role:'authenticated',email:'direccion@fenix.test',app_metadata:{},user_metadata:{},created_at:'2026-09-15T00:00:00.000Z'}
};
const navigation={items:[{label:'Inicio',route:'/inicio'},{label:'Expedientes',route:'/expedientes'},{label:'Agenda',route:'/agenda'},{label:'Hablar con Ana',route:'/ana'},{label:'Chat interno',route:'/chat'}]};
const expedientes=Array.from({length:6},(_,index)=>({
 id:`internal-${index+1}`,expediente_code:`EXP-00${index+1}`,expediente:`Expediente real ${index+1}`,
 cliente_alias:`Cliente real ${index+1}`,stage:index%2?'Banco':'Documentación',version:index+1,riesgo:index===0?'Alto':'Bajo'
}));
const tareas=Array.from({length:6},(_,index)=>({
 task_code:`TASK-00${index+1}`,id:`TASK-00${index+1}`,version:index+1,tarea:`Tarea real ${index+1}`,
 estado:'Pendiente',fecha_limite:`2026-09-${20+index}`,prioridad:index<2?'Alta':'Media',responsable:'DIR-QA'
}));

async function seed(page:Page,theme:'light'|'dark'='light'){
 await page.addInitScript(({session,selectedTheme})=>{
  localStorage.setItem('fenix-prod-auth-v1',JSON.stringify(session));
  localStorage.setItem('fenix-remember-device','true');
  localStorage.setItem('fenix-theme',selectedTheme);
  localStorage.setItem('fenix-global-theme',selectedTheme);
  sessionStorage.setItem('fenix-theme',selectedTheme);
  sessionStorage.setItem('fenix-session-active','1');
 },{session:fakeSession,selectedTheme:theme});
}
function json(route:Route,body:unknown,status=200){return route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});}
async function gateway(page:Page,extra?:(route:Route,url:string)=>Promise<boolean>){
 await page.route('**/functions/v1/fenix-app-gateway/**',async route=>{
  const url=route.request().url();
  if(extra&&await extra(route,url))return;
  if(url.endsWith('/session/context'))return json(route,{actor_code:'DIR-QA',role:'Direccion'});
  if(url.endsWith('/navigation'))return json(route,navigation);
  if(url.endsWith('/expedientes'))return json(route,{items:expedientes});
  if(url.endsWith('/tareas'))return json(route,{items:tareas});
  return json(route,{ok:false},404);
 });
}

test.describe('App real · cinco flujos sobre runtime PROD local aislado',()=>{
 test('Expedientes selecciona 4, 5 y todos sin abrir y ejecuta cambio masivo real',async({page},testInfo)=>{
  test.skip(!testInfo.project.name.includes('desktop'));
  await seed(page);await gateway(page);
  let payload:any=null;
  await page.route('**/functions/v1/fenix-expediente-actions',async route=>{payload=route.request().postDataJSON();return json(route,{ok:true,count:6});});
  await page.goto('/expedientes');
  for(let index=0;index<4;index++)await page.getByLabel(`Seleccionar EXP-00${index+1}`).check();
  await expect(page).toHaveURL(/\/expedientes$/);await expect(page.getByText('4 expedientes seleccionados')).toBeVisible();
  await page.getByLabel('Seleccionar EXP-005').check();
  await expect(page).toHaveURL(/\/expedientes$/);await expect(page.getByText('5 expedientes seleccionados')).toBeVisible();
  await page.getByLabel('Seleccionar todos los expedientes visibles vinculados').check();
  await expect(page).toHaveURL(/\/expedientes$/);await expect(page.getByText('6 expedientes seleccionados')).toBeVisible();
  await page.getByLabel('NUEVA FASE').selectOption('Análisis');
  await page.getByRole('button',{name:'Previsualizar cambios'}).click();
  await page.getByRole('button',{name:'Confirmar y aplicar'}).click();
  await expect.poll(()=>payload).not.toBeNull();
  expect(payload).toEqual({items:expedientes.map(x=>({expediente_code:x.expediente_code,expected_version:x.version})),action:'stage',target_stage:'Análisis',comment:null});
  await expect(page.getByText('6 expedientes actualizados correctamente.')).toBeVisible();
 });

 test('Tareas selecciona 4, 5 y todas sin abrir y ejecuta acción masiva real',async({page},testInfo)=>{
  test.skip(!testInfo.project.name.includes('desktop'));
  await seed(page);await gateway(page);
  let payload:any=null;
  await page.route('**/functions/v1/fenix-app-gateway/tareas/actions',async route=>{payload=route.request().postDataJSON();return json(route,{ok:true,count:6});});
  await page.goto('/agenda');
  for(let index=0;index<4;index++)await page.getByLabel(`Seleccionar Tarea real ${index+1}`).check();
  await expect(page).toHaveURL(/\/agenda$/);await expect(page.getByText('4 tareas seleccionadas')).toBeVisible();
  await page.getByLabel('Seleccionar Tarea real 5').check();
  await expect(page).toHaveURL(/\/agenda$/);await expect(page.getByText('5 tareas seleccionadas')).toBeVisible();
  await page.getByLabel('Seleccionar todas las tareas visibles').check();
  await expect(page).toHaveURL(/\/agenda$/);await expect(page.getByText('6 tareas seleccionadas')).toBeVisible();
  await page.getByLabel('NUEVO ESTADO').selectOption('En curso');
  await page.getByRole('button',{name:'Previsualizar cambios'}).click();
  await page.getByRole('button',{name:'Confirmar y aplicar'}).click();
  await expect.poll(()=>payload).not.toBeNull();
  expect(payload).toEqual({items:tareas.map(x=>({task_code:x.task_code,expected_version:x.version})),action:'state',target_state:'En curso',comment:null});
  await expect(page.getByText('6 tareas actualizadas correctamente.')).toBeVisible();
 });

 test('Expediente muestra fichas desplegables por participante y sus documentos vinculados',async({page},testInfo)=>{
  test.skip(!testInfo.project.name.includes('desktop'));
  const detail={...expedientes[0],cliente:'Cliente real 1',fase:'Documentación',precio_vivienda:180000,importe_solicitado:150000};
  await seed(page);await gateway(page,async(route,url)=>{
   if(url.endsWith('/expedientes/EXP-001')){await json(route,{expediente:detail});return true}return false;
  });
  await page.route('**/functions/v1/fenix-app-gateway/expedientes/EXP-001/people',route=>json(route,{ok:true,count:2,titulares:1,avalistas:1,items:[
   {id:'CLI-001',nombre:'Laura',apellidos:'García',rol_operacion:'Titular comprador',dni_nie:'11111111A',situacion_laboral:'Indefinida',documentacion_completa:true,documentos:[{title:'DNI Laura',document_code:'DOC-001',analysis_state:'Validado'}]},
   {id:'CLI-002',nombre:'Mario',apellidos:'López',rol_operacion:'Avalista',dni_nie:'22222222B',situacion_laboral:'Autónomo',documentacion_completa:false,documentos:[{title:'IRPF Mario',document_code:'DOC-002',analysis_state:'Pendiente'}]}
  ]}));
  await page.goto('/expedientes/EXP-001');
  const people=page.getByTestId('expediente-people-prod');await expect(people).toBeVisible();
  const laura=people.locator('.exp-person').filter({hasText:'Laura García'});const lauraHead=laura.locator('.exp-person-toggle');
  await expect(lauraHead).toHaveAttribute('aria-expanded','false');await expect(laura.getByText('11111111A')).toBeHidden();
  await lauraHead.click();await expect(lauraHead).toHaveAttribute('aria-expanded','true');await expect(laura.getByText('11111111A')).toBeVisible();
  const docsHead=laura.locator('.exp-person-documents-head');await expect(docsHead).toHaveAttribute('aria-expanded','false');
  await docsHead.click();await expect(docsHead).toHaveAttribute('aria-expanded','true');await expect(laura.getByText('DNI Laura')).toBeVisible();
  const mario=people.locator('.exp-person').filter({hasText:'Mario López'});await mario.locator('.exp-person-toggle').click();
  await expect(mario.getByText('22222222B')).toBeVisible();await mario.locator('.exp-person-documents-head').click();await expect(mario.getByText('IRPF Mario')).toBeVisible();
 });

 test('Hablar con Ana conserva tema oscuro y devuelve conversación dentro del panel',async({page},testInfo)=>{
  test.skip(!testInfo.project.name.includes('desktop'));
  await seed(page,'dark');await gateway(page);
  await page.route('**/functions/v1/fenix-ana-canonical/rules?domain=Hipotecas',route=>json(route,{ok:true,items:[{id:'RULE-1',rule:'Con documentación completa, revisar capacidad de pago antes de enviar a banco.',approved:true}]}));
  await page.goto('/agenda');await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await page.getByRole('button',{name:'Abrir acciones por voz'}).click();
  const panel=page.getByRole('region',{name:'Acciones por voz y texto'});await expect(panel).toBeVisible();
  expect(await panel.evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(31, 32, 35)');
  await panel.getByRole('button',{name:/Hablar con Ana/}).click();
  await page.getByLabel('Texto de la acción').fill('¿Qué hago con documentación completa y capacidad de pago?');
  await page.getByRole('button',{name:'Enviar'}).click();
  await expect(panel.locator('.fenix-ana-bubble.user')).toContainText('documentación completa');
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
  for(const style of styles){
    expect(style.width).toBe('46px');expect(style.height).toBe('46px');expect(style.borderRadius).toBe('50%');
    const rgb=style.background.match(/\d+/g)?.map(Number)??[];
    expect(rgb[0]).toBe(255);expect(rgb[1]).toBeGreaterThanOrEqual(89);expect(rgb[1]).toBeLessThanOrEqual(91);expect(rgb[2]).toBeGreaterThanOrEqual(29);expect(rgb[2]).toBeLessThanOrEqual(32);
  }
 });
});
