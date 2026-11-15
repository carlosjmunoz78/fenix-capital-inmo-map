import {expect,test,type Page} from '@playwright/test';

// Synthetic LAB hostname. Every request to it is intercepted and served from the
// local built artifact; it never reaches Vercel or owner systems.
const ORIGIN='https://fenix-capital-preprod-qa.vercel.app';
function enc(value:unknown){return Buffer.from(JSON.stringify(value)).toString('base64url')}
const token=`${enc({alg:'none',typ:'JWT'})}.${enc({aud:'authenticated',role:'authenticated',sub:'owner-qa',exp:1999999999})}.synthetic`;
const user={id:'owner-qa',aud:'authenticated',role:'authenticated',email:'owner-qa@invalid.test',app_metadata:{provider:'email'},user_metadata:{actor_code:'CARLOS-ADMIN',role:'Dirección'},created_at:'2026-11-14T00:00:00Z'};
const session={access_token:token,token_type:'bearer',expires_in:3600,expires_at:1999999999,refresh_token:'qa-refresh-not-real',user};
const headers={'content-type':'application/json','access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'authorization,apikey,content-type'};
const details={
 REGISTRY_STATUS:{label:'Consultar motores registrados'},
 JOB001_STATUS:{label:'Consultar JOB-001'},
 ENGINE_STATUS:{label:'Consultar estado de SEO-001',target_engine_id:'SEO-001',engine_runtime:'NOT_VERIFIED',engine_definition_environment:'SCAFFOLD',engine_status_source:'REPOSITORY_SNAPSHOT_NOT_LIVE'},
 FACT_LATEST:{label:'Consultar recibo'},
 STAGING_STATUS:{label:'Consultar suspensión'}
};
const commands:Record<string,keyof typeof details>={
 'estado de motores':'REGISTRY_STATUS','estado de job-001':'JOB001_STATUS',
 'estado del motor SEO-001':'ENGINE_STATUS','última certificación':'FACT_LATEST',
 'estado de staging':'STAGING_STATUS'
};
async function setup(page:Page){
 const calls:string[]=[];const outside:string[]=[];
 let lab={desired_state:'PAUSED' as 'PAUSED'|'RUNNING',priority:3,revision:1,work_units:0,last_receipt_id:null as string|null};
 await page.addInitScript(s=>{localStorage.setItem('fenix-preprod-auth-v2',JSON.stringify(s));sessionStorage.setItem('fenix-session-active','1')},session);
 await page.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.hostname==='fenix-capital-preprod-qa.vercel.app'){
   // Synthetic replacement for the existing server-side owner GET; never deployed.
   if(url.pathname==='/api/cerebro-preview-owner')
    return route.fulfill({status:200,headers,body:JSON.stringify({allowed:true,source:'SYNTHETIC_QA_OWNER'})});
   if(url.pathname==='/api/cerebro-preview-gateway'){
    const resource=url.searchParams.get('resource');
    calls.push('gateway_'+resource);
    if(resource==='health')return route.fulfill({status:200,headers,
     body:JSON.stringify({status:'ok',authenticated_transport:true,direct_model_access:false,
      prod_execution_enabled:false,live_writes:false,chat_available:true,chat_mode:'DETERMINISTIC_READ_ONLY'})});
    return route.fulfill({status:503,headers,body:'{"status":"UNAVAILABLE"}'});
   }
   if(url.pathname==='/api/cerebro-lab-worker-control'){
    calls.push(request.method()==='GET'?'lab_state':'lab_control');
    const common={status:'OK',company_id:'fenix',environment:'LAB',engine_id:'LAB-DEMO-001',
      version:'0.1.0',source:'PREPROD_LAB_WORKER_RPC_V0',transport:'PREPROD_OWNER_LAB_RUNTIME_V0',
      autonomous_scheduling:false,prod_execution_enabled:false};
    if(request.method()==='GET')return route.fulfill({status:200,headers,body:JSON.stringify({
     ...common,...lab,updated_at:'2026-11-15T09:20:00Z',observed_at:'2026-11-15T09:20:01Z',
     runtime_kind:'DETERMINISTIC_MANUAL_LAB_WORKER',executed:false
    })});
    const input=request.postDataJSON() as {action:string;priority:number|null;expected_revision:number;idempotency_key:string};
    if(input.expected_revision!==lab.revision)return route.fulfill({status:409,headers,body:'{"status":"CONFLICT"}'});
    const before={desired_state:lab.desired_state,priority:lab.priority,revision:lab.revision,work_units:lab.work_units};
    if(input.action==='PAUSE')lab.desired_state='PAUSED';
    if(input.action==='RESUME')lab.desired_state='RUNNING';
    if(input.action==='PRIORITIZE'&&input.priority!==null)lab.priority=input.priority;
    if(input.action==='TICK'&&lab.desired_state==='RUNNING')lab.work_units++;
    lab.revision++;
    const receiptId='123e4567-e89b-42d3-a456-'+String(lab.revision).padStart(12,'0');
    lab.last_receipt_id=receiptId;
    return route.fulfill({status:200,headers,body:JSON.stringify({
     ...common,status:'APPLIED',receipt_id:receiptId,executed:true,
     executed_work_units:lab.work_units-before.work_units,external_actions_executed:false,additional_cost_eur:0,
     before,after:{desired_state:lab.desired_state,priority:lab.priority,revision:lab.revision,work_units:lab.work_units}
    })});
   }
   if(url.pathname==='/api/cerebro-cloudflare-fleet'){
    calls.push('cloudflare_fleet');
    if(request.method()!=='GET')return route.fulfill({status:405,headers,body:'{"status":"CLOSED"}'});
    return route.fulfill({status:200,headers,body:JSON.stringify({
     status:'OK',source:'CLOUDFLARE_REST_ACCOUNT_WORKERS_LIVE_V1',
     account_id:'e39a57e1ac42650ca5a6d5307cf0ac8e',company_id:'fenix',environment:'LAB_OBSERVATION',
     observed_at:'2026-11-15T10:20:00Z',worker_count:2,cron_verified_count:2,with_cron:1,without_cron:1,
     cron_unknown_count:0,active_agent_count:null,active_execution_verified:false,
     read_only:true,controls_enabled:false,cache_status:'FRESH',workers:[
      {id:'cerebro-facebook-autoqual-lab',modified_on:'2026-11-12T18:20:19Z',
       cron:[],scheduled:false,cron_observed_at:'2026-11-15T10:20:00Z',
       active_execution_verified:false,worker_agent_id:null},
      {id:'cerebro-fact001-headless-operator-lab-20261111',modified_on:'2026-11-11T15:37:16Z',
       cron:['*/5 * * * *'],scheduled:true,cron_observed_at:'2026-11-15T10:20:00Z',
       active_execution_verified:false,worker_agent_id:null}
     ]
    })});
   }
   if(url.pathname==='/api/cerebro-fleet-observe'){
    calls.push('fleet_observe');
    if(request.method()!=='GET')return route.fulfill({status:405,headers,body:'{"status":"CLOSED"}'});
    const entries=Array.from({length:11},(_,i)=>({id:i===10?'AGT-SALES-EXECUTIVE':'ENG-TEST-'+String(i).padStart(2,'0'),
     name:i===10?'Ventas':'Especialista '+i,department:i===10?'REVENUE_SALES':'ENGINEERING',
     company_id:'GLOBAL',environment:'PREPROD',state:'DECLARED',reports_to:null,runtime_verified:false}));
    return route.fulfill({status:200,headers,body:JSON.stringify({
     status:'OK',source:'OWNER_LAB_FLEET_SOURCES_V1',environment:'LAB',company_id:'fenix',
     observed_at:'2026-11-15T00:50:00Z',verified_owner:true,read_only:true,execution_enabled:false,additional_cost_eur:0,
     roles:{declared_role_profiles:11,active_agent_count:null,verified_subagent_count:null,
      unknown_agent_count:true,unknown_subagent_count:true,hierarchy_complete:false,
      by_department:{ENGINEERING:10,REVENUE_SALES:1},entries,registry_id:'CEREBRO_ROLE_AGENT_REGISTRY_V1',
      registry_environment:'PREPROD',registry_status:'ACTIVE_PREPROD_ADDITIVE'},
     engine_registry_count:179,engine_registry_semantics:'DEFINED_NOT_RUNNING',
     sources:[{platform:'GitHub',repo:'carlosjmunoz78/fenix-capital-inmo-map',
       name:'App / CEREBRO',state:'LIVE',reason:null,observed_at:'2026-11-15T00:50:00Z',
       observed_sample:1,active_in_sample:1,queued_in_sample:0,total_repo_run_count:15,
       recent:[{run_id:101,name:'LAB contrato vivo',status:'in_progress',conclusion:null,
        updated_at:'2026-11-15T00:50:00Z',url:'https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/101',
        agent_id:null,engine_id:null,subagent_id:null}]},
      {platform:'GitHub',repo:'carlosjmunoz78/fenix-capital-cerebro-social',
       name:'Social / AUTOQUAL',state:'UNAVAILABLE',reason:'PRIVATE_REPO_RUNTIME_CONNECTOR_NOT_CONFIGURED',observed_at:null,
       observed_sample:null,active_in_sample:null,queued_in_sample:null,total_repo_run_count:null,recent:[]},
      {platform:'Cloudflare',state:'UNAVAILABLE',reason:'OWNER_RUNTIME_CONNECTOR_NOT_VERIFIED',observed_at:null}],
     control:{pause:'NOT_CONNECTED',resume:'NOT_CONNECTED',prioritize:'NOT_CONNECTED',
      reason:'NO_VERIFIED_CONTROL_EXECUTOR',staging_status:'SUSPENDED_BY_OWNER'}
    })});
   }
   if(url.pathname==='/api/cerebro-universal-preview'){
    if(request.method()==='OPTIONS')return route.fulfill({status:204,headers,body:''});
    const body=request.postDataJSON() as {action:string;params:{instruction?:string;company_id?:string;environment?:string}};
    calls.push(body.action);
    if(body.params?.company_id!=='fenix'||body.params?.environment!=='LAB')
     return route.fulfill({status:403,headers,body:'{"status":"CLOSED"}'});
    let payload:Record<string,unknown>={status:'UNAVAILABLE'};
    if(body.action==='list_capabilities')payload={status:'OK',transport:'PREVIEW_ONLY_SERVER_VERIFIED',prod_execution_enabled:false,
     capabilities:[{company_id:'fenix',engine_id:'FACT-001',environment:'LAB',version:'0.1.0-lab',
       capability_id:'fact.registry.summary',policy:'READ_ONLY',side_effects:'NONE',executor:'LAB_READ_ONLY',health:'AVAILABLE'}]};
    if(body.action==='invoke_read')payload={status:'READ_EXECUTED',result:{engine_registry_count:179,operational_engine_count:'NOT_VERIFIED',source:'REPOSITORY_SNAPSHOT_NOT_LIVE'}};
    if(body.action==='get_job001_controls')payload={status:'UNAVAILABLE',source:'PREPROD_JOB001_CONTROL_METADATA',
      transport:'PREVIEW_ONLY_SERVER_VERIFIED',reason:'PREPROD_GATEWAY_UNREACHABLE'};
    if(body.action==='plan_instruction'){
     const instruction=body.params?.instruction||'';
     const intent=commands[instruction];
     payload=intent?{status:'PLAN_READY',transport:'PREVIEW_ONLY_SERVER_VERIFIED',source:'DETERMINISTIC_OWNER_LAB_ROUTER',executed:false,
      prod_execution_enabled:false,staging_probed:false,durable_audit:false,conversation_persisted:false,company_id:'fenix',environment:'LAB',
      production_allowed:false,external_destination_allowed:false,staging_allowed:false,additional_cost_eur:0,
      intent,requires_confirmation:false,...details[intent]}:
      {status:'NOT_SUPPORTED_IN_LAB',transport:'PREVIEW_ONLY_SERVER_VERIFIED',source:'DETERMINISTIC_OWNER_LAB_ROUTER',executed:false,
      prod_execution_enabled:false,staging_probed:false,durable_audit:false,conversation_persisted:false};
    }
    return route.fulfill({status:200,headers,body:JSON.stringify(payload)});
   }
   // Fetch the exact built Vite output locally while preserving a matching
   // synthetic browser hostname. No network request hits real Vercel.
   const local='http://127.0.0.1:4173'+url.pathname+url.search;
   const localResponse=await route.fetch({url:local});
   return route.fulfill({response:localResponse});
  }
  if(url.hostname==='127.0.0.1'&&url.pathname.startsWith('/auth/v1/')){
   if(request.method()==='OPTIONS')return route.fulfill({status:204,headers,body:''});
   return route.fulfill({status:200,headers,body:JSON.stringify(url.pathname.includes('/user')?user:session)});
  }
  if(url.pathname.includes('/functions/v1/fenix-app-gateway-test/')){
   if(request.method()==='OPTIONS')return route.fulfill({status:204,headers,body:''});
   const data=url.pathname.endsWith('/session/context')?{actor_code:'CARLOS-ADMIN',role:'Dirección'}:{items:[{label:'CEREBRO',route:'/cerebro'}]};
   return route.fulfill({status:200,headers,body:JSON.stringify(data)});
  }
  // Prevent app backends, Wordpress, staging and all other internet access in QA.
  outside.push(url.hostname+url.pathname);
  return route.fulfill({status:404,headers,body:'{}'});
 });
 await page.goto(ORIGIN+'/cerebro?section=operativa&visual_lab=cockpit-v3&op3_panel=motores',{waitUntil:'domcontentloaded'});
 const quick=page.getByRole('group',{name:'Consultas rápidas de solo lectura'});
 try{await expect(quick).toBeVisible({timeout:15_000});}
 catch(error){
  console.error('LAB_UI_DIAGNOSTIC',JSON.stringify({url:page.url(),body:(await page.locator('body').innerText().catch(()=>'' )).slice(0,1200),calls,outside:outside.slice(0,10)}));
  throw error;
 }
 return{calls,outside,quick};
}

