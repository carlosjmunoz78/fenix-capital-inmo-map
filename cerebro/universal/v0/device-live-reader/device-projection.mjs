/** Aggregate-only device evidence. Never return device IDs, command IDs, payloads or results. */
const ENVS=['LAB','PREPROD'];
const exactDate=value=>typeof value==='string'&&Number.isFinite(Date.parse(value))?Date.parse(value):null;
const latest=(items)=>items.length?new Date(Math.max(...items)).toISOString():null;
const quantile=(sorted,q)=>{
 if(!sorted.length)return null;
 const pos=(sorted.length-1)*q,lo=Math.floor(pos),hi=Math.ceil(pos);
 return Math.round((sorted[lo]+(sorted[hi]-sorted[lo])*(pos-lo))*10)/10;
};
export function projectDeviceLiveSummary({agents,commands,results,observedAt}={}){
 const at=exactDate(observedAt);
 if(at===null||!Array.isArray(agents)||!Array.isArray(commands)||!Array.isArray(results)||
  agents.length>100||commands.length>400||results.length>500)return null;
 // Fail closed if duplicated command or receipt pairing would double-count evidence.
 const keys=new Set();
 for(const c of commands){
  if(!c||c.company_id!=='fenix'||!ENVS.includes(c.environment)||
   typeof c.command_id!=='string'||!c.command_id||typeof c.device_id!=='string'||!c.device_id||
   typeof c.state!=='string'||typeof c.created_at!=='string')return null;
  const key=c.device_id+'\0'+c.command_id;
  if(keys.has(key))return null;
  keys.add(key);
 }
 for(const a of agents)if(!a||a.company_id!=='fenix'||!ENVS.includes(a.environment))return null;
 const receiptMap=new Map();
 for(const r of results){
  if(!r||typeof r.command_id!=='string'||typeof r.device_id!=='string')return null;
  const k=r.device_id+'\0'+r.command_id;
  if(!keys.has(k)||receiptMap.has(k))return null;
  receiptMap.set(k,r);
 }
 const environments=ENVS.map(environment=>{
  const a=agents.filter(x=>x.environment===environment);
  const c=commands.filter(x=>x.environment===environment);
  const seen=a.map(x=>exactDate(x.last_seen_at)).filter(x=>x!==null&&x<=at+60000);
  const nonrevoked=a.filter(x=>x.revoked_at===null);
  const validSeen=(x,ms)=>{const t=exactDate(x.last_seen_at);return t!==null&&t<=at+60000&&t>=at-ms;};
  const done=c.filter(x=>x.state==='COMPLETED');
  const failed=c.filter(x=>x.state==='FAILED');
  const intervals=done.map(x=>{const start=exactDate(x.created_at),end=exactDate(x.completed_at);
   return start!==null&&end!==null&&end>=start&&end<=at+60000?(end-start)/1000:null;
  }).filter(x=>x!==null&&Number.isFinite(x)&&x>=0&&x<=7*86400).sort((x,y)=>x-y);
  const recentCreated=c.filter(x=>{const t=exactDate(x.created_at);return t!==null&&t<=at+60000&&t>=at-86400000;}).length;
  const latestCompleted=done.map(x=>exactDate(x.completed_at)).filter(x=>x!==null&&x<=at+60000);
  const paired=c.map(x=>receiptMap.get(x.device_id+'\0'+x.command_id)).filter(Boolean);
  return {environment,meaning:environment==='LAB'?'LAB_DEVICE_RECORDS':'HISTORICAL_PREPROD_LABEL_IN_LAB_PROJECT',
   stored_online_count:a.filter(x=>x.status==='ONLINE').length,
   not_revoked_count:nonrevoked.length,
   heartbeat_5m_count:nonrevoked.filter(x=>validSeen(x,300000)).length,
   heartbeat_24h_count:nonrevoked.filter(x=>validSeen(x,86400000)).length,
   last_seen_at:latest(seen),
   commands_total:c.length,commands_completed:done.length,commands_failed:failed.length,
   commands_other:c.length-done.length-failed.length,
   commands_created_24h:recentCreated,latest_completed_at:latest(latestCompleted),
   receipt_count:paired.length,semantically_verified_receipts:paired.filter(x=>x.semantic_verified===true).length,
   comparable_successful_duration_samples:intervals.length,
   p50_completed_seconds:quantile(intervals,.5),p90_completed_seconds:quantile(intervals,.9)};
 });
 return {status:'OK',source:'FENIX_DEVICE_LAB_OWNER_READ_V1',company_id:'fenix',environment:'LAB',
  observed_at:new Date(at).toISOString(),read_only:true,executed:false,
  data_source_project:'hnqlnvakzaywtafeiybt',data_freshness:'SOURCE_READ_AT_REQUEST_TIME',
  active_agents_verified:null,active_subagents_verified:null,active_jobs_verified:null,cost_eur_measured:null,
  contains_device_ids:false,contains_command_payloads:false,contains_result_bodies:false,
  environments,scope_note:'Historical PREPROD is only a label inside LAB database; recent device heartbeats are not autonomous CEREBRO agents.'};
}
