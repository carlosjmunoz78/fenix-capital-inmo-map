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
 await page.addInitScript(s=>{localStorage.setItem('fenix-preprod-auth-v2',JSON.stringify(s));sessionStorage.setItem('fenix-session-active','1')},session);
 await page.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.hostname==='fenix-capital-preprod-qa.vercel.app'){
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
 await expect(quick).toBeVisible({timeout:15_000});
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
