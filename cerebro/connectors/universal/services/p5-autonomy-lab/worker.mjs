// FACT-001 P5 LAB · scheduled CEREBRO read-only, no public fetch route or API credentials.
const SCOPE={company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0'};
const AUTOMATION='FACT001_P5_DAILY_READ_V1';
const ENDPOINT='https://cluhljgonannaafpmblx.supabase.co/functions/v1/cerebro-fact001-p5-dispatch-lab/dispatch';
const PROVIDER_SET='cloudflare,vercel,supabase,notion,github';
async function sha(str){const h=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(str));return Array.from(new Uint8Array(h),x=>x.toString(16).padStart(2,'0')).join('');}
function ticket(){const b=new Uint8Array(32);crypto.getRandomValues(b);return Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');}
export async function scheduledP5(env,now=Date.now(),http=fetch){
 if(env?.P5_ENABLED!=='true'||!env.RECOVERY_DB)return {status:'DISABLED'};
 const config=await env.RECOVERY_DB.prepare("SELECT enabled,max_daily_jobs,company_id,engine_id,environment,version FROM fact001_p5_automation_registry_v1 WHERE automation_id=?1 LIMIT 1").bind(AUTOMATION).first();
 if(!config||config.enabled!==1||config.max_daily_jobs!==1||Object.entries(SCOPE).some(([k,v])=>config[k]!==v))return {status:'NOT_REGISTERED'};
 const day=new Date(now).toISOString().slice(0,10).replaceAll('-','');
 const requestId='FACT001-P5-'+day;
 const secret=ticket(),digest=await sha(secret);
 const expires=now+10*60*1000;
 const row=await env.RECOVERY_DB.prepare(
  "INSERT INTO fact001_p5_jobs_v1(request_id,day_key,automation_id,company_id,engine_id,environment,version,provider_set,operation,max_cost_eur,state,attempts,ticket_sha256,created_at_ms,expires_at_ms) VALUES(?1,?2,?3,'fenix-capital','FACT-001','LAB','1.0.0',?4,'providers.five.inventory.read',0,'QUEUED',0,?5,?6,?7) ON CONFLICT(day_key) DO NOTHING RETURNING request_id")
  .bind(requestId,day,AUTOMATION,PROVIDER_SET,digest,now,expires).first();
 if(!row)return {status:'ALREADY_SCHEDULED',day};
 if(row.request_id!==requestId)throw Error('P5_D1_INSERT_DRIFT');
 const cmd={...SCOPE,request_id:requestId,operation:'providers.five.inventory.read',provider_set:PROVIDER_SET,max_cost_eur:0,source:'registered_automation'};
 let response;try{response=await http(ENDPOINT,{method:'POST',headers:{Authorization:'Bearer '+secret,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(cmd),redirect:'error',signal:AbortSignal.timeout(105000)});}
 catch {return {status:'RECONCILE',reason:'DISPATCH_UNVERIFIED',request_id:requestId};}
 if(response.status!==200)return {status:'RECONCILE',reason:'DISPATCH_HTTP_'+response.status,request_id:requestId};
 let result;try{result=await response.json()}catch{return {status:'RECONCILE',reason:'DISPATCH_NOT_JSON',request_id:requestId};}
 if(result?.status!=='COMPLETED'||result?.provider_count!==5||result?.request_id!==requestId)return {status:'RECONCILE',reason:'DISPATCH_RESULT_UNVERIFIED',request_id:requestId};
 return {status:'COMPLETED',request_id:requestId,provider_count:5};
}
export default {
 async fetch(){return new Response(null,{status:404,headers:{'cache-control':'no-store'}});},
 async scheduled(event,env,ctx){ctx.waitUntil(scheduledP5(env).then(r=>{console.log('FACT001_P5_SCHEDULED='+r.status);}).catch(()=>{console.log('FACT001_P5_SCHEDULED=RECONCILE');}));}
};
