/** ZEUS/JARVIS B9 CUT01 — governed resilience evidence admission.
 * Reuses B9 recovery classifier, B2, B3, SUP, independent Tribunal,
 * B6 durable journal and AUD ports. No retries, new worker/queue or PROD path.
 */
import {createHash} from 'node:crypto';
import {decideJarvisB9Recovery} from './jarvis-b9-resilience-decision.mjs';
const ID=/^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,179}$/;
const SHA=/^[0-9a-f]{64}$/;
const valid=x=>typeof x==='string'&&ID.test(x);
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const deny=reason=>Object.freeze({state:'DENY',reason,executed:false,retried:false,prodAuthorized:false,spentEuro:0});
const ALLOW_KEYS=new Set(['companyId','ownerId','sessionId','missionId','engineId','environment',
 'version','failureClass','consecutiveSameFamily','operation','idempotencyKey','rollbackRef',
 'exceptionCode','estimatedExtraEuro','baselineRef','candidateRef','testReportRef','actorId']);
export const B9_GATES=Object.freeze({maxCostEuro:0,maxAttempts:2,prodAuthorized:false,
 supportsMutation:false,canAutoPromote:false});

export function createJarvisB9GovernedRecoveryGate({
 identityProvider,policy,supervisor,evidenceProvider,tribunal,journal,audit
}={}){
 if(typeof identityProvider?.verify!=='function'||typeof policy?.authorize!=='function'||
  typeof supervisor?.inspect!=='function'||typeof evidenceProvider?.readVerifiedComparison!=='function'||
  typeof tribunal?.verify!=='function'||typeof journal?.claim!=='function'||
  typeof journal?.complete!=='function'||typeof journal?.fail!=='function'||
  typeof audit?.append!=='function')throw Error('B9_REUSE_TRUSTED_PORTS_REQUIRED');

 async function alive(c){
  try{const r=await supervisor.inspect({companyId:c.companyId,environment:'LAB',missionId:c.missionId});
   return r?.enabled===true&&r.killSwitch===false&&r.revoked!==true&&r.halted!==true&&r.costEuro===0;}
  catch{return false;}
 }
 async function log(code,c,hash=null){
  try{return await audit.append({eventCode:code,companyId:c.companyId,missionId:c.missionId,
   engineId:'ORCH-001',environment:'LAB',version:c.version,evidenceHash:hash})===true;}
  catch{return false;}
 }
 function validate(c){
  if(!c||typeof c!=='object'||Array.isArray(c)||Object.keys(c).some(k=>!ALLOW_KEYS.has(k)))return false;
  if(c.engineId!=='ORCH-001'||c.environment!=='LAB'||
   ![c.companyId,c.ownerId,c.sessionId,c.missionId,c.version,c.idempotencyKey,
    c.baselineRef,c.candidateRef,c.testReportRef,c.actorId].every(valid)||
   c.operation!=='READ'||c.estimatedExtraEuro!==0||
   c.rollbackRef!==null&&c.rollbackRef!==undefined&&!valid(c.rollbackRef))return false;
  if(new Set([c.baselineRef,c.candidateRef,c.testReportRef]).size!==3)return false;
  return true;
 }
 function evidenceValid(e,c){
  if(!e||typeof e!=='object'||Array.isArray(e)||
   e.companyId!==c.companyId||e.missionId!==c.missionId||
   e.environment!=='LAB'||e.engineId!=='ORCH-001'||e.version!==c.version||
   e.baselineRef!==c.baselineRef||e.candidateRef!==c.candidateRef||
   e.testReportRef!==c.testReportRef||![e.baselineHash,e.candidateHash,e.testReportHash].every(x=>SHA.test(x))||
   !Number.isSafeInteger(e.testCount)||e.testCount<1||e.testCount>100000||
   !Number.isSafeInteger(e.failedTests)||e.failedTests<0||
   !Number.isSafeInteger(e.regressions)||e.regressions<0||
   e.failedTests>e.testCount||e.regressions>e.testCount||
   e.baselineVerified!==true||e.candidateVerified!==true||e.sourceVerified!==true||
   e.signedByCandidate===true||e.additionalCostEuro!==0||
   e.prodWriteAuthorized===true||e.externalMutation===true||
   e.containsSecrets===true||e.containsRawTenantData===true)return false;
  return true;
 }
 return Object.freeze({gates:B9_GATES,
  async review({token,candidate:c}={}){
   // Hard stop before any external port. No runnable executor exposed.
   if(c?.environment==='PROD'||c?.environment==='PREPROD')return deny('PROD_AND_PREPROD_NOT_CERTIFIED');
   if(!validate(c))return deny('RECOVERY_CONTRACT_INVALID');
   if(typeof token!=='string'||token.length===0)return deny('AUTH_REQUIRED');
   const decision=decideJarvisB9Recovery({
    companyId:c.companyId,environment:'LAB',missionId:c.missionId,
    failureClass:c.failureClass,consecutiveSameFamily:c.consecutiveSameFamily,
    operation:c.operation,idempotencyKey:c.idempotencyKey,rollbackRef:c.rollbackRef??null,
    exceptionCode:c.exceptionCode??null,estimatedExtraEuro:c.estimatedExtraEuro
   });
   if(decision.decision==='HUMAN_REQUIRED')
    return Object.freeze({...deny(decision.reason),state:'HUMAN_REQUIRED',humanRequired:decision.reason});
   if(decision.decision!=='CANDIDATE_ONLY')return deny(decision.reason);
   let owner;
   try{owner=await identityProvider.verify(token);}
   catch{return deny('B2_UNAVAILABLE');}
   if(owner?.ownerId!==c.ownerId||owner.sessionId!==c.sessionId||
    !Array.isArray(owner.roles)||!owner.roles.includes('OWNER_ROOT')||
    !Array.isArray(owner.authorizedCompanies)||!owner.authorizedCompanies.includes(c.companyId))
    return deny('OWNER_SCOPE_DENIED');
   let grant;
   try{grant=await policy.authorize({token,companyId:c.companyId,
    environment:'LAB',missionId:c.missionId,actionName:'JARVIS_B9_RECOVERY_REVIEW_READ'});}
   catch{return deny('B3_UNAVAILABLE');}
   if(grant?.decision!=='ALLOW')return deny('B3_RECOVERY_DENIED');
   if(!await alive(c))return deny('SUPERVISOR_STOP');
   if(!await log('B9_RECOVERY_CANDIDATE_REVIEW',c))return deny('AUDIT_UNAVAILABLE');
   const fp=digest({ownerId:c.ownerId,companyId:c.companyId,missionId:c.missionId,version:c.version,
    idempotencyKey:c.idempotencyKey,baselineRef:c.baselineRef,candidateRef:c.candidateRef,
    testReportRef:c.testReportRef,actorId:c.actorId,failureClass:c.failureClass});
   const scope={ownerId:c.ownerId,companyId:c.companyId,environment:'LAB',
    missionId:c.missionId,capability:'JARVIS_B9_RECOVERY_REVIEW',connectorId:'ORCH-001',
    idempotencyKey:c.idempotencyKey,fingerprint:fp};
   let claim;
   try{claim=await journal.claim(scope);}catch{return deny('JOURNAL_UNAVAILABLE');}
   if(claim?.state==='CONFLICT')return deny('RECOVERY_IDEMPOTENCY_CONFLICT');
   if(claim?.state==='IN_PROGRESS')return deny('RECOVERY_IN_PROGRESS_NO_RETRY');
   if(claim?.state==='ALREADY_COMPLETED'){
    const match=Object.keys(scope).every(k=>claim[k]===scope[k]);
    if(!match||!SHA.test(claim.evidenceHash))return deny('REPLAY_RECEIPT_NOT_TRUSTED');
    if(!await alive(c))return deny('SUPERVISOR_STOP');
    return Object.freeze({state:'ALREADY_REVIEWED_VERIFIED',companyId:c.companyId,
      missionId:c.missionId,evidenceHash:claim.evidenceHash,executed:false,retried:false,
      spentEuro:0,prodAuthorized:false});
   }
   if(claim?.state!=='CLAIMED')return deny('RECOVERY_CLAIM_DENIED');
   async function fail(reason){
    try{if(await journal.fail({...scope,reason})!==true)return deny('FAILURE_NOT_RECORDED');}
    catch{return deny('FAILURE_NOT_RECORDED');}
    return deny(reason);
   }
   let evidence;
   try{evidence=await evidenceProvider.readVerifiedComparison({
    companyId:c.companyId,environment:'LAB',engineId:'ORCH-001',version:c.version,
    missionId:c.missionId,baselineRef:c.baselineRef,candidateRef:c.candidateRef,
    testReportRef:c.testReportRef
   });}catch{return fail('EVIDENCE_SOURCE_UNAVAILABLE');}
   if(!evidenceValid(evidence,c))return fail('EVIDENCE_CONTRACT_INVALID');
   if(evidence.failedTests!==0||evidence.regressions!==0)return fail('OLD_NEW_REGRESSION_REJECTED');
   if(!await alive(c))return fail('SUPERVISOR_STOP');
   const evidenceHash=digest({companyId:c.companyId,missionId:c.missionId,
    version:c.version,baselineHash:evidence.baselineHash,
    candidateHash:evidence.candidateHash,testReportHash:evidence.testReportHash,
    testCount:evidence.testCount,failedTests:evidence.failedTests,regressions:evidence.regressions});
   let judgement;
   try{judgement=await tribunal.verify({companyId:c.companyId,environment:'LAB',
    missionId:c.missionId,candidateActorId:c.actorId,evidenceHash,
    sourceRefs:[c.baselineRef,c.candidateRef,c.testReportRef]});}
   catch{return fail('TRIBUNAL_UNAVAILABLE');}
   if(judgement?.decision!=='ACCEPT'||judgement.verified!==true||
    !valid(judgement.verifierId)||judgement.verifierId===c.actorId||
    judgement.verifierId==='JARVIS_B9_RECOVERY_GATE'||judgement.evidenceHash!==evidenceHash)
    return fail('INDEPENDENT_TRIBUNAL_REJECTED');
   if(!await alive(c))return fail('SUPERVISOR_STOP');
   if(!await log('B9_RECOVERY_CANDIDATE_VERIFIED',c,evidenceHash))
    return fail('AUDIT_UNAVAILABLE');
   let completed;
   try{completed=await journal.complete({...scope,evidenceHash});}
   catch{return deny('COMPLETION_AMBIGUOUS_NO_RETRY');}
   if(completed!==true)return deny('COMPLETION_AMBIGUOUS_NO_RETRY');
   return Object.freeze({state:'LAB_RECOVERY_CANDIDATE_VERIFIED',companyId:c.companyId,
    missionId:c.missionId,evidenceHash,testCount:evidence.testCount,
    executed:false,retried:false,autoPromoted:false,spentEuro:0,prodAuthorized:false});
  }
 });
}
