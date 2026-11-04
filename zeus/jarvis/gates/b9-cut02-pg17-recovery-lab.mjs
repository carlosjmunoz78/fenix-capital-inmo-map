/** B9 CUT02 · Real PostgreSQL17 B6 journal reuse, only in ephemeral Github Actions.
 * B2/B3/SUP/Tribunal/evidence origins are synthetic: NO PROD certification.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createJarvisB9GovernedRecoveryGate} from '../core/jarvis-b9-governed-recovery.mjs';
import {createJarvisB6PgJournal} from '../core/jarvis-b6-pg-journal.mjs';
import {b6CiPsqlQuery} from './b6-ci-psql-query.mjs';
if(process.env.PGDATABASE!=='jarvis_b9_cut02'||process.env.JARVIS_B9_LAB_ONLY!=='true'||
 process.env.CI!=='true')throw Error('B9_EPHEMERAL_CI_LAB_GUARD_REQUIRED');
const hash=s=>createHash('sha256').update(s).digest('hex');
const journal=createJarvisB6PgJournal({query:b6CiPsqlQuery});
const owner={ownerId:'owner-b9-ci',sessionId:'session-b9-ci',roles:['OWNER_ROOT'],
 authorizedCompanies:['fenix','aion']};
const token='CI_SYNTHETIC_ONLY';
let compared=0,audited=0;
function engine(){
 return createJarvisB9GovernedRecoveryGate({
  identityProvider:{verify:async t=>{
   if(t!==token)throw Error('SYNTHETIC_DENY');return owner;
  }},
  policy:{authorize:async p=>({decision:p.environment==='LAB'&&
    p.actionName==='JARVIS_B9_RECOVERY_REVIEW_READ'&&
    owner.authorizedCompanies.includes(p.companyId)?'ALLOW':'DENY'})},
  supervisor:{inspect:async p=>({enabled:p.environment==='LAB',killSwitch:false,
   halted:false,revoked:false,costEuro:0})},
  evidenceProvider:{readVerifiedComparison:async p=>{
   compared++;
   return {companyId:p.companyId,missionId:p.missionId,environment:p.environment,
    engineId:p.engineId,version:p.version,baselineRef:p.baselineRef,
    candidateRef:p.candidateRef,testReportRef:p.testReportRef,
    baselineHash:hash('baseline:'+p.companyId),candidateHash:hash('candidate:'+p.companyId),
    testReportHash:hash('tests:'+p.companyId),testCount:99,
    failedTests:0,regressions:0,baselineVerified:true,
    candidateVerified:true,sourceVerified:true,
    signedByCandidate:false,additionalCostEuro:0,prodWriteAuthorized:false,
    externalMutation:false,containsSecrets:false,containsRawTenantData:false};
  }},
  tribunal:{verify:async p=>({
   decision:'ACCEPT',verified:true,verifierId:'independent-ci-synthetic-tribunal',
   evidenceHash:p.evidenceHash
  })},
  journal,
  audit:{append:async event=>{
   assert.equal(event.environment,'LAB');
   audited++;return true;
  }}
 });
}
const make=(companyId,missionId)=>({
 ownerId:owner.ownerId,sessionId:owner.sessionId,companyId,missionId,
 engineId:'ORCH-001',environment:'LAB',version:'0.1.0',
 failureClass:'NETWORK',consecutiveSameFamily:1,operation:'READ',
 idempotencyKey:'idem-'+missionId,rollbackRef:null,exceptionCode:null,
 estimatedExtraEuro:0,baselineRef:'baseline-proof',candidateRef:'candidate-proof',
 testReportRef:'tests-proof',actorId:'synthetic-ci-specialist'
});
const call=(gate,candidate)=>gate.review({token,candidate});
const f=make('fenix','b9-lab-fenix'),a=make('aion','b9-lab-aion');
async function counts(){
 const row=(await b6CiPsqlQuery('SELECT COUNT(*)::integer AS total, COUNT(*) FILTER (WHERE state=\'COMPLETED\')::integer AS completed FROM zeus_jarvis_b6_lab.execution_claim'))[0];
 return row;
}
async function write(){
 const gate=engine();
 const [r1,r2]=await Promise.all([call(gate,f),call(gate,f)]);
 assert.equal([r1,r2].filter(r=>r.state==='LAB_RECOVERY_CANDIDATE_VERIFIED').length,1);
 assert.equal([r1,r2].some(r=>r.reason==='RECOVERY_IN_PROGRESS_NO_RETRY'||
   r.state==='ALREADY_REVIEWED_VERIFIED'),true);
 assert.equal((await call(engine(),a)).state,'LAB_RECOVERY_CANDIDATE_VERIFIED');
 const bad=await call(engine(),{...f,candidateRef:'candidate-changed'});
 assert.equal(bad.reason,'RECOVERY_IDEMPOTENCY_CONFLICT');
 assert.equal((await call(engine(),{...f,environment:'PROD'})).reason,'PROD_AND_PREPROD_NOT_CERTIFIED');
 assert.equal((await call(engine(),{...f,consecutiveSameFamily:3})).reason,
  'ANTI_LOOP_REEVALUATE_CAUSE');
 assert.deepEqual(await counts(),{total:2,completed:2});
 assert.equal(compared,2);
 console.log('B9_CUT02_REAL_LAB_WRITE_GREEN pg17=true two_synthetic_companies=true concurrent_claim_once=true zero_paid_cost=true');
}
async function replay(){
 const gate=engine();
 const x=await call(gate,f),y=await call(gate,a);
 assert.equal(x.state,'ALREADY_REVIEWED_VERIFIED');
 assert.equal(y.state,'ALREADY_REVIEWED_VERIFIED');
 assert.notEqual(x.evidenceHash,y.evidenceHash);
 assert.equal(compared,0); // Rebuilt process never re-fetches or evaluates.
 assert.deepEqual(await counts(),{total:2,completed:2});
 const cross=await call(gate,{...f,companyId:'unknown-company'});
 assert.equal(cross.reason,'OWNER_SCOPE_DENIED');
 console.log('B9_CUT02_REAL_LAB_RESTART_RESTORE_GREEN no_second_review=true tenant_isolation=true');
}
const phase=process.argv.find(v=>v.startsWith('--phase='))?.split('=')[1];
if(phase==='write')await write();
else if(phase==='replay')await replay();
else throw Error('B9_CUT02_PHASE_INVALID');