test('Owner LAB quick reads use existing planner, no execution or production routes',async({page})=>{
 const {calls,quick}=await setup(page);
 await expect(quick.getByRole('button')).toHaveCount(5);
 await quick.getByRole('button',{name:'SEO-001'}).click();
 await expect(page.getByRole('log',{name:'Conversación de Operativa LAB'})).toContainText('Motor SEO-001 acreditado');
 await quick.getByRole('button',{name:'Estado de motores'}).click();
 await expect(page.getByRole('log',{name:'Conversación de Operativa LAB'})).toContainText('179 definiciones');
 await quick.getByRole('button',{name:'JOB-001'}).click();
 await expect(page.getByRole('log',{name:'Conversación de Operativa LAB'})).toContainText('no tiene una lectura actual verificada');
 await expect(page.getByRole('group',{name:'Consultas rápidas de solo lectura'})).toContainText('No inician motores');
 expect(calls.filter(x=>x==='plan_instruction')).toHaveLength(3);
 expect(calls).not.toContain('submit_command');
 expect(calls).not.toContain('capture_staging_suspension');
 await page.screenshot({path:'test-results/operativa-owner-lab-desktop.png',fullPage:false,animations:'disabled'});
});

test('Owner LAB controls fit 375px phones without clipped touch targets',async({page})=>{
 await page.setViewportSize({width:375,height:812});
 const {quick}=await setup(page);
 const buttons=quick.getByRole('button');
 await expect(buttons).toHaveCount(5);
 for(const button of await buttons.all()){
  const rect=await button.boundingBox();
  expect(rect).not.toBeNull();
  expect(rect!.x).toBeGreaterThanOrEqual(-1);
  expect(rect!.x+rect!.width).toBeLessThanOrEqual(376);
  expect(rect!.height).toBeGreaterThanOrEqual(43);
 }
 await buttons.first().click();
 await expect(page.getByRole('log',{name:'Conversación de Operativa LAB'})).toContainText('179 definiciones');
 await page.screenshot({path:'test-results/operativa-owner-lab-mobile.png',fullPage:false,animations:'disabled'});
});

