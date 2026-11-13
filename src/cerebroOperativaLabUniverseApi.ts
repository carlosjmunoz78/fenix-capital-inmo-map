/**
 * CEREBRO Owner Universe — read-only and LAB-only presentation adapter.
 * No service credentials, new Supabase permissions or company membership grants.
 * Do not reuse this fixed LAB URL as a default production runtime.
 */
import {SUPABASE_PUBLISHABLE_KEY,supabase} from './supabase';

const OWNER_UNIVERSE_LAB='https://cluhljgonannaafpmblx.supabase.co/functions/v1/cerebro-console-gateway-v36-followups-lab/owner-universe';
export type UniverseCompany={company_id:string;environment:string;registry_state:string;access_status:string;prod_authorized:boolean};
export type UniverseProject={company_id:string;project_id:string;environment:string;project_status:string;access_status:string};
export type UniverseEngine={company_id:string;engine_id:string;environment:string;version:string;engine_state:string;access_status:string;prod_authorized:boolean};
export type FactoryEngine={engine_id:string;name?:string;version?:string;environment?:string;declared_state?:string;source_type:string};
export type FactoryDirectory={engine_id:string;source_type:string;manifest_verified:boolean;runtime_verified:boolean;execution_enabled:boolean};
export type OwnerUniverse={
 status:'OK'|'PARTIAL';
 owner_scope:string;
 registry:{status:string;source_status:string;companies:UniverseCompany[];projects:UniverseProject[];engines:UniverseEngine[];source_tables?:string[];counts?:Record<string,number>};
 factory:{status:string;source_status:string;repository?:string;branch?:string;observed_at?:string;catalog:FactoryEngine[];scaffolded:FactoryDirectory[]};
 source_status?:{registry?:string;factory?:string};
 live_writes:false;
 prod_execution_enabled:false;
};
export type OwnerUniverseResult={kind:'loading'|'ready'|'partial'|'denied'|'unavailable';data:OwnerUniverse|null;reason?:string};
export type UniverseCompanyRequest='all'|'fenix'|'aion'|'captacasa';
const COMPANY_IDS=new Set(['all','fenix','aion','captacasa']);
const ID=/^[a-z0-9][a-z0-9_-]{0,79}$/;
const ENGINE_ID=/^[A-Za-z0-9-]{2,100}$/;
const isObject=(value:unknown):value is Record<string,unknown>=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
function str(value:unknown,max=150){return typeof value==='string'?value.slice(0,max):''}
function flag(value:unknown){return value===true}
function convert<T>(data:unknown,mapper:(row:Record<string,unknown>)=>T|null,max=100):T[]{
 if(!Array.isArray(data))return [];
 const rows:T[]=[];
 for(const item of data.slice(0,max)){
  if(!isObject(item))continue;
  const mapped=mapper(item);
  if(mapped)rows.push(mapped);
 }
 return rows;
}
function decode(raw:unknown):OwnerUniverse|null{
 if(!isObject(raw)||!isObject(raw.registry)||!isObject(raw.factory))return null;
 if(!['OK','PARTIAL'].includes(str(raw.status)))return null;
 // The LAB endpoint must explicitly state it has not executed/write-promoted.
 if(raw.live_writes!==false||raw.prod_execution_enabled!==false)return null;
 // V0 server only validates Fénix. Refuse unknown future scope labels until
 // their membership contract has been implemented and tested server-side.
 const verifiedScope=str(raw.owner_scope,90);
 if(verifiedScope!=='SERVER_VERIFIED_FENIX_ONLY')return null;
 const registry=raw.registry,factory=raw.factory;
 const companies=convert(registry.companies,r=>{
  const id=str(r.company_id,80).toLowerCase();if(!ID.test(id)||id!=='fenix')return null;
  return {company_id:id,environment:str(r.environment,32),registry_state:str(r.registry_state,48),
   access_status:str(r.access_status,90),prod_authorized:flag(r.prod_authorized)};
 });
 const verifiedCompanies=new Set(companies.map(x=>x.company_id));
 const projects=convert(registry.projects,r=>{
  const id=str(r.company_id,80).toLowerCase(),project_id=str(r.project_id,100);
  if(!ID.test(id)||!verifiedCompanies.has(id)||!project_id)return null;
  return {company_id:id,project_id,environment:str(r.environment,32),
   project_status:str(r.project_status,48),access_status:str(r.access_status,90)};
 });
 const engines=convert(registry.engines,r=>{
  const company_id=str(r.company_id,80).toLowerCase(),engine_id=str(r.engine_id,100);
  if(!ID.test(company_id)||!verifiedCompanies.has(company_id)||!ENGINE_ID.test(engine_id))return null;
  return {company_id,engine_id,environment:str(r.environment,32),version:str(r.version,40),
   engine_state:str(r.engine_state,48),access_status:str(r.access_status,90),prod_authorized:false};
 });
 const catalog=convert(factory.catalog,r=>{
  const id=str(r.engine_id,100);
  if(!ENGINE_ID.test(id))return null;
  return {engine_id:id,name:str(r.name,150),version:str(r.version,40),
   environment:str(r.environment,32),declared_state:str(r.declared_state,48),
   source_type:'FACT_ENGINE_SEED_NOT_RUNTIME_EVIDENCE'};
 },200);
 const scaffolded=convert(factory.scaffolded,r=>{
  const id=str(r.engine_id,100);
  if(!ENGINE_ID.test(id))return null;
  return {engine_id:id,source_type:'FACT_SCAFFOLD_DIRECTORY',manifest_verified:false,
   runtime_verified:false,execution_enabled:false};
 },200);
 return {
  status:str(raw.status) as 'OK'|'PARTIAL',owner_scope:str(raw.owner_scope,90),
  registry:{status:str(registry.status,40),source_status:str(registry.source_status,90),
   companies,projects,engines},
  factory:{status:str(factory.status,40),source_status:str(factory.source_status,90),
   repository:str(factory.repository,130),branch:str(factory.branch,110),catalog,scaffolded},
  source_status:isObject(raw.source_status)?
   {registry:str(raw.source_status.registry,90),factory:str(raw.source_status.factory,90)}:undefined,
  live_writes:false,prod_execution_enabled:false
 };
}
export async function fetchOwnerUniverseLab(company:UniverseCompanyRequest,signal?:AbortSignal):Promise<OwnerUniverseResult>{
 if(!COMPANY_IDS.has(company))return {kind:'denied',data:null,reason:'COMPANY_SCOPE_NOT_ALLOWED'};
 const {data:{session}}=await supabase.auth.getSession();
 if(!session?.access_token)return {kind:'denied',data:null,reason:'AUTHENTICATION_REQUIRED'};
 const isPreview=typeof window!=='undefined'
  &&/^(?:fenix-capital-preprod-[a-z0-9]+|fenix-capital-prep-git-b7776b-carlosjmunozcabeza-2582s-projects)\.vercel\.app$/.test(window.location.hostname)
  &&new URLSearchParams(window.location.search).get('visual_lab')==='cockpit-v3';
 const url=isPreview?new URL('/api/cerebro-preview-gateway?resource=universe',window.location.origin):new URL(OWNER_UNIVERSE_LAB);
 url.searchParams.set('company_id',company);
 try{
  const response=await fetch(url.href,{method:'GET',signal,cache:'no-store',
   headers:{Authorization:`Bearer ${session.access_token}`,apikey:SUPABASE_PUBLISHABLE_KEY,Accept:'application/json'}});
  // Do not surface raw backend errors, headers or privileged diagnostics to the UI.
  if(response.status===401||response.status===403)return {kind:'denied',data:null,reason:'OWNER_AUTH_REQUIRED'};
  if(!response.ok&&response.status!==207)return {kind:'unavailable',data:null,reason:'LAB_SOURCE_UNAVAILABLE'};
  const raw=await response.json() as unknown;
  const parsed=decode(raw);
  if(!parsed)return {kind:'unavailable',data:null,reason:'LAB_RESPONSE_INVALID'};
  // A non-Fénix company is only displayable after the server returns a verified scope.
  if(company!=='all'&&!parsed.registry.companies.some(c=>c.company_id===company&&c.access_status==='VERIFIED_OWNER_CONTEXT_NOT_REGISTERED'))
   return {kind:'denied',data:null,reason:'COMPANY_NOT_VERIFIED'};
  return {kind:parsed.status==='OK'?'ready':'partial',data:parsed};
 }catch(error){
  if(signal?.aborted)return {kind:'unavailable',data:null,reason:'REQUEST_CANCELLED'};
  return {kind:'unavailable',data:null,reason:'LAB_CONNECTION_FAILED'};
 }
}
