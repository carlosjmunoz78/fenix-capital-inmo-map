/** Operativa-only LAB preview reader: never alters canonical chat/voice or PROD source. */
import {supabase,SUPABASE_PUBLISHABLE_KEY} from './supabase';

const HOST=/^(?:fenix-capital-preprod-[a-z0-9]+|fenix-capital-prep-git-326d86-carlosjmunozcabeza-2582s-projects)\.vercel\.app$/;
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
export type UniversalLabProof={
 reason?:'AUTH_REQUIRED'|'PREVIEW_ONLY'|'OWNER_AUTH_OR_POLICY_DENIED'|'COMPANY_OR_ENV_DENIED'|'READ_ACTION_NOT_ALLOWED'|'HTTP_401_403';
 kind:'ready'|'unavailable'|'denied';
 capabilities:UniversalLabCapability[];
 registeredDefinitions:number|null;
 operationalState:string;
 source:string;
 workActivity?:UniversalWorkActivityLab;
 ownerSources?:UniversalOwnerSourcesLab;
};
export async function readUniversalOperativaLab(signal?:AbortSignal):Promise<UniversalLabProof>{
 const unavailable=(kind:'unavailable'|'denied'):UniversalLabProof=>({
  kind,capabilities:[],registeredDefinitions:null,operationalState:'NO_VERIFICADO',source:'SIN_EVIDENCIA_LIVE'
 });
 if(typeof window==='undefined'||!canPreviewUniversalOperativa(window.location))return unavailable('denied');
 const {data:{session}}=await supabase.auth.getSession();
 if(!session?.access_token)return unavailable('denied');
 const endpoint=new URL('/api/cerebro-universal-preview',window.location.origin);
 const call=async(action:'list_capabilities'|'invoke_read'|'list_work_activity'|'list_owner_sources',extra:Record<string,unknown>={})=>{
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
  return {kind:'ready',capabilities:caps,registeredDefinitions:count,
   operationalState:'NO_VERIFICADO',source:'FACT-001 · REPOSITORIO LAB',workActivity,ownerSources};
 }catch(error){
  if(signal?.aborted)return unavailable('unavailable');
  const code=error instanceof Error?error.message:'';
  if(code.startsWith('DENIED:'))return {...unavailable('denied'),reason:code.slice(7) as UniversalLabProof['reason']};
  return unavailable('unavailable');
 }
}