test('Control tab shows real vs unavailable sources, answers agent questions and fails closed on controls',async({page})=>{
 const {calls}=await setup(page);
 const nav=page.getByRole('navigation',{name:'Áreas de Operativa'});
 await nav.getByRole('button',{name:'Control'}).click();
 const fleet=page.getByRole('region',{name:'Inventario operativo CEREBRO por plataforma'});
 await expect(fleet).toBeVisible();
 await expect(fleet).toContainText('11');
 await expect(fleet).toContainText('Agentes vivos · censo pendiente');
 await expect(fleet).toContainText('PRIVATE_REPO_RUNTIME_CONNECTOR_NOT_CONFIGURED');
 await expect(fleet).toContainText('LAB contrato vivo');
 await fleet.getByRole('button',{name:'Comprobar pausar'}).click();
 await expect(fleet.getByRole('status').last()).toContainText('Acción NO ejecutada');
 await nav.getByRole('button',{name:'Resumen'}).click();
 const input=page.getByRole('textbox',{name:'Pregunta u orden'});
 await input.fill('¿Cuántos agentes y subagentes tenemos?');
 await page.getByRole('button',{name:'Enviar instrucción'}).click();
 await expect(page.getByRole('status').filter({hasText:'Respuesta del control operativo'})).toContainText('11 perfiles especializados documentados');
 await expect(page.getByRole('status').filter({hasText:'Respuesta del control operativo'})).toContainText('SIN CENSO VERIFICADO');
 expect(calls).toContain('fleet_observe');
 expect(calls).not.toContain('submit_command');
 await page.screenshot({path:'test-results/operativa-fleet-owner-qa.png',fullPage:false,animations:'disabled'});
});

