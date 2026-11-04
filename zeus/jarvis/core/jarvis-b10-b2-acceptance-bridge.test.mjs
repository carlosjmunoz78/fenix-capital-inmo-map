import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {B2_EVIDENCE_KEYS,evaluateB2OperationalAcceptance} from './jarvis-b2-acceptance-gate.mjs';
import {B10_STAGE_REQUIREMENTS,B10_PHASES} from './jarvis-b10-certification-matrix.mjs';
import {evaluateJarvisB10OwnerCrossDeviceAcceptance as check} from './jarvis-b10-b2-acceptance-bridge.mjs';
const NOW='2026-11-04T08:00:00.000Z';
const SHA=s=>createHash('sha256').update(s).digest('hex');
const controls={
 companyId:'fenix',environment:'PROD',
 b3:{enabled:true,killSwitch:false},b4:{enabled:true,killSwitch:false},
 gateway:{enabled:true,killSwitch:false},
 supervisor:{enabled:true,killSwitch:false},audit:{reachable:true},
 finops:{hardCostLimitEuro:0},tradingAccess:false,prodWritesByB10:false
};
const records=B10_PHASES.slice(0,3).flatMap(phase=>B10_STAGE_REQUIREMENTS[phase]).map(key=>({
 key,companyId:'fenix',environment:'PROD',version:'0.1.0',
 observedAt:NOW,verified:true,classification:'PROD_OPERATION_VERIFIED',
 source:'OWNER_DEVICE_E2E',receiptRef:'b10-'+key,
 evidenceHash:SHA(key),verifierId:'external-ci-independent',
 candidateActorId:'jarvis-b10',containsSecrets:false,containsRawCompanyData:false,
 newCostEuro:0,prodMutationByB10:false,
 ...(key==='two_devices_same_mission'?{deviceProofRefs:['owner-device-1','owner-device-2']}:{})
}));
const b2=()=>Object.fromEntries(B2_EVIDENCE_KEYS.map(key=>[key,{
 passed:true,reference:'independent-'+key,observed_at:NOW,environment:'PROD'
}]));
const r=(changes={})=>check({
 companyId:'fenix',targetStage:'PERSISTENT_MISSIONS',
 controlSnapshot:controls,certificationEvidence:records,b2Evidence:b2(),
 now:NOW,...changes
});
test('B10 B2 evidence contract exactly includes two sessions, same mission, restart and duplicate checks',()=>{
 assert.equal(B2_EVIDENCE_KEYS.includes('session_a_authenticated'),true);
 assert.equal(B2_EVIDENCE_KEYS.includes('session_b_authenticated'),true);
 assert.equal(B2_EVIDENCE_KEYS.includes('same_mission_cross_device'),true);
 assert.equal(B2_EVIDENCE_KEYS.includes('restart_recovered'),true);
 assert.equal(B2_EVIDENCE_KEYS.includes('concurrency_no_duplicate'),true);
});
test('B10 even full synthetic B2+matrix fixture cannot issue PROD approval',()=>{
 const x=r();assert.equal(x.status,'NO_GO');assert.equal(x.operational,false);
 assert.equal(x.prodAuthorized,false);assert.equal(x.canActivate,false);
 assert.equal(x.reason,'INDEPENDENT_TWO_DEVICE_OWNER_TEST_REQUIRED');
 assert.equal(x.nextGate,'EXTERNAL_OWNER_TWO_DEVICE_PHYSICAL_REVIEW');
});
test('B10 missing B2 source is denied without minting proof',()=>{
 const x=r({b2Evidence:null});
 assert.equal(x.reason,'B2_PROD_OPERATION_EVIDENCE_MISSING');
 assert.equal(x.prodWriteAuthorized,false);
});
test('B10 every missing B2 evidence key blocks cross-device acceptance',()=>{
 for(const key of B2_EVIDENCE_KEYS){
  const e=b2();delete e[key];
  const x=r({b2Evidence:e});
  assert.equal(x.reason,'B2_PROD_CROSS_DEVICE_NOT_VERIFIED');
  assert.equal(x.b2Missing.includes(key),true);
 }
});
test('B10 rejects 2 sessions if one is unauthenticated or PREPROD',()=>{
 const e=b2();e.session_b_authenticated={...e.session_b_authenticated,passed:false};
 assert.equal(r({b2Evidence:e}).b2Invalid.includes('session_b_authenticated'),true);
 const f=b2();f.same_mission_cross_device={...f.same_mission_cross_device,environment:'PREPROD'};
 assert.equal(r({b2Evidence:f}).b2Invalid.includes('same_mission_cross_device'),true);
});
test('B10 B2 snapshot and rollback evidence mandatory for continuity',()=>{
 const e=b2();delete e.snapshot_restored;
 assert.equal(r({b2Evidence:e}).b2Missing.includes('snapshot_restored'),true);
 const f=b2();f.rollback_exercised.passed=false;
 assert.equal(r({b2Evidence:f}).b2Invalid.includes('rollback_exercised'),true);
});
test('B10 B2 complete but B10 controls OFF still fails certification',()=>{
 const snap={...controls,b3:{enabled:false,killSwitch:true},b4:{enabled:false,killSwitch:true}};
 const x=r({controlSnapshot:snap});
 assert.equal(x.reason,'B10_CERTIFICATION_MATRIX_INCOMPLETE');
 assert.equal(x.b10.evidenceMetadataComplete,false);
});
test('B10 B2 complete but prod evidence only synthetically classified stops',()=>{
 const wrong=records.map(v=>({...v,classification:'SYNTHETIC_TEST'}));
 const x=r({certificationEvidence:wrong});
 assert.equal(x.reason,'B10_CERTIFICATION_MATRIX_INCOMPLETE');
});
test('B10 B2 evidence cannot be upgraded by changing requested stage to READ_ONLY',()=>{
 const x=r({targetStage:'READ_ONLY'});
 assert.equal(x.reason,'CROSS_DEVICE_GATE_NOT_REQUESTED');
 assert.equal(x.prodAuthorized,false);
});
test('B10 B2 evidence failures neither call connectors nor mutate persistent data',()=>{
 const e=b2();e.audit_evidence_persisted={...e.audit_evidence_persisted,passed:false};
 const before=JSON.stringify(e);
 const x=r({b2Evidence:e});
 assert.equal(x.reason,'B2_PROD_CROSS_DEVICE_NOT_VERIFIED');
 assert.equal(JSON.stringify(e),before);
});
