// One-shot read-only Cloudflare cron -> Supabase Edge connectivity diagnostic.
// Never sends a valid bearer, provider data or credential; does not read app/CRM.
const DEST='https://cluhljgonannaafpmblx.supabase.co/functions/v1/cerebro-fact001-p5-dispatch-lab/dispatch';
export async function probeP5Egress(env,fetcher=fetch){
 if(env?.P5_DIAG_ENABLED!=='true'||!env?.RECOVERY_DB)return {status:'OFF'};
 const insert=await env.RECOVERY_DB.prepare("INSERT INTO fact001_p5_diag_v2(id,state,created_ms) VALUES('FACT001-P5-EGRESS-PROBE-20261112-V2','PROBING',?1) ON CONFLICT(id) DO NOTHING RETURNING id").bind(Date.now()).first();
 if(!insert)return {status:'ALREADY_PROBED'};
 const start=Date.now();let code='UNKNOWN';
 try{
  const body={company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0',source:'registered_automation',operation:'providers.five.inventory.read',provider_set:'cloudflare,vercel,supabase,notion,github',max_cost_eur:0,request_id:'FACT001-P5-20261112'};
  const resp=await fetcher(DEST,{method:'POST',headers:{Authorization:'Bearer invalid','Content-Type':'application/json'},body:JSON.stringify(body),redirect:'manual',signal:AbortSignal.timeout(12000)});
  code=resp.status===401?'EDGE_HTTP_401':'UNEXPECTED_HTTP_'+resp.status;
 }catch(e){code=e?.name==='AbortError'||e?.name==='TimeoutError'?'EGRESS_TIMEOUT':e?.name==='TypeError'?'EGRESS_TYPE_ERROR':'EGRESS_EXCEPTION';}
 const state=code==='EDGE_HTTP_401'?'PASS':'BLOCKED';
 await env.RECOVERY_DB.prepare("UPDATE fact001_p5_diag_v2 SET state=?2,code=?3,latency_ms=?4,completed_ms=?5 WHERE id=?1 AND state='PROBING'").bind('FACT001-P5-EGRESS-PROBE-20261112-V2',state,code,Date.now()-start,Date.now()).run();
 return {status:state,code};
}
