/**
 * JARVIS · capability delegation bridge · LAB/PREPROD only.
 *
 * A new CEREBRO skill/engine becomes discoverable through a trusted,
 * refreshed server catalogue. Discoverability NEVER grants execution.
 * A separate server-attested release manifest is required for each action.
 * JARVIS itself is not a new worker, model or executor.
 *
 * All adapters are supplied by trusted backend bootstrap. Never wire
 * client JSON, model output, or a remote unverified manifest to them.
 */
const PREPROD='PREPROD';
const GATES=Object.freeze([
 'contracts','permissions','tests','evaluation','tribunal','observability',
 'backup','rollback','rebuild','cost','policy'
]);
const HUMAN_REASONS=new Set([
 'LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK',
 'POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'
]);
const isString=(v,max=160)=>typeof v==='string'&&v.length>0&&v.length<=max&&v.trim()===v&&!v.includes('\0');
const contextOk=c=>c&&isString(c.company_id)&&isString(c.version)&&c.environment===PREPROD;
const isTrading=id=>/^(LAB-TRD|TRD-)/i.test(id)||/TRADING/i.test(id);
const fail=(status,reason)=>Object.freeze({status,reason,executed:false,delegated:false});
const duplicateIds=(items,key)=>new Set(items.map(v=>v[key])).size!==items.length;
const clone=x=>structuredClone(x);

function validateCatalogue(snapshot){
 if(!snapshot||typeof snapshot!=='object'||Array.isArray(snapshot)||
  snapshot.source!=='CEREBRO_CANONICAL_REGISTRY'||!isString(snapshot.revision,256)||
  !Array.isArray(snapshot.engine_ids)||!Array.isArray(snapshot.roles)||
  !Array.isArray(snapshot.learned_capabilities))throw Error('CANONICAL_CATALOGUE_UNAVAILABLE');
 if(snapshot.engine_ids.some(id=>!isString(id)||id!==id.trim())||
  duplicateIds(snapshot.engine_ids.map(target_id=>({target_id})),'target_id'))
  throw Error('INVALID_ENGINE_CATALOGUE');
 if(snapshot.roles.some(r=>!r||!isString(r.role_id)||typeof r.reports_to_state!=='string'||
   typeof r.state!=='string')||duplicateIds(snapshot.roles,'role_id'))
  throw Error('INVALID_ROLE_CATALOGUE');
 if(snapshot.learned_capabilities.some(x=>!x||!isString(x.capability_id,256)||
   !isString(x.target_id)||!['LEARNED_CANDIDATE','TESTED_NOT_RELEASED','RELEASED'].includes(x.state))||
   duplicateIds(snapshot.learned_capabilities,'capability_id'))
  throw Error('INVALID_LEARNING_CATALOGUE');
 return {
  revision:snapshot.revision,
  engines:new Set(snapshot.engine_ids),
  roles:new Map(snapshot.roles.map(r=>[r.role_id,{role_id:r.role_id,state:r.state,
   reports_to_state:r.reports_to_state}])),
  learned:snapshot.learned_capabilities.map(x=>({
   capability_id:x.capability_id,target_id:x.target_id,state:x.state
  }))
 };
}
function validateManifest(m,cat){
 if(!m||typeof m!=='object'||Array.isArray(m))return null;
 if(!isString(m.capability_id,256)||!isString(m.target_id)||
  !isString(m.company_id)||!isString(m.version,128)||
  !isString(m.handler_name,256)||!isString(m.evidence_ref,512))return null;
 if(isTrading(m.target_id)||m.environment!==PREPROD||m.release_state!=='APPROVED_PREPROD'||
  m.prod_authorized!==false||m.prod_write_authorized!==false||
  m.trading_access!==false||m.additional_cost_eur!==0||
  m.server_attested!==true||m.permission!=='EXECUTE_PREPROD'||
  !['LOW','MEDIUM','HIGH'].includes(m.risk))return null;
 if(!m.gates||GATES.some(g=>m.gates[g]!==true))return null;
 if(m.target_type==='ENGINE'){
  if(!cat.engines.has(m.target_id))return null;
 }else if(m.target_type==='ROLE'){
  const role=cat.roles.get(m.target_id);
  if(!role||role.state==='PLAN_ONLY'||role.reports_to_state!=='RESOLVED')return null;
 }else return null;
 return Object.freeze({
  capability_id:m.capability_id,target_id:m.target_id,target_type:m.target_type,
  company_id:m.company_id,version:m.version,handler_name:m.handler_name,
  risk:m.risk,signature_required:m.signature_required===true,
  evidence_ref:m.evidence_ref
 });
}

export const JARVIS_DELEGATION_GATES=GATES;

/**
 * The catalogue provider can refresh on every request, including new engines
 * made by FACT-001. The approved manifest provider is a DIFFERENT trust feed.
 * Neither provider may come from a user or model prompt.
 */
