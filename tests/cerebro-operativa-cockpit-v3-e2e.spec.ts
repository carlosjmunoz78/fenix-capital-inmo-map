import {test,expect} from '@playwright/test';

// Completely synthetic local-browser session; no account secrets or production JWT.
function fixtureSession(){
 const encode=(v:unknown)=>Buffer.from(JSON.stringify(v)).toString('base64url');
 const user={id:'operativa-preview-qa',aud:'authenticated',role:'authenticated',email:'preview@example.invalid',
  app_metadata:{},user_metadata:{actor_code:'CARLOS-ADMIN',role:'Dirección'},
  created_at:'2026-11-12T00:00:00.000Z'};
 const access_token=[encode({alg:'none',typ:'JWT'}),encode({aud:'authenticated',role:'authenticated',sub:user.id,
   exp:1999999999}), 'qa-only-not-a-signature'].join('.');
 return {access_token,token_type:'bearer',expires_in:3600,expires_at:1999999999,
  refresh_token:'qa-local-placeholder',user};
}
const cors={'access-control-allow-origin':'http://127.0.0.1:4173',
 'access-control-allow-headers':'authorization,apikey,content-type',
 'access-control-allow-methods':'GET,POST,OPTIONS','content-type':'application/json'};
const result=(obj:unknown)=>JSON.stringify(obj);
test('Operativa Cockpit V3 · visual responsive, source evidence, navigation, real command bridge',async({page})=>{
 test.setTimeout(60_000);
 const session=fixtureSession();let postedChat:Record<string,unknown>|null=null;
 await page.addInitScript(value=>{
  localStorage.setItem('fenix-preprod-auth-v2',JSON.stringify(value));
  localStorage.setItem('fenix-remember-device','true');
  sessionStorage.setItem('fenix-session-active','1');
  class QARecognition{lang='';continuous=false;interimResults=false;maxAlternatives=1;
   onstart:any=null;onresult:any=null;onend:any=null;onerror:any=null;
   start(){this.onstart?.(new Event('start'))}
   stop(){this.onend?.(new Event('end'))}
   abort(){this.onend?.(new Event('end'))}}
  (window as any).SpeechRecognition=QARecognition;
 },session);
 await page.route('http://127.0.0.1:54321/auth/v1/**',route=>{
  if(route.request().url().includes('/user'))
   return route.fulfill({status:200,headers:cors,body:result(session.user)});
  if(route.request().url().includes('/token'))
   return route.fulfill({status:200,headers:cors,body:result(session)});
  return route.fulfill({status:200,headers:cors,body:'{}'});
 });
 await page.route('**/functions/v1/fenix-app-gateway-test/**',route=>{
  if(route.request().method()==='OPTIONS')
   return route.fulfill({status:204,headers:cors,body:''});
  const url=route.request().url();
  if(url.endsWith('/session/context'))
   return route.fulfill({status:200,headers:cors,body:result({actor_code:'CARLOS-ADMIN',role:'Dirección'})});
  if(url.endsWith('/navigation'))
   return route.fulfill({status:200,headers:cors,body:result({items:[{label:'Inicio',route:'/inicio'},
    {label:'CEREBRO',route:'/cerebro',resource:'CEREBRO'}]})});
  return route.fulfill({status:404,headers:cors,body:'{}'});
 });
 await page.route('https://cluhljgonannaafpmblx.supabase.co/functions/v1/cerebro-console-gateway-v0/**',route=>{
  const request=route.request();if(request.method()==='OPTIONS')
   return route.fulfill({status:204,headers:cors,body:''});
  const url=request.url();
  if(url.endsWith('/health'))
   return route.fulfill({status:200,headers:cors,body:result({status:'ok',service:'cerebro-console-gateway-v0',
    environment:'QA_ISOLATED',version:'qa',authenticated_transport:true,direct_model_access:false,
    prod_execution_enabled:false,live_writes:false,chat_available:true,chat_mode:'OWNER_DECISION_BY_EXCEPTION_V1'})});
  if(url.endsWith('/preferences'))
   return route.fulfill({status:200,headers:cors,body:result({status:'ok',preferences:{response_length:'concise'}})});
  if(url.endsWith('/chat')){
   postedChat=request.postDataJSON();
   return route.fulfill({status:200,headers:cors,body:result({status:'OK',intent:'qa_preview',
    message:'RESPUESTA_QA',executed:false})});
  }
  return route.fulfill({status:404,headers:cors,body:'{}'});
 });
 await page.route('https://cluhljgonannaafpmblx.supabase.co/functions/v1/cerebro-console-activity-v0/**',route=>{
  if(route.request().method()==='OPTIONS')
   return route.fulfill({status:204,headers:cors,body:''});
  const dt='2026-11-12T20:45:00.000Z';
  const run=(id:number,status:string,engine_id:string,conclusion:string|null)=>({
   run_id:id,workflow_name:'Prueba visual '+engine_id,workflow_alias:engine_id,
   workflow_path:'.github/workflows/qa-only.yml',status,conclusion,event:'workflow_dispatch',
   html_url:'https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/'+id,
   created_at:dt,run_started_at:dt,updated_at:dt,engine_id,company_id:'fenix',environment:'LAB',
   version:'qa',source:'GITHUB_ACTIONS',provenance:'REAL',
   company_provenance:'DERIVED_REPOSITORY_SCOPE',alias_provenance:'ENGINE_ID',
   progress_percent:null,progress_completed_steps:null,progress_total_steps:null,
   current_step:'Ejecución de prueba',next_step:'Verificación',progress_provenance:'UNAVAILABLE'
  });
  return route.fulfill({status:200,headers:cors,body:result({status:'OK',observed_at:dt,
   source:'GITHUB_ACTIONS',source_status:'LIVE',repository:'carlosjmunoz78/fenix-capital-inmo-map',
   runs:[run(12345,'in_progress','FACT-001',null),run(12344,'completed','SEO-001','success')]})});
 });
 await page.route('https://cluhljgonannaafpmblx.supabase.co/functions/v1/cerebro-console-gateway-v36-followups-lab/owner-universe**',route=>{
  const request=route.request();
  if(request.method()==='OPTIONS')return route.fulfill({status:204,headers:cors,body:''});
  const scope=new URL(request.url()).searchParams.get('company_id');
  if(scope!=='all'&&scope!=='fenix')
   return route.fulfill({status:207,headers:cors,body:result({
    status:'PARTIAL',owner_scope:'SERVER_VERIFIED_FENIX_ONLY',
    live_writes:false,prod_execution_enabled:false,
    registry:{status:'NOT_CONNECTED',source_status:'LIVE_SERVER_READ',
      companies:[],projects:[],engines:[]},
    factory:{status:'OK',source_status:'PUBLIC_GITHUB_LIVE',catalog:[],scaffolded:[]}
   })});
  return route.fulfill({status:200,headers:cors,body:result({
   status:'OK',owner_scope:'SERVER_VERIFIED_FENIX_ONLY',
   live_writes:false,prod_execution_enabled:false,
   registry:{status:'OK',source_status:'LIVE_SERVER_READ',
    companies:[{company_id:'fenix',environment:'PROD',registry_state:'AUTHENTICATED_OWNER_CONTEXT',
     access_status:'VERIFIED_OWNER_CONTEXT_NOT_REGISTERED',prod_authorized:false}],
    projects:[{company_id:'fenix',project_id:'PRJ-SUPERAGENT-001',environment:'PROD',
     project_status:'PARCIAL',access_status:'PROJECT_RECORD_PRESENT_INTEGRATION_UNVERIFIED'}],
    engines:[]},
   factory:{status:'OK',source_status:'PUBLIC_GITHUB_LIVE',
    catalog:[{engine_id:'FACT-001',name:'Fábrica de Motores',version:'0.1',
     environment:'LAB',declared_state:'DEFINED_NOT_RUNTIME_VERIFIED',source_type:'FACT_ENGINE_SEED_NOT_RUNTIME_EVIDENCE'}],
    scaffolded:[{engine_id:'FACT-001',source_type:'FACT_SCAFFOLD_DIRECTORY',
     manifest_verified:false,runtime_verified:false,execution_enabled:false}]}
  })});
 });
 await page.goto('/cerebro?section=operativa&visual_lab=cockpit-v3',{waitUntil:'domcontentloaded'});
 const cockpit=page.locator('.op3-root');
 await expect(cockpit).toBeVisible();
 await expect(page.locator('.operativa-premium')).toHaveCount(0);
 const bar=page.getByRole('navigation',{name:'Interfaces'});
 for(const name of ['Inicio','Jarvis','Operativa','Neuronal','Navegador'])
  await expect(bar.getByRole('button',{name:new RegExp(name,'i')})).toBeVisible();
 await expect(cockpit.getByRole('heading',{name:'¿Qué necesitas hacer?'})).toBeVisible();
 // The five-tab bar must stay before content and must never float over the command field.
 await expect(page.locator('.cerebro-interface-bar')).toHaveCSS('position','relative');
 const command=cockpit.getByRole('textbox',{name:'Pregunta u orden'});
 await command.scrollIntoViewIfNeeded();
 const overlaps=await page.evaluate(()=>{
  const bar=document.querySelector('.cerebro-interface-bar')?.getBoundingClientRect();
  const field=document.querySelector('.op3-input-frame')?.getBoundingClientRect();
  return Boolean(bar&&field&&bar.bottom>field.top&&bar.top<field.bottom);
 });
 expect(overlaps).toBe(false);

 await expect(cockpit.getByText('Actividad GitHub disponible')).toBeVisible();
 await expect(cockpit.locator('.op3-pulse.is-working')).toBeVisible();
 await expect(cockpit.locator('.op3-indicators')).toContainText('En ejecución');
 await page.evaluate(()=>window.scrollTo(0,0));
 await page.screenshot({path:'test-results/cockpit-v3-desktop.png',fullPage:true,animations:'disabled'});
 await cockpit.getByRole('button',{name:'Motores',exact:true}).click();
 await expect(cockpit.getByRole('heading',{name:'Motores observados'})).toBeVisible();
 await expect(cockpit.getByText('FACT-001',{exact:true}).first()).toBeVisible();
 await expect(cockpit.getByText('Definido · no certifica ejecución')).toBeVisible();
 await expect(cockpit.getByText('Runtime sin verificar')).toBeVisible();
 await page.evaluate(()=>window.scrollTo(0,0));
 await page.screenshot({path:'test-results/cockpit-v3-engines.png',fullPage:true,animations:'disabled'});
 await cockpit.getByRole('button',{name:'Trabajos',exact:true}).click();
 await expect(cockpit.getByRole('heading',{name:'Trabajos y ejecuciones'})).toBeVisible();
 await page.evaluate(()=>window.scrollTo(0,0));
 await page.screenshot({path:'test-results/cockpit-v3-jobs.png',fullPage:true,animations:'disabled'});
 await cockpit.getByRole('button',{name:/Inspeccionar/}).first().click();
 await expect(page.getByRole('dialog',{name:'Detalle del trabajo'})).toBeVisible();
 await page.evaluate(()=>window.scrollTo(0,0));
 await page.screenshot({path:'test-results/cockpit-v3-work-inspector.png',fullPage:true,animations:'disabled'});
 await page.getByRole('dialog',{name:'Detalle del trabajo'}).getByRole('button',{name:'Cerrar'}).click();
 await cockpit.getByRole('button',{name:'Proyectos',exact:true}).click();
 await expect(cockpit.getByText('PRJ-SUPERAGENT-001',{exact:true})).toBeVisible();
 await expect(cockpit.getByText('PARCIAL',{exact:true})).toBeVisible();
 await page.evaluate(()=>window.scrollTo(0,0));
 await page.screenshot({path:'test-results/cockpit-v3-projects.png',fullPage:true,animations:'disabled'});
 await cockpit.getByRole('button',{name:'Entidades',exact:true}).click();
 await expect(cockpit.getByText('Contexto del propietario confirmado; registro PREPROD aún sin alta')).toBeVisible();
 await page.evaluate(()=>window.scrollTo(0,0));
 await page.screenshot({path:'test-results/cockpit-v3-entities.png',fullPage:true,animations:'disabled'});
 await cockpit.getByRole('combobox',{name:'Empresa'}).selectOption('aion');
 await expect(cockpit.getByText('No hay acceso verificado a este contexto. Cambiar el selector no concede permisos.')).toBeVisible();
 await page.evaluate(()=>window.scrollTo(0,0));
 await page.screenshot({path:'test-results/cockpit-v3-scope-denied.png',fullPage:true,animations:'disabled'});
 await expect(cockpit.getByText('PRJ-SUPERAGENT-001',{exact:true})).toHaveCount(0);
 await cockpit.getByRole('button',{name:'Resumen',exact:true}).click();
 await expect(cockpit.getByText('Actividad sin verificar')).toBeVisible();
 await expect(cockpit.locator('.op3-indicators')).toContainText('—');
 await cockpit.getByRole('button',{name:'Entidades',exact:true}).click();
 await cockpit.getByRole('combobox',{name:'Empresa'}).selectOption('all');
 await cockpit.getByRole('button',{name:'Evidencias',exact:true}).click();
 await expect(cockpit.getByRole('heading',{name:'Evidencias de ejecución'})).toBeVisible();
 await page.evaluate(()=>window.scrollTo(0,0));
 await page.screenshot({path:'test-results/cockpit-v3-evidence.png',fullPage:true,animations:'disabled'});
 await cockpit.getByRole('button',{name:'Resumen',exact:true}).click();
 await cockpit.getByRole('button',{name:'Ver detalle'}).click();
 await expect(cockpit.getByRole('heading',{name:'Estado y revisiones'})).toBeVisible();
 await page.evaluate(()=>window.scrollTo(0,0));
 await page.screenshot({path:'test-results/cockpit-v3-attention.png',fullPage:true,animations:'disabled'});
 await cockpit.getByRole('button',{name:'Resumen',exact:true}).click();
 const input=cockpit.getByRole('textbox',{name:'Pregunta u orden'});
 await expect(input).toBeEnabled();
 await input.fill('Consulta el estado operativo');
 await expect(cockpit.locator('.op3-pulse.is-typing')).toBeVisible();
 await cockpit.getByRole('button',{name:'Enviar instrucción'}).click();
 await expect.poll(()=>postedChat?.message??null,{timeout:7_000}).toBe('Consulta el estado operativo');
 await expect(cockpit.getByRole('log',{name:'Historial de conversación'})).toContainText('Consulta el estado operativo');
 await expect(cockpit.getByRole('log',{name:'Historial de conversación'})).toContainText('RESPUESTA_QA');
 await expect(cockpit.getByRole('heading',{name:'Continuar conversación'})).toBeVisible();
 await page.setViewportSize({width:390,height:844});
 await expect(cockpit.getByRole('heading',{name:'Continuar conversación'})).toBeVisible();
 for(const name of ['Inicio','Jarvis','Operativa','Neuronal','Navegador']){
  const tab=bar.getByRole('button',{name:new RegExp(name,'i')});
  await expect(tab).toBeVisible();
  const box=await tab.boundingBox();
  expect(box?.x??1000).toBeGreaterThanOrEqual(-1);
  expect((box?.x??1000)+(box?.width??0)).toBeLessThanOrEqual(391);
 }
 await page.evaluate(()=>window.scrollTo(0,0));
 await page.evaluate(()=>window.scrollTo(0,0));
 await page.screenshot({path:'test-results/cockpit-v3-mobile.png',fullPage:true,animations:'disabled'});
 const dimensions=await page.evaluate(()=>({document:document.documentElement.scrollWidth,
  viewport:document.documentElement.clientWidth}));
 expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport+2);
});
