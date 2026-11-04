/** ZEUS/JARVIS B6 CUT01 — shared-runtime, server-only, ZERO-COST READ executor.
 * Does not deploy endpoints, construct a new server/worker, invoke shell/browser,
 * change App/CRM/PROD, expose credentials or authorize mutations.
 * It wraps B6 preflight and verifies an allowlisted trusted connector result.
 * No durable claim of exactly-once operation until a real transaction journal is wired.
 */
import {createHash} from 'node:crypto';
const ID=/^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,179}$/;
const HASH=/^[0-9a-f]{64}$/;
const valid=x=>typeof x==='string'&&ID.test(x);
const denied=(reason,extra={})=>Object.freeze({
 state:'DENY',reason,executed:false,adapterInvoked:false,spentEuro:0,...extra
});
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
export function createJarvisB6ControlledRead({identityProvider,controlStore,preflight,policy,
 journal,connectorRegistry,resultVerifier,audit}={}){
 if(typeof identityProvider?.verify!=='function'||typeof controlStore?.get!=='function'||
  typeof preflight?.plan!=='function'||typeof policy?.authorize!=='function'||
  typeof journal?.claim!=='function'||typeof journal?.complete!=='function'||
  typeof journal?.fail!=='function'||typeof connectorRegistry?.resolve!=='function'||
  typeof resultVerifier?.verify!=='function'||typeof audit?.append!=='function')
  throw Error('B6_SERVER_DEPENDENCIES_REQUIRED');
 return Object.freeze({async executeRead({token,companyId,environment='LAB',sessionId,missionId,
   capability,idempotencyKey,privacy='INTERNAL',operation='READ'}={}){
  // Deliberate hard lock: B6 PROD cannot run with synthetic authorizations.
  if(environment==='PROD')return denied('PROD_NOT_CERTIFIED');
  if(environment!=='LAB'||operation!=='READ'||!valid(companyId)||!valid(sessionId)||
    !valid(missionId)||!valid(capability)||!valid(idempotencyKey)||
    !['PUBLIC','INTERNAL','CONFIDENTIAL','RESTRICTED'].includes(privacy))
   return denied('REQUEST_INVALID');
  if(!token)return denied('AUTH_REQUIRED');
  let control;
  try{control=await controlStore.get({companyId,environment});}
  catch{return denied('B6_CONTROL_UNAVAILABLE');}
  if(control?.enabled!==true||control?.killSwitch!==false)
   return denied('B6_LOCKED');
  let principal;
  try{principal=await identityProvider.verify(token);}
  catch{return denied('AUTH_UNAVAILABLE');}
  if(!valid(principal?.ownerId)||principal.sessionId!==sessionId||
    !Array.isArray(principal.roles)||!principal.roles.includes('OWNER_ROOT')||
    !Array.isArray(principal.authorizedCompanies)||
    !principal.authorizedCompanies.includes(companyId))
   return denied('OWNER_SCOPE_DENIED');
  let candidate;
  try{candidate=await preflight.plan({token,companyId,environment,sessionId,missionId,
    capability,operation:'READ',privacy});}
  catch{return denied('PREFLIGHT_UNAVAILABLE');}
  if(candidate?.state!=='PLAN_ONLY_OFF'||candidate.executed!==false||
    candidate.spentEuro!==0||candidate.companyId!==companyId||
    candidate.environment!==environment||candidate.missionId!==missionId||
    candidate.capability!==capability||!valid(candidate.selectedCapabilityId)||
    !['API','MCP','CLI','BROWSER'].includes(candidate.route))
   return denied('PREFLIGHT_DENIED_OR_INVALID');
  let grant;
  try{grant=await policy.authorize({token,companyId,environment,missionId,capability,
    connectorId:candidate.selectedCapabilityId,actionName:'JARVIS_CAPABILITY_EXECUTE_READ'});}
  catch{return denied('B3_EXECUTION_POLICY_UNAVAILABLE');}
  if(grant?.decision!=='ALLOW')return denied('B3_EXECUTION_DENIED');
  // Never accept an adapter object, executable script, browser URL, path or command
  // from client text. The only possible adapter is resolved by trusted server registry.
  let adapter;
  try{adapter=await connectorRegistry.resolve({companyId,environment,
    capability,connectorId:candidate.selectedCapabilityId});}
  catch{return denied('CONNECTOR_REGISTRY_UNAVAILABLE');}
  if(adapter?.id!==candidate.selectedCapabilityId||adapter?.companyId!==companyId||
    adapter?.environment!==environment||adapter?.capability!==capability||
    adapter?.route!==candidate.route||adapter?.operation!=='READ'||
    adapter?.estimatedEuro!==0||adapter?.sideEffectFree!==true||
    typeof adapter?.read!=='function'||
    (['CONFIDENTIAL','RESTRICTED'].includes(privacy)&&
     adapter?.dataBoundary!=='LOCAL_PRIVATE'))
   return denied('CONNECTOR_CONTRACT_INVALID');
  const scope={ownerId:principal.ownerId,companyId,environment,missionId,capability,
    connectorId:candidate.selectedCapabilityId,idempotencyKey};
  const fingerprint=hash({companyId,environment,missionId,capability,
    connectorId:candidate.selectedCapabilityId,privacy,operation});
  let audited;
  try{audited=await audit.append({eventCode:'B6_READ_STARTED',companyId,environment,
    missionId,capability,connectorId:candidate.selectedCapabilityId,route:adapter.route});}
  catch{return denied('AUDIT_UNAVAILABLE');}
  if(audited!==true)return denied('AUDIT_UNAVAILABLE');
  let claimed;
  try{claimed=await journal.claim({...scope,fingerprint});}
  catch{return denied('IDEMPOTENCY_JOURNAL_UNAVAILABLE');}
  if(claimed?.state==='ALREADY_COMPLETED'&&claimed.fingerprint===fingerprint&&
    HASH.test(claimed.evidenceHash)&&claimed.companyId===companyId&&
    claimed.environment===environment&&claimed.ownerId===principal.ownerId&&
    claimed.missionId===missionId&&claimed.capability===capability&&
    claimed.connectorId===candidate.selectedCapabilityId&&
    claimed.idempotencyKey===idempotencyKey)
   return Object.freeze({state:'ALREADY_COMPLETED_VERIFIED',companyId,environment,
    missionId,capability,evidenceHash:claimed.evidenceHash,
    executed:false,adapterInvoked:false,spentEuro:0});
  if(claimed?.state==='IN_PROGRESS')return denied('DUPLICATE_IN_PROGRESS');
  if(claimed?.state==='CONFLICT')return denied('IDEMPOTENCY_CONFLICT');
  if(claimed?.state!=='CLAIMED')return denied('JOURNAL_CLAIM_REJECTED');
  let invoked=false;
  async function abort(reason){
   try{await journal.fail({...scope,fingerprint,reason});}
   catch{return denied('JOURNAL_FAILURE_UNRECORDED',{adapterInvoked:invoked});}
   return denied(reason,{adapterInvoked:invoked});
  }
  let result;
  try{invoked=true;result=await adapter.read({companyId,environment,missionId,
    capability,connectorId:candidate.selectedCapabilityId});}
  catch{return await abort('CONNECTOR_READ_FAILED');}
  let proof;
  try{proof=await resultVerifier.verify({result,companyId,environment,
    missionId,capability,connectorId:candidate.selectedCapabilityId});}
  catch{return await abort('INDEPENDENT_VERIFIER_UNAVAILABLE');}
  if(proof?.verified!==true||!HASH.test(proof.evidenceHash)||
     typeof proof.summary!=='string'||proof.summary.length===0||proof.summary.length>500)
   return await abort('RESULT_NOT_VERIFIED');
  let confirmed;
  try{confirmed=await audit.append({eventCode:'B6_READ_VERIFIED',companyId,environment,
    missionId,capability,connectorId:candidate.selectedCapabilityId,
    evidenceHash:proof.evidenceHash});}
  catch{return await abort('AUDIT_COMPLETION_UNAVAILABLE');}
  if(confirmed!==true)return await abort('AUDIT_COMPLETION_UNAVAILABLE');
  let completed;
  try{completed=await journal.complete({...scope,fingerprint,
    evidenceHash:proof.evidenceHash});}
  catch{return denied('JOURNAL_COMPLETION_UNAVAILABLE',{adapterInvoked:true});}
  if(completed!==true)return denied('JOURNAL_COMPLETION_UNAVAILABLE',{adapterInvoked:true});
  return Object.freeze({state:'EXECUTED_VERIFIED_READ',companyId,environment,
    missionId,capability,connectorId:candidate.selectedCapabilityId,
    route:adapter.route,evidenceHash:proof.evidenceHash,summary:proof.summary,
    executed:true,adapterInvoked:true,spentEuro:0});
 }});
}
