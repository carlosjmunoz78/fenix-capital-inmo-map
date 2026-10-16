import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TECHNOLOGY_CAPABILITY_SCOUT_NATIVE_V1_CONTRACT,
  authorizeTechnologyScoutAction,
  planScoutAcquisition,
  ingestScoutEvidence,
  scoreScoutCandidate,
  buildScoutDossier,
  verifyScoutDossier,
  executeTechnologyScoutAction
} from '../runtime/technology-capability-scout-native-v1.mjs';
import { defineBenchmark, evaluateOldNew, tribunalDecision } from '../runtime/evaluation-tribunal.mjs';

const ctx={company_id:'fenix',engine_id:'RSH-001',environment:'PREPROD',version:'1.0.0'};
const evidence={
  evidence_type:'TECHNOLOGY',source_ref:'github:D4Vinci/Scrapling',source_url:'https://github.com/D4Vinci/Scrapling',observed_at:'2026-10-16T12:00:00Z',
  version_ref:'main@2026-10-16',license_ref:'BSD-3-Clause',security_notes:'public repository; no credentials used',integration_notes:'evaluate as adapter only',
  summary:'Public evidence for a zero-cost web acquisition candidate.',public_evidence:true
};
const candidate={
  candidate_id:'scrapling',source_ref:'github:D4Vinci/Scrapling',observed_at:'2026-10-16T12:00:00Z',version_ref:'main@2026-10-16',
  license_ref:'BSD-3-Clause',security_notes:'public repository; PREPROD evaluation only',integration_notes:'adapter candidate',cost_eur_month:0,
  fit:90,maintainability:82,security:80,interoperability:86,reversibility:95
};

test('contract reuses RSH web acquisition and public evidence runtime without new engine or paid dependency',()=>{
  assert.equal(TECHNOLOGY_CAPABILITY_SCOUT_NATIVE_V1_CONTRACT.owner_engine_id,'RSH-001');
  assert.equal(TECHNOLOGY_CAPABILITY_SCOUT_NATIVE_V1_CONTRACT.web_profile_owner,'RSH-001');
  assert.equal(TECHNOLOGY_CAPABILITY_SCOUT_NATIVE_V1_CONTRACT.public_adapter_method,'GET_ONLY');
  assert.equal(TECHNOLOGY_CAPABILITY_SCOUT_NATIVE_V1_CONTRACT.new_engine_created,false);
  assert.equal(TECHNOLOGY_CAPABILITY_SCOUT_NATIVE_V1_CONTRACT.new_paid_subscription_required,false);
  assert.equal(TECHNOLOGY_CAPABILITY_SCOUT_NATIVE_V1_CONTRACT.additional_cost_target_eur,0);
});

test('gateway and exact PREPROD RSH ownership fail closed',()=>{
  assert.equal(authorizeTechnologyScoutAction({...ctx,operation:'INGEST_EVIDENCE'}).authorized,false);
  assert.equal(authorizeTechnologyScoutAction({...ctx,operation:'INGEST_EVIDENCE',gateway_authorized:true}).authorized,true);
  assert.equal(authorizeTechnologyScoutAction({...ctx,environment:'PROD',operation:'INGEST_EVIDENCE',gateway_authorized:true}).authorized,false);
  assert.equal(authorizeTechnologyScoutAction({...ctx,engine_id:'FACT-001',operation:'INGEST_EVIDENCE',gateway_authorized:true}).authorized,false);
  assert.equal(authorizeTechnologyScoutAction({...ctx,operation:'DELETE_ANYTHING',gateway_authorized:true}).authorized,false);
});

test('acquisition planning preserves deterministic public zero-cost route order',()=>{
  const out=planScoutAcquisition({...ctx,target_url:'https://example.com',authorized_public_research:true,robots_allowed:true,estimated_incremental_cost_eur:0,sources:{official_api_feed:true,scrapling:true,crawlee:true,apify_free:true,browser:true},browser_binding_status:'BROWSER_SESSION_BINDING_HEALTHY'});
  assert.equal(out.status,'ROUTED');
  assert.equal(out.route.selected_route,'OFFICIAL_API_FEED_SITEMAP');
  assert.equal(out.additional_cost_eur,0);
  assert.equal(out.prod_authorized,false);
});

test('credential-bearing or secret-bearing URLs are denied before routing',()=>{
  const auth1=authorizeTechnologyScoutAction({...ctx,operation:'PLAN_ACQUISITION',gateway_authorized:true,target_url:'https://user:pass@example.com/x'});
  assert.equal(auth1.authorized,false);assert.equal(auth1.human_required,'SECURITY_INCIDENT');
  const auth2=authorizeTechnologyScoutAction({...ctx,operation:'PLAN_ACQUISITION',gateway_authorized:true,target_url:'https://example.com/?access_token=abc'});
  assert.equal(auth2.authorized,false);assert.equal(auth2.human_required,'SECURITY_INCIDENT');
});

test('evidence ingestion is deterministic, provenance-preserving and company-isolated',()=>{
  const a=ingestScoutEvidence({context:ctx,evidence});
  const b=ingestScoutEvidence({context:ctx,evidence});
  assert.equal(a.evidence_id,b.evidence_id);
  assert.equal(a.canonical_knowledge_write,false);
  assert.equal(a.context.company_id,'fenix');
  assert.throws(()=>ingestScoutEvidence({context:ctx,evidence:{...evidence,company_id:'other'}}),/CROSS_COMPANY_EVIDENCE_DENIED/);
  const other=ingestScoutEvidence({context:{...ctx,company_id:'other'},evidence:{...evidence,company_id:'other'}});
  assert.notEqual(a.evidence_id,other.evidence_id);
});

