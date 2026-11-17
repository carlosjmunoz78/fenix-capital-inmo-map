/** Owner-authenticated LAB roster from the existing immutable Git revision.
 * No agent control, execution or credential exposure. Does not grant multi-company access.
 */
import registry from '../cerebro/registry/role-agent-registry.v1.json' with { type: 'json' };
type H=string|string[]|undefined;
type Req={method?:string;url?:string;headers:Record<string,H>};
type Res={status:(v:number)=>Res;setHeader:(k:string,v:string)=>void;json:(v:unknown)=>void};
const HOST=/^(?:fenix-capital-preprod-[a-z0-9]+|fenix-capital-prep-git-b7776b-carlosjmunozcabeza-2582s-projects)\.vercel\.app$/;
const OWNER='https://cluhljgonannaafpmblx.supabase.co/functions/v1/fenix-app-gateway/session/context';
const header=(x:H)=>Array.isArray(x)?x[0]||'':x||'';
const denied=(r:Res,code:number,reason:string)=>r.status(code).json({status:'UNAVAILABLE',reason,executed:false});
export function roleAgentRosterSnapshot(){
 const roles=registry.roles;
 if(registry.registry_id!=='CEREBRO_ROLE_AGENT_REGISTRY_V1'||
  registry.status!=='ACTIVE_PREPROD_ADDITIVE'||registry.environment!=='PREPROD'||
  !Array.isArray(roles)||roles.length!==11||
  roles.some(r=>!/^((ENG|AGT)-[A-Z-]+)$/.test(r.role_id)||
   !['GLOBAL','fenix'].includes(r.company_scope)||
   !['SPECIALIST_ROLE','AGENT_PROFILE_IMPLEMENTED_PLAN_ONLY'].includes(r.class)||
   r.reports_to!==null||r.reports_to_state!=='UNRESOLVED'||
   !Array.isArray(r.engines)||r.engines.length===0))throw Error('ROLE_SOURCE_CONTRACT_DRIFT');
 return {
  status:'OK' as const,source:'REPOSITORY_ROLE_AGENT_REGISTRY_V1' as const,
  source_state:registry.status,source_environment:'PREPROD' as const,
  company_id:'fenix',transport:'PREVIEW_ONLY_SERVER_VERIFIED' as const,
  snapshot_date:registry.created_at,read_only:true as const,executed:false as const,
  agent_runtime_verified:false as const,subagent_hierarchy_verified:false as const,
  active_agent_count:null,active_subagent_count:null,
  roles:roles.map(r=>({
   role_id:r.role_id,name:r.name,class:r.class,department:r.department,
   company_scope:r.company_scope,environment:r.environment,state:r.state,
   reports_to:r.reports_to,reports_to_state:r.reports_to_state,
   engines:r.engines,knowledge_pack_id:r.knowledge_pack_id
  }))
 };
}
export default async function handler(req:Req,res:Res){
 res.setHeader('Cache-Control','private, no-store, max-age=0');
 res.setHeader('Vary','Authorization');
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('X-Frame-Options','DENY');
 const host=header(req.headers.host).toLowerCase();
 if(process.env.VERCEL_ENV!=='preview'||!HOST.test(host))return denied(res,403,'PREVIEW_ONLY');
 if(req.method!=='GET')return denied(res,405,'READ_ONLY');
 const origin=header(req.headers.origin);
 if(origin&&origin!=='https://'+host)return denied(res,403,'ORIGIN_DENIED');
 let query:URLSearchParams;
 try{query=new URL(req.url||'/','https://'+host).searchParams}
 catch{return denied(res,400,'INVALID_URL')}
 if(query.getAll('company_id').length!==1||query.get('company_id')!=='fenix'||
  [...query.keys()].some(k=>k!=='company_id'))return denied(res,403,'FENIX_OWNER_ONLY');
 const bearer=header(req.headers.authorization),apikey=header(req.headers.apikey);
 if(!/^Bearer\s+\S{20,8192}$/i.test(bearer)||apikey.length<12||apikey.length>256)
  return denied(res,401,'OWNER_SESSION_REQUIRED');
 try{
  const response=await fetch(OWNER,{method:'GET',headers:{authorization:bearer,apikey,accept:'application/json'},
   redirect:'error',cache:'no-store',signal:AbortSignal.timeout(6500)});
  if(response.status!==200)return denied(res,403,'OWNER_NOT_VERIFIED');
  const body=await response.json();
  const ctx=body?.context&&typeof body.context==='object'?body.context:body;
  if(body?.ok===false||ctx?.actor_code!=='CARLOS-ADMIN')return denied(res,403,'OWNER_NOT_VERIFIED');
 }catch{return denied(res,503,'OWNER_RESOLVER_UNAVAILABLE')}
 try{return res.status(200).json(roleAgentRosterSnapshot())}
 catch{return denied(res,503,'ROLE_SOURCE_INVALID')}
}
