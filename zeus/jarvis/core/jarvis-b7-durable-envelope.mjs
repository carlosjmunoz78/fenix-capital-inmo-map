/** ZEUS JARVIS B7 CUT03 — durable LAB mission envelope reuses B6 PG17 journal.
 * No new table, runtime, worker or secret. Fail-closed: never auto-replay
 * after crash/incomplete mission, and never promote PROD.
 */
import {createHash} from 'node:crypto';
const ID=/^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,179}$/;
const HASH=/^[0-9a-f]{64}$/;
const valid=x=>typeof x==='string'&&ID.test(x);
const deny=(reason,extra={})=>Object.freeze({state:'DENY',reason,executed:false,spentEuro:0,...extra});
const fingerprint=m=>createHash('sha256').update(JSON.stringify({
 ownerId:m.ownerId,companyId:m.companyId,environment:m.environment,engineId:m.engineId,
 missionId:m.missionId,version:m.version,maxEuro:m.maxEuro,maxParallel:m.maxParallel,
 timeoutMs:m.timeoutMs,tasks:m.tasks
})).digest('hex');
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
export function createJarvisB7DurableMissionEnvelope({
 identityProvider,policy,supervisor,journal,orchestrator,audit
}={}){
 if(typeof identityProvider?.verify!=='function'||typeof policy?.authorize!=='function'||
 typeof supervisor?.inspect!=='function'||typeof journal?.claim!=='function'||
 typeof journal?.complete!=='function'||typeof journal?.fail!=='function'||
 typeof orchestrator?.executeMission!=='function'||typeof audit?.append!=='function')
  throw Error('B7_DURABLE_TRUSTED_PORTS_REQUIRED');
 return Object.freeze({async execute({mission:m,missionKey,token}={}){
  if(m?.environment==='PROD')return deny('PROD_NOT_CERTIFIED');
  if(!token)return deny('AUTH_REQUIRED');
  if(!m||m.environment!=='LAB'||m.engineId!=='ORCH-001'||
    ![m.ownerId,m.companyId,m.missionId,m.sessionId,m.version,missionKey].every(valid)||
    !Array.isArray(m.tasks)||m.maxEuro!==0)return deny('MISSION_INVALID');
  let owner;
  try{owner=await identityProvider.verify(token);}
  catch{return deny('B2_UNAVAILABLE');}
  if(owner?.ownerId!==m.ownerId||owner?.sessionId!==m.sessionId||
   !Array.isArray(owner?.roles)||!owner.roles.includes('OWNER_ROOT')||
   !Array.isArray(owner.authorizedCompanies)||!owner.authorizedCompanies.includes(m.companyId))
   return deny('OWNER_SCOPE_DENIED');
  let ctrl;
  try{ctrl=await supervisor.inspect({companyId:m.companyId,environment:'LAB',missionId:m.missionId});}
  catch{return deny('SUPERVISOR_UNAVAILABLE');}
  if(ctrl?.enabled!==true||ctrl.killSwitch!==false||ctrl.revoked===true||ctrl.halted===true)
   return deny('SUPERVISOR_STOP');
  let grant;
  try{grant=await policy.authorize({token,companyId:m.companyId,environment:'LAB',
   missionId:m.missionId,actionName:'JARVIS_CAPABILITY_COORDINATE_READ'});}
  catch{return deny('B3_POLICY_UNAVAILABLE');}
  if(grant?.decision!=='ALLOW')return deny('B3_COORDINATE_DENIED');
  const scope={ownerId:m.ownerId,companyId:m.companyId,environment:'LAB',missionId:m.missionId,
   capability:'JARVIS_B7_MISSION',connectorId:'ORCH-001',idempotencyKey:missionKey,
   fingerprint:fingerprint(m)};
  let recorded;
  try{recorded=await audit.append({eventCode:'B7_MISSION_CLAIM',companyId:m.companyId,
   environment:'LAB',missionId:m.missionId,engineId:'ORCH-001',version:m.version});}
  catch{return deny('AUDIT_UNAVAILABLE');}
  if(recorded!==true)return deny('AUDIT_UNAVAILABLE');
  let claim;
  try{claim=await journal.claim(scope);}
  catch{return deny('JOURNAL_UNAVAILABLE');}
  if(claim?.state==='CONFLICT')return deny('MISSION_FINGERPRINT_CONFLICT');
  if(claim?.state==='IN_PROGRESS')return deny('MISSION_IN_PROGRESS_STOPPED');
  if(claim?.state==='ALREADY_COMPLETED'&&claim.ownerId===scope.ownerId&&
    claim.companyId===scope.companyId&&claim.environment===scope.environment&&
    claim.missionId===scope.missionId&&claim.capability===scope.capability&&
    claim.connectorId===scope.connectorId&&claim.idempotencyKey===scope.idempotencyKey&&
    claim.fingerprint===scope.fingerprint&&HASH.test(claim.evidenceHash))
   return Object.freeze({state:'ALREADY_COMPLETED_VERIFIED',executed:false,spentEuro:0,
    companyId:m.companyId,missionId:m.missionId,evidenceHash:claim.evidenceHash});
  if(claim?.state!=='CLAIMED')return deny('MISSION_CLAIM_REJECTED');
  const fail=async reason=>{
   try{const ok=await journal.fail({...scope,reason});
    if(ok!==true)return deny('MISSION_FAILURE_UNRECORDED');}
   catch{return deny('MISSION_FAILURE_UNRECORDED');}
   return deny(reason);
  };
  let response;
  try{response=await orchestrator.executeMission({mission:m,token});}
  catch{return fail('ORCHESTRATOR_FAILED');}
  if(response?.state!=='LAB_ACCEPTED'||response.accepted!==m.tasks.length||
    response.total!==m.tasks.length||response.spentEuro!==0||
    !Array.isArray(response.results)||response.results.length!==m.tasks.length||
    response.results.some(r=>r.state!=='ACCEPTED'||!HASH.test(r.evidenceHash)))
   return fail('MISSION_NOT_FULLY_VERIFIED');
  let after;
  try{after=await supervisor.inspect({companyId:m.companyId,environment:'LAB',missionId:m.missionId});}
  catch{return fail('SUPERVISOR_UNAVAILABLE');}
  if(after?.enabled!==true||after.killSwitch!==false||after.revoked===true||after.halted===true)
   return fail('SUPERVISOR_STOP');
  const evidenceHash=hash({planFingerprint:response.planFingerprint,
    companyId:m.companyId,missionId:m.missionId,version:m.version,
    results:response.results.map(r=>({taskId:r.taskId,evidenceHash:r.evidenceHash,
     specialistId:r.specialistId,engineId:r.engineId}))});
  try{recorded=await audit.append({eventCode:'B7_MISSION_VERIFIED',
   companyId:m.companyId,environment:'LAB',missionId:m.missionId,evidenceHash});}
  catch{return fail('AUDIT_UNAVAILABLE');}
  if(recorded!==true)return fail('AUDIT_UNAVAILABLE');
  let completed;
  try{completed=await journal.complete({...scope,evidenceHash});}
  catch{return deny('MISSION_COMPLETION_UNCERTAIN');}
  if(completed!==true)return deny('MISSION_COMPLETION_UNCERTAIN');
  return Object.freeze({state:'LAB_ACCEPTED_DURABLE',companyId:m.companyId,
   missionId:m.missionId,evidenceHash,executed:true,spentEuro:0,
   taskCount:response.total});
 }});
}