test('candidate scoring reuses deterministic zero-cost gate and paid candidate yields MONEY_LIMIT',()=>{
  const zero=scoreScoutCandidate({context:ctx,candidate});
  assert.equal(zero.status,'SCORED');
  assert.equal(zero.recommendation,'SHORTLIST');
  assert.equal(zero.additional_cost_eur,0);
  const paid=scoreScoutCandidate({context:ctx,candidate:{...candidate,cost_eur_month:2}});
  assert.equal(paid.status,'HUMAN_REQUIRED');
  assert.equal(paid.human_required,'MONEY_LIMIT');
  assert.equal(paid.prod_authorized,false);
});

test('dossier is deterministic, evidence-first, replay-verifiable and rejects cross-company material',()=>{
  const ev=ingestScoutEvidence({context:ctx,evidence});
  const score=scoreScoutCandidate({context:ctx,candidate});
  const a=buildScoutDossier({context:ctx,question:'Which zero-cost acquisition capability is fit for PREPROD?',evidence_records:[ev],candidate_scores:[score]});
  const b=buildScoutDossier({context:ctx,question:'Which zero-cost acquisition capability is fit for PREPROD?',evidence_records:[ev],candidate_scores:[score]});
  assert.equal(a.dossier_id,b.dossier_id);
  assert.equal(a.source_evidence_separate_from_interpretation,true);
  assert.equal(a.ai_required,false);
  assert.equal(verifyScoutDossier(a).status,'REPLAY_GREEN');
  const foreign=ingestScoutEvidence({context:{...ctx,company_id:'other'},evidence:{...evidence,company_id:'other'}});
  assert.throws(()=>buildScoutDossier({context:ctx,question:'x',evidence_records:[foreign],candidate_scores:[]}),/DOSSIER_EVIDENCE_CONTEXT_MISMATCH/);
});

test('native wrapper E2E plan -> ingest -> score -> dossier -> replay stays PREPROD-only',async()=>{
  const common={...ctx,gateway_authorized:true};
  const plan=await executeTechnologyScoutAction({...common,operation:'PLAN_ACQUISITION',target_url:'https://example.com',authorized_public_research:true,robots_allowed:true,estimated_incremental_cost_eur:0,sources:{official_api_feed:true}});
  assert.equal(plan.status,'ROUTED');
  const ev=await executeTechnologyScoutAction({...common,operation:'INGEST_EVIDENCE',evidence});
  const score=await executeTechnologyScoutAction({...common,operation:'SCORE_CANDIDATE',candidate});
  const dossier=await executeTechnologyScoutAction({...common,operation:'BUILD_DOSSIER',question:'Evaluate public capability',evidence_records:[ev],candidate_scores:[score]});
  const replay=await executeTechnologyScoutAction({...common,operation:'REPLAY_VERIFY',dossier});
  assert.equal(replay.replay_green,true);
  assert.equal(dossier.context.environment,'PREPROD');
  assert.equal(dossier.prod_authorized,false);
});

test('OLD vs NEW governance benchmark and independent Tribunal pass without granting PROD authority',()=>{
  const benchmark=defineBenchmark({...ctx,benchmark_id:'tech-cap-scout-governance-coverage',benchmark_version:'1.0.0',metric:'required_gates_covered',holdout_ref:'cerebro/tests/technology-capability-scout-native-v1.test.mjs',adversarial_refs:['prod-denial','secret-url-denial','cross-company-denial']});
  const old_result={...ctx,arm:'OLD',experiment_id:'tech-cap-scout-v1',metrics:{required_gates_covered:7}};
  const new_result={...ctx,arm:'NEW',experiment_id:'tech-cap-scout-v1',metrics:{required_gates_covered:14}};
  const evaluation=evaluateOldNew({benchmark,old_result,new_result,candidate_visible_holdout:false});
  const verdict=tribunalDecision({evaluation,judge_id:'QA-001',candidate_actor_id:'RSH-001',metric_direction:'higher'});
  assert.equal(evaluation.delta,7);
  assert.equal(verdict.decision,'PASS');
  assert.equal(verdict.prod_authorized,false);
});

test('PROD and Trading remain denied and no AI is required',()=>{
  const prod=authorizeTechnologyScoutAction({...ctx,environment:'PROD',operation:'PLAN_ACQUISITION',gateway_authorized:true});
  const trading=authorizeTechnologyScoutAction({...ctx,operation:'PLAN_ACQUISITION',gateway_authorized:true,trading_requested:true});
  assert.equal(prod.authorized,false);assert.equal(trading.authorized,false);
  assert.equal(TECHNOLOGY_CAPABILITY_SCOUT_NATIVE_V1_CONTRACT.ai_required,false);
  assert.equal(TECHNOLOGY_CAPABILITY_SCOUT_NATIVE_V1_CONTRACT.prod_authorized,false);
  assert.equal(TECHNOLOGY_CAPABILITY_SCOUT_NATIVE_V1_CONTRACT.trading_access,false);
});
