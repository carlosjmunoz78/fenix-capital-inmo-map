import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createJarvisB9GovernedRecoveryGate,B9_GATES} from './jarvis-b9-governed-recovery.mjs';

const H=s=>createHash('sha256').update(s).digest('hex');
const E=Object.freeze({baselineHash:H('baseline'),candidateHash:H('candidate'),
 testReportHash:H('test'),testCount:42,failedTests:0,regressions:0,
 baselineVerified:true,candidateVerified:true,sourceVerified:true,
 signedByCandidate:false,additionalCostEuro:0,prodWriteAuthorized:false,
 externalMutation:false,containsSecrets:false,containsRawTenantData:false});
const candidate=(companyId='fenix',missionId='m-1',extras={})=>({
 companyId,missionId,ownerId:'owner-1',sessionId:'session-1',
 engineId:'ORCH-001',environment:'LAB',version:'0.1.0',
 failureClass:'NETWORK',consecutiveSameFamily:1,operation:'READ',
 idempotencyKey:'idem-'+missionId,rollbackRef:null,exceptionCode:null,
 estimatedExtraEuro:0,baselineRef:'baseline-1',candidateRef:'candidate-1',
 testReportRef:'tests-1',actorId:'recovery-worker',...extras});
function rig(options={}){
 const log=[],rows=options.rows||new Map();
 const key=s=>[s.ownerId,s.companyId,s.environment,s.missionId,s.capability,s.connectorId,s.idempotencyKey].join('|');
 let stop=!!options.kill;
 const ports={
  identityProvider:{verify:async token=>{
   log.push('b2');
   if(options.identityThrows)throw Error('B2_DOWN');
   return token==='synthetic-token'?{ownerId:'owner-1',sessionId:'session-1',
    roles:options.roles||['OWNER_ROOT'],authorizedCompanies:options.companies||['fenix','aion']}:{};}},
  policy:{authorize:async p=>{log.push('b3:'+p.companyId);
   if(options.policyThrows)throw Error('B3_DOWN');
   return {decision:options.policyDenied?'DENY':'ALLOW'};}},
  supervisor:{inspect:async p=>{log.push('supervisor:'+p.companyId);
   return {enabled:!stop,killSwitch:stop,halted:false,revoked:!!options.revoked,costEuro:0};}},
  evidenceProvider:{readVerifiedComparison:async p=>{
   log.push('evidence:'+p.companyId);
   if(options.sourceThrows)throw Error('DOWN');
   if(options.killAfterEvidence)stop=true;
   return {companyId:options.fakeCompany||p.companyId,missionId:p.missionId,
    environment:'LAB',engineId:'ORCH-001',version:'0.1.0',
    baselineRef:p.baselineRef,candidateRef:p.candidateRef,testReportRef:p.testReportRef,
    ...E,...(options.evidenceOverride||{})};}},
  tribunal:{verify:async p=>{log.push('tribunal:'+p.companyId);
   if(options.tribunalThrows)throw Error('DOWN');
   return {decision:options.reject?'REJECT':'ACCEPT',verified:!options.unverifiedTribunal,
    verifierId:options.selfJudge?'recovery-worker':'independent-verifier',
    evidenceHash:options.fakeVerdictHash?H('fabricated'):p.evidenceHash};}},
  journal:{
   claim:async s=>{
    log.push('claim:'+s.companyId);
    if(options.journalThrows)throw Error('DOWN');
    const k=key(s),old=rows.get(k);
    if(old)return old.fingerprint!==s.fingerprint?{state:'CONFLICT'}:
     old.state==='complete'?{state:'ALREADY_COMPLETED',...old.scope,
      evidenceHash:old.hash}:{state:'IN_PROGRESS'};
    rows.set(k,{fingerprint:s.fingerprint,state:'pending',scope:{...s}});
    return {state:'CLAIMED'};
   },
   complete:async s=>{
    log.push('complete:'+s.companyId);
    if(options.completionThrows)throw Error('UNCERTAIN');
    const old=rows.get(key(s));
    if(!old||old.state!=='pending')return false;
    old.hash=s.evidenceHash;old.state='complete';return true;
   },
   fail:async s=>{
    log.push('fail:'+s.companyId);
    if(options.failJournalThrows)throw Error('DOWN');
    const old=rows.get(key(s));
    if(!old)return false;old.state='failed';return true;
   }
  },
  audit:{append:async e=>{log.push('audit:'+e.eventCode);
   return !options.auditDenied;}}
 };
 return {gate:createJarvisB9GovernedRecoveryGate(ports),log,rows,
  stop:()=>{stop=true;},token:'synthetic-token'};
}
const review=async(r,c=candidate(),token=r.token)=>r.gate.review({token,candidate:c});
test('B9 verified old-vs-new evidence is candidate only; no retry or PROD',async()=>{
 const r=rig(),x=await review(r);
 assert.equal(x.state,'LAB_RECOVERY_CANDIDATE_VERIFIED');
 assert.equal(x.testCount,42);assert.equal(x.executed,false);assert.equal(x.retried,false);
 assert.equal(x.autoPromoted,false);assert.equal(x.prodAuthorized,false);assert.equal(x.spentEuro,0);
 assert.equal(r.log.some(s=>s.startsWith('complete:fenix')),true);
});
test('two tenants reviewed independently with no cross-company result leakage',async()=>{
 const r=rig(),a=await review(r,candidate('fenix','mf')),
 b=await review(r,candidate('aion','ma'));
 assert.equal(a.state,'LAB_RECOVERY_CANDIDATE_VERIFIED');assert.equal(b.state,a.state);
 assert.equal(a.companyId,'fenix');assert.equal(b.companyId,'aion');assert.equal(r.rows.size,2);
 assert.equal(JSON.stringify([a,b]).includes('signedByCandidate'),false);
});
test('durable re-instantiation returns verified receipt without rereading source',async()=>{
 const rows=new Map(),first=rig({rows}),next=rig({rows}),c=candidate();
 assert.equal((await review(first,c)).state,'LAB_RECOVERY_CANDIDATE_VERIFIED');
 const result=await review(next,c);
 assert.equal(result.state,'ALREADY_REVIEWED_VERIFIED');
 assert.equal(next.log.some(s=>s.startsWith('evidence:')),false);
 assert.equal(rows.size,1);
});
test('same idempotency key with changed evidence is conflict, no second evaluation',async()=>{
 const r=rig(),c=candidate();
 await review(r,c);
 const x=await review(r,{...c,candidateRef:'alternative-1'});
 assert.equal(x.reason,'RECOVERY_IDEMPOTENCY_CONFLICT');
 assert.equal(r.log.filter(s=>s.startsWith('evidence:')).length,1);
});
test('anonymous owner and wrong role denied before journal',async()=>{
 for(const opts of [{roles:['EMPLOYEE']},{companies:['aion']}]){
  const r=rig(opts),x=await review(r);
  assert.equal(x.state,'DENY');
  assert.equal(r.log.some(s=>s.startsWith('claim:')),false);
 }
 const u=rig(),x=await review(u,candidate(),'unknown');
 assert.equal(x.reason,'OWNER_SCOPE_DENIED');
});
test('invalid token stops before identity lookup',async()=>{
 const r=rig(),x=await review(r,candidate(),'');
 assert.equal(x.reason,'AUTH_REQUIRED');assert.equal(r.log.length,0);
});
test('PROD and PREPROD have hard deny with no ports',async()=>{
 for(const env of ['PROD','PREPROD']){
  const r=rig(),x=await review(r,candidate('fenix','m-1',{environment:env}));
  assert.equal(x.reason,'PROD_AND_PREPROD_NOT_CERTIFIED');assert.equal(r.log.length,0);
 }
});
test('unrecognized extra authority fields are refused',async()=>{
 const r=rig(),x=await review(r,candidate('fenix','m-1',{canGrantOwner:true}));
 assert.equal(x.reason,'RECOVERY_CONTRACT_INVALID');assert.equal(r.log.length,0);
});
test('mutation with rollback is not admitted into B9 CUT01',async()=>{
 const r=rig(),x=await review(r,candidate('fenix','m-1',
  {operation:'MUTATION',rollbackRef:'rollback-1'}));
 assert.equal(x.reason,'RECOVERY_CONTRACT_INVALID');assert.equal(r.log.length,0);
 assert.equal(B9_GATES.supportsMutation,false);
});
test('zero new cost even tiny paid estimation, no identity lookup',async()=>{
 const r=rig(),x=await review(r,candidate('fenix','m-1',{estimatedExtraEuro:.0001}));
 assert.equal(x.reason,'RECOVERY_CONTRACT_INVALID');assert.equal(r.log.length,0);
});
test('repeated family third failure invokes anti-loop before B2 and no retries',async()=>{
 const r=rig(),x=await review(r,candidate('fenix','m-1',{consecutiveSameFamily:3}));
 assert.equal(x.reason,'ANTI_LOOP_REEVALUATE_CAUSE');assert.equal(r.log.length,0);
});
test('unknown failure is STOP until classified',async()=>{
 const r=rig(),x=await review(r,candidate('fenix','m-1',{failureClass:'UNKNOWN'}));
 assert.equal(x.reason,'CLASSIFY_FAILURE_BEFORE_RETRY');assert.equal(r.log.length,0);
});
test('AUTH credential and policy failures cannot create recovery admission',async()=>{
 for(const failureClass of ['AUTH','CREDENTIALS','POLICY','PERMISSIONS']){
  const r=rig(),x=await review(r,candidate('fenix','m-1',{failureClass}));
  assert.equal(x.reason,'REVALIDATE_IDENTITY_OR_POLICY');assert.equal(r.log.length,0);
 }
});
test('canonical HUMAN_REQUIRED exceptions are surfaced but not executed',async()=>{
 for(const exceptionCode of ['SECURITY_INCIDENT','LEGAL_REQUIRED','SIGNATURE_REQUIRED',
  'HIGH_RISK','MONEY_LIMIT','POLICY_CONFLICT','LOW_CONFIDENCE','CUSTOMER_HUMAN_REQUEST']){
  const r=rig(),x=await review(r,candidate('fenix','m-1',{exceptionCode}));
  assert.equal(x.state,'HUMAN_REQUIRED');assert.equal(x.humanRequired,exceptionCode);
  assert.equal(r.log.length,0);
 }
});
test('B2 outage fails closed',async()=>{
 const x=await review(rig({identityThrows:true}));
 assert.equal(x.reason,'B2_UNAVAILABLE');
});
test('B3 DENY and outage block before audit and journal',async()=>{
 for(const p of [{policyDenied:true},{policyThrows:true}]){
  const r=rig(p),x=await review(r);
  assert.equal(x.state,'DENY');assert.equal(r.log.some(s=>s.startsWith('claim:')),false);
 }
});
test('Supervisor kill or revocation block before claim',async()=>{
 for(const p of [{kill:true},{revoked:true}]){
  const r=rig(p),x=await review(r);
  assert.equal(x.reason,'SUPERVISOR_STOP');
  assert.equal(r.log.some(s=>s.startsWith('claim:')),false);
 }
});
test('audit outage rejects admission before claim',async()=>{
 const r=rig({auditDenied:true}),x=await review(r);
 assert.equal(x.reason,'AUDIT_UNAVAILABLE');
 assert.equal(r.log.some(s=>s.startsWith('claim:')),false);
});
test('journal outage fails closed without evidence read',async()=>{
 const r=rig({journalThrows:true}),x=await review(r);
 assert.equal(x.reason,'JOURNAL_UNAVAILABLE');
 assert.equal(r.log.some(s=>s.startsWith('evidence:')),false);
});
test('cross-company evidence substitution rejected and journal records FAILED',async()=>{
 const r=rig({fakeCompany:'aion'}),x=await review(r);
 assert.equal(x.reason,'EVIDENCE_CONTRACT_INVALID');
 assert.equal([...r.rows.values()][0].state,'failed');
});
test('fabricated evidence source, hashes and unknown baselines rejected',async()=>{
 for(const evidenceOverride of [{sourceVerified:false},{baselineVerified:false},
  {candidateHash:'xyz'},{testCount:0},{containsSecrets:true},
  {containsRawTenantData:true},{prodWriteAuthorized:true},{externalMutation:true},
  {signedByCandidate:true},{additionalCostEuro:1},{baselineRef:'other-ref'}]){
  const r=rig({evidenceOverride}),x=await review(r);
  assert.equal(x.reason,'EVIDENCE_CONTRACT_INVALID');
 }
});
test('failed tests or regressions cannot be certified by tribunal',async()=>{
 for(const evidenceOverride of [{failedTests:1},{regressions:1}]){
  const r=rig({evidenceOverride}),x=await review(r);
  assert.equal(x.reason,'OLD_NEW_REGRESSION_REJECTED');
  assert.equal(r.log.some(s=>s.startsWith('tribunal:')),false);
 }
});
test('self-judgement and mismatched independent verdict denied',async()=>{
 for(const p of [{selfJudge:true},{reject:true},{unverifiedTribunal:true},{fakeVerdictHash:true}]){
  const r=rig(p),x=await review(r);
  assert.equal(x.reason,'INDEPENDENT_TRIBUNAL_REJECTED');
  assert.equal([...r.rows.values()][0].state,'failed');
 }
});
test('tribunal outage rejects without success',async()=>{
 const r=rig({tribunalThrows:true}),x=await review(r);
 assert.equal(x.reason,'TRIBUNAL_UNAVAILABLE');
});
test('revocation during evidence collection stops before tribunal acceptance',async()=>{
 const r=rig({killAfterEvidence:true}),x=await review(r);
 assert.equal(x.reason,'SUPERVISOR_STOP');
 assert.equal(r.log.some(s=>s.startsWith('tribunal:')),false);
});
test('ambiguous completion stops; repeated review cannot auto-retry',async()=>{
 const rows=new Map(),r=rig({rows,completionThrows:true}),c=candidate();
 assert.equal((await review(r,c)).reason,'COMPLETION_AMBIGUOUS_NO_RETRY');
 const again=rig({rows});
 assert.equal((await review(again,c)).reason,'RECOVERY_IN_PROGRESS_NO_RETRY');
 assert.equal(again.log.some(s=>s.startsWith('evidence:')),false);
});
test('source unavailable safely records journal failure',async()=>{
 const r=rig({sourceThrows:true}),x=await review(r);
 assert.equal(x.reason,'EVIDENCE_SOURCE_UNAVAILABLE');
 assert.equal([...r.rows.values()][0].state,'failed');
});
test('result receipt contains only hashes and metadata',async()=>{
 const r=rig(),x=await review(r);const serialized=JSON.stringify(x);
 assert.equal(serialized.includes('synthetic-token'),false);
 assert.equal(serialized.includes('baselineRef'),false);
 assert.equal(serialized.includes('sourceVerified'),false);
 assert.equal(serialized.includes('rawTenantData'),false);
 assert.match(x.evidenceHash,/^[0-9a-f]{64}$/);
});
test('duplicate evidence references deny before journal',async()=>{
 const r=rig(),x=await review(r,candidate('fenix','m-1',{candidateRef:'baseline-1'}));
 assert.equal(x.reason,'RECOVERY_CONTRACT_INVALID');assert.equal(r.log.length,0);
});
