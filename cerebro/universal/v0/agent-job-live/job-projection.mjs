/** Owner-only LAB job observations. Never return job IDs, worker IDs, payload or errors. */
const SOURCES=['JARVIS_WORK','BROWSER_V2','CREATIVE_V1'];
const TIME_MS=86400000;
const time=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
const quantile=(data,q)=>{
 if(!data.length)return null;
 const p=(data.length-1)*q,lo=Math.floor(p),hi=Math.ceil(p);
 return Math.round((data[lo]+(data[hi]-data[lo])*(p-lo))*10)/10;
};
const engineOk=s=>typeof s==='string'&&/^[A-Z][A-Z0-9]{1,19}-[0-9]{3}$/.test(s);
const statusOk=s=>typeof s==='string'&&/^[A-Z][A-Z_]{1,35}$/.test(s);
const validJob=(j,source,now)=>{
 if(!j||j.company_id!=='fenix'||!['LAB','PREPROD'].includes(j.environment)||
  !engineOk(j.engine_id)||!statusOk(j.status))return false;
 const updated=time(j.updated_at),created=time(j.created_at);
 if(updated===null||created===null||updated<created-60000||updated>now+60000)return false;
 for(const k of ['lease_expires_at',...(source==='JARVIS_WORK'?['heartbeat_at']:
  source==='BROWSER_V2'?['last_heartbeat_at']:[])])
  if(j[k]!==null&&j[k]!==undefined&&time(j[k])===null)return false;
 return true;
};
const safeMetric=(m,now)=>{
 if(!m||m.company_id!=='fenix'||!['LAB','PREPROD'].includes(m.environment)||
  !statusOk(m.outcome)||time(m.created_at)===null||time(m.created_at)>now+60000||
  m.secret_material_logged===true)return false;
 if(m.duration_ms!==null&&m.duration_ms!==undefined&&(!Number.isSafeInteger(m.duration_ms)||
  m.duration_ms<0||m.duration_ms>7*86400000))return false;
 const cost=m.incremental_cost_eur;
 return cost===null||cost===undefined||
  ((typeof cost==='string'||typeof cost==='number')&&/^\d{1,9}(?:\.\d{1,6})?$/.test(String(cost))&&Number(cost)>=0);
};
export function projectAgentJobSummary({jarvis,browser,creative,metrics,observedAt}={}){
 const now=time(observedAt);
 if(now===null||!Array.isArray(jarvis)||!Array.isArray(browser)||!Array.isArray(creative)||
  !Array.isArray(metrics)||jarvis.length>300||browser.length>300||creative.length>300||metrics.length>300)return null;
 const input=[jarvis,browser,creative],grouped=[];
 for(let i=0;i<input.length;i++){
  const source=SOURCES[i],items=input[i],groups=new Map();
  for(const j of items){
   if(!validJob(j,source,now))return null;
   const key=j.environment+'\0'+j.engine_id+'\0'+j.status;
   if(!groups.has(key))groups.set(key,{
    source,environment:j.environment,engine_id:j.engine_id,status:j.status,
    records:0,latest_updated_at:null,created_24h_count:0,
    heartbeat_5m_count:0,heartbeat_24h_count:0,unexpired_lease_count:0,
    stale_queued_24h_count:0
   });
   const g=groups.get(key);
   g.records++;
   const updated=time(j.updated_at),created=time(j.created_at);
   if(g.latest_updated_at===null||updated>time(g.latest_updated_at))
    g.latest_updated_at=new Date(updated).toISOString();
   if(created>=now-TIME_MS)g.created_24h_count++;
   const h=time(source==='JARVIS_WORK'?j.heartbeat_at:
    source==='BROWSER_V2'?j.last_heartbeat_at:null);
   if(h!==null&&h<=now+60000&&h>=now-TIME_MS){
    g.heartbeat_24h_count++;
    if(h>=now-300000)g.heartbeat_5m_count++;
   }
   const lease=time(j.lease_expires_at);
   if(lease!==null&&lease>now)g.unexpired_lease_count++;
   if(j.status==='QUEUED'&&updated<now-TIME_MS)g.stale_queued_24h_count++;
  }
  grouped.push(...groups.values());
 }
 if(grouped.length>60)return null;
 for(const m of metrics)if(!safeMetric(m,now))return null;
 const costSamples=metrics.filter(m=>m.incremental_cost_eur!==null&&m.incremental_cost_eur!==undefined);
 const cost=costSamples.length?Math.round(costSamples.reduce((sum,m)=>sum+Number(m.incremental_cost_eur),0)*10000)/10000:null;
 const durations=metrics.map(m=>m.duration_ms).filter(x=>Number.isSafeInteger(x)&&x>=0)
  .sort((a,b)=>a-b).map(x=>x/1000);
 const latestMetric=metrics.map(m=>time(m.created_at)).filter(x=>x!==null);
 const costMetric={
  source:'BROWSER_WORKER_METRIC_V2',total_samples:metrics.length,cost_samples:costSamples.length,
  recorded_incremental_cost_eur:cost,overall_infrastructure_cost_eur:null,
  duration_samples:durations.length,p50_duration_seconds:quantile(durations,.5),
  p90_duration_seconds:quantile(durations,.9),
  last_observation_at:latestMetric.length?new Date(Math.max(...latestMetric)).toISOString():null,
  warning:'ZERO_RECORDED_INCREMENTAL_COST_IS_NOT_ZERO_PROVIDER_BILL'
 };
 const totals=SOURCES.map((source,i)=>({source,total_rows:input[i].length,
  last_updated_at:grouped.filter(x=>x.source===source).map(x=>x.latest_updated_at)
   .filter(Boolean).sort().at(-1)||null}));
 const pending=grouped.filter(x=>['DEAD_LETTER','HOLD','QUEUED'].includes(x.status))
  .map(x=>({...x,priority_suggestion:x.status==='DEAD_LETTER'?'P1_REVIEW_HISTORICAL':
   'P2_REVIEW_HISTORICAL'}));
 return {status:'OK',source:'FENIX_LAB_AGENT_JOB_AGGREGATE_V1',
  company_id:'fenix',environment:'LAB',project_id:'hnqlnvakzaywtafeiybt',
  observed_at:new Date(now).toISOString(),read_only:true,executed:false,
  source_semantics:'HISTORICAL_JOB_RECORDS_IN_LAB_PROJECT',
  agent_identity_verified:false,active_agent_count:null,active_subagent_count:null,
  active_job_count:null,independent_worker_heartbeat_verified:false,
  groups:grouped.sort((a,b)=>a.source.localeCompare(b.source)||a.engine_id.localeCompare(b.engine_id)||a.status.localeCompare(b.status)),
  source_totals:totals,attention_groups:pending,cost_metrics:costMetric,
  no_identifiers_or_payloads:true,
  warning:'PREPROD_IS_HISTORICAL_ENV_LABEL_NOT_ACTIVE_APP; QUEUED_OR_HOLD_IS_NOT_PROOF_OF_LIVE_EXECUTOR; COUNTS_ARE_NOT_GLOBAL_AGENT_CENSUS'};
}
