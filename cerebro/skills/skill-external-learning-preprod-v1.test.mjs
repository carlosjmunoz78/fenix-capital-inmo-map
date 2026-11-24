import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {runExternalSkillLearningPreprod as run} from './skill-external-learning-preprod-v1.mjs';
import {prepareExternalSkillProposal as prepare} from './skill-chatgpt-evolution-bridge-v1.mjs';
import {LearningLedgerV0} from '../runtime/learning-ledger.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
function fixture(t){
  const dir=mkdtempSync(join(tmpdir(),'skill-lrn-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const baseline='---\nname: sample-skill\ndescription: Test\n---\nOld';
  const candidate=baseline.replace('Old','New');
  const evidence='Synthetic only';
  const proposal={company_id:'sample',skill_id:'sample-skill',base_release:'r1',base_sha256:sha(baseline),candidate_sha256:sha(candidate),evidence_sha256:sha(evidence),source:'CHATGPT'};
  const context={company_id:'sample',source:'CHATGPT',environment:'PREPROD'};
  const catalog=[{company_id:'sample',skill_id:'sample-skill',release:'r1',sha256:sha(baseline),capabilities:['test']}];
  const r=prepare({proposal,baseline,candidate,catalog,context});
  return {proposal,baseline,candidate,evidence,catalog,context,subscribers:{accepted_signal_families:['SKILL_SUPPLY_CHAIN'],subscribers:[{company_id:'sample',enabled:true,environment:'PREPROD',local_validation_required:true,local_persistence_scope:'LOCAL_PREPROD_LRN_LEDGER_ONLY',prod_authorized:false,prod_write_authorized:false,trading_access:false}]},engines:[{company_id:'sample',engine_id:'FACT-001',version:'1.0.0',capabilities:['test']}],known_engine_ids:['FACT-001'],review:{proposal_id:r.proposal_id,candidate_sha256:proposal.candidate_sha256,evidence_sha256:proposal.evidence_sha256,policy_pass:true,security_pass:true,private_artifact_verified:true},ledger_file:join(dir,'ledger.v8'),preprod_version:'test-v1',local_persistence_enabled:true,observed_at:'2026-01-01T00:00:00Z'};
}
test('actual canonical FACT plans and LRN journal, replay is deduplicated',t=>{const f=fixture(t);const a=run(f);assert.equal(a.status,'LRN_CANDIDATE_RECORDED');assert.equal(a.plans.length,1);assert.equal(a.learning_binding.status,'BOUND_NOT_RUN');assert.equal(Object.keys(a.learning_binding.mechanisms).length,12);assert.equal(a.plans[0].learning_comparison.arms.length,4);assert.equal(a.learning.persisted_total,1);assert.equal(a.prod_authorized,false);const b=run({...f,observed_at:'2026-01-02T00:00:00Z'});assert.equal(b.learning.duplicates_total,1);const l=new LearningLedgerV0({file_path:f.ledger_file});assert.equal(l.operation_count,1);const rec=l.list()[0];assert.equal(rec.promotion_state,'CANDIDATE');assert.equal(rec.judge_decision,null);assert.equal(rec.company_id,'sample');assert.ok(!JSON.stringify(rec).includes(f.candidate));});
test('missing review fails closed',t=>{const f=fixture(t);assert.equal(run({...f,review:null}).reason,'TRUSTED_REVIEW_OR_PERSISTENCE_MISSING');});
test('altered evidence fails closed',t=>{const f=fixture(t);assert.equal(run({...f,evidence:'wrong'}).reason,'EVIDENCE_HASH_MISMATCH');});
test('disabled subscriber fails closed',t=>{const f=fixture(t);assert.equal(run({...f,subscribers:{}}).reason,'SUBSCRIPTION_NOT_AUTHORIZED');});
test('wrong tenant or unknown engine fails closed',t=>{const f=fixture(t);assert.equal(run({...f,engines:[{...f.engines[0],company_id:'other'}]}).reason,'INVALID_ENGINE_SCOPE');assert.equal(run({...f,known_engine_ids:['OTHER']}).reason,'INVALID_ENGINE_SCOPE');});
test('capability gap does not create engine',t=>{const f=fixture(t);assert.equal(run({...f,engines:[{...f.engines[0],capabilities:['unrelated']}]}).reason,'FACT_CAPABILITY_GAP_REVIEW');});
test('kill switch requires no inputs',()=>assert.equal(run({kill_switch:true}).status,'KILLED'));
test('persistence disabled fails closed',t=>{const f=fixture(t);assert.equal(run({...f,local_persistence_enabled:false}).reason,'TRUSTED_REVIEW_OR_PERSISTENCE_MISSING');});
