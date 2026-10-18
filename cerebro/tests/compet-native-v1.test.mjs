import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { COMPET_NATIVE_V1_CONTRACT, authorizeCompetNativeAction, buildCompetWatchPlan, runCompetNativeCycle, buildCompetDossier, verifyCompetDossier, executeCompetNativeAction } from '../runtime/compet-native-v1.mjs';
import { defineBenchmark, evaluateOldNew, tribunalDecision } from '../runtime/evaluation-tribunal.mjs';

const ctx={company_id:'fenix',engine_id:'COMPET-001',environment:'PREPROD',version:'1.0.0'};
const prev=[
  {competitor_id:'rival-a',dimension:'pricing',value:'3500 EUR',source_url:'https://example.com/pricing',observed_at:'2026-10-15T09:00:00Z',confidence:0.9},
  {competitor_id:'rival-a',dimension:'seo',value:{title:'old'},source_url:'https://example.com/',observed_at:'2026-10-15T09:00:00Z',confidence:1}
];
const current=[
  {competitor_id:'rival-a',dimension:'pricing',value:'3000 EUR',source_url:'https://example.com/pricing',observed_at:'2026-10-16T09:00:00Z',confidence:0.9},
  {competitor_id:'rival-a',dimension:'seo',value:{title:'new'},source_url:'https://example.com/',observed_at:'2026-10-16T09:00:00Z',confidence:1},
  {competitor_id:'rival-b',dimension:'expansion',value:'Cordoba',source_url:'https://rival.example.com/news',observed_at:'2026-10-16T09:00:00Z',confidence:0.8}
];

test('contract closes canonical competitor dimensions without new engine or paid dependency',()=>{
  assert.equal(COMPET_NATIVE_V1_CONTRACT.owner_engine_id,'COMPET-001');
  for(const d of ['offer','pricing','seo','campaigns','expansion','positioning'])assert.ok(COMPET_NATIVE_V1_CONTRACT.dimensions.includes(d));
  assert.equal(COMPET_NATIVE_V1_CONTRACT.new_engine_created,false);
  assert.equal(COMPET_NATIVE_V1_CONTRACT.new_paid_subscription_required,false);
  assert.equal(COMPET_NATIVE_V1_CONTRACT.additional_cost_target_eur,0);
});

test('gateway, exact PREPROD and owner engine fail closed',()=>{
  assert.equal(authorizeCompetNativeAction({...ctx,operation:'RUN_CYCLE'}).authorized,false);
  assert.equal(authorizeCompetNativeAction({...ctx,operation:'RUN_CYCLE',gateway_authorized:true}).authorized,true);
  assert.equal(authorizeCompetNativeAction({...ctx,environment:'PROD',operation:'RUN_CYCLE',gateway_authorized:true}).authorized,false);
  assert.equal(authorizeCompetNativeAction({...ctx,engine_id:'RSH-001',operation:'RUN_CYCLE',gateway_authorized:true}).authorized,false);
  const paid=authorizeCompetNativeAction({...ctx,operation:'RUN_CYCLE',gateway_authorized:true,estimated_incremental_cost_eur:0.01});
  assert.equal(paid.authorized,false);assert.equal(paid.human_required,'MONEY_LIMIT');
});

test('watch plan is deterministic, HTTPS-only and multi-company scoped',()=>{
  const targets=[{competitor_id:'b',name:'B',url:'https://b.example.com/',geography:'cordoba',business_relevance:'mortgage',dimensions:['pricing','offer']},{competitor_id:'a',name:'A',url:'https://a.example.com/',geography:'cordoba',business_relevance:'mortgage',dimensions:['seo']}];
  const a=buildCompetWatchPlan({context:ctx,targets,cadence_hours:24});
  const b=buildCompetWatchPlan({context:ctx,targets:[...targets].reverse(),cadence_hours:24});
  assert.equal(a.plan_id,b.plan_id);assert.deepEqual(a.targets.map(x=>x.competitor_id),['a','b']);
  assert.throws(()=>buildCompetWatchPlan({context:ctx,targets:[{...targets[0],url:'http://b.example.com/'}]}),/HTTPS required/);
});

test('continuous cycle detects offer/pricing/SEO/expansion changes deterministically',()=>{
  const cycle=runCompetNativeCycle({context:ctx,previous:prev,current,cycle_anchor:'2026-10-16T09:00:00Z',cadence_hours:24});
  assert.equal(cycle.status,'GREEN');assert.equal(cycle.change_count,3);assert.equal(cycle.external_writes,0);assert.equal(cycle.additional_cost_eur,0);
  assert.deepEqual(cycle.changes.map(x=>x.dimension).sort(),['expansion','pricing','seo']);
  const again=runCompetNativeCycle({context:ctx,previous:prev,current,cycle_anchor:'2026-10-16T09:00:00Z',cadence_hours:24});
  assert.equal(cycle.provenance_hash,again.provenance_hash);
});

