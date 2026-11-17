// FACT-001 · Notion LAB incremental sync preflight.
// Pure, read-only, no provider calls, no new database, no token exposure.
// This generates reconciliation decisions for explicitly registered synthetic LAB children.
// It does not enqueue, apply, restore, delete or update any Notion page.
export const NOTION_SYNC_SCOPE=Object.freeze({company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0'});
export const NOTION_SYNC_PARENT='1c481b1a-756d-8002-813d-f3efdd4ecd89';
const digest=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
const stamp=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(x)&&Number.isFinite(Date.parse(x));
const keys=(x,k)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join(',')===k.slice().sort().join(',');
const LOCAL=['page_id','parent_id','approved','synthetic','last_synced_hash','current_hash','last_edited_time'];
const REMOTE=['page_id','parent_id','current_hash','last_edited_time','in_trash'];
const compareIds=(a,b)=>a.page_id.localeCompare(b.page_id);
const conflict=(id,reason)=>({page_id:id,status:'CONFLICT_HUMAN_REVIEW',reason,provider_writes:0});
export function planNotionIncrementalSync({scope,local,remote,limit=25}={}){
 if(!keys(scope,['company_id','engine_id','environment','version'])||
    Object.entries(NOTION_SYNC_SCOPE).some(([k,v])=>scope[k]!==v))throw Error('SYNC_SCOPE_DENIED');
 if(!Number.isSafeInteger(limit)||limit<1||limit>25)throw Error('SYNC_BATCH_LIMIT_DENIED');
 if(!Array.isArray(local)||!Array.isArray(remote)||local.length>limit||remote.length>limit||
    local.length!==remote.length)throw Error('SYNC_MANIFEST_BOUND_DENIED');
 const byLocal=new Map(),byRemote=new Map();
 for(const p of local){
  if(!keys(p,LOCAL)||!uuid(p.page_id)||p.page_id===NOTION_SYNC_PARENT||
    p.parent_id!==NOTION_SYNC_PARENT||p.approved!==true||p.synthetic!==true||
    !digest(p.last_synced_hash)||!digest(p.current_hash)||!stamp(p.last_edited_time)||
    byLocal.has(p.page_id))throw Error('SYNC_LOCAL_MANIFEST_DENIED');
  byLocal.set(p.page_id,p);
 }
 for(const p of remote){
  if(!keys(p,REMOTE)||!uuid(p.page_id)||p.page_id===NOTION_SYNC_PARENT||
    p.parent_id!==NOTION_SYNC_PARENT||!digest(p.current_hash)||!stamp(p.last_edited_time)||
    typeof p.in_trash!=='boolean'||byRemote.has(p.page_id)||
    !byLocal.has(p.page_id))throw Error('SYNC_REMOTE_MANIFEST_DENIED');
  byRemote.set(p.page_id,p);
 }
 const decisions=[];
 for(const l of [...byLocal.values()].sort(compareIds)){
  const r=byRemote.get(l.page_id);
  if(r.in_trash){decisions.push(conflict(l.page_id,'REMOTE_IN_TRASH'));continue}
  const lchanged=l.current_hash!==l.last_synced_hash;
  const rchanged=r.current_hash!==l.last_synced_hash;
  if(lchanged&&rchanged){decisions.push(conflict(l.page_id,'DIVERGENT_VERSIONS'));continue}
  if(!lchanged&&!rchanged){decisions.push({page_id:l.page_id,status:'UNCHANGED',provider_writes:0});continue}
  if(lchanged){decisions.push({page_id:l.page_id,status:'LOCAL_CHANGE_REQUIRES_EXPLICIT_OWNER_ORDER',
    expected_revision:r.last_edited_time,provider_writes:0});continue}
  decisions.push({page_id:l.page_id,status:'REMOTE_CHANGE_REQUIRES_SNAPSHOT_REVIEW',
    expected_revision:r.last_edited_time,provider_writes:0});
 }
 return Object.freeze({status:decisions.some(d=>d.status==='CONFLICT_HUMAN_REVIEW')?'REVIEW_REQUIRED':'READ_ONLY_PLAN',
  scope:NOTION_SYNC_SCOPE,decisions,provider_writes:0,queued_jobs:0,cost_additional_eur:0,
  credentials_exposed:false,activation:'OFF',source:'NOTION_LAB_INCREMENTAL_PLANNER_V0'});
}
