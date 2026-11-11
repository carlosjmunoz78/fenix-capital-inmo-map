// FACT-001 · D1 durable CAS ledger for Supabase synthetic Edge LAB ONLY.
// CANDIDATE / NOT IMPORTED by the running broker; all vendor writes remain OFF.
// A server-owned query(sql, bindings) adapter is required; never expose it to callers.
import {SUPABASE_MGMT_LAB,assertServicePrincipal} from './supabase-mgmt-edge-policy.mjs';

const TABLE='fact001_supabase_edge_jobs_v1';
const EVENT='fact001_supabase_edge_events_v1';
const HEX=/^[a-f0-9]{64}$/;
const REQUEST=/^FACT001-SBMGT-[A-Z0-9-]{8,60}$/;
const reject=code=>{throw Error(code);};
const strict=x=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;
const sha=x=>typeof x==='string'&&HEX.test(x);

// Statement array is documentation/migration candidate. No auto-application on import.
export const SUPABASE_EDGE_LEDGER_SCHEMA=Object.freeze([
  "CREATE TABLE IF NOT EXISTS "+TABLE+" ("+
  "request_id TEXT PRIMARY KEY NOT NULL CHECK(request_id GLOB 'FACT001-SBMGT-*'),"+
  "command_sha256 TEXT NOT NULL CHECK(length(command_sha256)=64),"+
  "company_id TEXT NOT NULL CHECK(company_id='fenix-capital'),"+
  "engine_id TEXT NOT NULL CHECK(engine_id='FACT-001'),"+
  "environment TEXT NOT NULL CHECK(environment='LAB'),"+
  "project_ref TEXT NOT NULL CHECK(project_ref='cluhljgonannaafpmblx'),"+
  "resource_slug TEXT NOT NULL CHECK(resource_slug='cerebro-fact001-sb-mgmt-canary-lab'),"+
  "operation TEXT NOT NULL CHECK(operation IN ('edge.read','edge.create','edge.update','edge.delete')),"+
  "status TEXT NOT NULL CHECK(status IN ('PREPARED','IN_FLIGHT','COMPLETED','RECONCILE')),"+
  "attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 1),"+
  "expires_at_ms INTEGER NOT NULL,"+
  "before_sha256 TEXT, after_sha256 TEXT,"+
  "max_cost_eur INTEGER NOT NULL DEFAULT 0 CHECK(max_cost_eur=0),"+
  "created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),"+
  "claimed_at TEXT,settled_at TEXT,"+
  "CHECK((status='PREPARED' AND attempts=0) OR (status IN ('IN_FLIGHT','COMPLETED','RECONCILE') AND attempts=1)))",
  "CREATE TABLE IF NOT EXISTS "+EVENT+" ("+
  "event_id INTEGER PRIMARY KEY AUTOINCREMENT,request_id TEXT NOT NULL REFERENCES "+TABLE+"(request_id),"+
  "event_type TEXT NOT NULL CHECK(event_type IN ('PREPARED','IN_FLIGHT','COMPLETED','RECONCILE')),"+
  "command_sha256 TEXT NOT NULL CHECK(length(command_sha256)=64),"+
  "created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),"+
  "UNIQUE(request_id,event_type))",
  "CREATE TRIGGER IF NOT EXISTS fact001_sb_edge_ledger_ai AFTER INSERT ON "+TABLE+
  " BEGIN INSERT INTO "+EVENT+"(request_id,event_type,command_sha256) VALUES(NEW.request_id,NEW.status,NEW.command_sha256); END",
  "CREATE TRIGGER IF NOT EXISTS fact001_sb_edge_ledger_au AFTER UPDATE OF status ON "+TABLE+
  " WHEN NEW.status<>OLD.status BEGIN INSERT INTO "+EVENT+"(request_id,event_type,command_sha256) VALUES(NEW.request_id,NEW.status,NEW.command_sha256); END",
  "CREATE TRIGGER IF NOT EXISTS fact001_sb_edge_events_no_update BEFORE UPDATE ON "+EVENT+
  " BEGIN SELECT RAISE(ABORT,'AUDIT_IMMUTABLE'); END",
  "CREATE TRIGGER IF NOT EXISTS fact001_sb_edge_events_no_delete BEFORE DELETE ON "+EVENT+
  " BEGIN SELECT RAISE(ABORT,'AUDIT_IMMUTABLE'); END"
]);
export const SUPABASE_EDGE_LEDGER_INFO=Object.freeze({
  d1_uuid:'1305f791-7c44-47f9-946b-f330a09c88aa',
  d1_name:'cerebro-fact001-recovery-lab-eu',
  schema_applied:false,provider_mutations_enabled:false,
  table:TABLE,event_table:EVENT
});
function validate(plan,expires_at_ms,now){
 if(!strict(plan)||plan.executed!==false||plan.needs_signed_executor!==true||
   !['LAB_READ_PLAN_ONLY','LAB_MUTATION_PLAN_ONLY'].includes(plan.status)||
   plan.project_ref!==SUPABASE_MGMT_LAB.project_ref||
   plan.resource_slug!==SUPABASE_MGMT_LAB.resource_slug||
   plan.company_id!=='fenix-capital'||plan.engine_id!=='FACT-001'||plan.environment!=='LAB'||
   plan.version!=='1.0.0'||plan.max_cost_eur!==0||
   !SUPABASE_MGMT_LAB.operations.includes(plan.operation)||
   !REQUEST.test(plan.request_id)||plan.idempotency_key!==plan.request_id)
   reject('SB_LEDGER_SCOPE_DENIED');
 if(!Number.isSafeInteger(now)||!Number.isSafeInteger(expires_at_ms)||
   expires_at_ms<=now||expires_at_ms>now+900000)reject('SB_LEDGER_EXPIRY_DENIED');
 if(plan.operation==='edge.read' ? plan.status!=='LAB_READ_PLAN_ONLY':plan.status!=='LAB_MUTATION_PLAN_ONLY')
   reject('SB_LEDGER_PLAN_STATUS_DENIED');
 if(plan.before_sha256!==null&&!sha(plan.before_sha256))reject('SB_LEDGER_HASH_DENIED');
 if(plan.artifact_sha256!==null&&!sha(plan.artifact_sha256))reject('SB_LEDGER_HASH_DENIED');
 if(plan.rollback_sha256!==null&&!sha(plan.rollback_sha256))reject('SB_LEDGER_HASH_DENIED');
 return true;
}
export async function digestSupabaseEdgePlan(plan,{cryptoImpl=crypto}={}){
 if(!strict(plan))reject('SB_LEDGER_SCOPE_DENIED');
 const fields=['company_id','engine_id','environment','version','project_ref','resource_slug','operation',
  'request_id','idempotency_key','before_sha256','artifact_sha256','rollback_sha256','max_cost_eur','status'];
 const material=JSON.stringify(fields.map(k=>[k,plan[k]===undefined?null:plan[k]]));
 const bits=await cryptoImpl.subtle.digest('SHA-256',new TextEncoder().encode(material));
 return Array.from(new Uint8Array(bits),x=>x.toString(16).padStart(2,'0')).join('');
}
export function makeSupabaseEdgeLedger({query,now=Date.now,principal}={}){
 assertServicePrincipal(principal);
 if(typeof query!=='function'||typeof now!=='function')reject('SB_LEDGER_TRUSTED_ADAPTER_REQUIRED');
 async function one(sql,values){
   const r=await query(sql,values);
   if(!Array.isArray(r)||r.length>1||r.some(x=>!strict(x)))reject('SB_LEDGER_DB_RESPONSE_DENIED');
   return r[0]||null;
 }
 return Object.freeze({
  async prepare({plan,expires_at_ms}={}){
   const ts=now();validate(plan,expires_at_ms,ts);
   const command_sha256=await digestSupabaseEdgePlan(plan);
   const r=await one("INSERT INTO "+TABLE+
      "(request_id,command_sha256,company_id,engine_id,environment,project_ref,resource_slug,operation,status,attempts,expires_at_ms,before_sha256,max_cost_eur)"+
      " VALUES(?1,?2,'fenix-capital','FACT-001','LAB',?3,?4,?5,'PREPARED',0,?6,?7,0)"+
      " ON CONFLICT(request_id) DO NOTHING RETURNING request_id,status,attempts,command_sha256",
      [plan.request_id,command_sha256,plan.project_ref,plan.resource_slug,plan.operation,expires_at_ms,plan.before_sha256]);
   if(!r||r.request_id!==plan.request_id||r.status!=='PREPARED'||r.attempts!==0||r.command_sha256!==command_sha256)
      reject('SB_LEDGER_REPLAY_OR_UNVERIFIED');
   return Object.freeze({request_id:r.request_id,command_sha256,status:'PREPARED',executed:false});
  },
  async claim({request_id,command_sha256}={}){
   if(!REQUEST.test(request_id)||!sha(command_sha256))reject('SB_LEDGER_CLAIM_INPUT_DENIED');
   const r=await one("UPDATE "+TABLE+
    " SET status='IN_FLIGHT',attempts=1,claimed_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')"+
    " WHERE request_id=?1 AND command_sha256=?2 AND status='PREPARED' AND attempts=0 AND expires_at_ms>?3"+
    " RETURNING request_id,status,attempts,command_sha256",
    [request_id,command_sha256,now()]);
   if(!r||r.status!=='IN_FLIGHT'||r.attempts!==1||r.request_id!==request_id||r.command_sha256!==command_sha256)
     reject('SB_LEDGER_ALREADY_CLAIMED_OR_EXPIRED');
   return Object.freeze({request_id,status:'IN_FLIGHT',attempts:1});
  },
  async settle({request_id,command_sha256,operation,outcome,readback,after_sha256=null}={}){
   if(!REQUEST.test(request_id)||!sha(command_sha256)||!SUPABASE_MGMT_LAB.operations.includes(operation)||!['COMPLETED','RECONCILE'].includes(outcome))
      reject('SB_LEDGER_SETTLE_INPUT_DENIED');
   if(outcome==='COMPLETED'){
    if(!strict(readback)||readback.verified!==true||readback.metadata_only!==true||
       readback.project_ref!==SUPABASE_MGMT_LAB.project_ref||
       readback.resource_slug!==SUPABASE_MGMT_LAB.resource_slug ||
       typeof readback.exists!=='boolean'||
       !Number.isSafeInteger(readback.checked_at)||readback.checked_at>now()||
       readback.checked_at<now()-60000)reject('SB_LEDGER_READBACK_REQUIRED');
    const expectedExists=operation==='edge.delete'?false:operation==='edge.read'?readback.exists:true;
    if(readback.exists!==expectedExists ||
      (readback.exists ? (!sha(after_sha256)||readback.sha256!==after_sha256):
        (after_sha256!==null||readback.sha256!==null))) reject('SB_LEDGER_READBACK_REQUIRED');
   }else if(after_sha256!==null)reject('SB_LEDGER_RECONCILE_NO_ASSUMPTIONS');
   const r=await one("UPDATE "+TABLE+
    " SET status=?3,after_sha256=?4,settled_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')"+
    " WHERE request_id=?1 AND command_sha256=?2 AND status='IN_FLIGHT' AND attempts=1 AND operation=?5"+
    " RETURNING request_id,status,attempts,command_sha256",
    [request_id,command_sha256,outcome,after_sha256,operation]);
   if(!r||r.request_id!==request_id||r.status!==outcome||r.attempts!==1||r.command_sha256!==command_sha256)
     reject('SB_LEDGER_ALREADY_SETTLED_RECONCILE');
   return Object.freeze({request_id,status:outcome,attempts:1});
  },
  async status(request_id){
   if(!REQUEST.test(request_id))reject('SB_LEDGER_STATUS_INPUT_DENIED');
   const r=await one("SELECT request_id,status,attempts,command_sha256 FROM "+TABLE+" WHERE request_id=?1",[request_id]);
   return r?Object.freeze({request_id:r.request_id,status:r.status,attempts:r.attempts}):null;
  }
 });
}