test('isolated LAB worker responds to actual revisioned pause, resume, tick and priority contracts',async({page})=>{
 const {calls}=await setup(page);
 await page.getByRole('navigation',{name:'Áreas de Operativa'}).getByRole('button',{name:'Control'}).click();
 const worker=page.getByRole('region',{name:'Control real del trabajador determinista aislado LAB'});
 await expect(worker).toContainText('Estado observado: PAUSED');
 await worker.getByRole('button',{name:'Reanudar LAB'}).click();
 await worker.getByRole('button',{name:'Confirmar una vez'}).click();
 await expect(worker).toContainText('CONTROL LAB VERIFICADO: RESUME');
 await expect(worker).toContainText('Estado observado: RUNNING');
 await worker.getByRole('button',{name:'Ejecutar 1 paso LAB'}).click();
 await worker.getByRole('button',{name:'Confirmar una vez'}).click();
 await expect(worker).toContainText('Pasos terminados: 1');
 await worker.getByRole('button',{name:'Pausar LAB'}).click();
 await worker.getByRole('button',{name:'Confirmar una vez'}).click();
 await expect(worker).toContainText('CONTROL LAB VERIFICADO: PAUSE');
 await worker.getByRole('button',{name:'Ejecutar 1 paso LAB'}).click();
 await worker.getByRole('button',{name:'Confirmar una vez'}).click();
 await expect(worker).toContainText('Pasos terminados: 1');
 await worker.getByRole('combobox',{name:'Prioridad del worker LAB'}).selectOption('5');
 await worker.getByRole('button',{name:'Cambiar prioridad LAB'}).click();
 await worker.getByRole('button',{name:'Confirmar una vez'}).click();
 await expect(worker).toContainText('Prioridad: 5');
 expect(calls.filter(c=>c==='lab_control')).toHaveLength(5);
 expect(calls).not.toContain('submit_command');
 await page.screenshot({path:'test-results/operativa-lab-control-verified.png',fullPage:false,animations:'disabled'});
});

