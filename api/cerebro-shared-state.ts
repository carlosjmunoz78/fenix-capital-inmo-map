/** Shared owner-only read API across ALL CEREBRO interfaces.
 * The old directory and activity endpoints remain untouched; this only wraps.
 */
import {buildCerebroAgentDirectoryV0,queryCerebroAgentDirectoryV0,validateCerebroAgentDirectoryQueryV0,
  verifiedReadOnlyMode,observeExecutors} from './cerebro-agent-directory';
import {buildSharedState} from '../cerebro/universal/v0/cerebro-shared-state-core.mjs';
type H=string|string[]|undefined;
type Req={method?:string;url?:string;headers:Record<string,H>};
type Res={status:(n:number)=>Res;setHeader:(name:string,val:string)=>void;json:(body:unknown)=>void};
const owner='https://cluhljgonannaafpmblx.supabase.co/functions/v1/fenix-app-gateway/session/context';
const get=(v:H)=>Array.isArray(v)?v[0]||'':v||'';
const deny=(res:Res,code:number,reason:string)=>res.status(code).json({status:'UNAVAILABLE',reason,read_only:true,executed:false});
export function validateSharedQuery(search:URLSearchParams){
 const allowed=new Set(['mode','company_id','kind','family','q','offset','limit']);
 if([...search.keys()].some(k=>!allowed.has(k)||search.getAll(k).length!==1))throw Error('INVALID_QUERY');
 if(search.get('company_id')!=='fenix')throw Error('INVALID_COMPANY');
 const mode=search.get('mode')||'summary';
 if(!['summary','profiles'].includes(mode))throw Error('INVALID_MODE');
 if(mode==='summary'&&[...search.keys()].some(k=>!['mode','company_id'].includes(k)))throw Error('SUMMARY_QUERY_INVALID');
 const filters=new URLSearchParams(search);
 filters.delete('mode');
 if(!filters.has('kind'))filters.set('kind','ALL');
 if(!filters.has('limit'))filters.set('limit','25');
 if(!filters.has('offset'))filters.set('offset','0');
 if(!filters.has('family'))filters.set('family','ALL');
 validateCerebroAgentDirectoryQueryV0(filters);
 return {mode,filters};
}
export default async function handler(req:Req,res:Res){
 res.setHeader('Cache-Control','private, no-store, max-age=0');
 res.setHeader('Vary','Authorization');
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('X-Frame-Options','DENY');
 const host=get(req.headers.host).toLowerCase();
 const scope=verifiedReadOnlyMode(host,process.env.VERCEL_ENV);
 if(!scope)return deny(res,403,'HOST_ENV_SCOPE_DENIED');
 if(req.method!=='GET')return deny(res,405,'READ_ONLY');
 const origin=get(req.headers.origin);
 if(origin&&origin!=='https://'+host)return deny(res,403,'ORIGIN_DENIED');
 let input;
 try{input=validateSharedQuery(new URL(req.url||'/','https://'+host).searchParams)}
 catch{return deny(res,400,'INVALID_QUERY_OR_SCOPE')}
 const bearer=get(req.headers.authorization),apikey=get(req.headers.apikey);
 if(!/^Bearer\s+\S{20,8192}$/i.test(bearer)||apikey.length<12||apikey.length>256)
  return deny(res,401,'OWNER_SESSION_REQUIRED');
 try{
  const response=await fetch(owner,{method:'GET',headers:{authorization:bearer,apikey,accept:'application/json'},
   redirect:'error',cache:'no-store',signal:AbortSignal.timeout(6500)});
  if(response.status!==200)return deny(res,403,'OWNER_NOT_VERIFIED');
  const body=await response.json();
  const ctx=body?.context&&typeof body.context==='object'?body.context:body;
  if(body?.ok===false||ctx?.actor_code!=='CARLOS-ADMIN')return deny(res,403,'OWNER_NOT_VERIFIED');
 }catch{return deny(res,503,'OWNER_RESOLVER_UNAVAILABLE')}
 try{
  const existing=buildCerebroAgentDirectoryV0();
  if(existing.length!==2506)throw Error('PROFILE_REGISTRY_DRIFT');
  const runtime=await observeExecutors(req,existing);
  const state=buildSharedState(runtime.records,runtime);
  const {records,...summary}=state;
  if(input.mode==='summary')return res.status(200).json({status:'OK',...summary,transport:scope});
  // Existing source directory owns order, filter semantics, parent_id and page boundaries.
  const directory=queryCerebroAgentDirectoryV0(input.filters);
  const byKey=new Map(records.map(x=>[x.kind+':'+x.id,x]));
  const page=directory.records.map(x=>byKey.get(x.kind+':'+x.id)??x);
  return res.status(200).json({...directory,transport:scope,records:page,
   active_agents_verified:state.overview.verified_running_profiles>0,
   runtime_source:{provider:'CEREBRO_CONSOLE_ACTIVITY_V0',status:runtime.status,
    observed_at:runtime.observed_at,error_code:runtime.error_code,
    verified_profiles:runtime.verified_profiles,observed_execution_ids:runtime.observed_execution_ids},
   shared_state:summary});
 }catch{return deny(res,503,'SHARED_STATE_CONTRACT_INVALID')}
}
