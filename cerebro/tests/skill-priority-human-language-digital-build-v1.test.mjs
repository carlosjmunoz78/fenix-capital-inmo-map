import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {classifyCandidate,rankPriorityCandidates,resolveGlobalLanguageBinding,buildPriorityReport} from '../runtime/skill-priority-portfolio-v1.mjs';
import {buildSyntheticHumanPlan,evaluateSyntheticHumanResults} from '../runtime/synthetic-human-language-lab-v1.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,'..');
const policy=JSON.parse(fs.readFileSync(path.join(ROOT,'registry','skill-priority-portfolio-v1.json'),'utf8'));
const engines=JSON.parse(fs.readFileSync(path.join(ROOT,'registry','engine-registry.v1.json'),'utf8'));
const lab=JSON.parse(fs.readFileSync(path.join(ROOT,'registry','synthetic-human-language-lab-v1.json'),'utf8'));

test('language and human communication is the highest-priority capability family',()=>{
  const language=classifyCandidate({technical_name:'human-language-coach',description:'humanize language communication conversation tone voice'},policy);
  assert.equal(language.matched,true);
  assert.equal(language.best_match.capability_family,'LANGUAGE_HUMAN_INTERACTION');
  assert.equal(language.best_match.base_weight,100);
  const ranked=rankPriorityCandidates([
    {candidate_id:'r',technical_name:'report-pro',description:'reporting pdf executive summary'},
    {candidate_id:'a',technical_name:'cross-app',description:'app development mobile desktop tablet'},
    {candidate_id:'l',technical_name:'human-language-coach',description:'language communication conversation humanize'}
  ],policy);
  assert.equal(ranked[0].candidate_id,'l');
  assert.equal(ranked[1].candidate_id,'a');
  assert.equal(ranked[2].candidate_id,'r');
});

test('global language binding reaches every current non-trading engine only after governed readonly capability green',()=>{
  const candidate={candidate_id:'lang-1',technical_name:'human-language-coach',description:'language communication conversation humanize',prod_capability_state:'PROD_CAPABILITY_AVAILABLE_READONLY',human_required:null,additional_cost_eur:0,external_skill_code_execution:false};
  const result=resolveGlobalLanguageBinding({candidate,policy,engineRegistry:engines,requested_mode:'ANALYZE'});
  assert.equal(result.allowed,true);
  assert.equal(engines.engine_ids.length,179);
  assert.equal(result.target_engine_count,178);
  for(const id of ['SEM-001','COM-001','VOICE-001','APP-001','WEB-001','HCI-001','MOTION-001']) assert.equal(result.target_engine_ids.includes(id),true,id);
  assert.equal(result.target_engine_ids.includes('LAB-TRD'),false);
  assert.equal(result.excluded_engine_ids.includes('LAB-TRD'),true);
  assert.equal(result.prod_write_authorized,false);
  assert.equal(result.prod_mutation_authorized,false);
  assert.equal(result.external_skill_code_execution,false);
  assert.equal(result.additional_cost_eur,0);
});

test('global language binding fails closed before the real governed PROD capability gate',()=>{
  const candidate={candidate_id:'lang-2',technical_name:'human-language-coach',description:'language communication',prod_capability_state:'FULL_SAFE_PREPROD',human_required:null,additional_cost_eur:0,external_skill_code_execution:false};
  const result=resolveGlobalLanguageBinding({candidate,policy,engineRegistry:engines});
  assert.equal(result.allowed,false);
  assert.equal(result.blockers.includes('LANGUAGE_CAPABILITY_NOT_PROD_READONLY_GREEN'),true);
  assert.equal(result.target_engine_count,0);
});

test('social acquisition family is public-readonly and forbids anti-bot or auth bypass',()=>{
  const social=policy.portfolio.find((x)=>x.capability_family==='SOCIAL_PUBLIC_DATA_ACQUISITION');
  assert.equal(social.collection_policy.public_readonly_default,true);
  assert.equal(social.collection_policy.official_api_first,true);
  assert.equal(social.collection_policy.bypass_auth,false);
  assert.equal(social.collection_policy.bypass_captcha,false);
  assert.equal(social.collection_policy.bypass_anti_bot,false);
  assert.equal(social.collection_policy.private_data_without_authority,false);
});

test('synthetic human lab continuously spans charisma, naturalness, voice, accessibility and diverse personas without direct PROD self-modification',()=>{
  const plan=buildSyntheticHumanPlan(lab);
  assert.equal(plan.status,'GREEN_SYNTHETIC_HUMAN_EVAL_PLAN_READY');
  assert.equal(plan.persona_count,16);
  assert.equal(plan.scenario_count,10);
  assert.equal(plan.case_count,160);
  assert.equal(plan.required_dimensions,undefined);
  assert.equal(lab.dimensions.some((x)=>x.id==='D-CHARISMA'),true);
  assert.equal(lab.dimensions.some((x)=>x.id==='D-NATURAL'),true);
  assert.equal(lab.dimensions.some((x)=>x.id==='D-VOICE'),true);
  assert.equal(lab.dimensions.some((x)=>x.id==='D-ACCESS'),true);
  assert.equal(plan.prod_write_authorized,false);
  assert.equal(plan.prod_mutation_authorized,false);
  assert.equal(plan.automatic_prod_prompt_mutation,false);
  assert.equal(plan.paid_fallback,false);
  assert.equal(plan.additional_cost_eur,0);
});

test('low charisma becomes a bounded LRN-001 improvement candidate and never a direct PROD mutation',()=>{
  const scores=Object.fromEntries(lab.dimensions.map((d)=>[d.id,0.99]));
  scores['D-CHARISMA']=0.40;
  const first=buildSyntheticHumanPlan(lab).cases[0];
  const evalReport=evaluateSyntheticHumanResults({config:lab,results:[{case_id:first.case_id,persona_id:first.persona_id,scenario_id:first.scenario_id,scores}]});
  assert.equal(evalReport.status,'IMPROVEMENT_CANDIDATES_READY');
  const candidate=evalReport.improvement_candidates.find((x)=>x.dimension_id==='D-CHARISMA');
  assert.ok(candidate);
  assert.equal(candidate.target,'LRN-001');
  assert.equal(candidate.old_vs_new_required,true);
  assert.equal(candidate.independent_judge_required,true);
  assert.equal(candidate.tribunal_required_before_prod_behavior_change,true);
  assert.equal(candidate.direct_prod_mutation,false);
  assert.equal(evalReport.prod_write_authorized,false);
});

test('priority report preserves current 179-engine registry including HCI/MOTION extensions and zero-cost authority',()=>{
  const report=buildPriorityReport();
  assert.equal(report.status,'GREEN_PRIORITY_POLICY_ACTIVE');
  assert.equal(report.portfolio_count,7);
  assert.equal(report.canonical_engine_count,179);
  assert.deepEqual([...report.registry_extension_ids].sort(),['HCI-001','MOTION-001']);
  assert.equal(report.prod_authorized,false);
  assert.equal(report.prod_write_authorized,false);
  assert.equal(report.trading_access,false);
  assert.equal(report.additional_cost_eur,0);
});
