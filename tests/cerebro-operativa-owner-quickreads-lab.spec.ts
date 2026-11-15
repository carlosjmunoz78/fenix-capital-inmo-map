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
 let cloudflareReadUnbound=false;
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
     ...common,...lab,updated_at:new Date(Date.now()-1000).toISOString(),observed_at:new Date().toISOString(),
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
   if(url.pathname==='/api/cerebro-device-live'){
    calls.push('device_live_read');
    if(request.method()!=='GET')return route.fulfill({status:405,headers,body:'{"status":"UNAVAILABLE"}'});
    const current=new Date().toISOString();
    const row=(environment:'LAB'|'PREPROD',devices:number,total:number,done:number,failed:number,verified:number,median:number,p90:number)=>({
      environment,meaning:environment==='LAB'?'LAB_DEVICE_RECORDS':'HISTORICAL_PREPROD_LABEL_IN_LAB_PROJECT',
      stored_online_count:devices,not_revoked_count:devices,heartbeat_5m_count:0,
      heartbeat_24h_count:0,last_seen_at:environment==='LAB'?'2026-11-03T07:35:51.927Z':'2026-11-12T13:04:02.895Z',
      commands_total:total,commands_completed:done,commands_failed:failed,commands_other:0,
      commands_created_24h:0,latest_completed_at:environment==='LAB'?'2026-10-28T14:51:33.120Z':'2026-11-04T16:02:09.353Z',
      receipt_count:total,semantically_verified_receipts:verified,
      comparable_successful_duration_samples:environment==='LAB'?6:66,
      p50_completed_seconds:median,p90_completed_seconds:p90
    });
    return route.fulfill({status:200,headers,body:JSON.stringify({
      status:'OK',source:'FENIX_DEVICE_LAB_OWNER_READ_V1',company_id:'fenix',environment:'LAB',
      observed_at:current,read_only:true,executed:false,data_freshness:'SOURCE_READ_AT_REQUEST_TIME',
      active_agents_verified:null,active_subagents_verified:null,active_jobs_verified:null,cost_eur_measured:null,
      environments:[row('LAB',1,8,6,2,6,28.2,113.1),row('PREPROD',4,96,75,21,75,3.7,127.7)]
    })});
   }
   if(url.pathname==='/api/cerebro-cloudflare-fleet'){
    calls.push('cloudflare_fleet');
    if(cloudflareReadUnbound)return route.fulfill({status:503,headers,body:JSON.stringify({status:'UNAVAILABLE',reason:'CLOUDFLARE_READ_TOKEN_NOT_BOUND',read_only:true,controls_enabled:false,workers:[]})});
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
   if(url.pathname==='/api/cerebro-fleet-job-detail'){
    calls.push('job_detail');
    if(request.method()!=='GET')return route.fulfill({status:405,headers,body:'{"status":"UNAVAILABLE"}'});
    if(url.searchParams.get('repo')!=='fenix-capital-inmo-map'||url.searchParams.get('run_id')!=='105')
     return route.fulfill({status:403,headers,body:'{"status":"UNAVAILABLE","reason":"TARGET_NOT_ALLOWLISTED"}'});
    return route.fulfill({status:200,headers,body:JSON.stringify({
     status:'OK',job_status:'FAILED_STEP_VERIFIED',source:'GITHUB_ACTIONS_PUBLIC_JOB_METADATA',
     company_id:'fenix',environment:'LAB',observed_at:new Date().toISOString(),
     owner_verified:true,read_only:true,executed:false,repo:'carlosjmunoz78/fenix-capital-inmo-map',
     run_id:105,job_id:505,job_name:'QA con fallo',failed_step_number:2,
     failed_step_name:'Ejecutar pruebas',
     evidence_url:'https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/105/job/505',
     engine_id:null,agent_id:null,subagent_id:null,runtime_failure_verified:false
    })});
   }
   if(url.pathname==='/api/cerebro-fleet-observe'){
    calls.push('fleet_observe');
    if(request.method()!=='GET')return route.fulfill({status:405,headers,body:'{"status":"CLOSED"}'});
    const entries=Array.from({length:11},(_,i)=>({id:i===10?'AGT-SALES-EXECUTIVE':'ENG-TEST-'+String(i).padStart(2,'0'),
     name:i===10?'Ventas':'Especialista '+i,department:i===10?'REVENUE_SALES':'ENGINEERING',
     engine_bindings:i===10?['SALE-001','LEAD-001','CRM-001','C360-001']:['FACT-001','QA-001'],
     company_id:'GLOBAL',environment:'PREPROD',state:'DECLARED',reports_to:null,runtime_verified:false}));
    return route.fulfill({status:200,headers,body:JSON.stringify({
     status:'OK',source:'OWNER_LAB_FLEET_SOURCES_V1',environment:'LAB',company_id:'fenix',
     observed_at:new Date().toISOString(),verified_owner:true,read_only:true,execution_enabled:false,additional_cost_eur:0,
     roles:{declared_role_profiles:11,active_agent_count:null,verified_subagent_count:null,
      unknown_agent_count:true,unknown_subagent_count:true,hierarchy_complete:false,
      by_department:{ENGINEERING:10,REVENUE_SALES:1},entries,registry_id:'CEREBRO_ROLE_AGENT_REGISTRY_V1',
      registry_environment:'PREPROD',registry_status:'ACTIVE_PREPROD_ADDITIVE'},
     engine_registry_count:179,engine_registry_semantics:'DEFINED_NOT_RUNNING',
     sources:[{platform:'GitHub',repo:'carlosjmunoz78/fenix-capital-inmo-map',
       name:'App / CEREBRO',state:'LIVE',reason:null,observed_at:new Date().toISOString(),
       observed_sample:2,active_in_sample:1,queued_in_sample:0,total_repo_run_count:15,
       timing_samples:[{workflow_name:'LAB contrato vivo',sample_size:4,p50_upper_bound_seconds:20,p90_upper_bound_seconds:41,
        method:'GITHUB_RUN_STARTED_TO_LAST_UPDATE_PROXY',engine_mapping_verified:false}],
       recent:[{run_id:101,name:'LAB contrato vivo',status:'in_progress',conclusion:null,
        updated_at:'2026-11-15T00:50:00Z',url:'https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/101',
        agent_id:null,engine_id:null,subagent_id:null},
        {run_id:105,name:'QA con fallo',status:'completed',conclusion:'failure',
         updated_at:new Date(Date.now()-15000).toISOString(),
         url:'https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/105',
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
 return{calls,outside,quick,setCloudflareReadUnbound:(value:boolean)=>{cloudflareReadUnbound=value}};
}

test('Owner Operativa answers missing-agent, ETA/cost and priority advice without executing any motor',async({page})=>{
 const {calls}=await setup(page);
 await page.getByRole('navigation',{name:'Áreas de Operativa'}).getByRole('button',{name:'Resumen'}).click();
 const prompt=page.getByRole('textbox',{name:'Pregunta u orden'});
 const send=page.getByRole('button',{name:'Enviar instrucción'});
 const answer=page.getByRole('status').filter({hasText:'Respuesta del control operativo'});
 await prompt.fill('Qué agentes faltan para SEO-001');
 await send.click();
 await expect(answer).toContainText('AGENTES QUE FALTAN: NO CUANTIFICABLES');
 await expect(answer).toContainText('179 motores lógicos DEFINIDOS');
 await expect(answer).toContainText('SIN ASIGNACIÓN DE PERFIL PARA SEO-001 EN ESTE REGISTRO');
 await prompt.fill('Qué agentes faltan para FACT-001');
 await send.click();
 await expect(answer).toContainText('ASIGNACIÓN DECLARADA PARA FACT-001 EN ESTE REGISTRO');
 await expect(answer).toContainText('Especialista 0');
  await prompt.fill('¿Cuánto tarda y cuesta SEO-001?');
 await send.click();
 await expect(answer).toContainText('TIEMPO: NO_MEDIDO');
 await expect(answer).toContainText('COSTE REAL, INCREMENTAL Y DE ACELERACIÓN: NO_MEDIDOS');
 await prompt.fill('¿Cuánto tarda LAB contrato vivo?');
 await send.click();
 await expect(answer).toContainText('TIEMPO DEL WORKFLOW GITHUB LAB contrato vivo');
 await expect(answer).toContainText('p50=20 s, p90=41 s');
 await expect(answer).toContainText('ETA DEL MOTOR: SIN_BASE_SUFICIENTE');
 await prompt.fill('¿Cuántos dispositivos tienen latido?');
 await send.click();
 await expect(answer).toContainText('LECTURA ACTUAL LAB');
 await expect(answer).toContainText('0 latidos últimos 5 min');
 await expect(answer).toContainText('0 latidos últimas 24 h');
 await expect(answer).toContainText('Agentes, subagentes y trabajos autónomos activos: DESCONOCIDOS');
 await expect(answer).toContainText('NO App PREPROD activa');
 await expect(answer).toContainText('Coste real: NO_MEDIDO');
 expect(calls).toContain('device_live_read');
 await prompt.fill('¿Qué deberíamos priorizar?');
 await send.click();
 await expect(answer).toContainText('SIGUIENTE AVANCE RECOMENDABLE');
 await prompt.fill('acelerar LAB-DEMO-001');
 await send.click();
 await expect(answer).toContainText('ORDEN NO EJECUTADA: ACCELERATE');
 expect(calls.filter(x=>x==='lab_control'||x==='submit_command')).toHaveLength(0);
 expect(calls.filter(x=>x==='fleet_observe').length).toBeGreaterThanOrEqual(3);
});

test('Cloudflare owner Preview reports missing read-only binding precisely, never a fictitious live connection',async({page})=>{
 const {calls,setCloudflareReadUnbound}=await setup(page);
 await page.getByRole('navigation',{name:'Áreas de Operativa'}).getByRole('button',{name:'Control'}).click();
 const provider=page.getByRole('region',{name:'Cloudflare · inventario vivo de Workers'});
 await expect(provider).toContainText('Cloudflare API');
 setCloudflareReadUnbound(true);
 await provider.getByRole('button',{name:'Actualizar Cloudflare desde origen'}).click();
 const alert=provider.getByRole('status',{name:'Conexión Cloudflare Preview pendiente'});
 await expect(alert).toContainText('SIN CREDENCIAL DE LECTURA CONFIGURADA');
 await expect(alert).toContainText('CEREBRO_CF_READ_TOKEN_PREVIEW');
 await expect(provider).toContainText('ARCHIVO COMPUESTO, NO EN VIVO');
 await expect(provider).not.toContainText('EN VIVO · Cloudflare API');
 expect(calls.filter(x=>x==='cloudflare_fleet').length).toBeGreaterThanOrEqual(2);
 expect(calls).not.toContain('submit_command');
});

test('Owner lab current device reader is authenticated, never becomes autonomous agent count',async({page})=>{
 const {calls}=await setup(page);
 await page.getByRole('navigation',{name:'Áreas de Operativa'}).getByRole('button',{name:'Control'}).click();
 const live=page.getByRole('region',{name:'Latidos y trabajos de dispositivo · fuente actual LAB'});
 await expect(live).toContainText('LECTURA ACTUAL LAB');
 await expect(live).toContainText('Dispositivos no revocados: 1');
 await expect(live).toContainText('Dispositivos no revocados: 4');
 await expect(live).toContainText('Contacto últimos 5 minutos: 0');
 await expect(live).toContainText('Agentes, subagentes y jobs activos: DESCONOCIDOS');
 await expect(live).toContainText('Costes reales: NO_MEDIDOS');
 await expect(live).toContainText('PREPROD · etiqueta histórica en Supabase LAB');
 const before=calls.filter(x=>x==='device_live_read').length;
 await live.getByRole('button',{name:'Actualizar latidos ahora'}).click();
 await expect.poll(()=>calls.filter(x=>x==='device_live_read').length).toBeGreaterThan(before);
 expect(calls).not.toContain('lab_control');
 expect(calls).not.toContain('submit_command');
});

test('Dated Supabase LAB device audit shows historical heartbeats and command receipts, never agents active',async({page})=>{
 const {calls}=await setup(page);
 await page.getByRole('navigation',{name:'Áreas de Operativa'}).getByRole('button',{name:'Control'}).click();
 const region=page.getByRole('region',{name:'Auditoría histórica de agentes de dispositivo LAB'});
 await expect(region).toContainText('ARCHIVO FECHADO, NO EN VIVO');
 await expect(region).toContainText('Registros de dispositivo no revocados: 5');
 await expect(region).toContainText('Con latido durante las 24 horas anteriores a la auditoría: 0');
 await expect(region).toContainText('Censo de agentes y subagentes activos: DESCONOCIDO');
 await expect(region).toContainText('LAB · dispositivos históricos');
 await expect(region).toContainText('PREPROD · etiqueta histórica en BD LAB');
 await expect(region).toContainText('Órdenes anteriores: 8 · completadas 6 · fallidas 2');
 await expect(region).toContainText('Órdenes anteriores: 96 · completadas 75 · fallidas 21');
 await expect(region).toContainText('p50 28.2 s · p90 113.1 s');
 await expect(region).toContainText('p50 3.7 s · p90 127.7 s');
 await expect(region).toContainText('no un despliegue activo de App PREPROD');
 expect(calls).not.toContain('lab_control');
 expect(calls).not.toContain('submit_command');
});

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
 const triage=fleet.getByRole('region',{name:'Diagnóstico de fallos y prioridades sugeridas'});
 await expect(triage).toContainText('proveedores sin diagnóstico');
 await expect(triage).toContainText('Sin diagnóstico en vivo: Cloudflare');
 await expect(triage).toContainText('Coste: NO_MEDIDO');
 await expect(triage).toContainText('Último resultado fallido: QA con fallo');
 expect(calls).not.toContain('job_detail');
 await triage.getByRole('button',{name:'Analizar paso fallido (solo lectura)'}).click();
 await expect(triage).toContainText('Paso fallido: 2 · Ejecutar pruebas');
 await expect(triage).toContainText('No acredita fallo del motor, del agente ni causa raíz');
 expect(calls.filter(x=>x==='job_detail')).toHaveLength(1);

 const inspector=fleet.getByRole('region',{name:'Inspector de motores no listados'});
 await expect(inspector).toContainText('ASIGNACIÓN DECLARADA en el registro para FACT-001');
 await expect(inspector).toContainText('NO agentes ejecutándose');
 const inspectorField=inspector.getByRole('textbox',{name:'Identificador del motor a consultar'});
 await inspectorField.fill('SEO-001');
 await expect(inspector).toContainText('SIN ASIGNACIÓN EN ESTE REGISTRO para SEO-001');
 await inspectorField.fill('C360-001');
 await expect(inspector).toContainText('Ventas (AGT-SALES-EXECUTIVE)');
 await inspectorField.fill('https://invalid.test');
 await expect(inspector).toContainText('Escribe el identificador exacto del motor');

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
 const evidence=worker.getByRole('region',{name:'Evidencia de identidad y actividad LAB'});
 await expect(evidence).toContainText('LECTURA DE ESTADO RECIENTE: PAUSED');
 await expect(evidence).toContainText('Agente, subagente, job activo y latido independiente:');
 await expect(evidence).toContainText('NO VERIFICADOS');
 await expect(evidence).toContainText('Coste real: NO_MEDIDO');
 await expect(evidence).not.toContainText('agentes activos: 1');
 await worker.getByRole('button',{name:'Reanudar LAB'}).click();
 await worker.getByRole('button',{name:'Confirmar una vez'}).click();
 await expect(worker).toContainText('CONTROL LAB VERIFICADO: RESUME');
 await expect(worker).toContainText('Estado observado: RUNNING');
 await expect(evidence).toContainText('LECTURA DE ESTADO RECIENTE: RUNNING');
 await expect(evidence).toContainText('Autónomo: NO');
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
 await expect(page.getByRole('status').filter({hasText:'LAB-DEMO-001 · ESTADO OBSERVADO RECIENTEMENTE'})).toContainText('RUNNING (estado deseado, no ejecución activa)');
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

test('Cloudflare outage shows composite 38-worker dated inventory and 5/5 Free cron quota without write powers',async({page})=>{
 const {calls}=await setup(page);
 await page.route('**/api/cerebro-cloudflare-fleet?**',async route=>{
  calls.push('cloudflare_unavailable');
  await route.fulfill({status:503,headers,body:JSON.stringify({status:'UNAVAILABLE',reason:'TOKEN_NOT_BOUND'})});
 });
 await page.getByRole('navigation',{name:'Áreas de Operativa'}).getByRole('button',{name:'Control'}).click();
 const cloud=page.getByRole('region',{name:'Cloudflare · inventario vivo de Workers'});
 await expect(cloud.getByRole('status').first()).toContainText('ARCHIVO COMPUESTO, NO EN VIVO');
 await expect(cloud).toContainText('38');
 await expect(cloud.getByRole('region',{name:'Gate de capacidad cron Cloudflare Free'})).toContainText('5/5');
 await expect(cloud).toContainText('cerebro-operativa-control-canary-lab');
 await expect(cloud).toContainText('cerebro-facebook-autoqual-lab');
 await cloud.getByRole('button',{name:'Examinar cerebro-facebook-autoqual-lab'}).click();
 await expect(cloud.getByRole('status').last()).toContainText('SOC-FB-FINANCIAL-REAL-ESTATE-V1');
 await expect(cloud.getByRole('status').last()).toContainText('AUTOQUAL_ENABLED=false');
 await expect(cloud.getByRole('status').last()).toContainText('NO CONECTADO');
 await page.getByRole('navigation',{name:'Áreas de Operativa'}).getByRole('button',{name:'Resumen'}).click();
 const input=page.getByRole('textbox',{name:'Pregunta u orden'});
 await input.fill('¿Cuántos Workers tenemos en Cloudflare?');
 await page.getByRole('button',{name:'Enviar instrucción'}).click();
 await expect(page.getByRole('status').filter({hasText:'Cloudflare en tiempo real NO DISPONIBLE'})).toContainText('Auditoría compuesta');
 expect(calls).not.toContain('submit_command');
});

test('Cloudflare canary physical deployed-version receipts are dated and never treated as app control',async({page})=>{
 const {calls}=await setup(page);
 await page.route('**/api/cerebro-cloudflare-fleet?**',async route=>{
  calls.push('cf_unavailable');
  await route.fulfill({status:503,headers,body:JSON.stringify({status:'UNAVAILABLE',reason:'OWNER_READ_TOKEN_NOT_BOUND'})});
 });
 const nav=page.getByRole('navigation',{name:'Áreas de Operativa'});
 await nav.getByRole('button',{name:'Control'}).click();
 const cf=page.getByRole('region',{name:'Cloudflare · inventario vivo de Workers'});
 await expect(cf.getByRole('status').first()).toContainText('ARCHIVO COMPUESTO, NO EN VIVO');
 const queueProof=cf.getByRole('region',{name:'Cola Cloudflare · prueba física de trabajo LAB'});
 await expect(queueProof).toContainText('PAUSED_SKIPPED');
 await expect(queueProof).toContainText('WORK_UNIT_ACK');
 await expect(queueProof).toContainText('1 unidad de prueba');
 await expect(queueProof).toContainText('NO CONECTADO');
 const physical=cf.getByRole('region',{name:'Control físico de configuración del canario LAB'});
 await expect(physical).toContainText('CONTROL_PAUSED=false');
 await expect(physical).toContainText('CONTROL_PAUSED=true');
 await expect(physical).toContainText('NO CONECTADO');
 await expect(physical).toContainText('fe57b5f7-48b7-44a9-8cbc-ddbbcbca5134');
 await cf.getByRole('textbox',{name:'Buscar Worker Cloudflare'}).fill('control-canary');
 await cf.getByRole('button',{name:'Examinar cerebro-operativa-control-canary-lab'}).click();
 await expect(cf.getByRole('status').last()).toContainText('CONTROL_PAUSED=true');
 await nav.getByRole('button',{name:'Resumen'}).click();
 const input=page.getByRole('textbox',{name:'Pregunta u orden'});
 await input.fill('estado LAB-CF-CANARY-001');
 await page.getByRole('button',{name:'Enviar instrucción'}).click();
 await expect(page.getByRole('status').filter({hasText:'ARCHIVO, no en vivo'})).toContainText('WORK_UNIT_ACK');
 await expect(page.getByRole('status').filter({hasText:'ARCHIVO, no en vivo'})).toContainText('CONTROL_PAUSED=true');
 await expect(page.getByRole('status').filter({hasText:'ARCHIVO, no en vivo'})).toContainText('NO CONECTADO');
 expect(calls).not.toContain('submit_command');
 await page.screenshot({path:'test-results/operativa-cloudflare-canary-provider-proof.png',fullPage:false,animations:'disabled'});
});

test('Cloudflare 22-Queue historical consumer topology, backlog and owner chat distinguish data from jobs',async({page})=>{
 const {calls}=await setup(page);
 const nav=page.getByRole('navigation',{name:'Áreas de Operativa'});
 await nav.getByRole('button',{name:'Control'}).click();
 const queues=page.getByRole('region',{name:'Cloudflare Queues · mapa de consumidores'});
 await expect(queues).toContainText('22');
 await expect(queues.getByRole('status').first()).toContainText('ARCHIVO, NO EN VIVO');
 await expect(queues).toContainText('Consumidor configurado NO equivale a agente activo');
 await queues.getByRole('textbox',{name:'Filtrar colas Cloudflare'}).fill('control-canary-queue');
 await expect(queues).toContainText('cerebro-operativa-control-canary-queue-lab-eu');
 await queues.getByRole('button',{name:'Examinar cola cerebro-operativa-control-canary-queue-lab-eu'}).click();
 await expect(queues.getByRole('status').last()).toContainText('cerebro-operativa-control-canary-lab');
 await expect(queues.getByRole('status').last()).toContainText('NO CONECTADAS');
 await nav.getByRole('button',{name:'Resumen'}).click();
 const input=page.getByRole('textbox',{name:'Pregunta u orden'});
 await input.fill('¿Cuántas colas Cloudflare tenemos y qué backlog hay?');
 await page.getByRole('button',{name:'Enviar instrucción'}).click();
 await expect(page.getByRole('status').filter({hasText:'AUDITORÍA ARCHIVADA, no en vivo'})).toContainText('22');
 await expect(page.getByRole('status').filter({hasText:'AUDITORÍA ARCHIVADA, no en vivo'})).toContainText('0 mensajes pendientes observados');
 await input.fill('Pausar cola Cloudflare');
 await page.getByRole('button',{name:'Enviar instrucción'}).click();
 await expect(page.getByRole('status').filter({hasText:'ORDEN NO EJECUTADA'})).toContainText('controles de despacho');
 expect(calls).not.toContain('submit_command');
});

test('Private Social PR and Worker inventory is dated, read-only and does not assert active agent counts',async({page})=>{
 const {calls}=await setup(page);
 await page.getByRole('navigation',{name:'Áreas de Operativa'}).getByRole('button',{name:'Control'}).click();
 const social=page.getByRole('region',{name:'Social · Instagram y Facebook AUTOQUAL auditados'});
 await expect(social).toContainText('NO EN VIVO');
 await expect(social).toContainText('SOC-IG-FINANCIAL-REAL-ESTATE-V1');
 await expect(social).toContainText('SOC-FB-FINANCIAL-REAL-ESTATE-V1');
 await expect(social).toContainText('AUTOQUAL OFF');
 await expect(social).toContainText('Agentes activos: DESCONOCIDO');
 await social.getByRole('button',{name:'Comprobar detalles auditados SOC-IG-FINANCIAL-REAL-ESTATE-V1'}).click();
 await expect(social.getByRole('status')).toContainText('NO CONECTADOS');
 await page.getByRole('navigation',{name:'Áreas de Operativa'}).getByRole('button',{name:'Resumen'}).click();
 const input=page.getByRole('textbox',{name:'Pregunta u orden'});
 await input.fill('estado Instagram AUTOQUAL');
 await page.getByRole('button',{name:'Enviar instrucción'}).click();
 await expect(page.getByRole('status').filter({hasText:'AUDITORÍA HISTÓRICA'})).toContainText('SOC-IG-FINANCIAL-REAL-ESTATE-V1');
 await input.fill('pausar Facebook AUTOQUAL');
 await page.getByRole('button',{name:'Enviar instrucción'}).click();
 await expect(page.getByRole('status').filter({hasText:'ORDEN NO EJECUTADA'})).toContainText('adaptador autenticado');
 expect(calls).not.toContain('submit_command');
 await page.screenshot({path:'test-results/operativa-private-social-lab-audit.png',fullPage:false,animations:'disabled'});
});
