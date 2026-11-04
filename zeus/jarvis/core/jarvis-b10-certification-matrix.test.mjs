import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {
 assessJarvisB10Certification,B10_PHASES,B10_STAGE_REQUIREMENTS,
 B10_CERTIFICATION_AUTHORITY
} from './jarvis-b10-certification-matrix.mjs';
const NOW='2026-11-04T08:00:00.000Z';
const H=x=>createHash('sha256').update(x).digest('hex');
const controls=(override={})=>({
 companyId:'fenix',environment:'PROD',
 b3:{enabled:true,killSwitch:false},b4:{enabled:true,killSwitch:false},
 gateway:{enabled:true,killSwitch:false},
 supervisor:{enabled:true,killSwitch:false},
 audit:{reachable:true},finops:{hardCostLimitEuro:0},
 tradingAccess:false,prodWritesByB10:false,...override
});
const e=(key,extra={})=>({
 key,companyId:'fenix',environment:'PROD',version:'0.1.0',
 observedAt:NOW,verified:true,classification:'PROD_OPERATION_VERIFIED',
 source:'GATEWAY_LIVE',receiptRef:'receipt-'+key,evidenceHash:H(key),
 verifierId:'independent-checker',candidateActorId:'jarvis-candidate',
 containsSecrets:false,containsRawCompanyData:false,newCostEuro:0,
 prodMutationByB10:false,
 ...(key==='two_devices_same_mission'?{deviceProofRefs:['device-one','device-two']}:{}),
 ...extra
});
const evidenceFor=stage=>B10_PHASES.slice(0,B10_PHASES.indexOf(stage)+1)
 .flatMap(x=>B10_STAGE_REQUIREMENTS[x].map(key=>e(key)));
