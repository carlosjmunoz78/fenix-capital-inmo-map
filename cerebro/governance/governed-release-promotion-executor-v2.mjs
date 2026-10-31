#!/usr/bin/env node
import fs from 'node:fs';

export const HUMAN_EXCEPTION_REASONS=Object.freeze([
  'LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK',
  'POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'
]);

export const REQUIRED_RELEASE_GATES=Object.freeze([
  'contracts','permissions','tests','evaluation','tribunal','observability',
  'rollback','backup','rebuild','cost_measured','policy','preprod','old_vs_new','canary'
]);
export const SUPPORTED_RELEASE_TARGETS=Object.freeze(['APP_FENIX_STATIC']);
export const RELEASE_REF_PREFIX='release/app-fenix-static/';

function reqString(v,label){if(typeof v!=='string'||!v.trim())throw new Error(`${label} required`);return v.trim();}
function validSha(v){return typeof v==='string'&&/^[0-9a-f]{40}$/i.test(v);}
function read(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function write(file,value){fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');}
function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}

export function assessGovernedReleasePromotion(packet,{now=new Date().toISOString()}={}){
  if(!packet||packet.state_type!=='CEREBRO_GOVERNED_RELEASE_PROMOTION_PACKET_V2')throw new Error('CEREBRO_GOVERNED_RELEASE_PROMOTION_PACKET_V2 required');
  const company_id=reqString(packet.company_id,'company_id');
  const engine_id=reqString(packet.engine_id,'engine_id');
  const target=reqString(packet.target,'target');
  const release_ref=reqString(packet.release_ref,'release_ref');
  if(!release_ref.startsWith(RELEASE_REF_PREFIX))throw new Error(`release_ref must start with ${RELEASE_REF_PREFIX}`);
  if(!validSha(packet.expected_release_sha))throw new Error('expected_release_sha must be a 40-char git SHA');
  if(!validSha(packet.base_prod_sha))throw new Error('base_prod_sha must be a 40-char git SHA');
  const preprod_evidence_run_id=Number(packet.preprod_evidence_run_id);
  if(!Number.isSafeInteger(preprod_evidence_run_id)||preprod_evidence_run_id<1)throw new Error('preprod_evidence_run_id must be a positive integer');

  if(packet.human_exception){
    const reason=reqString(packet.human_exception.reason,'human_exception.reason');
    if(!HUMAN_EXCEPTION_REASONS.includes(reason))throw new Error(`invalid HUMAN_REQUIRED reason:${reason}`);
    return {schema_version:'2.0',state_type:'CEREBRO_GOVERNED_RELEASE_PROMOTION_DECISION_V2',company_id,engine_id,environment:'PREPROD',version:'v2',updated_at:now,status:'HUMAN_REQUIRED',human_required:{...packet.human_exception,reason},blockers:[],authority:{promotion_authorized:false,prod_write_authorized:false},next_gate:'HUMAN_EXCEPTION_RESOLUTION',safety:{trading:false,additional_subscription_eur:0}};
  }

  const gates=packet.gates&&typeof packet.gates==='object'?packet.gates:{};
  const blockers=[];
  for(const gate of REQUIRED_RELEASE_GATES){if(gates[gate]!==true)blockers.push(`GATE_${gate.toUpperCase()}_NOT_GREEN`);}
  if(!SUPPORTED_RELEASE_TARGETS.includes(target))blockers.push(`UNSUPPORTED_TARGET_ADAPTER_${target}`);
  if(packet.additional_subscription_eur!==0)blockers.push('ADDITIONAL_COST_NOT_ZERO');
  if(packet.trading_access===true)blockers.push('TRADING_ISOLATION_VIOLATION');
  if(packet.prod_source_audit_green!==true)blockers.push('PHYSICAL_PROD_BASE_NOT_AUDITED');
  const ready=blockers.length===0;
  return {schema_version:'2.0',state_type:'CEREBRO_GOVERNED_RELEASE_PROMOTION_DECISION_V2',company_id,engine_id,environment:'PREPROD',version:'v2',updated_at:now,status:ready?'PROMOTE_READY':'REPAIR_REQUIRED',human_required:null,blockers,target,release_ref,expected_release_sha:packet.expected_release_sha,base_prod_sha:packet.base_prod_sha,preprod_evidence_run_id,authority:{promotion_authorized:ready,prod_write_authorized:ready},next_gate:ready?'VERIFY_EXACT_RELEASE_AND_PHYSICAL_PREPROD':'REPAIR_AND_RECHECK',safety:{trading:false,additional_subscription_eur:0}};
}

export function finalizeGovernedReleasePromotion(packet,physicalEvidence,{now=new Date().toISOString()}={}){
  const decision=assessGovernedReleasePromotion(packet,{now});
  if(decision.status!=='PROMOTE_READY')return decision;
  const evidence=physicalEvidence&&typeof physicalEvidence==='object'?physicalEvidence:{};
  const blockers=[];
  if(!Number.isSafeInteger(Number(evidence.deployment_run_id))||Number(evidence.deployment_run_id)<1)blockers.push('PHYSICAL_DEPLOYMENT_RECEIPT_MISSING');
  if(!validSha(evidence.prod_source_sha))blockers.push('PHYSICAL_PROD_SOURCE_SHA_MISSING');
  if(evidence.prod_source_sha!==packet.expected_release_sha)blockers.push('PHYSICAL_PROD_SOURCE_SHA_MISMATCH');
  if(evidence.smoke_passed!==true)blockers.push('PHYSICAL_SMOKE_NOT_GREEN');
  if(evidence.monitor_passed!==true)blockers.push('PHYSICAL_MONITOR_NOT_GREEN');
  if(blockers.length)return {...decision,updated_at:now,status:'REPAIR_REQUIRED',blockers,next_gate:'REPAIR_PROD_PROOF_AND_RECHECK',authority:{promotion_authorized:false,prod_write_authorized:false}};
  return {...decision,environment:'PROD',updated_at:now,status:'PROD_PROMOTED',blockers:[],physical_prod_evidence:{deployment_run_id:Number(evidence.deployment_run_id),prod_source_sha:evidence.prod_source_sha,smoke_passed:true,monitor_passed:true,proof_url:evidence.proof_url??null},authority:{promotion_authorized:true,prod_write_authorized:true},next_gate:'MONITOR_AND_LEARN'};
}

if(import.meta.url===`file://${process.argv[1]}`){
  const packetPath=reqString(arg('--packet'),'--packet');
  const out=reqString(arg('--out'),'--out');
  const packet=read(packetPath);
  const deploymentRunId=arg('--deployment-run-id');
  const result=deploymentRunId?finalizeGovernedReleasePromotion(packet,{deployment_run_id:Number(deploymentRunId),prod_source_sha:arg('--prod-source-sha'),smoke_passed:arg('--smoke-passed')==='true',monitor_passed:arg('--monitor-passed')==='true',proof_url:arg('--proof-url')}):assessGovernedReleasePromotion(packet);
  write(out,result);
  console.log(JSON.stringify({status:result.status,blockers:result.blockers??[],next_gate:result.next_gate,prod:result.status==='PROD_PROMOTED'}));
  if(!['PROMOTE_READY','PROD_PROMOTED','HUMAN_REQUIRED'].includes(result.status))process.exitCode=2;
}
