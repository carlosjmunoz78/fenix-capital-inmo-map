/** Operativa-only LAB preview reader: never alters canonical chat/voice or PROD source. */
import {supabase,SUPABASE_PUBLISHABLE_KEY} from './supabase';

const HOST=/^(?:fenix-capital-preprod-[a-z0-9]+|fenix-capital-prep-git-b7776b-carlosjmunozcabeza-2582s-projects)\.vercel\.app$/;
export type UniversalLabCapability={
 company_id:string;engine_id:string;environment:'LAB';version:string;capability_id:string;
 policy:string;side_effects:string;executor:string;health:string
};
type CapResponse={
 status:string;source:string;transport?:string;
 capabilities?:UniversalLabCapability[];prod_execution_enabled?:boolean
};
type SummaryResponse={
 status:string;result?:{engine_registry_count:number;operational_engine_count:string;source:string}
};
export function canPreviewUniversalOperativa(location:Pick<Location,'hostname'|'search'>):boolean{
 return HOST.test(location.hostname.toLowerCase())
  &&new URLSearchParams(location.search).get('visual_lab')==='cockpit-v3'
  &&new URLSearchParams(location.search).get('section')==='operativa';
}
export type UniversalWorkActivityLab={
 state:'LIVE'|'CACHED'|'UNAVAILABLE';
 observedAt:string|null;
 rows:{run_id:number;engine_id:string|null;workflow_name:string;status:string;environment:string;html_url:string}[];
 source:'GITHUB_ACTIONS';
 job001Connected:false;
 provenance:'EXISTING_ACTIVITY_EDGE_GITHUB_ACTIONS'|'PUBLIC_GITHUB_REST_READ_ONLY_FALLBACK'|'UNAVAILABLE';
};
export type UniversalOwnerSourcesLab={
 state:'OK'|'PARTIAL'|'UNAVAILABLE';
 registryState:string;registrySource:string;
 companyRecords:number;projectRecords:number;engineRecords:number;
 factoryState:string;factorySource:string;factoryCatalog:number;factoryScaffolds:number;
 job001Connected:false;
};
export type UniversalCronObservationLab={
 state:'OK'|'UNAVAILABLE';active:number|null;recentSuccessful:number|null;
 jobs:{job_id:number;active:boolean;last_status:string;last_run_at:string|null;run_recent:boolean}[];
 source:'PREPROD_PG_CRON_OBSERVATION';hostingerMasterVerified:false;job001ExecutionVerified:false;
};
export type UniversalRpcObservationLab={
 state:'OK'|'UNAVAILABLE';calls:number|null;statsResetAt:string|null;observedAt:string|null;
 source:'PREPROD_JOB001_DISPATCH_RPC_STATS';runtimeVerified:false;downstreamVerified:false;
};
export type UniversalSeoBacklogLab={
 state:'OK'|'UNAVAILABLE';queued:number|null;done:number|null;
 waiting:number|null;cancelled:number|null;total:number|null;
 supervisorState:'DEGRADED'|'GREEN'|'PLANNED'|'UNVERIFIED'|'BLOCKED';
 lastDoneAt:string|null;supervisorMeasuredAt:string|null;
 dispatchAuthorized:false;publicationVerified:false;
};
export type UniversalJob001ControlLab={
 state:'OK'|'UNAVAILABLE';source_environment:'PREPROD';
 controlRows:number|null;enabledControls:number|null;externalControls:number|null;
 engineRecords:number|null;telemetryRecords:number|null;staleControls:number|null;
 observedAt:string|null;executionVerified:false;reason:string|null;cron:UniversalCronObservationLab;rpc:UniversalRpcObservationLab;seo:UniversalSeoBacklogLab;
 engineBindings:{engine_id:string;version:string;declared_state:string;freshness:'STALE_CONFIG'|'RECENT_CONFIG';observed_config_at:string}[];
 controlEngineBindings:{engine_id:string;configured_controls:number;enabled_controls:number;stale_controls:number}[];
};
export type UniversalDependencyPolicyLab={
 state:'SUSPENDED_VERIFIED'|'UNAVAILABLE';
 policyVersion:string|null;host:'staging.fenixcapital.es';
 canProbe:false;canPublish:false;canAutoResume:false;
 legacyCronEnforcement:'NOT_VERIFIED_OUTSIDE_UNIVERSAL_GATEWAY';
};
export type UniversalLabProof={
 reason?:'AUTH_REQUIRED'|'PREVIEW_ONLY'|'OWNER_AUTH_OR_POLICY_DENIED'|'COMPANY_OR_ENV_DENIED'|'READ_ACTION_NOT_ALLOWED'|'HTTP_401_403';
 kind:'ready'|'unavailable'|'denied';
 capabilities:UniversalLabCapability[];
 registeredDefinitions:number|null;
 operationalState:string;
 source:string;
 workActivity?:UniversalWorkActivityLab;
 ownerSources?:UniversalOwnerSourcesLab;
 job001?:UniversalJob001ControlLab;
 dependencies?:UniversalDependencyPolicyLab;
};
export async function readUniversalOperativaLab(signal?:AbortSignal):Promise<UniversalLabProof>{
 const unavailable=(kind:'unavailable'|'denied'):UniversalLabProof=>({
  kind,capabilities:[],registeredDefinitions:null,operationalState:'NO_VERIFICADO',source:'SIN_EVIDENCIA_LIVE'
 });
 if(typeof window==='undefined'||!canPreviewUniversalOperativa(window.location))return unavailable('denied');
 const {data:{session}}=await supabase.auth.getSession();
 if(!session?.access_token)return unavailable('denied');
 const endpoint=new URL('/api/cerebro-universal-preview',window.location.origin);
 const call=async(action:'list_capabilities'|'invoke_read'|'list_work_activity'|'list_owner_sources'|'get_job001_controls'|'get_dependency_status',extra:Record<string,unknown>={})=>{
  const response=await fetch(endpoint.href,{
   method:'POST',signal,cache:'no-store',
   headers:{Authorization:'Bearer '+session.access_token,apikey:SUPABASE_PUBLISHABLE_KEY,'content-type':'application/json'},
   body:JSON.stringify({action,params:{company_id:'fenix',environment:'LAB',...extra}})
  });
  if(response.status===401||response.status===403){
   let reason='HTTP_401_403';
   try{const body=await response.json() as {reason?:unknown};
    if(['AUTH_REQUIRED','PREVIEW_ONLY','OWNER_AUTH_OR_POLICY_DENIED','COMPANY_OR_ENV_DENIED','READ_ACTION_NOT_ALLOWED'].includes(String(body?.reason)))reason=String(body.reason);
   }catch{/* keep redacted generic reason */}
   throw Error('DENIED:'+reason);
  }
  if(response.status!==200)throw Error('UNAVAILABLE');
  return response.json() as Promise<unknown>;
 };
 try{
  const raw=await call('list_capabilities');
  if(!raw||typeof raw!=='object')return unavailable('unavailable');
  const r=raw as CapResponse;
  if(r.status!=='OK'||r.transport!=='PREVIEW_ONLY_SERVER_VERIFIED'||r.prod_execution_enabled!==false||!Array.isArray(r.capabilities))
   return unavailable('unavailable');
  const caps=r.capabilities.filter(c=>c&&c.company_id==='fenix'&&c.environment==='LAB'&&
   c.policy==='READ_ONLY'&&c.side_effects==='NONE'&&c.engine_id==='FACT-001'&&c.capability_id==='fact.registry.summary');
  if(caps.length!==1)return unavailable('unavailable');
  const response=await call('invoke_read',{capability_id:'fact.registry.summary'});
  const parsed=response as SummaryResponse;
  const count=parsed?.result?.engine_registry_count;
  if(parsed?.status!=='READ_EXECUTED'||!Number.isSafeInteger(count)||count!==179||
    parsed?.result?.operational_engine_count!=='NOT_VERIFIED')
   return unavailable('unavailable');
  // Work is an optional, separate source: never let a failed GitHub read
  // invalidate the successful FACT capability handshake.
  let workActivity:UniversalWorkActivityLab={
   state:'UNAVAILABLE',observedAt:null,rows:[],source:'GITHUB_ACTIONS',job001Connected:false,provenance:'UNAVAILABLE'
  };
  try{
   const work=await call('list_work_activity') as {
    status?:unknown;source?:unknown;source_status?:unknown;observed_at?:unknown;
    job001_connected?:unknown;runs?:unknown;transport?:unknown;activity_provenance?:unknown
   };
   if(work?.status==='OK'&&work.source==='GITHUB_ACTIONS'&&work.transport==='PREVIEW_ONLY_SERVER_VERIFIED'&&work.job001_connected===false&&
     (work.source_status==='LIVE'||work.source_status==='CACHED')&&Array.isArray(work.runs)){
    const rows=work.runs.slice(0,6).flatMap((item):UniversalWorkActivityLab['rows']=>{
     if(!item||typeof item!=='object')return [];
     const row=item as Record<string,unknown>;
     if(!Number.isSafeInteger(row.run_id)||typeof row.workflow_name!=='string'||typeof row.html_url!=='string'||
       !/^https:\/\/github\.com\/carlosjmunoz78\/fenix-capital-inmo-map\/actions\/runs\/\d+$/.test(row.html_url))return [];
     return [{
      run_id:row.run_id as number,engine_id:typeof row.engine_id==='string'?row.engine_id:null,
      workflow_name:row.workflow_name,status:typeof row.status==='string'?row.status:'UNKNOWN',
      environment:typeof row.environment==='string'?row.environment:'UNKNOWN',html_url:row.html_url
     }];
    });
    const provenance=(work.activity_provenance==='PUBLIC_GITHUB_REST_READ_ONLY_FALLBACK'?'PUBLIC_GITHUB_REST_READ_ONLY_FALLBACK':'EXISTING_ACTIVITY_EDGE_GITHUB_ACTIONS') as UniversalWorkActivityLab['provenance'];
    workActivity={state:work.source_status,observedAt:typeof work.observed_at==='string'?work.observed_at:null,rows,source:'GITHUB_ACTIONS',job001Connected:false,provenance};
   }
  }catch{/* work stays UNAVAILABLE, owner identity/FACT remain unchanged */}
  let ownerSources:UniversalOwnerSourcesLab={
   state:'UNAVAILABLE',registryState:'UNAVAILABLE',registrySource:'UNVERIFIED',
   companyRecords:0,projectRecords:0,engineRecords:0,
   factoryState:'UNAVAILABLE',factorySource:'UNVERIFIED',factoryCatalog:0,factoryScaffolds:0,job001Connected:false
  };
  try{
   const sources=await call('list_owner_sources') as {
    status?:unknown;source?:unknown;transport?:unknown;
    registry?:{status?:unknown;source_status?:unknown;companies?:unknown;projects?:unknown;engine_records?:unknown};
    factory?:{status?:unknown;source_status?:unknown;catalog_definitions?:unknown;scaffold_directories?:unknown};
    job001_connected?:unknown;execution_enabled?:unknown;prod_execution_enabled?:unknown;
   };
   if(['OK','PARTIAL'].includes(String(sources.status))&&sources.source==='EXISTING_OWNER_UNIVERSE_LAB'&&
     sources.transport==='PREVIEW_ONLY_SERVER_VERIFIED'&&sources.job001_connected===false&&
     sources.execution_enabled===false&&sources.prod_execution_enabled===false){
    const reg=sources.registry,fac=sources.factory;
    const num=(v:unknown)=>Number.isSafeInteger(v)&&Number(v)>=0?Number(v):0;
    ownerSources={
     state:sources.status as 'OK'|'PARTIAL',registryState:String(reg?.status||'UNAVAILABLE').slice(0,24),
     registrySource:String(reg?.source_status||'UNVERIFIED').slice(0,50),
     companyRecords:num(reg?.companies),projectRecords:num(reg?.projects),engineRecords:num(reg?.engine_records),
     factoryState:String(fac?.status||'UNAVAILABLE').slice(0,24),
     factorySource:String(fac?.source_status||'UNVERIFIED').slice(0,50),
     factoryCatalog:num(fac?.catalog_definitions),factoryScaffolds:num(fac?.scaffold_directories),
     job001Connected:false
    };
   }
  }catch{/* optional source unavailable: FACT proof remains valid, no false LIVE */}
  let job001:UniversalJob001ControlLab={
   state:'UNAVAILABLE',source_environment:'PREPROD',controlRows:null,
   enabledControls:null,externalControls:null,engineRecords:null,telemetryRecords:null,
   staleControls:null,observedAt:null,executionVerified:false,reason:null,engineBindings:[],controlEngineBindings:[],cron:{state:'UNAVAILABLE',active:null,recentSuccessful:null,jobs:[],source:'PREPROD_PG_CRON_OBSERVATION',hostingerMasterVerified:false,job001ExecutionVerified:false},rpc:{state:'UNAVAILABLE',calls:null,statsResetAt:null,observedAt:null,source:'PREPROD_JOB001_DISPATCH_RPC_STATS',runtimeVerified:false,downstreamVerified:false},seo:{state:'UNAVAILABLE',queued:null,done:null,waiting:null,cancelled:null,total:null,supervisorState:'UNVERIFIED',lastDoneAt:null,supervisorMeasuredAt:null,dispatchAuthorized:false,publicationVerified:false}
  };
  try{
   const j=await call('get_job001_controls') as {
    status?:unknown;source?:unknown;transport?:unknown;source_environment?:unknown;
    job001_queue_connected?:unknown;live_execution_verified?:unknown;prod_execution_enabled?:unknown;
    control_rows?:unknown;enabled_control_rows?:unknown;external_control_rows?:unknown;
    engine_state_records?:unknown;telemetry_records?:unknown;stale_control_rows?:unknown;
    observed_at?:unknown;reason?:unknown;engine_bindings?:unknown;control_engine_bindings?:unknown;cron_observation?:unknown;rpc_observation?:unknown;seo_backlog?:unknown
   };
   const why=new Set(['PREPROD_OWNER_CONTEXT_NOT_AUTHORIZED','PREPROD_OWNER_ONLY','PREPROD_OWNER_CONTEXT_INVALID','PREPROD_OWNER_RESOLVER_UNAVAILABLE','PREPROD_FENIX_LAB_SCOPE_ONLY','PREPROD_OWNER_SESSION_REQUIRED','PREPROD_GATEWAY_UNREACHABLE','PREPROD_OWNER_DENIED','PREPROD_SOURCE_UNAVAILABLE','PREPROD_SOURCE_CONTRACT_INVALID','PREPROD_COUNTS_INVALID','PREPROD_COUNT_MISMATCH','PREPROD_OBSERVED_AT_INVALID','PREPROD_TENANT_OR_RUNTIME_INVALID','ENGINE_BINDING_CONTRACT_INVALID','JOB_ENGINE_CONTRACT_INVALID','PREPROD_SOURCE_HTTP_404','PREPROD_DB_AUTH_UNAVAILABLE','PREPROD_READ_FAILED','PREPROD_OWNER_CONTEXT_UNAVAILABLE']);
   if(j.status==='UNAVAILABLE'&&j.source==='PREPROD_JOB001_CONTROL_METADATA'&&j.transport==='PREVIEW_ONLY_SERVER_VERIFIED'&&why.has(String(j.reason)))job001.reason=String(j.reason);
   const n=(v:unknown)=>Number.isSafeInteger(v)&&Number(v)>=0?Number(v):null;
   if(j?.status==='OK'&&j.source==='PREPROD_JOB001_CONTROL_METADATA'&&j.transport==='PREVIEW_ONLY_SERVER_VERIFIED'&&
     j.source_environment==='PREPROD'&&j.job001_queue_connected===false&&j.live_execution_verified===false&&
     j.prod_execution_enabled===false&&
     [j.control_rows,j.enabled_control_rows,j.external_control_rows,j.engine_state_records,j.telemetry_records,j.stale_control_rows].every(x=>n(x)!==null)){
    job001={state:'OK',source_environment:'PREPROD',
     controlRows:n(j.control_rows),enabledControls:n(j.enabled_control_rows),
     externalControls:n(j.external_control_rows),engineRecords:n(j.engine_state_records),
     telemetryRecords:n(j.telemetry_records),staleControls:n(j.stale_control_rows),
     observedAt:typeof j.observed_at==='string'?j.observed_at:null,executionVerified:false,reason:null,
     seo:(()=>{
      const x=j.seo_backlog;
      const no:UniversalSeoBacklogLab={state:'UNAVAILABLE',queued:null,done:null,waiting:null,
       cancelled:null,total:null,supervisorState:'UNVERIFIED',lastDoneAt:null,supervisorMeasuredAt:null,
       dispatchAuthorized:false,publicationVerified:false};
      if(!x||typeof x!=='object')return no;
      const r=x as Record<string,unknown>;
      const valid=(v:unknown)=>Number.isSafeInteger(v)&&Number(v)>=0;
      if(r.status!=='OK'||r.source!=='PREPROD_SEO_BACKLOG_READ_ONLY'||
         r.staging_probe_performed!==false||r.seo_dispatch_authorized!==false||
         r.downstream_publication_verified!==false||
         ![r.queued,r.done,r.waiting_prerequisites,r.cancelled,r.total].every(valid)||
         Number(r.total)!==Number(r.queued)+Number(r.done)+Number(r.waiting_prerequisites)+Number(r.cancelled)||
         !['DEGRADED','GREEN','PLANNED','UNVERIFIED','BLOCKED'].includes(String(r.supervisor_state)))
       return no;
      const date=(v:unknown)=>typeof v==='string'&&Number.isFinite(Date.parse(v))?v:null;
      return {state:'OK',queued:Number(r.queued),done:Number(r.done),
       waiting:Number(r.waiting_prerequisites),cancelled:Number(r.cancelled),total:Number(r.total),
       supervisorState:r.supervisor_state as UniversalSeoBacklogLab['supervisorState'],
       lastDoneAt:date(r.latest_done_at),supervisorMeasuredAt:date(r.supervisor_last_measured_at),
       dispatchAuthorized:false,publicationVerified:false};
     })(),
     rpc:(()=>{
      const raw=j.rpc_observation;
      const fallback:UniversalRpcObservationLab={state:'UNAVAILABLE',calls:null,statsResetAt:null,observedAt:null,
       source:'PREPROD_JOB001_DISPATCH_RPC_STATS',runtimeVerified:false,downstreamVerified:false};
      if(!raw||typeof raw!=='object')return fallback;
      const r=raw as Record<string,unknown>;
      if(r.status!=='OK'||r.source!==fallback.source||r.hostinger_origin_verified!==false||
         r.runtime_execution_verified!==false||r.downstream_effect_verified!==false||
         !Number.isSafeInteger(r.rpc_calls_since_reset)||Number(r.rpc_calls_since_reset)<0||
         typeof r.stats_reset_at!=='string'||!Number.isFinite(Date.parse(r.stats_reset_at))||
         typeof r.observed_at!=='string'||!Number.isFinite(Date.parse(r.observed_at)))return fallback;
      return {state:'OK',calls:Number(r.rpc_calls_since_reset),statsResetAt:r.stats_reset_at,
       observedAt:r.observed_at,source:fallback.source,runtimeVerified:false,downstreamVerified:false};
     })(),
     cron:(()=>{
      const c=j.cron_observation;
      const fallback:UniversalCronObservationLab={state:'UNAVAILABLE',active:null,recentSuccessful:null,jobs:[],
       source:'PREPROD_PG_CRON_OBSERVATION',hostingerMasterVerified:false,job001ExecutionVerified:false};
      if(!c||typeof c!=='object')return fallback;
      const v=c as Record<string,unknown>;
      if(v.status!=='OK'||v.source!=='PREPROD_PG_CRON_OBSERVATION'||v.is_job001_hostinger_master!==false||
         v.is_job001_runtime_proof!==false||!Array.isArray(v.jobs)||v.jobs.length>4)return fallback;
      const items:UniversalCronObservationLab['jobs']=[];
      for(const item of v.jobs){
       if(!item||typeof item!=='object')return fallback;
       const r=item as Record<string,unknown>;
       if(![6,22,23,25].includes(Number(r.job_id))||typeof r.active!=='boolean'||typeof r.last_status!=='string'||
          !['succeeded','failed','running','starting','sending','UNKNOWN'].includes(r.last_status)||
          typeof r.run_recent!=='boolean'||r.downstream_effect_verified!==false||
          r.last_run_at!==null&&(typeof r.last_run_at!=='string'||!Number.isFinite(Date.parse(r.last_run_at))))return fallback;
       items.push({job_id:r.job_id as number,active:r.active,last_status:r.last_status,
        last_run_at:r.last_run_at as string|null,run_recent:r.run_recent});
      }
      if(!Number.isSafeInteger(v.active)||!Number.isSafeInteger(v.recent_successful_cron_commands))return fallback;
      return {state:'OK',active:Number(v.active),recentSuccessful:Number(v.recent_successful_cron_commands),
       jobs:items,source:'PREPROD_PG_CRON_OBSERVATION',hostingerMasterVerified:false,job001ExecutionVerified:false};
     })(),
     engineBindings:Array.isArray(j.engine_bindings)?j.engine_bindings.slice(0,64).flatMap(item=>{
      if(!item||typeof item!=='object')return [];
      const r=item as Record<string,unknown>;
      if(typeof r.engine_id!=='string'||!/^[A-Z][A-Z0-9-]{2,60}$/.test(r.engine_id)||
         typeof r.version!=='string'||r.version.length>40||
         typeof r.declared_state!=='string'||r.declared_state.length>32||
         !['STALE_CONFIG','RECENT_CONFIG'].includes(String(r.freshness))||
         typeof r.observed_config_at!=='string'||!Number.isFinite(Date.parse(r.observed_config_at)))return [];
      return [{engine_id:r.engine_id,version:r.version,declared_state:r.declared_state,
       freshness:r.freshness as 'STALE_CONFIG'|'RECENT_CONFIG',observed_config_at:r.observed_config_at}];
     }):[],
     controlEngineBindings:Array.isArray(j.control_engine_bindings)?j.control_engine_bindings.slice(0,32).flatMap(item=>{
      if(!item||typeof item!=='object')return [];
      const r=item as Record<string,unknown>,num=(v:unknown)=>Number.isSafeInteger(v)&&Number(v)>=0?Number(v):null;
      if(typeof r.engine_id!=='string'||!/^[A-Z][A-Z0-9-]{2,60}$/.test(r.engine_id)||
         num(r.configured_controls)===null||num(r.enabled_controls)===null||
         num(r.stale_controls)===null)return [];
      return [{engine_id:r.engine_id,configured_controls:num(r.configured_controls) as number,
       enabled_controls:num(r.enabled_controls) as number,stale_controls:num(r.stale_controls) as number}];
     }):[]};
   }
  }catch{/* unavailable JOB-001 metadata never blocks existing owner/FACT evidence */}
  let dependencies:UniversalDependencyPolicyLab={
   state:'UNAVAILABLE',policyVersion:null,host:'staging.fenixcapital.es',
   canProbe:false,canPublish:false,canAutoResume:false,
   legacyCronEnforcement:'NOT_VERIFIED_OUTSIDE_UNIVERSAL_GATEWAY'
  };
  try{
   const d=await call('get_dependency_status') as {
    status?:unknown;source?:unknown;transport?:unknown;policy_version?:unknown;
    wordpress_staging?:{host?:unknown;state?:unknown;can_probe?:unknown;can_read?:unknown;
     can_publish?:unknown;can_modify?:unknown;can_auto_resume?:unknown;requires_explicit_owner_reactivation?:unknown};
    supported_execution?:unknown;prod_execution_enabled?:unknown;
    legacy_cron_enforcement?:unknown;
   };
   if(d.status==='OK'&&d.source==='OWNER_DIRECTIVE_LAB_POLICY'&&d.transport==='PREVIEW_ONLY_SERVER_VERIFIED'&&
     d.policy_version==='STAGING_SUSPENSION_2026_11_13'&&
     d.wordpress_staging?.host==='staging.fenixcapital.es'&&
     d.wordpress_staging.state==='SUSPENDED_BY_OWNER_UNTIL_FURTHER_NOTICE'&&
     d.wordpress_staging.can_probe===false&&d.wordpress_staging.can_read===false&&
     d.wordpress_staging.can_publish===false&&d.wordpress_staging.can_modify===false&&
     d.wordpress_staging.can_auto_resume===false&&d.wordpress_staging.requires_explicit_owner_reactivation===true&&
     d.supported_execution===false&&d.prod_execution_enabled===false&&
     d.legacy_cron_enforcement==='NOT_VERIFIED_OUTSIDE_UNIVERSAL_GATEWAY'){
    dependencies={state:'SUSPENDED_VERIFIED',policyVersion:d.policy_version,
     host:'staging.fenixcapital.es',canProbe:false,canPublish:false,canAutoResume:false,
     legacyCronEnforcement:'NOT_VERIFIED_OUTSIDE_UNIVERSAL_GATEWAY'};
   }
  }catch{/* Never present an unknown status as permitted or reactivated. */}
  return {kind:'ready',capabilities:caps,registeredDefinitions:count,
   operationalState:'NO_VERIFICADO',source:'FACT-001 · REPOSITORIO LAB',workActivity,ownerSources,job001,dependencies};
 }catch(error){
  if(signal?.aborted)return unavailable('unavailable');
  const code=error instanceof Error?error.message:'';
  if(code.startsWith('DENIED:'))return {...unavailable('denied'),reason:code.slice(7) as UniversalLabProof['reason']};
  return unavailable('unavailable');
 }
}