test('Main owner conversation plans but never executes a LAB command before exact confirmation',async({page})=>{
 const {calls}=await setup(page);
 await page.getByRole('navigation',{name:'Áreas de Operativa'}).getByRole('button',{name:'Resumen'}).click();
 const prompt=page.getByRole('textbox',{name:'Pregunta u orden'});
 await prompt.fill('reanudar LAB-DEMO-001');
 await page.getByRole('button',{name:'Enviar instrucción'}).click();
 await expect(page.getByRole('button',{name:'Confirmar control LAB'})).toBeVisible();
 await expect(page.getByRole('status').filter({hasText:'PROPUESTA, NO EJECUTADA'})).toBeVisible();
 expect(calls.filter(x=>x==='lab_control')).toHaveLength(0);
 await page.getByRole('button',{name:'Cancelar orden LAB'}).click();
 await expect(page.getByRole('status').filter({hasText:'Orden cancelada sin ejecución'})).toBeVisible();
 await prompt.fill('reanudar LAB-DEMO-001');
 await page.getByRole('button',{name:'Enviar instrucción'}).click();
 await page.getByRole('button',{name:'Confirmar control LAB'}).click();
 await expect(page.getByRole('status').filter({hasText:'CONTROL REAL LAB VERIFICADO'})).toContainText('RESUME');
 expect(calls.filter(x=>x==='lab_control')).toHaveLength(1);
 await prompt.fill('estado LAB-DEMO-001');
 await page.getByRole('button',{name:'Enviar instrucción'}).click();
 await expect(page.getByRole('status').filter({hasText:'LAB-DEMO-001 · lectura actual'})).toContainText('RUNNING');
 await page.screenshot({path:'test-results/operativa-lab-chat-confirmation.png',fullPage:false,animations:'disabled'});
});

