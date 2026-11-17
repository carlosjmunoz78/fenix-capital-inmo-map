import {supabase,SUPABASE_PUBLISHABLE_KEY} from './supabase';
export type AgentDirectoryRecord={
 id:string;name:string;kind:'AGENT_ROLE'|'SUBAGENT_ROLE'|'SUBAGENT_TEMPLATE';family:string;
 state:string;source:string;purpose_plain:string;purpose_technical:string;
 engine_ids:string[];parent_id:string|null;hierarchy_verified:boolean;runtime_verified:boolean;
 company_scope:string;source_url:string
};
export type AgentDirectoryResponse={
 status:'OK';company_id:'fenix';coverage:'PARTIAL_SOURCED_INVENTORY_NOT_ALL_AGENTS';
 transport:'PREVIEW_ONLY_SERVER_VERIFIED'|'OWNER_PROD_READONLY';read_only:true;executed:false;
 active_agents_verified:false;subagent_instances_verified:false;
 counts:{known_agent_roles:number;registered_logical_subagent_roles:number;media_studio_source_roles:number;facebook_source_components:number;seo_source_profiles:number;instagram_source_components:number;linkedin_source_components:number;instagram_department_roles:number;subagent_templates_not_instances:number;
 total_runtime_instances:null;unindexed_sources_possible:boolean};
 page:{offset:number;limit:number;total:number;next_offset:number|null};
 sources:string[];records:AgentDirectoryRecord[]
};
export type AgentDirectoryResult={kind:'ready'|'denied'|'unavailable';data:AgentDirectoryResponse|null;reason:string};
export type AgentDirectoryFilters={offset:number;limit:number;kind:'AGENT_ROLE'|'SUBAGENT_ROLE'|'SUBAGENT_TEMPLATE'|'ALL';
 family:'ALL'|'ENGINEERING'|'REVENUE_SALES'|'SOCIAL_FACEBOOK'|'MEDIA_STUDIO'|'SEO_ENTERPRISE'|'SOCIAL_INSTAGRAM'|'SOCIAL_LINKEDIN'|'INSTAGRAM_DEPARTMENTS';q:string};
const PREVIEW_HOST=/^(?:fenix-capital-preprod-[a-z0-9]+|fenix-capital-prep-git-b7776b-carlosjmunozcabeza-2582s-projects)\.vercel\.app$/;
export async function readAgentDirectoryLab(filters:AgentDirectoryFilters,signal?:AbortSignal):Promise<AgentDirectoryResult>{
 const unavailable=(kind:AgentDirectoryResult['kind'],reason:string):AgentDirectoryResult=>({kind,data:null,reason});
 if(typeof window==='undefined')return unavailable('denied','BROWSER_REQUIRED');
 const host=window.location.hostname,prod=host==='app.fenixcapital.es';
 if(!prod&&(!PREVIEW_HOST.test(host)||new URLSearchParams(window.location.search).get('visual_lab')!=='cockpit-v3'))
  return unavailable('denied','OWNER_SCOPE_REQUIRED');
 const transport=prod?'OWNER_PROD_READONLY':'PREVIEW_ONLY_SERVER_VERIFIED';
 try{
  const {data:{session}}=await supabase.auth.getSession();
  if(!session?.access_token)return unavailable('denied','OWNER_SESSION_REQUIRED');
  const args=new URLSearchParams({company_id:'fenix',offset:String(filters.offset),limit:String(filters.limit),
   kind:filters.kind,family:filters.family,q:filters.q});
  const r=await fetch('/api/cerebro-agent-directory?'+args.toString(),{method:'GET',cache:'no-store',signal,
   headers:{authorization:'Bearer '+session.access_token,apikey:SUPABASE_PUBLISHABLE_KEY,accept:'application/json'}});
  if(r.status===401||r.status===403)return unavailable('denied','OWNER_DENIED');
  if(r.status!==200)return unavailable('unavailable','DIRECTORY_SOURCE_UNAVAILABLE');
  const data=await r.json() as AgentDirectoryResponse;
  if(data.status!=='OK'||data.company_id!=='fenix'||data.coverage!=='PARTIAL_SOURCED_INVENTORY_NOT_ALL_AGENTS'||
   data.transport!==transport||data.read_only!==true||data.executed!==false||
   data.active_agents_verified!==false||data.subagent_instances_verified!==false||
   data.counts?.total_runtime_instances!==null||
   !Array.isArray(data.records)||data.records.length>filters.limit||
   data.page?.offset!==filters.offset||data.page?.limit!==filters.limit||
   !Number.isSafeInteger(data.page.total)||data.page.total<0||
   data.records.some(x=>!x.id||!x.name||!x.purpose_plain||!x.source||
     !['AGENT_ROLE','SUBAGENT_ROLE','SUBAGENT_TEMPLATE'].includes(x.kind)||!Array.isArray(x.engine_ids)||
     x.runtime_verified!==false||typeof x.hierarchy_verified!=='boolean'))
    return unavailable('unavailable','DIRECTORY_CONTRACT_INVALID');
  return {kind:'ready',data,reason:''};
 }catch{
  if(signal?.aborted)return unavailable('unavailable','REQUEST_CANCELLED');
  return unavailable('unavailable','DIRECTORY_CONNECTION_FAILED');
 }
}