export function bindJarvisCapabilityDelegationV0({
 consoleGateway,actionGateway,readCanonicalCatalogue,readReleaseManifests,verifyOwner
}={}){
 if(consoleGateway?.environment!==PREPROD||typeof consoleGateway.registerCommand!=='function')
  throw Error('EXISTING_PREPROD_CONSOLE_REQUIRED');
 if(actionGateway?.contract?.().environment!==PREPROD||typeof actionGateway.execute!=='function')
  throw Error('EXISTING_PREPROD_ACTION_GATEWAY_REQUIRED');
 for(const [name,fn] of Object.entries({readCanonicalCatalogue,readReleaseManifests,verifyOwner}))
  if(typeof fn!=='function')throw Error('TRUSTED_BACKEND_CALLBACK_REQUIRED:'+name);

 async function snapshot(){
  // Never persist a model-supplied or stale registry in Jarvis memory.
  const cat=validateCatalogue(clone(await readCanonicalCatalogue()));
  const raw=clone(await readReleaseManifests());
  if(!Array.isArray(raw))throw Error('RELEASE_MANIFESTS_UNAVAILABLE');
  const active=new Map();
  for(const value of raw){
   const m=validateManifest(value,cat);
   if(!m)continue;
   if(active.has(m.capability_id))throw Error('AMBIGUOUS_RELEASE_MANIFEST');
   active.set(m.capability_id,m);
  }
  return {cat,active};
 }
 async function owner({context,operation,capability_id=null}){
  try{return await verifyOwner({
   company_id:context.company_id,environment:PREPROD,
   operation,capability_id
  })===true}
  catch{return false}
 }
 consoleGateway.registerCommand('jarvis.capabilities',async({context})=>{
  if(!contextOk(context))return fail('POLICY_CONFLICT','PREPROD_CONTEXT_REQUIRED');
  if(!await owner({context,operation:'LIST_CAPABILITIES'}))
   return fail('AUTH_REQUIRED','REAL_OWNER_VERIFIER_REQUIRED');
  let state;
  try{state=await snapshot()}catch{return fail('CATALOGUE_UNAVAILABLE','TRUSTED_SOURCE_NOT_VERIFIED')}
  const {cat,active}=state;
  const released=[...active.values()].filter(m=>m.company_id===context.company_id)
   .map(m=>({capability_id:m.capability_id,target_id:m.target_id,release:'APPROVED_PREPROD'}))
   .sort((a,b)=>a.capability_id.localeCompare(b.capability_id));
  return Object.freeze({
   status:'DISCOVERED',executed:false,delegated:false,
   catalogue_revision:cat.revision,known_engine_count:cat.engines.size,
   registered_role_count:cat.roles.size,
   discovered_learned_capabilities:cat.learned.length,
   released_capabilities:released,
   unreleased_learning:cat.learned.filter(x=>!released.some(y=>y.capability_id===x.capability_id))
    .map(x=>({capability_id:x.capability_id,target_id:x.target_id,
     state:'DISCOVERED_NOT_AUTHORIZED'})),
   live_connection_verified:false,prod_authorized:false
  });
 });
 consoleGateway.registerCommand('jarvis.delegate',async({context,payload})=>{
  if(!contextOk(context))return fail('POLICY_CONFLICT','PREPROD_CONTEXT_REQUIRED');
  if(!payload||typeof payload!=='object'||Array.isArray(payload)||
   !isString(payload.capability_id,256)||!isString(payload.idempotency_key,256)||
   !payload.parameters||typeof payload.parameters!=='object'||Array.isArray(payload.parameters))
   return fail('INVALID_REQUEST','EXACT_CAPABILITY_ID_AND_IDEMPOTENCY_REQUIRED');
  // Do not accept role, risk, company, target, authority or cost from client.
  if(payload.estimated_additional_cost_eur!==undefined&&payload.estimated_additional_cost_eur!==0)
   return {status:'HUMAN_REQUIRED',reason:'MONEY_LIMIT',executed:false,delegated:false};
  let state;
  try{state=await snapshot()}catch{return fail('CATALOGUE_UNAVAILABLE','TRUSTED_SOURCE_NOT_VERIFIED')}
  const selected=state.active.get(payload.capability_id);
  if(!selected)return fail('CAPABILITY_NOT_RELEASED','CATALOGUE_OR_GATES_INCOMPLETE');
  if(selected.company_id!==context.company_id)
   return fail('POLICY_CONFLICT','CROSS_COMPANY_FORBIDDEN');
  if(!await owner({context,operation:'DELEGATE',capability_id:selected.capability_id}))
   return fail('AUTH_REQUIRED','REAL_OWNER_VERIFIER_REQUIRED');
  const result=await actionGateway.execute({
   context:{company_id:context.company_id,engine_id:'ACTGW-001',
    environment:PREPROD,version:context.version},
   capability:selected.handler_name,
   idempotency_key:payload.idempotency_key,
   payload:clone(payload.parameters),
   authorized:true, // derived ONLY from independent backend verification above
   risk:selected.risk,
   signature_required:selected.signature_required,
   estimated_additional_cost_eur:0,
   requires_prod_write:false,autonomous_prod:false,trading_access:false
  });
  if(result?.status==='HUMAN_REQUIRED'&&!HUMAN_REASONS.has(result.reason))
   throw Error('INVALID_HUMAN_GATE_FROM_ACTION_GATEWAY');
  return Object.freeze({
   status:result.status,delegated:result.status==='ACTION_EXECUTED',
   executed:result.executed===true,capability_id:selected.capability_id,
   target_id:selected.target_id,action_result:result,
   prod_authorized:false,trading_access:false
  });
 });
 return Object.freeze({
  status:'PREPROD_DYNAMIC_DELEGATION_BOUND',commands:['jarvis.capabilities','jarvis.delegate'],
  catalogue_refresh:'ON_EACH_CALL',release_manifest_gate:'INDEPENDENT_TRUSTED_SOURCE',
  runtime_processes_added:0,production_enabled:false,paid_ai_required:false
 });
}
