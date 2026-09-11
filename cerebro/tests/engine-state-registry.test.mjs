import test from 'node:test';
import assert from 'node:assert/strict';
import {deriveEngineState,buildEngineStatusRegistry,buildDocumentationUpdatePlan,assertMonotonicTransition} from '../factory/engine-state-registry.mjs';
const context={company_id:'fenix',environment:'PREPROD',version:'0.1.0'};
test('derives canonical engine maturity states fail-closed',()=>{
  assert.equal(deriveEngineState({engine_id:'KNW-001',context}).state,'DEFINED');
  assert.equal(deriveEngineState({engine_id:'KNW-001',context,scaffold_complete:true,contracts:true,permissions:true,tests:true}).state,'STRUCTURAL_GREEN');
  const pre={engine_id:'KNW-001',context,scaffold_complete:true,contracts:true,permissions:true,tests:true,evaluation:true,tribunal:true,observability:true,backup:true,rollback:true,rebuild:true,cost:true,policy:true,preprod:true};
  assert.equal(deriveEngineState(pre).state,'PREPROD_GREEN');
  assert.equal(deriveEngineState({...pre,live_evidence_refs:['run://1']}).state,'LIVE_EVIDENCE');
  assert.equal(deriveEngineState({...pre,live_evidence_refs:['run://1'],autonomy_approved:true,prod_promotion_approved:true}).state,'PROD_AUTONOMY');
  assert.equal(deriveEngineState({...pre,trading_access:true}).reason,'POLICY_CONFLICT');
});
test('registry covers every canonical engine exactly once and defaults safely',()=>{
  const r=buildEngineStatusRegistry({canonical_engine_ids:['FACT-001','KNW-001'],records:[{engine_id:'FACT-001',state:'PREPROD_GREEN',evidence_refs:['run://371']}]});
  assert.equal(r.engine_count,2);assert.equal(r.counts.PREPROD_GREEN,1);assert.equal(r.counts.DEFINED,1);assert.equal(r.autonomous_prod,false);
});
test('registry rejects unknown engines and regressions',()=>{
  assert.throws(()=>buildEngineStatusRegistry({canonical_engine_ids:['FACT-001'],records:[{engine_id:'X-001',state:'DEFINED'}]}),/unknown engine_id/);
  assert.throws(()=>buildEngineStatusRegistry({canonical_engine_ids:['FACT-001'],records:[{engine_id:'FACT-001',state:'PREPROD_GREEN'},{engine_id:'FACT-001',state:'STRUCTURAL_GREEN'}]}),/regression/);
  assert.throws(()=>assertMonotonicTransition('LIVE_EVIDENCE','PREPROD_GREEN'),/regression/);
});
test('documentation plan requires all canonical documents',()=>{
  const all={ENGINE_REGISTRY:true,DEPENDENCY_MAP:true,RUNBOOK:true,CHANGELOG:true,BACKUP_REBUILD:true,AUTONOMY_STATE:true};
  assert.equal(buildDocumentationUpdatePlan({updated:all}).status,'DOCS_SYNC_READY');
  assert.equal(buildDocumentationUpdatePlan({updated:{...all,CHANGELOG:false}}).status,'BLOCKED');
});
