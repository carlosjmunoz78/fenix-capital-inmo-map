#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function reqString(value,label){if(typeof value!=='string'||!value.trim())throw new Error(`${label} required`);return value.trim();}
function cleanText(value,max=1200){return String(value??'').replace(/[\r\n\t]+/g,' ').replace(/\s+/g,' ').trim().slice(0,max);}
function riskFor(issue){
  // Observed defect severity is not the same thing as repair/change risk.
  // The downstream candidate is PREPROD-only and receives no PROD authority.
  if(issue?.severity==='CRITICAL') return 'MEDIUM';
  if(issue?.severity==='HIGH') return 'MEDIUM';
  return 'LOW';
}
function confidenceFor(issue){return issue?.severity==='HIGH'||issue?.severity==='CRITICAL'?0.90:0.85;}
function evidenceRefs(issue,state){
  return [...new Set([
    `qa-state:${state.updated_at??'unknown'}`,
    `qa-finding:${issue.fingerprint}`,
    ...(Array.isArray(issue.evidence)?issue.evidence.map((_,i)=>`qa-evidence:${issue.fingerprint}:${i+1}`):[])
  ])];
}

export function buildQaLearningSignals(state){
  if(!state||state.state_type!=='CEREBRO_CONTINUOUS_HUMAN_QA_STATE_V0') throw new Error('verified QA state required');
  if(state.company_id!=='fenix'||state.engine_id!=='QA-001') throw new Error('QA state scope mismatch');
  if(state.safety?.prod_write!==false||state.safety?.customer_data!==false||state.safety?.trading!==false||Number(state.safety?.additional_subscription_eur??NaN)!==0) throw new Error('QA state safety boundary drift');
  const signals=[];
  for(const issue of state.new_issues??[]){
    const owner=reqString(issue.owner_engine,'owner_engine');
    const title=cleanText(issue.title,500);
    signals.push({
      signal_id:`qa:${issue.fingerprint}:detected`,signal_type:'ENGINE_ERROR',company_id:state.company_id,engine_id:owner,source_environment:'PROD',version:state.version,observed_at:state.updated_at,
      severity:['LOW','MEDIUM','HIGH','CRITICAL'].includes(issue.severity)?issue.severity:'MEDIUM',confidence:confidenceFor(issue),risk_class:riskFor(issue),
      reason:`QA-001 reproduced a human-facing defect: ${title}`,
      hypothesis:`A bounded change owned by ${owner} should reduce recurrence of QA finding ${issue.fingerprint} without weakening existing contracts.`,
      metric:{name:'qa_finding_recurrence',direction:'LOWER',measurement:'QA_OLD_VS_NEW_PLUS_REGRESSION_RETEST'},
      evidence_refs:evidenceRefs(issue,state),
      payload:{qa_fingerprint:issue.fingerprint,finding_kind:issue.kind,finding_title:title,finding_severity:issue.severity,owner_engine:owner,required_path:['REPRODUCE','PREPROD_FIX_OR_ROUTE','ADD_REGRESSION_TEST','OLD_VS_NEW','TRIBUNAL','PROMOTE_ONLY_IF_AUTHORIZED']},
      contains_customer_data:false,contains_secrets:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0
    });
  }
  for(const fingerprint of state.resolved_issue_fingerprints??[]){
    signals.push({
      signal_id:`qa:${fingerprint}:resolved:${state.updated_at}`,signal_type:'ENGINE_RESULT',company_id:state.company_id,engine_id:'QA-001',source_environment:'PROD',version:state.version,observed_at:state.updated_at,
      severity:'INFO',confidence:0.9,risk_class:'LOW',reason:`QA-001 no longer reproduces finding ${fingerprint} in the current read-only verification cycle.`,
      hypothesis:`Resolved QA evidence should reinforce regression coverage so finding ${fingerprint} remains absent.`,
      metric:{name:'regression_escape_rate',direction:'LOWER',measurement:'FUTURE_QA_RETESTS'},evidence_refs:[`qa-state:${state.updated_at}`,`qa-resolved:${fingerprint}`],
      payload:{qa_fingerprint:fingerprint,outcome:'NOT_REPRODUCED_CURRENT_CYCLE',required_path:['BIND_OR_CREATE_REGRESSION_TEST','RETEST']},
      contains_customer_data:false,contains_secrets:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0
    });
  }
  if(Number.isFinite(state.quality_delta)&&state.quality_delta<0){
    signals.push({
      signal_id:`qa:quality-regression:${state.updated_at}`,signal_type:'METRIC_OBSERVATION',company_id:state.company_id,engine_id:'QA-001',source_environment:'PROD',version:state.version,observed_at:state.updated_at,
      severity:'MEDIUM',confidence:0.9,risk_class:'LOW',reason:`Daily verified QA quality score regressed by ${state.quality_delta}.`,
      hypothesis:'QA-001 should identify the smallest evidence-backed change set that restores quality without weakening contracts.',
      metric:{name:'daily_quality_score',direction:'HIGHER',measurement:'QA_OLD_VS_NEW'},evidence_refs:[`qa-state:${state.updated_at}`],payload:{quality_score:state.quality_score,previous_quality_score:state.previous_quality_score,quality_delta:state.quality_delta},
      contains_customer_data:false,contains_secrets:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0
    });
  }
  return Object.freeze({schema_version:'0.1.0',state_type:'CEREBRO_QA_LEARNING_SIGNAL_BATCH_V0',company_id:state.company_id,engine_id:'QA-001',environment:'CONTROL_PLANE',version:'0.1.0',source_qa_updated_at:state.updated_at,signals_total:signals.length,signals,downstream:'CEREBRO_RSI_UNIVERSAL_LEARNING_INGRESS_V0',repair_semantics:'PREPROD_CANDIDATE_ONLY_UNTIL_EXISTING_PROMOTION_GATES_AUTHORIZE_MORE',prod_authorized:false,prod_write_authorized:false,trading_access:false,contains_customer_data:false,contains_secrets:false,additional_cost_eur:0});
}

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){
  const input=reqString(arg('--input'),'--input');const output=reqString(arg('--output'),'--output');
  const batch=buildQaLearningSignals(JSON.parse(fs.readFileSync(input,'utf8')));
  fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(batch,null,2)+'\n');
  console.log(JSON.stringify({status:'QA_LEARNING_BRIDGE_GREEN',signals_total:batch.signals_total,prod_write_authorized:false,additional_cost_eur:0}));
}
