/** CEREBRO P0-B — pure, strict, non-causal temporal audit.
 * Reads in-memory provider/D1 observations, never network, secrets or jobs.
 * Identical timestamps alone are NOT a cryptographic or per-job identity join.
 */
const SCRIPT='cerebro-fact001-recovery-runner-lab';
const WINDOW_START='2026-11-15T06:00:00Z';
const WINDOW_END='2026-11-16T06:00:00Z';
function timeMs(value){
 if(typeof value!=='string')return null;
 const m=value.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
 const canonical=m?value.replace(' ','T')+'Z':value;
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(canonical))return null;
 const n=Date.parse(canonical);return Number.isFinite(n)?n:null;
}
const roundSeconds=ms=>Math.round(ms/1)/1000;
function consistent(items){
 for(let i=1;i<items.length;i++){
  if(items[i].t<=items[i-1].t)return false;
 }
 return true;
}
export function correlateFact001CronTicks({cloudflareInvocations,d1Ticks}={}){
 if(!Array.isArray(cloudflareInvocations)||!Array.isArray(d1Ticks)||
    !cloudflareInvocations.length||!d1Ticks.length||
    cloudflareInvocations.length>400||d1Ticks.length>400)return null;
 const start=timeMs(WINDOW_START),end=timeMs(WINDOW_END),maxWindowMs=30000;
 const cf=cloudflareInvocations.map(r=>{
  if(!r||r.scriptName!==SCRIPT||r.invocationType!=='cron'||r.status!=='success'||
     r.sampleInterval!==1)return null;
  const t=timeMs(r.timestamp);
  return t!==null&&t>=start&&t<end?{t}:null;
 });
 const db=d1Ticks.map(r=>{
  if(!r||r.outcome!=='EMPTY')return null;
  const t=timeMs(r.started_at);
  return t!==null&&t>=start&&t<end?{t}:null;
 });
 if(cf.includes(null)||db.includes(null))return null;
 cf.sort((a,b)=>a.t-b.t);db.sort((a,b)=>a.t-b.t);
 if(!consistent(cf)||!consistent(db))return null;
 let i=0,j=0;const differences=[];let cfUnmatched=0,dbUnmatched=0;
 while(i<cf.length&&j<db.length){
  const delta=db[j].t-cf[i].t;
  if(Math.abs(delta)<=maxWindowMs){
   differences.push(Math.abs(delta));i++;j++;
  }else if(delta>0){cfUnmatched++;i++}
  else{dbUnmatched++;j++}
 }
 cfUnmatched+=cf.length-i;dbUnmatched+=db.length-j;
 differences.sort((a,b)=>a-b);
 const quantile=p=>differences.length?roundSeconds(differences[Math.floor((differences.length-1)*p)]):null;
 const allPaired=cfUnmatched===0&&dbUnmatched===0&&cf.length===db.length;
 return Object.freeze({
  status:allPaired?'TEMPORAL_ALIGNMENT_OBSERVED':'TEMPORAL_ALIGNMENT_INCOMPLETE',
  evidence_type:'SAMPLED_PROVIDER_INVOCATION_VS_D1_TICK',
  window_start_utc:WINDOW_START,window_end_utc:WINDOW_END,
  cf_rows:cf.length,d1_ticks:db.length,
  matched_pairs:differences.length,cf_unmatched:cfUnmatched,d1_unmatched:dbUnmatched,
  pairing_max_drift_seconds:maxWindowMs/1000,
  median_abs_drift_seconds:quantile(.5),p95_abs_drift_seconds:quantile(.95),
  max_abs_drift_seconds:differences.length?roundSeconds(differences.at(-1)):null,
  crypto_or_run_id_join_verified:false,worker_identity_signed:false,
  verified_business_jobs:0,completed_business_jobs_claim_allowed:false,
  active_agent_count:null,canonical_company_registry_proven:false,
  prod_promotion_allowed:false,requires_fresh_source_read:true
 });
}
