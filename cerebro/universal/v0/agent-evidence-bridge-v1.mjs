/**
 * CEREBRO OPERATIVA P0 · evidence-to-profile projection, no external writes.
 * Inputs are SERVER-SIDE verified provider receipts, NEVER browser or model data.
 * Inventory and deployment metadata NEVER attest that an agent is working.
 * To earn an identity, a receipt MUST explicitly carry an existing profile ID.
 */
import {RECEIPT_ATTESTED_V1} from './agent-receipt-attestor-v1.mjs';
const PROVIDERS=new Set(['CLOUDFLARE','SUPABASE','GITHUB_ACTIONS','VERCEL','CEREBRO_JOB']);
const EVENTS=new Set(['STARTED','HEARTBEAT','SUCCEEDED','FAILED']);
const ENV=new Set(['LAB','PREPROD','PROD']);
const MAX_AGE=86400000,ACTIVE_AGE=120000;
const safe=(x,max=180)=>typeof x==='string'&&x.length>0&&x.length<=max&&!/[\u0000-\u001f]/.test(x);
const date=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):null;
const fresh=(t,now,age)=>t!==null&&t>=now-age&&t<=now+60000;
const EMPTY='NOT_VERIFIED';
export function projectAgentEvidenceV1({roster,inventories=[],receipts=[],company_id='fenix',observed_at,authorized_sources=[]}={}){
 const now=date(observed_at);
 if(!safe(company_id,80)||now===null||!Array.isArray(roster)||roster.length>5000||
    !Array.isArray(inventories)||inventories.length>5000||
    !Array.isArray(receipts)||receipts.length>10000||
    !Array.isArray(authorized_sources)||authorized_sources.some(s=>!PROVIDERS.has(s)))
  throw Error('EVIDENCE_INPUT_INVALID');
 const ids=new Map();
 for(const p of roster){
  if(!p||!safe(p.id)||!['AGENT_ROLE','SUBAGENT_ROLE','SUBAGENT_TEMPLATE'].includes(p.kind)||
   ids.has(p.kind+':'+p.id))throw Error('PROFILE_REGISTRY_INVALID');
  ids.set(p.kind+':'+p.id,p);
 }
 const authorized=new Set(authorized_sources),providerStates=new Map();
 // Provider metadata = inventory visibility only; not runtime activity or certified identities.
 for(const m of inventories){
  if(!m||!PROVIDERS.has(m.source)||!safe(m.executor_id)||m.company_id!==company_id||
    !['LAB','PREPROD','PROD','UNKNOWN'].includes(m.environment)||!fresh(date(m.observed_at),now,600000)||
    m.server_collector_verified!==true)continue;
  if(!authorized.has(m.source))continue;
  if(!providerStates.has(m.source))providerStates.set(m.source,new Set());
  providerStates.get(m.source).add(m.executor_id);
 }
 const byProfile=new Map(),seen=new Set(),rejected={duplicate:0,untrusted:0,unmatched:0,invalid:0};
 for(const r of receipts){
  if(!r||!PROVIDERS.has(r.source)||!authorized.has(r.source)||
    r.server_collector_verified!==true||r.integrity!=='VERIFIED_BY_SOURCE_ADAPTER'||r[RECEIPT_ATTESTED_V1]!==true){
   rejected.untrusted++;continue;
  }
  const ts=date(r.emitted_at);
  if(r.company_id!==company_id||!ENV.has(r.environment)||
    !EVENTS.has(r.event)||!safe(r.receipt_id)||!safe(r.job_id)||
    !safe(r.executor_id)||!safe(r.engine_id)||
    !fresh(ts,now,MAX_AGE)||r.environment==='PROD'&&r.lab_only===true){
    rejected.invalid++;continue;
  }
  const unique=r.source+':'+r.receipt_id;
  if(seen.has(unique)){rejected.duplicate++;continue;}seen.add(unique);
  const agent=ids.get('AGENT_ROLE:'+r.agent_role_id);
  const sub=r.subagent_role_id?ids.get('SUBAGENT_ROLE:'+r.subagent_role_id):null;
  if(!agent||agent.company_scope&&
    !['fenix','fenix-capital','GLOBAL_OR_SCOPED','GLOBAL_MULTI_COMPANY','GLOBAL'].includes(agent.company_scope)||
    (agent.engine_ids?.length>0&&!agent.engine_ids.includes(r.engine_id))||
    (r.subagent_role_id&&(!sub||sub.parent_id!==agent.id))||
    (sub?.engine_ids?.length>0&&!sub.engine_ids.includes(r.engine_id))){
    rejected.unmatched++;continue;
  }
  for(const p of [agent,...(sub?[sub]:[])]){
   const key=p.kind+':'+p.id;
   const entry=byProfile.get(key)||{id:p.id,kind:p.kind,engine_ids:new Set(),providers:new Set(),last_event:null,
    last_receipt_at:null,last_receipt_id:null,last_heartbeat_at:null,verified_events:0,active_execution_verified:false};
   entry.verified_events++;
   entry.engine_ids.add(r.engine_id);entry.providers.add(r.source);
   if(entry.last_receipt_at===null||ts>=date(entry.last_receipt_at)){
    entry.last_event=r.event;entry.last_receipt_at=r.emitted_at;entry.last_receipt_id=r.receipt_id;
   }
   if((r.event==='HEARTBEAT'||r.event==='STARTED')&&fresh(ts,now,ACTIVE_AGE)){
    entry.active_execution_verified=true;
    if(entry.last_heartbeat_at===null||ts>date(entry.last_heartbeat_at))entry.last_heartbeat_at=r.emitted_at;
   }
   byProfile.set(key,entry);
  }
 }
 const profiles=roster.map(p=>{
  const item=byProfile.get(p.kind+':'+p.id);
  if(!item)return{id:p.id,kind:p.kind,evidence_state:EMPTY,runtime_verified:false,
   active_execution_verified:false,last_event:null,last_receipt_at:null,last_receipt_id:null,
   last_heartbeat_at:null,evidence_providers:[],engine_ids_observed:[],verified_events:0};
  return{id:p.id,kind:p.kind,evidence_state:item.active_execution_verified?'ACTIVE_RECENT':
    'EXECUTION_EVIDENCED',runtime_verified:true,active_execution_verified:item.active_execution_verified,
   last_event:item.last_event,last_receipt_at:item.last_receipt_at,last_receipt_id:item.last_receipt_id,
   last_heartbeat_at:item.last_heartbeat_at,evidence_providers:[...item.providers].sort(),
   engine_ids_observed:[...item.engine_ids].sort(),verified_events:item.verified_events};
 });
 const credited=profiles.filter(p=>p.runtime_verified);
 return {status:'OK',source:'CEREBRO_VERIFIED_EXECUTOR_EVIDENCE_V1',company_id,observed_at,read_only:true,
  semantics:'PER_PROFILE_EXECUTION_RECEIPTS_NOT_WORKER_INVENTORY',
  profile_total:profiles.length,runtime_verified_profiles:credited.length,
  active_recent_profiles:credited.filter(p=>p.active_execution_verified).length,
  unverified_profiles:profiles.length-credited.length,
  provider_inventory:[...providerStates].map(([source,set])=>({source,visible_executors:set.size,
   active_agents_from_inventory:null})).sort((a,b)=>a.source.localeCompare(b.source)),
  rejected_receipts:rejected,profiles};
}