export type UniversalLabDryRun={kind:'validated'|'human_required'|'denied'|'unavailable';message:string;executed:false};
export async function simulateFactRegistryDryRunLab():Promise<UniversalLabDryRun>{
 const blocked=(kind:'denied'|'unavailable',message:string):UniversalLabDryRun=>({kind,message,executed:false});
 if(typeof window==='undefined'||!canPreviewUniversalOperativa(window.location))
  return blocked('denied','Solo disponible en la Operativa LAB autenticada');
 const {data:{session}}=await supabase.auth.getSession();
 if(!session?.access_token)return blocked('denied','No hay sesión válida');
 try{
  const response=await fetch(new URL('/api/cerebro-universal-preview',window.location.origin),{
   method:'POST',cache:'no-store',headers:{authorization:'Bearer '+session.access_token,apikey:SUPABASE_PUBLISHABLE_KEY,'content-type':'application/json'},
   body:JSON.stringify({action:'submit_command',params:{
    company_id:'fenix',environment:'LAB',engine_id:'FACT-001',
    capability_id:'fact.registry.summary',version:'0.1.0-lab',
    dry_run:true,estimated_additional_cost_eur:0,risk:'LOW',
    idempotency_key:'lab-fact001-dryrun-read-20261113',payload:{}
   }})
  });
  if(response.status===401||response.status===403)return blocked('denied','El servidor no autorizó la simulación');
  if(response.status!==200)return blocked('unavailable','La simulación LAB no pudo verificarse');
  const result=await response.json() as {
   status?:unknown;reason?:unknown;executed?:unknown;transport?:unknown;
   durable_audit?:unknown;idempotency_persisted?:unknown;prod_execution_enabled?:unknown
  };
  if(result.executed!==false||result.transport!=='PREVIEW_ONLY_SERVER_VERIFIED'||
    result.prod_execution_enabled!==false||
    (result.status==='DRY_RUN_VALIDATED'&&(result.durable_audit!==true||result.idempotency_persisted!==true)))
   return blocked('unavailable','Contrato seguro no acreditado');
  if(result.status==='DRY_RUN_VALIDATED')
   return {kind:'validated',executed:false,message:'Simulación FACT-001 validada y auditada de forma persistente en PREPROD. Sin ejecución ni permisos de producción.'};
  if(result.status==='HUMAN_REQUIRED')
   return {kind:'human_required',executed:false,message:'Revisión humana necesaria: '+String(result.reason||'LOW_CONFIDENCE').slice(0,50)};
  return blocked('unavailable','El Gateway no confirmó la simulación');
 }catch{return blocked('unavailable','La conexión LAB no respondió')}
}