test('non-Fenix company selector never exposes another tenant LAB worker controls',async({page})=>{
 await setup(page);
 await page.getByRole('navigation',{name:'Áreas de Operativa'}).getByRole('button',{name:'Control'}).click();
 await expect(page.getByRole('region',{name:'Control real del trabajador determinista aislado LAB'})).toBeVisible();
 await page.getByRole('combobox',{name:'Empresa'}).selectOption('aion');
 await expect(page.getByRole('region',{name:'Control real del trabajador determinista aislado LAB'})).toHaveCount(0);
 await expect(page.getByText('Control LAB disponible únicamente en Fénix')).toBeVisible();
 await page.getByRole('combobox',{name:'Empresa'}).selectOption('fenix');
 await expect(page.getByRole('region',{name:'Control real del trabajador determinista aislado LAB'})).toBeVisible();
});

test('Cloudflare live Worker inventory, manual refresh and chat grounded answers without writes',async({page})=>{
 const {calls}=await setup(page);
 const nav=page.getByRole('navigation',{name:'Áreas de Operativa'});
 await nav.getByRole('button',{name:'Control'}).click();
 const cloudflare=page.getByRole('region',{name:'Cloudflare · inventario vivo de Workers'});
 await expect(cloudflare).toContainText('Cloudflare · Workers reales');
 await expect(cloudflare).toContainText('2');
 await expect(cloudflare).toContainText('cerebro-facebook-autoqual-lab');
 await cloudflare.getByRole('button',{name:'Examinar cerebro-facebook-autoqual-lab'}).click();
 await expect(cloudflare.getByRole('status').last()).toContainText('Sin cron verificado');
 await expect(cloudflare.getByRole('status').last()).toContainText('NO CONECTADO');
 await cloudflare.getByRole('button',{name:'Actualizar Cloudflare desde origen'}).click();
 await expect.poll(()=>calls.filter(x=>x==='cloudflare_fleet').length).toBeGreaterThan(1);
 await nav.getByRole('button',{name:'Resumen'}).click();
 const input=page.getByRole('textbox',{name:'Pregunta u orden'});
 await input.fill('¿Cuántos Workers hay en Cloudflare?');
 await page.getByRole('button',{name:'Enviar instrucción'}).click();
 await expect(page.getByRole('status').filter({hasText:'Cloudflare cuenta Fénix'})).toContainText('2 Workers registrados');
 await input.fill('Pausar cerebro-facebook-autoqual-lab en Cloudflare');
 await page.getByRole('button',{name:'Enviar instrucción'}).click();
 await expect(page.getByRole('status').filter({hasText:'ORDEN NO EJECUTADA'})).toContainText('solo lectura');
 expect(calls).not.toContain('submit_command');
 await page.screenshot({path:'test-results/operativa-cloudflare-live-qa.png',fullPage:false,animations:'disabled'});
});

test('Cloudflare outage retains audited 37-worker history without claiming live state or write powers',async({page})=>{
 const {calls}=await setup(page);
 await page.route('**/api/cerebro-cloudflare-fleet?**',async route=>{
  calls.push('cloudflare_unavailable');
  await route.fulfill({status:503,headers,body:JSON.stringify({status:'UNAVAILABLE',reason:'TOKEN_NOT_BOUND'})});
 });
 await page.getByRole('navigation',{name:'Áreas de Operativa'}).getByRole('button',{name:'Control'}).click();
 const cloud=page.getByRole('region',{name:'Cloudflare · inventario vivo de Workers'});
 await expect(cloud.getByRole('status').first()).toContainText('ARCHIVO, NO EN VIVO');
 await expect(cloud).toContainText('37');
 await expect(cloud).toContainText('cerebro-facebook-autoqual-lab');
 await cloud.getByRole('button',{name:'Examinar cerebro-facebook-autoqual-lab'}).click();
 await expect(cloud.getByRole('status').last()).toContainText('SOC-FB-FINANCIAL-REAL-ESTATE-V1');
 await expect(cloud.getByRole('status').last()).toContainText('AUTOQUAL_ENABLED=false');
 await expect(cloud.getByRole('status').last()).toContainText('NO CONECTADO');
 await page.getByRole('navigation',{name:'Áreas de Operativa'}).getByRole('button',{name:'Resumen'}).click();
 const input=page.getByRole('textbox',{name:'Pregunta u orden'});
 await input.fill('¿Cuántos Workers tenemos en Cloudflare?');
 await page.getByRole('button',{name:'Enviar instrucción'}).click();
 await expect(page.getByRole('status').filter({hasText:'Cloudflare en tiempo real NO DISPONIBLE'})).toContainText('Última auditoría');
 expect(calls).not.toContain('submit_command');
});
