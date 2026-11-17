import {supabase,SUPABASE_PUBLISHABLE_KEY} from './supabase';
export type RoleAgentRecord={
 role_id:string;name:string;class:'SPECIALIST_ROLE'|'AGENT_PROFILE_IMPLEMENTED_PLAN_ONLY';
 department:string;company_scope:string;environment:string;state:string;
 reports_to:null;reports_to_state:'UNRESOLVED';engines:string[];knowledge_pack_id:string
};
export type RosterResponse={
 status:'OK';source:'REPOSITORY_ROLE_AGENT_REGISTRY_V1';source_state:string;
 source_environment:'PREPROD';company_id:'fenix';transport:'PREVIEW_ONLY_SERVER_VERIFIED';
 snapshot_date:string;read_only:true;executed:false;
 agent_runtime_verified:false;subagent_hierarchy_verified:false;
 active_agent_count:null;active_subagent_count:null;roles:RoleAgentRecord[]
};
export type RoleAgentResult={kind:'ready'|'denied'|'unavailable';data:RosterResponse|null;reason:string};
const HOST=/^(?:fenix-capital-preprod-[a-z0-9]+|fenix-capital-prep-git-b7776b-carlosjmunozcabeza-2582s-projects)\.vercel\.app$/;
export async function readRoleAgentRosterLab(signal?:AbortSignal):Promise<RoleAgentResult>{
 const unavailable=(kind:RoleAgentResult['kind'],reason:string):RoleAgentResult=>({kind,data:null,reason});
 if(typeof window==='undefined'||!HOST.test(window.location.hostname)||
  new URLSearchParams(window.location.search).get('visual_lab')!=='cockpit-v3')return unavailable('denied','PREVIEW_ONLY');
 try{
  const {data:{session}}=await supabase.auth.getSession();
  if(!session?.access_token)return unavailable('denied','OWNER_SESSION_REQUIRED');
  const response=await fetch('/api/cerebro-role-agent-roster?company_id=fenix',{method:'GET',signal,cache:'no-store',
   headers:{authorization:'Bearer '+session.access_token,apikey:SUPABASE_PUBLISHABLE_KEY,accept:'application/json'}});
  if(response.status===401||response.status===403)return unavailable('denied','OWNER_DENIED');
  if(response.status!==200)return unavailable('unavailable','REGISTRY_SOURCE_UNAVAILABLE');
  const r=await response.json() as RosterResponse;
  if(r.status!=='OK'||r.source!=='REPOSITORY_ROLE_AGENT_REGISTRY_V1'||
   r.transport!=='PREVIEW_ONLY_SERVER_VERIFIED'||r.company_id!=='fenix'||
   r.source_environment!=='PREPROD'||r.read_only!==true||r.executed!==false||
   r.agent_runtime_verified!==false||r.subagent_hierarchy_verified!==false||
   r.active_agent_count!==null||r.active_subagent_count!==null||
   !Array.isArray(r.roles)||r.roles.length!==11||
   r.roles.some(item=>!item||typeof item.role_id!=='string'||
    !['GLOBAL','fenix'].includes(item.company_scope)||item.reports_to!==null||
    item.reports_to_state!=='UNRESOLVED'||!Array.isArray(item.engines)))
    return unavailable('unavailable','REGISTRY_CONTRACT_INVALID');
  return {kind:'ready',data:r,reason:''};
 }catch{return unavailable('unavailable','ROSTER_CONNECTION_FAILED')}
}
