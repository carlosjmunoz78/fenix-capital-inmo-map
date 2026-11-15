/** Preview-only on-demand owner diagnostic. No logs, writes, credentials or cross-provider transport. */
import {summarizeFailedJob} from '../cerebro/universal/v0/operator-job-detail.mjs';
type H=string|string[]|undefined;
type Req={method?:string;url?:string;headers:Record<string,H>};
type Res={status:(s:number)=>Res;setHeader:(k:string,v:string)=>void;json:(o:unknown)=>void};
const HOST=/^(?:fenix-capital-preprod-[a-z0-9]+|fenix-capital-prep-git-b7776b-carlosjmunozcabeza-2582s-projects)\.vercel\.app$/;
const REPOS=new Map([['fenix-capital-inmo-map','carlosjmunoz78/fenix-capital-inmo-map'],['capital-mapa-pro','carlosjmunoz78/capital-mapa-pro']]);
const AUTH='https://cluhljgonannaafpmblx.supabase.co/functions/v1/fenix-app-gateway/session/context';
const header=(v:H)=>Array.isArray(v)?v[0]||'':v||'';
const response=(res:Res,code:number,reason:string)=>res.status(code).json({status:'UNAVAILABLE',reason,executed:false});
export default async function handler(req:Req,res:Res){
 res.setHeader('Cache-Control','private, no-store, max-age=0');
 res.setHeader('Vary','Authorization');
 res.setHeader('X-Content-Type-Options','nosniff');
 const host=header(req.headers.host).toLowerCase();
 if(process.env.VERCEL_ENV!=='preview'||!HOST.test(host))return response(res,403,'PREVIEW_ONLY');
 if(req.method!=='GET')return response(res,405,'READ_ONLY');
 const origin=header(req.headers.origin);
 if(origin&&origin!=='https://'+host)return response(res,403,'ORIGIN_DENIED');
 let url:URL;
 try{url=new URL(req.url||'/','https://'+host)}catch{return response(res,400,'REQUEST_INVALID')}
 if([...url.searchParams.keys()].some(k=>!['company_id','repo','run_id'].includes(k))||
  url.searchParams.getAll('company_id').length!==1||
  url.searchParams.getAll('repo').length!==1||
  url.searchParams.getAll('run_id').length!==1||
  url.searchParams.get('company_id')!=='fenix')return response(res,403,'FENIX_LAB_SCOPE_ONLY');
 const repo=REPOS.get(url.searchParams.get('repo')||'');
 const idString=url.searchParams.get('run_id')||'';
 if(!repo||!/^[1-9]\d{0,14}$/.test(idString))return response(res,400,'TARGET_NOT_ALLOWLISTED');
 const run_id=Number(idString);
 if(!Number.isSafeInteger(run_id))return response(res,400,'TARGET_NOT_ALLOWLISTED');
 const bearer=header(req.headers.authorization),apikey=header(req.headers.apikey);
 if(!/^Bearer\s+\S{20,8192}$/i.test(bearer)||apikey.length<12||apikey.length>256)
  return response(res,401,'AUTH_REQUIRED');
 try{
  const owner=await fetch(AUTH,{method:'GET',headers:{authorization:bearer,apikey,accept:'application/json'},
   redirect:'error',cache:'no-store',signal:AbortSignal.timeout(6500)});
  if(owner.status!==200)return response(res,403,'OWNER_DENIED');
  const raw=await owner.json();
  const identity=raw&&typeof raw==='object'&&raw.context&&typeof raw.context==='object'?raw.context:raw;
  if(identity?.actor_code!=='CARLOS-ADMIN')return response(res,403,'OWNER_DENIED');
 }catch{return response(res,503,'OWNER_RESOLVER_UNAVAILABLE')}
 try{
  const endpoint='https://api.github.com/repos/'+repo+'/actions/runs/'+run_id+'/jobs?per_page=20';
  const result=await fetch(endpoint,{method:'GET',redirect:'error',cache:'no-store',
   headers:{Accept:'application/vnd.github+json','User-Agent':'CEREBRO-OS-Owner-Job-Detail-LAB',
    'X-GitHub-Api-Version':'2022-11-28'},signal:AbortSignal.timeout(6500)});
  if(result.status!==200)return response(res,503,result.status===403||result.status===429?
   'GITHUB_RATE_LIMIT_OR_DENIED':'GITHUB_JOBS_NOT_AVAILABLE');
  const data=await result.json();
  const evidence=summarizeFailedJob(data,{repo,run_id});
  if(!evidence)return response(res,503,'JOB_FAILURE_STEP_NOT_VERIFIED');
  return res.status(200).json({status:'OK',company_id:'fenix',environment:'LAB',
   observed_at:new Date().toISOString(),owner_verified:true,read_only:true,executed:false,
   ...evidence});
 }catch{return response(res,503,'GITHUB_JOBS_UNREACHABLE')}
}
