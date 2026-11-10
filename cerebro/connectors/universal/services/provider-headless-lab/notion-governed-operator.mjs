// FACT-001 · Notion owner-scoped mutation controller candidate.
// NOT ROUTED from active Supabase v12, Gateway, Worker or cron.
// Requires independent signed transport, durable ownership, D1 CAS, snapshots and audit.
// Only restores/trashes/renames explicitly registered synthetic LAB children.
export const NOTION_WIKI_LAB_ID='1c481b1a-756d-8002-813d-f3efdd4ecd89';
export const NOTION_WIKI_LAB_TITLE='Wiki Fénix Capital';
export const NOTION_LAB_OPS=Object.freeze(['notion.lab.child.restore','notion.lab.child.trash','notion.lab.child.rename']);
const scope={company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0',client_id:'cerebro',source:'owner_order'};
const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
const safeText=x=>typeof x==='string'&&x.length>0&&x.length<=96&&/^FACT001 CEREBRO Notion LAB [A-Za-z0-9 _-]+$/.test(x);
const inTrash=p=>p?.in_trash===true||p?.archived===true;
const okPage=(p,id,parent)=>p?.object==='page'&&p.id===id&&p.parent?.type==='page_id'&&p.parent.page_id===parent&&safeText(p.title);
const failure=reason=>({status:'BLOCKED',reason,executed:false});
async function digest(x){
 const bytes=new TextEncoder().encode(JSON.stringify(x));
 const hash=await crypto.subtle.digest('SHA-256',bytes);
 return Array.from(new Uint8Array(hash),x=>x.toString(16).padStart(2,'0')).join('');
}
function validateOrder(o){
 if(!o||typeof o!=='object'||Array.isArray(o))return false;
 const keys=['company_id','engine_id','environment','version','client_id','source','operation','request_id','idempotency_key','page_id','expected_last_edited_time','expected_title','new_title'];
 if(Object.keys(o).some(k=>!keys.includes(k)))return false;
 for(const [k,v] of Object.entries(scope))if(o[k]!==v)return false;
 if(!NOTION_LAB_OPS.includes(o.operation)||!uuid(o.page_id)||o.page_id===NOTION_WIKI_LAB_ID)return false;
 if(typeof o.request_id!=='string'||!/^FACT001-[A-Z0-9-]{10,80}$/.test(o.request_id))return false;
 if(typeof o.idempotency_key!=='string'||!/^FACT001-[A-Z0-9-]{10,80}$/.test(o.idempotency_key))return false;
 if(!safeText(o.expected_title))return false;
 if(typeof o.expected_last_edited_time!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z$/.test(o.expected_last_edited_time))return false;
 return o.operation==='notion.lab.child.rename'?safeText(o.new_title):o.new_title===undefined;
}
function acceptedClaim(record){
 if(record?.status==='COMPLETED')return {status:'ALREADY_COMPLETED',executed:false};
 if(record?.status==='PENDING'||record?.status==='BACKOFF')return {status:'IN_PROGRESS',executed:false};
 if(record?.status==='RECONCILE')return {status:'RECONCILIATION_REQUIRED',executed:false};
 if(record?.status==='CONFLICT')return {status:'IDEMPOTENCY_CONFLICT',executed:false};
 return failure('ALREADY_BLOCKED');
}
export function createNotionLabGovernedOperator({
 verifyTransport,ownership,ledger,snapshots,audit,provider,costGuard,
 now=()=>Date.now(),writesEnabled=false
}={}){
 if(typeof verifyTransport!=='function'||ownership?.durable!==true||typeof ownership.get!=='function'||
    ledger?.durable!==true||typeof ledger.claim!=='function'||typeof ledger.settle!=='function'||
    snapshots?.durable!==true||typeof snapshots.save!=='function'||
    audit?.durable!==true||typeof audit.append!=='function'||
    typeof provider?.getPage!=='function'||typeof provider?.patchPage!=='function'||
    typeof costGuard!=='function')throw Error('NOTION_GOVERNED_DEPENDENCIES_REQUIRED');
 return Object.freeze({async run(order,transport){
  if(!writesEnabled)return failure('NOTION_WRITES_DISABLED');
  if(!validateOrder(order))return failure('ORDER_SCOPE_DENIED');
  // Only transport signature verifier establishes identity; NEVER trust claimed user/role fields.
  let caller;
  try{caller=await verifyTransport(transport);}catch{return failure('SIGNED_IDENTITY_DENIED');}
  if(caller?.verified!==true||caller?.client_id!=='cerebro'||caller?.authority!=='owner_signed_command'||
     caller?.source!=='owner_order'||caller?.actor_id!=='carlosjmunoz78'||
     typeof caller.identity_ref!=='string'||caller.identity_ref.length<4||caller.identity_ref.length>128)
    return failure('SIGNED_IDENTITY_DENIED');
  const owned=await ownership.get(order.page_id);
  if(owned?.page_id!==order.page_id||owned?.parent_id!==NOTION_WIKI_LAB_ID||
    owned?.company_id!=='fenix-capital'||owned?.environment!=='LAB'||
    owned?.approved!==true||owned?.synthetic!==true)return failure('UNREGISTERED_OR_FOREIGN_PAGE');
  if(await costGuard({scope,operation:order.operation,max_additional_cost_eur:0})!==true)return failure('MONEY_LIMIT');
  const key=await digest({scope,identity_ref:caller.identity_ref,actor_id:caller.actor_id,key:order.idempotency_key});
  const fingerprint=await digest({operation:order.operation,page_id:order.page_id,expected_title:order.expected_title,
    expected_last_edited_time:order.expected_last_edited_time,new_title:order.new_title??null});
  // This must be a real D1 CAS ledger, not an in-memory map with a spoofed flag.
  const started=now();
  const lease=await ledger.claim({key,fingerprint,now:started,leaseMs:60000,maxAttempts:1,retryableRead:false});
  if(lease?.status!=='CLAIMED')return acceptedClaim(lease);
  const attempt=lease.attempt;
  let mutationAttempted=false,settled=false;
  async function settle(status){
   await ledger.settle({key,fingerprint,attempt,now:now(),status});settled=true;
  }
  try {
   const parent=await provider.getPage(NOTION_WIKI_LAB_ID);
   if(parent?.object!=='page'||parent.id!==NOTION_WIKI_LAB_ID||parent.title!==NOTION_WIKI_LAB_TITLE||inTrash(parent))
    throw Error('PARENT_NOT_VERIFIED');
   const before=await provider.getPage(order.page_id);
   if(!okPage(before,order.page_id,NOTION_WIKI_LAB_ID)||
      before.title!==order.expected_title||before.last_edited_time!==order.expected_last_edited_time)
    throw Error('STALE_OR_FOREIGN_CHILD');
   if(order.operation==='notion.lab.child.restore'&&!inTrash(before))throw Error('RESTORE_REQUIRES_TRASH');
   if(order.operation==='notion.lab.child.trash'&&inTrash(before))throw Error('TRASH_REQUIRES_LIVE');
   if(order.operation==='notion.lab.child.rename'&&(inTrash(before)||order.new_title===before.title))
    throw Error('RENAME_INVALID_STATE');
   const snapshot={page_id:before.id,parent_id:NOTION_WIKI_LAB_ID,title:before.title,
     in_trash:inTrash(before),last_edited_time:before.last_edited_time};
   const saved=await snapshots.save({key,scope,record:snapshot});
   if(typeof saved?.ref!=='string'||!saved.ref)throw Error('SNAPSHOT_NOT_DURABLE');
   await audit.append({event:'NOTION_MUTATION_PREPARED',key,company_id:scope.company_id,engine_id:scope.engine_id,
     environment:scope.environment,operation:order.operation,page_id:order.page_id,snapshot_ref:saved.ref});
   const patch=order.operation==='notion.lab.child.rename'?{title:order.new_title}:
     {in_trash:order.operation==='notion.lab.child.trash'};
   mutationAttempted=true;
   await provider.patchPage(order.page_id,patch); // no retry on ambiguous failure
   const after=await provider.getPage(order.page_id);
   if(!okPage(after,order.page_id,NOTION_WIKI_LAB_ID)||after.title!==(patch.title??before.title)||
      inTrash(after)!==(patch.in_trash??inTrash(before)))throw Error('READBACK_NOT_VERIFIED');
   await audit.append({event:'NOTION_MUTATION_VERIFIED',key,company_id:scope.company_id,engine_id:scope.engine_id,
     environment:scope.environment,operation:order.operation,page_id:order.page_id,snapshot_ref:saved.ref});
   await settle('COMPLETED');
   return {status:'COMPLETED',operation:order.operation,provider:'notion',page_id:order.page_id,
     additional_cost_eur:0,snapshot_ref:saved.ref,credentials_exposed:false};
  } catch {
   // No mutation attempted: STOPPED. After attempted PATCH: RECONCILE, never auto-replay.
   try{if(!settled)await settle(mutationAttempted?'RECONCILE':'STOPPED');}
   catch{return failure('DURABLE_SETTLEMENT_UNCERTAIN');}
   return mutationAttempted?{status:'RECONCILIATION_REQUIRED',executed:false}:failure('NOTION_PREFLIGHT_FAILED');
  }
 }});
}