const assess=(stage='READ_ONLY',extra={})=>assessJarvisB10Certification({
 companyId:'fenix',targetStage:stage,now:NOW,controlSnapshot:controls(),
 evidence:evidenceFor(stage),...extra
});
test('B10 missing everything: NO_GO, never grants permission or writes',()=>{
 const r=assessJarvisB10Certification({companyId:'fenix',targetStage:'READ_ONLY',
  now:NOW,controlSnapshot:controls(),evidence:[]});
 assert.equal(r.state,'NO_GO');assert.equal(r.missing.length,B10_STAGE_REQUIREMENTS.READ_ONLY.length);
 assert.equal(r.productionAuthorized,false);assert.equal(r.prodWriteAuthorized,false);
 assert.equal(r.automaticActivation,false);assert.equal(r.spentEuro,0);
});
test('B10 all seven phases remain review-only even with fabricated green fixtures',()=>{
 for(const stage of B10_PHASES){
  const r=assess(stage);
  assert.equal(r.targetStage,stage);assert.equal(r.evidenceMetadataComplete,true);
  assert.equal(r.state,'NO_GO');
  assert.equal(r.reason,'INDEPENDENT_EXTERNAL_PROMOTION_AUTHORITY_REQUIRED');
  assert.equal(r.productionAuthorized,false);assert.equal(r.prodWriteAuthorized,false);
  assert.equal(r.scope,'ASSESSMENT_ONLY_NO_ACTIVATION');
 }
});
test('B10 each later phase requires all earlier phase evidence',()=>{
 const r=assess('VOICE',{evidence:B10_STAGE_REQUIREMENTS.VOICE.map(key=>e(key))});
 assert.equal(r.state,'NO_GO');
 assert.equal(r.missing.includes('prod_source_sha_exact'),true);
 assert.equal(r.missing.includes('real_job001_durable_recovery'),true);
});
test('B10 two missing owner-device evidences block persistent missions',()=>{
 const r=assess('PERSISTENT_MISSIONS',{
  evidence:evidenceFor('PERSISTENT_MISSIONS')
   .filter(x=>x.key!=='two_devices_same_mission')
 });
 assert.equal(r.state,'NO_GO');assert.equal(r.missing.includes('two_devices_same_mission'),true);
});
test('B10 identical device proof references are not accepted as two real devices',()=>{
 const records=evidenceFor('PERSISTENT_MISSIONS').map(x=>x.key==='two_devices_same_mission'?
  e(x.key,{deviceProofRefs:['device-one','device-one']}):x);
 const r=assess('PERSISTENT_MISSIONS',{evidence:records});
 assert.equal(r.evidenceMetadataComplete,false);
 assert.equal(r.invalid.includes('two_devices_same_mission'),true);
});
test('B10 same evidence used across tenants is rejected',()=>{
 const data=evidenceFor('READ_ONLY').map(x=>e(x.key,{companyId:'aion'}));
 const r=assess('READ_ONLY',{evidence:data});
 assert.equal(r.invalid.length,B10_STAGE_REQUIREMENTS.READ_ONLY.length);
 assert.equal(r.evidenceMetadataComplete,false);
});
test('B10 no special credential, secret, raw company data or budget escalation',()=>{
 for(const extra of [
  {containsSecrets:true},{containsRawCompanyData:true},{newCostEuro:.001},
  {prodMutationByB10:true},{source:'CANDIDATE_SELF'},
  {classification:'SYNTHETIC_TEST'},{classification:'REAL_EXTERNAL_READ'}
 ]){
  const r=assess('READ_ONLY',{evidence:evidenceFor('READ_ONLY').map(x=>
   x.key==='prod_source_sha_exact'?e(x.key,extra):x)});
  assert.equal(r.invalid.includes('prod_source_sha_exact'),true);
 }
});
test('B10 candidate cannot attest own evidence',()=>{
 const r=assess('READ_ONLY',{evidence:evidenceFor('READ_ONLY').map(x=>
  x.key==='owner_root_real_authenticated'?e(x.key,{verifierId:'jarvis-candidate'}):x)});
 assert.equal(r.invalid.includes('owner_root_real_authenticated'),true);
});
test('B10 missing or malformed immutable receipt prevents completion',()=>{
 for(const bad of [{receiptRef:''},{evidenceHash:'not-a-sha'},{observedAt:'sometime'},
  {verified:false}]){
  const r=assess('READ_ONLY',{evidence:evidenceFor('READ_ONLY').map(x=>
   x.key==='prod_gateway_health_verified'?e(x.key,bad):x)});
  assert.equal(r.invalid.includes('prod_gateway_health_verified'),true);
 }
});
test('B10 stale/future evidence never counts as current PROD certification',()=>{
 for(const observedAt of ['2026-11-01T07:00:00.000Z','2026-11-04T09:10:00.000Z']){
  const r=assess('READ_ONLY',{evidence:evidenceFor('READ_ONLY').map(x=>
   x.key==='prod_gateway_health_verified'?e(x.key,{observedAt}):x)});
  assert.equal(r.invalid.includes('prod_gateway_health_verified'),true);
 }
});
test('B10 duplicate evidence receipts are ambiguous even if both pass',()=>{
 const data=evidenceFor('READ_ONLY');data.push({...data[0]});
 const r=assess('READ_ONLY',{evidence:data});
 assert.equal(r.invalid.includes('prod_source_sha_exact'),true);
});
test('B10 control kill-switch OFF policy mismatch always NO_GO',()=>{
 for(const override of [
  {b3:{enabled:false,killSwitch:true}},
  {b4:{enabled:false,killSwitch:true}},
  {gateway:{enabled:false,killSwitch:true}},
  {supervisor:{enabled:false,killSwitch:true}},
  {audit:{reachable:false}},
  {finops:{hardCostLimitEuro:1}},
  {tradingAccess:true},
  {prodWritesByB10:true}
 ]){
  const r=assess('READ_ONLY',{controlSnapshot:controls(override)});
  assert.equal(r.state,'NO_GO');assert.equal(r.evidenceMetadataComplete,false);
  assert.equal(r.reason,'LIVE_PRODUCTION_CONTROLS_NOT_ENABLED');
 }
});
test('B10 current real B3/B4 disabled snapshot explicitly NO_GO',()=>{
 const r=assess('READ_ONLY',{controlSnapshot:controls({
  b3:{enabled:false,killSwitch:true},b4:{enabled:false,killSwitch:true}
 })});
 assert.equal(r.state,'NO_GO');assert.equal(r.productionAuthorized,false);
});
test('B10 target company must match control snapshot',()=>{
 const r=assess('READ_ONLY',{controlSnapshot:controls({companyId:'aion'})});
 assert.equal(r.reason,'CONTROL_SNAPSHOT_REQUIRED');
});
test('B10 invalid company, stage or time denied',()=>{
 for(const params of [
  {companyId:'*'},{targetStage:'ACTIVATE_ALL'},{now:'not-a-date'},
  {evidence:{}}
 ]){
  const r=assessJarvisB10Certification({
   companyId:'fenix',targetStage:'READ_ONLY',now:NOW,
   controlSnapshot:controls(),evidence:[],...params
  });assert.equal(r.reason,'REQUEST_INVALID');
 }
});
test('B10 no trading, subscriptions, or promotion authority ever exported',()=>{
 assert.equal(B10_CERTIFICATION_AUTHORITY.productionWrites,false);
 assert.equal(B10_CERTIFICATION_AUTHORITY.autoPromotion,false);
 assert.equal(B10_CERTIFICATION_AUTHORITY.canChangeKillSwitch,false);
 assert.equal(B10_CERTIFICATION_AUTHORITY.canDeploy,false);
 assert.equal(B10_CERTIFICATION_AUTHORITY.spendEuro,0);
});
test('B10 whitelist evidence only; attaching unrelated data grants nothing',()=>{
 const evidence=evidenceFor('READ_ONLY');evidence.push(e('prod_payment_execution'));
 const result=assess('READ_ONLY',{evidence});
 assert.equal(result.state,'NO_GO');
 assert.equal(result.productionAuthorized,false);
 assert.equal(JSON.stringify(result).includes('prod_payment_execution'),false);
});
test('B10 no reverse stage shortcut through multi-company or voice',()=>{
 for(const stage of ['MULTICOMPANY','GOVERNED_IMPROVEMENT']){
  const data=B10_STAGE_REQUIREMENTS[stage].map(key=>e(key));
  const r=assess(stage,{evidence:data});
  assert.equal(r.evidenceMetadataComplete,false);
  assert.equal(r.missing.includes('prod_source_sha_exact'),true);
 }
});
