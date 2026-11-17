/** Only owner-authenticated Preview can address the new isolated LAB worker. */
type H=string|string[]|undefined;
type Req={method?:string;url?:string;headers:Record<string,H>;query?:Record<string,H>;body?:unknown};
type Res={status:(code:number)=>Res;setHeader:(key:string,value:string)=>void;json:(value:unknown)=>void};
const HOST=/^(?:fenix-capital-preprod-[a-z0-9]+|fenix-capital-prep-git-b7776b-carlosjmunozcabeza-2582s-projects)\.vercel\.app$/;
const PROD_OWNER='https://cluhljgonannaafpmblx.supabase.co/functions/v1/fenix-app-gateway/session/context';
const PREPROD='https://hnqlnvakzaywtafeiybt.supabase.co/functions/v1/cerebro-operativa-lab-runtime-v0';
const idempotency=/^labctrl-[a-z0-9-]{20,60}$/;
const hdr=(value:H)=>Array.isArray(value)?value[0]||'':value||'';
const obj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const resp=(r:Res,n:number,reason:string)=>r.status(n).json({status:'CLOSED',reason,executed:false,prod_execution_enabled:false});
export default async function handler(req:Req,res:Res){
 res.setHeader('Cache-Control','private, no-store, max-age=0');
 res.setHeader('Vary','Authorization');res.setHeader('X-Content-Type-Options','nosniff');
 const host=hdr(req.headers.host).toLowerCase();
 if(process.env.VERCEL_ENV!=='preview'||!HOST.test(host))return resp(res,403,'PREVIEW_ONLY');
 const origin=hdr(req.headers.origin);
 if(origin&&origin!=='https://'+host)return resp(res,403,'ORIGIN_DENIED');
 if(req.method!=='GET'&&req.method!=='POST')return resp(res,405,'METHOD_NOT_ALLOWED');
 const inputUrl=new URL(req.url||'/','https://'+host);
 if(inputUrl.pathname!=='/api/cerebro-lab-worker-control')return resp(res,404,'PATH_DENIED');
 if([...inputUrl.searchParams.keys()].some(k=>k!=='company_id')||inputUrl.searchParams.get('company_id')!=='fenix')
  return resp(res,403,'COMPANY_SCOPE_DENIED');
 const bearer=hdr(req.headers.authorization),ownerKey=hdr(req.headers.apikey);
 if(!/^Bearer\s+\S{20,8192}$/i.test(bearer)||ownerKey.length<12||ownerKey.length>256)
  return resp(res,401,'OWNER_SESSION_REQUIRED');
 let payload:Record<string,unknown>|null=null;
 if(req.method==='POST'){
  if(!obj(req.body))return resp(res,400,'INVALID_BODY');
  payload=req.body;
  if(Object.keys(payload).sort().join(',')!==['company_id','engine_id','environment','version','action','priority','expected_revision','idempotency_key'].sort().join(','))
   return resp(res,400,'UNEXPECTED_FIELDS');
  if(payload.company_id!=='fenix'||payload.environment!=='LAB'||payload.engine_id!=='LAB-DEMO-001'||payload.version!=='0.1.0'||
   !['PAUSE','RESUME','PRIORITIZE','TICK'].includes(String(payload.action))||
   !Number.isSafeInteger(payload.expected_revision)||Number(payload.expected_revision)<1||
   typeof payload.idempotency_key!=='string'||!idempotency.test(payload.idempotency_key)||
   (payload.action==='PRIORITIZE'? !Number.isSafeInteger(payload.priority)||Number(payload.priority)<1||Number(payload.priority)>5 : payload.priority!==null))
   return resp(res,403,'CONTROL_CONTRACT_DENIED');
 }
 const publishable=process.env.CEREBRO_PREPROD_PUBLISHABLE_KEY;
 if(!publishable||publishable.length<12)return resp(res,503,'PREPROD_BRIDGE_MISSING');
 try{
  // A new owner check for every individual control request; no user_metadata.
  const owner=await fetch(PROD_OWNER,{method:'GET',cache:'no-store',redirect:'error',
   headers:{authorization:bearer,apikey:ownerKey,accept:'application/json'},
   signal:AbortSignal.timeout(7500)});
  if(owner.status!==200)return resp(res,403,'OWNER_DENIED');
  const response=await owner.json();
  const identity=obj(response?.context)?response.context:response;
  if(!obj(identity)||identity.actor_code!=='CARLOS-ADMIN'||response?.ok===false)
   return resp(res,403,'OWNER_DENIED');
  const upstream=PREPROD+(req.method==='GET'
   ?'/state?company_id=fenix&environment=LAB&engine_id=LAB-DEMO-001&version=0.1.0'
   :'/control');
  const r=await fetch(upstream,{method:req.method,cache:'no-store',redirect:'error',
   headers:{authorization:bearer,apikey:publishable,'x-cerebro-owner-prod-apikey':ownerKey,
    accept:'application/json',...(payload?{'content-type':'application/json'}:{})},
   body:payload?JSON.stringify(payload):undefined,signal:AbortSignal.timeout(16000)});
  const n=Number(r.headers.get('content-length')||'0');
  if(n>8000)return resp(res,502,'RESPONSE_LIMIT');
  const data:unknown=await r.json();
  if(!obj(data))return resp(res,502,'INVALID_RESPONSE');
  if(r.status===200){
   if(data.transport!=='PREPROD_OWNER_LAB_RUNTIME_V0'||data.prod_execution_enabled!==false||
    data.environment!=='LAB'||data.engine_id!=='LAB-DEMO-001')return resp(res,502,'RECEIPT_CONTRACT_DENIED');
  }
  return res.status(r.status).json(data);
 }catch{return resp(res,503,'LAB_CONTROL_UNAVAILABLE')}
}
