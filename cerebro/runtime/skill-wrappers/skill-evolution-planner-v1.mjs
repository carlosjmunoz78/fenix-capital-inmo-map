import fs from 'node:fs';
import { stableHash } from './governed-wrapper-factory-v1.mjs';

const POLICY_URL=new URL('../../governance/skill-continuous-improvement-policy.v1.json',import.meta.url);

function readJson(url){
  return JSON.parse(fs.readFileSync(url,'utf8'));
}

export function loadSkillEvolutionPolicy(){
  return readJson(POLICY_URL);
}

function nonEmpty(value,name){
  const text=String(value??'').trim();
  if(!text)throw new Error(`SKILL_EVOLUTION_${name}_REQUIRED`);
  return text;
}

function stringList(value,maxItems=64){
  if(!Array.isArray(value))return [];
  return value.slice(0,maxItems).map(item=>String(item??'').trim()).filter(Boolean);
}

export function createSkillEvolutionPlan({
  baseline_skill,
  trigger,
  strategy='INTERNAL_HARDENING',
  hypothesis,
  metrics=[],
  evidence_refs=[],
  company_id='GLOBAL',
  engine_id='LRN-001',
  environment='PREPROD',
  candidate_version='candidate-v1',
  requested_at_utc=new Date().toISOString()
}={}){
  const policy=loadSkillEvolutionPolicy();
  if(!baseline_skill||typeof baseline_skill!=='object'||Array.isArray(baseline_skill))throw new Error('SKILL_EVOLUTION_BASELINE_REQUIRED');

  const technicalName=nonEmpty(baseline_skill.technical_name,'TECHNICAL_NAME');
  const triggerName=nonEmpty(trigger,'TRIGGER').toUpperCase();
  const strategyName=nonEmpty(strategy,'STRATEGY').toUpperCase();
  const hypothesisText=nonEmpty(hypothesis,'HYPOTHESIS');
  const candidateEnvironment=nonEmpty(environment,'ENVIRONMENT').toUpperCase();

  if(candidateEnvironment!==policy.candidate_rules.candidate_environment)throw new Error('SKILL_EVOLUTION_PROD_MUTATION_DENIED');
  if(!policy.review.triggers.includes(triggerName))throw new Error(`SKILL_EVOLUTION_TRIGGER_NOT_ALLOWED:${triggerName}`);
  if(!policy.strategies.includes(strategyName))throw new Error(`SKILL_EVOLUTION_STRATEGY_NOT_ALLOWED:${strategyName}`);

  const baseline={
    candidate_id:String(baseline_skill.candidate_id??''),
    wrapper_id:String(baseline_skill.wrapper_id??''),
    technical_name:technicalName,
    wrapper_ref:String(baseline_skill.wrapper_ref??''),
    source_locator:String(baseline_skill.source_locator??''),
    source_license:String(baseline_skill.source_license??''),
    pinned_sha:String(baseline_skill.pinned_sha??''),
    status:String(baseline_skill.status??''),
    immutable_in_prod:true
  };

  const requiredMetrics=stringList(metrics).length?stringList(metrics):[...policy.non_regression_dimensions];
  const seed={baseline,trigger:triggerName,strategy:strategyName,hypothesis:hypothesisText,company_id,engine_id,candidate_version};
  const planId=`skill-evolution:${technicalName}:${stableHash(seed).slice(0,16)}`;

  const plan={
    schema_version:'1.0.0',
    state_type:'CEREBRO_SKILL_EVOLUTION_CANDIDATE_PLAN_V1',
    plan_id:planId,
    policy_id:policy.policy_id,
    company_id:nonEmpty(company_id,'COMPANY_ID'),
    engine_id:nonEmpty(engine_id,'ENGINE_ID'),
    environment:candidateEnvironment,
    version:nonEmpty(candidate_version,'CANDIDATE_VERSION'),
    requested_at_utc:nonEmpty(requested_at_utc,'REQUESTED_AT_UTC'),
    status:'CANDIDATE_PLAN_ONLY',
    baseline,
    candidate:{
      strategy:strategyName,
      trigger:triggerName,
      hypothesis:hypothesisText,
      metrics:requiredMetrics,
      evidence_refs:stringList(evidence_refs),
      allowed_actions:['ADAPT','HARDEN','COMPOSE','DERIVE','REIMPLEMENT','TEST','EVALUATE'],
      direct_prod_mutation:false
    },
    required_evidence:[
      'BASELINE_SNAPSHOT',
      'CANDIDATE_SNAPSHOT',
      'TESTS',
      'OLD_VS_NEW',
      'EVALUATION',
      'TRIBUNAL',
      'OBSERVABILITY',
      'ROLLBACK_PROOF',
      'BACKUP_REBUILD_PROOF',
      'COST_MEASUREMENT'
    ],
    promotion_gate:{
      measurable_gain_required:true,
      reject_on_uncertain_gain:true,
      non_regression_dimensions:[...policy.non_regression_dimensions],
      tribunal_required:true,
      old_vs_new_required:true
    },
    rollback:{
      required:true,
      target_candidate_id:baseline.candidate_id,
      target_wrapper_id:baseline.wrapper_id,
      target_pinned_sha:baseline.pinned_sha
    },
    learning:{
      consumer_engine:policy.ownership.learning_engine,
      factory_engine:policy.ownership.factory_engine,
      record_promotion:true,
      record_rejection:true,
      feed_next_iteration:true
    },
    authority:{...policy.authority}
  };

  return Object.freeze({...plan,plan_hash:stableHash(plan)});
}
