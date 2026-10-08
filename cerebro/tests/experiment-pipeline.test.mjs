import test from 'node:test';
import assert from 'node:assert/strict';
import {defineExperiment,registerReplay,recordArmResult,compareArms} from '../runtime/experiment-pipeline.mjs';

const exp=defineExperiment({company_id:'fenix',engine_id:'SEO-001',environment:'LAB',version:'1.0.0',hypothesis:'new improves score',baseline_version:'old',candidate_version:'new',metrics:['score'],dataset_kind:'SYNTHETIC'});

test('experiment requires OLD vs NEW and forbids PROD context/writes',()=>{
  assert.equal(exp.prod_authorized,false);
  assert.throws(()=>defineExperiment({company_id:'fenix',engine_id:'SEO-001',environment:'PROD',version:'1',hypothesis:'x',baseline_version:'a',candidate_version:'b',metrics:['m']}),/prod_context_not_allowed/);
  assert.throws(()=>defineExperiment({company_id:'fenix',engine_id:'SEO-001',hypothesis:'x',baseline_version:'a',candidate_version:'a',metrics:['m']}),/must differ/);
});

test('replay and arm results remain scoped and evidence-backed',()=>{
  const replay=registerReplay({experiment:exp,case_ids:['a','a','b']});
  assert.deepEqual(replay.case_ids,['a','b']);
  const old=recordArmResult({experiment_id:exp.experiment_id,company_id:'fenix',engine_id:'SEO-001',environment:'LAB',version:'1.0.0',arm:'OLD',metrics:{score:70},evidence_refs:['old:1']});
  const newer=recordArmResult({experiment_id:exp.experiment_id,company_id:'fenix',engine_id:'SEO-001',environment:'LAB',version:'1.0.0',arm:'NEW',metrics:{score:80},evidence_refs:['new:1']});
  const compared=compareArms({old_result:old,new_result:newer,metric:'score'});
  assert.equal(compared.delta,10);
  assert.equal(compared.better,true);
});

test('cross-company arms fail closed',()=>{
  const old=recordArmResult({experiment_id:exp.experiment_id,company_id:'fenix',engine_id:'SEO-001',environment:'LAB',version:'1.0.0',arm:'OLD',metrics:{score:70},evidence_refs:['old']});
  const newer=recordArmResult({experiment_id:exp.experiment_id,company_id:'other',engine_id:'SEO-001',environment:'LAB',version:'1.0.0',arm:'NEW',metrics:{score:80},evidence_refs:['new']});
  assert.throws(()=>compareArms({old_result:old,new_result:newer,metric:'score'}),/context mismatch/);
});
