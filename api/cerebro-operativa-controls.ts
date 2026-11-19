/**
 * OPSCTRL-001 · Private Vercel preview proxy to existing CEREBRO LAB pg_cron controls.
 * Only owner and company fenix; no arbitrary URLs, run targets or PROD actions.
 */
type H=string|string[]|undefined;
type Req={method?:string;url?:string;headers:Record<string,H>;body?:unknown};
type Res={status:(n:number)=>Res;setHeader:(k:string,v:string)=>void;json:(x:unknown)=>void};
const HOST=/^fenix-capital-preprod-[a-z0-9]+\.vercel\.app$/;
const OWNER='https://cluhljgonannaafpmblx.supabase.co/functions/v1/fenix-app-gateway/session/context';
const CONTROL='https://hnqlnvakzaywtafeiybt.supabase.co/functions/v1/cerebro-operativa-controls-lab-v1?company_id=fenix&environment=LAB';
const head=(v:H)=>Array.isArray(v)?v[0]||'':v||'';
const denied=(res:Res,code:number,reason:string)=>res.status(code).json({
 status:'UNAVAILABLE',reason,executed:false,company_id:'fenix',
 environment:'LAB',prod_execution_enabled:false});
export default async function handler(req:Req,res:Res){
 res.setHeader('Cache-Control','private,no-store,max-age=0');
 res.setHeader('Vary','Authorization');
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('X-Frame-Options','DENY');
 const host=head(req.headers.host).toLowerCase();
 if(!HOST.test(host)||!(process.env.VERCEL_ENV==='preview'||
  (process.env.VERCEL_ENV==='production'&&host===process.env.VERCEL_URL)))
   return denied(res,403,'PRIVATE_LAB_ONLY');
 const origin=head(req.headers.origin);
 if(origin&&origin!=='https://'+host)return denied(res,403,'ORIGIN_DENIED');
 if(!['GET','POST'].includes(req.method||''))return denied(res,405,'METHOD_DENIED');
 let url:URL;
 try{url=new URL(req.url||'/','https://'+host)}
 catch{return denied(res,400,'INVALID_URL')}
 if(url.pathname!=='/api/cerebro-operativa-controls'||url.searchParams.getAll('company_id').length!==1||
    url.searchParams.get('company_id')!=='fenix'||
    [...url.searchParams.keys()].some(k=>k!=='company_id'))
    return denied(res,403,'COMPANY_SCOPE_DENIED');
 const auth=head(req.headers.authorization),apikey=head(req.headers.apikey);
 if(!/^Bearer\s+\S{20,8192}$/i.test(auth)||apikey.length<12||apikey.length>256)
   return denied(res,401,'OWNER_SESSION_REQUIRED');
 const labKey=process.env.CEREBRO_PREPROD_PUBLISHABLE_KEY||'';
 if(labKey.length<12)return denied(res,503,'LAB_PUBLISHABLE_MISSING');
 let jsonBody:string|undefined;
 if(req.method==='POST'){
  const body=req.body;
  if(!body||typeof body!=='object'||Array.isArray(body))
   return denied(res,400,'BODY_INVALID');
  const x=body as Record<string,unknown>;
  if(Object.keys(x).sort().join(',')!=='command,company_id,engine_id,environment,request_id'||
    x.company_id!=='fenix'||x.environment!=='LAB'||
    !['QA-001','CERT-001'].includes(String(x.engine_id))||
    !['RUN_ONCE','PAUSE_SCHEDULE','RESUME_SCHEDULE'].includes(String(x.command))||
    typeof x.request_id!=='string'||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x.request_id))
    return denied(res,400,'COMMAND_SCOPE_DENIED');
  jsonBody=JSON.stringify(body);
  if(jsonBody.length>4096)return denied(res,413,'PAYLOAD_TOO_LARGE');
 }
 try{
  const r=await fetch(OWNER,{method:'GET',redirect:'error',cache:'no-store',
   headers:{authorization:auth,apikey,accept:'application/json'},
   signal:AbortSignal.timeout(6500)});
  if(r.status!==200)return denied(res,403,'OWNER_DENIED');
  const raw=await r.json(),ctx=raw?.context&&typeof raw.context==='object'?raw.context:raw;
  if(raw?.ok===false||ctx?.actor_code!=='CARLOS-ADMIN')return denied(res,403,'OWNER_DENIED');
 }catch{return denied(res,503,'OWNER_RESOLVER_UNAVAILABLE')}
 try{
  const upstream=await fetch(CONTROL,{method:req.method,redirect:'error',cache:'no-store',
   headers:{authorization:auth,apikey:labKey,'x-cerebro-owner-prod-apikey':apikey,
    accept:'application/json',...(jsonBody?{'content-type':'application/json'}:{})},
   body:jsonBody,signal:AbortSignal.timeout(req.method==='POST'?12000:8500)});
  const raw=await upstream.text();
  if(raw.length>35000)return denied(res,502,'UPSTREAM_TOO_LARGE');
  const data=JSON.parse(raw);
  if(upstream.status!==200)
   return denied(res,[400,401,403,405,409,415,429].includes(upstream.status)?upstream.status:503,
     typeof data?.reason==='string'&&/^[A-Z0-9_]{2,60}$/.test(data.reason)?data.reason:'UPSTREAM_UNAVAILABLE');
  if(data?.company_id!=='fenix'||data?.environment!=='LAB'||
    data?.prod_execution_enabled!==false||
    req.method==='GET'&&(data?.status!=='OK'||data?.read_only!==true||data?.executed!==false)||
    req.method==='POST'&&(!['APPLIED','ALREADY_APPLIED'].includes(data?.status)||
      !['QA-001','CERT-001'].includes(data?.engine_id)||
      !['RUN_ONCE','PAUSE_SCHEDULE','RESUME_SCHEDULE'].includes(data?.command)))
   return denied(res,502,'UPSTREAM_CONTRACT_INVALID');
  return res.status(200).json(data);
 }catch{return denied(res,503,'LAB_OPERATOR_UNAVAILABLE')}
}