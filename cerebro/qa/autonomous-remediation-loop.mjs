#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {buildVersionedImprovementCandidate} from '../runtime/improvement-candidate-factory.mjs';
import {validateLearningRecord} from '../runtime/continuous-improvement-contract.mjs';

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

function readJson(filePath, fallback = {}) {
  if (!filePath || !fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function stable(parts) {
  return crypto.createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 24);
}

function evidenceText(value) {
  if (Array.isArray(value)) return value.map(String).join(' | ');
  return String(value ?? 'no-inline-evidence');
}

function humanReasonFor(text) {
  const value = String(text ?? '').toLowerCase();
  if (/credential|secret|access[_ -]?token|private[_ -]?key|password leak|token leak/.test(value)) return 'SECURITY_INCIDENT';
  if (/delete|destructive|payment|money|transfer|refund|signature|legal/.test(value)) return 'HIGH_RISK';
  return null;
}

function learningFromIssue(issue, quality) {
  const fingerprint = String(issue.fingerprint);
  const observedAt = quality.updated_at ?? new Date().toISOString();
  const text = `${issue.title ?? ''} ${evidenceText(issue.evidence)}`;
  const human = humanReasonFor(text);
  const record = {
    learning_id:`qa-learning:${fingerprint}`,
    company_id:quality.company_id ?? 'fenix',
    engine_id:issue.owner_engine ?? 'QA-001',
    environment:'PREPROD',
    version:'0.1.0',
    source_event_ids:[fingerprint],
    source_type:'ENGINE_ERROR',
    source_environment:'PROD_READ_ONLY',
    observed_at:observedAt,
    hypothesis:`Reproducir y corregir ${issue.title ?? 'el fallo QA'} sin relajar contratos debe reducir su reincidencia.`,
    expected_metric_delta:{name:'qa_issue_presence',direction:'LOWER',measurement:'CONTROLLED_OLD_VS_NEW'},
    confidence:0.90,
    risk_class:human ? 'HIGH' : 'MEDIUM',
    evidence_refs:[`qa:${fingerprint}`],
    promotion_state:'CANDIDATE',
    created_by:'QA-001',
    reason:'CONTINUOUS_HUMAN_QA_FINDING',
    persistent_publish_authorized:true,
    persistence_scope:'LOCAL_PREPROD_LRN_LEDGER_ONLY',
    prod_authorized:false,
    prod_write_authorized:false,
    trading_access:false,
    additional_cost_eur:0
  };
  return {record,human};
}

function learningFromImprovement(item, now) {
  const sourceId = item.improvement_id ?? `qa-imp:${stable([item.engine_id ?? 'QA-001', item.title ?? 'improvement'])}`;
  const record = {
    learning_id:`qa-learning:${sourceId.replace(/^qa-imp:/,'')}`,
    company_id:item.company_id ?? 'fenix',
    engine_id:item.engine_id ?? 'QA-001',
    environment:'PREPROD',
    version:item.version ?? '0.1.0',
    source_event_ids:[sourceId],
    source_type:'METRIC_OBSERVATION',
    source_environment:'PROD_READ_ONLY',
    observed_at:now,
    hypothesis:item.hypothesis ?? item.title ?? 'Mejora QA medible',
    expected_metric_delta:item.expected_metric_delta ?? {name:'human_qa_quality',direction:'HIGHER',measurement:'CONTROLLED_OLD_VS_NEW'},
    confidence:Number(item.confidence ?? 0.60),
    risk_class:item.risk_class ?? 'LOW',
    evidence_refs:[`qa-improvement:${sourceId}`],
    promotion_state:'CANDIDATE',
    created_by:'QA-001',
    reason:'CONTINUOUS_HUMAN_QA_IMPROVEMENT_SCOUT',
    persistent_publish_authorized:true,
    persistence_scope:'LOCAL_PREPROD_LRN_LEDGER_ONLY',
    prod_authorized:false,
    prod_write_authorized:false,
    trading_access:false,
    additional_cost_eur:0
  };
  return {record,human:null};
}

function route(record, human, source, issueSeverity = null) {
  const autonomousCandidate = !human && !['HIGH','CRITICAL'].includes(record.risk_class) && record.confidence >= 0.60;
  return {
    case_id:`qa-case:${stable([source,record.learning_id])}`,
    company_id:record.company_id,
    owner_engine:record.engine_id,
    environment:'PREPROD',
    source,
    source_learning_id:record.learning_id,
    issue_severity:issueSeverity,
    state:human ? 'HUMAN_REQUIRED' : 'ROUTED_TO_PREPROD_OWNER',
    human_required:human,
    repair_mode:autonomousCandidate ? 'VERSIONED_PREPROD_CANDIDATE' : 'HOLD',
    gates:{
      reproduce_required:source === 'BUG',
      regression_test_required:source === 'BUG',
      old_vs_new_required:true,
      preprod_required:true,
      independent_judge_required:true,
      rollback_required:true,
      rebuild_required:true
    },
    promotion_authorized:false,
    prod_authorized:false,
    prod_write_authorized:false,
    customer_data:false,
    trading_access:false,
    additional_cost_eur:0
  };
}

export function buildAutonomousRemediationState({quality = {}, improvements = {}, now = new Date().toISOString()} = {}) {
  const cases = [];
  const learningRecords = [];
  const candidatePackages = [];
  const humanRequired = [];

  const issues = Array.isArray(quality.issues) ? quality.issues : [];
  for (const issue of issues) {
    const {record,human} = learningFromIssue(issue, quality);
    const check = validateLearningRecord(record);
    if (!check.ok) throw new Error(`invalid QA learning record:${check.errors.join(',')}`);
    learningRecords.push(record);
    const item = route(record,human,'BUG',issue.severity ?? null);
    cases.push(item);
    if (human) humanRequired.push({case_id:item.case_id,reason:human,owner_engine:record.engine_id});
    else {
      const built = buildVersionedImprovementCandidate(record);
      if (!built.ok || !built.candidate) throw new Error(`QA issue candidate build failed:${built.reasons.join(',')}`);
      candidatePackages.push(built.candidate);
    }
  }

  for (const improvement of improvements.candidates ?? []) {
    const {record,human} = learningFromImprovement(improvement, improvements.updated_at ?? now);
    const check = validateLearningRecord(record);
    if (!check.ok) throw new Error(`invalid QA improvement learning record:${check.errors.join(',')}`);
    learningRecords.push(record);
    const item = route(record,human,'IMPROVEMENT',null);
    cases.push(item);
    if (human) humanRequired.push({case_id:item.case_id,reason:human,owner_engine:record.engine_id});
    else {
      const built = buildVersionedImprovementCandidate(record);
      if (built.ok && built.candidate) candidatePackages.push(built.candidate);
      else if (built.human_required) humanRequired.push({case_id:item.case_id,reason:built.human_required,owner_engine:record.engine_id});
    }
  }

  const uniqueHuman = [...new Map(humanRequired.map(x => [`${x.case_id}:${x.reason}`,x])).values()];
  return {
    schema_version:'0.1.0',
    state_type:'CEREBRO_QA_AUTONOMOUS_REMEDIATION_STATE_V0',
    company_id:quality.company_id ?? 'fenix',
    engine_id:'SELF-001',
    environment:'PREPROD_CONTROL_PLANE',
    version:'0.1.0',
    updated_at:now,
    status:uniqueHuman.length ? 'ROUTED_WITH_HUMAN_HOLDS' : (cases.length ? 'ROUTED_AUTONOMOUSLY_TO_PREPROD' : 'GREEN_NO_WORK'),
    open_cases:cases.length,
    bug_cases:cases.filter(x=>x.source==='BUG').length,
    improvement_cases:cases.filter(x=>x.source==='IMPROVEMENT').length,
    learning_records_total:learningRecords.length,
    candidate_packages_total:candidatePackages.length,
    cases,
    learning_records:learningRecords,
    candidate_packages:candidatePackages,
    human_required:uniqueHuman,
    next_gate:candidatePackages.length ? 'OLD_VS_NEW_EXPERIMENT' : 'WAIT_FOR_EVIDENCE',
    authority:{
      app_web_prod_autofix:false,
      assisted_owner_engines_preserved:true,
      promotion_authorized:false,
      prod_authorized:false,
      prod_write_authorized:false
    },
    safety:{prod_write:false,customer_data:false,trading:false,paid_fallback:false,additional_subscription_eur:0}
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const qualityPath = arg('--quality');
  const improvementsPath = arg('--improvements');
  const outPath = arg('--out');
  if (!qualityPath || !improvementsPath || !outPath) throw new Error('usage: autonomous-remediation-loop.mjs --quality <json> --improvements <json> --out <json>');
  const state = buildAutonomousRemediationState({quality:readJson(qualityPath,{}),improvements:readJson(improvementsPath,{})});
  fs.mkdirSync(path.dirname(outPath),{recursive:true});
  fs.writeFileSync(outPath,JSON.stringify(state,null,2)+'\n');
  console.log(JSON.stringify({status:state.status,cases:state.open_cases,candidates:state.candidate_packages_total,human_required:state.human_required.length,next_gate:state.next_gate,cost_eur:0}));
}