test('observations from another company are denied',()=>{
  assert.throws(()=>runCompetNativeCycle({context:ctx,previous:[],current:[{...current[0],company_id:'other'}],cycle_anchor:'2026-10-16T09:00:00Z'}),/CROSS_COMPANY_OBSERVATION_DENIED/);
  const other=runCompetNativeCycle({context:{...ctx,company_id:'other'},previous:[],current:[{...current[0],company_id:'other'}],cycle_anchor:'2026-10-16T09:00:00Z'});
  assert.equal(other.context.company_id,'other');
});

test('dossier is deterministic, evidence-only, AI-optional and replay-verifiable',()=>{
  const cycle=runCompetNativeCycle({context:ctx,previous:prev,current,cycle_anchor:'2026-10-16T09:00:00Z'});
  const a=buildCompetDossier({context:ctx,cycle,question:'What changed in competitor positioning?'});
  const b=buildCompetDossier({context:ctx,cycle,question:'What changed in competitor positioning?'});
  assert.equal(a.dossier_id,b.dossier_id);assert.equal(a.source_evidence_only,true);assert.equal(a.ai_required,false);assert.equal(a.canonical_knowledge_write,false);
  assert.equal(verifyCompetDossier(a).status,'REPLAY_GREEN');
  assert.throws(()=>buildCompetDossier({context:{...ctx,company_id:'other'},cycle}),/COMPET_CYCLE_CONTEXT_MISMATCH/);
});

test('gateway E2E run cycle -> dossier -> replay stays PREPROD',async()=>{
  const cycle=await executeCompetNativeAction({...ctx,gateway_authorized:true,operation:'RUN_CYCLE',previous:prev,current,cycle_anchor:'2026-10-16T09:00:00Z'});
  const dossier=await executeCompetNativeAction({...ctx,gateway_authorized:true,operation:'BUILD_DOSSIER',cycle,question:'Competitor update'});
  const replay=await executeCompetNativeAction({...ctx,gateway_authorized:true,operation:'REPLAY_VERIFY',dossier});
  assert.equal(replay.replay_green,true);assert.equal(dossier.prod_authorized,false);
});

test('existing Fenix V0 stays preserved while additive acceptance certifies real scheduled continuity',()=>{
  const base=JSON.parse(fs.readFileSync(new URL('../registry/compet-real-targets.v0.json',import.meta.url),'utf8'));
  const acceptance=JSON.parse(fs.readFileSync(new URL('../registry/compet-real-targets-acceptance.v1.json',import.meta.url),'utf8'));
  assert.equal(base.status,'REAL_TARGETS_BASELINE_FROZEN_CONTINUOUS_PREPROD');
  assert.equal(base.scheduler.soak_complete,false);
  assert.equal(base.next_gate,'THREE_CONTINUOUS_REAL_COMPETITOR_SCHEDULED_RUNS_GREEN');
  assert.equal(acceptance.status,'REAL_TARGETS_CONTINUOUS_PREPROD_ACCEPTANCE_GREEN');
  assert.equal(acceptance.scheduled_acceptance.verified_scheduled_green_runs,3);
  assert.equal(acceptance.scheduled_acceptance.qualifying_run_ids.length,3);
  assert.equal(new Set(acceptance.scheduled_acceptance.qualifying_run_ids).size,3);
  assert.equal(acceptance.remaining_gate,null);
  assert.equal(acceptance.authority.prod_authorized,false);
  assert.equal(acceptance.authority.provider_write_authorized,false);
  assert.equal(acceptance.authority.additional_cost_eur,0);
  assert.equal(COMPET_NATIVE_V1_CONTRACT.existing_fenix_real_target_soak_overclaimed,false);
});

test('OLD vs NEW multi-company governance benchmark passes independent Tribunal without PROD grant',()=>{
  const benchmark=defineBenchmark({...ctx,benchmark_id:'compet-native-governance',benchmark_version:'1.0.0',metric:'required_gates_covered',holdout_ref:'cerebro/tests/compet-native-v1.test.mjs',adversarial_refs:['prod-denial','cross-company-denial','money-limit']});
  const evaluation=evaluateOldNew({benchmark,old_result:{...ctx,arm:'OLD',experiment_id:'compet-native-v1',metrics:{required_gates_covered:8}},new_result:{...ctx,arm:'NEW',experiment_id:'compet-native-v1',metrics:{required_gates_covered:14}},candidate_visible_holdout:false});
  const verdict=tribunalDecision({evaluation,judge_id:'QA-001',candidate_actor_id:'COMPET-001',metric_direction:'higher'});
  assert.equal(verdict.decision,'PASS');assert.equal(verdict.prod_authorized,false);
});
