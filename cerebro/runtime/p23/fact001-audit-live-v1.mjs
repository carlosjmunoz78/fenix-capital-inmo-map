#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,'../../..');
const REGISTRY=path.join(ROOT,'cerebro/registry/engine-registry.v1.json');
const GOVERNANCE=path.join(ROOT,'cerebro/registry/prod-engine-governance.v1.json');
const CONTRACT=path.join(ROOT,'cerebro/audit/p23-live-contract.v1.json');
const READINESS=path.join(ROOT,'cerebro/missions/audit-179-autonomy-readiness-v1.mjs');
const HUMAN_REQUIRED=['LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'];

const readJson=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const stable=v=>Array.isArray(v)?v.map(stable):(v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v);
const json=v=>JSON.stringify(stable(v),null,2)+'\n';

export function validateGovernance(registry,governance,contract){
  const ids=registry.engine_ids||[];
  if(registry.count!==179||ids.length!==179||new Set(ids).size!==179)throw new Error('P23 requires exact 179 unique canonical registry IDs');
  if(governance.state_type!=='CEREBRO_PROD_ENGINE_GOVERNANCE_V1'||governance.environment!=='PROD_CONTROL_PLANE')throw new Error('invalid PROD governance contract');
  if(governance.coverage?.strategy!=='ALL_CANONICAL_ENGINE_IDS'||governance.coverage?.expected_count!==179||governance.coverage?.require_exact_unique_registry_match!==true)throw new Error('PROD governance must cover all 179 canonical engines');
  const p=governance.default_policy||{};
  if(p.prod_registered!==true||p.prod_registration_authorized!==true||p.prod_execution_authorized!==false||p.prod_write_authorized!==false||p.execution_mode!=='FAIL_CLOSED')throw new Error('PROD governance default must remain registered + fail-closed + no execution/write authority');
  if(p.trading_access!==false||p.secret_value_access_authorized!==false||p.additional_cost_eur!==0)throw new Error('PROD governance safety boundary mismatch');
  if(contract.state_type!=='P23_AUDIT_LIVE_INTEGRATION_V1'||contract.status!=='LIVE'||contract.target_engine!=='FACT-001'||contract.audit_scope!=='ALL_179_CANONICAL_ENGINES')throw new Error('P23 Live contract invalid');
  if(contract.storage?.backend!=='GIT_STATE_BRANCH'||contract.storage?.branch!=='cerebro/p23-state-v1')throw new Error('P23 durable state branch contract invalid');
  if(contract.safety?.prod_mutation_authorized!==false||contract.safety?.prod_execution_authorized!==false||contract.safety?.trading_scope!=='FORBIDDEN'||contract.safety?.additional_cost_eur!==0)throw new Error('P23 safety contract mismatch');
  for(const reason of HUMAN_REQUIRED)if(!(governance.human_required_reasons||[]).includes(reason))throw new Error(`missing canonical HUMAN_REQUIRED reason ${reason}`);
  return {registry_total:179,prod_registered:179,execution_authorized:0,write_authorized:0,trading_access:false,additional_cost_eur:0,p23_live:true};
}

function parseArgs(argv){
  const out={out:null,auditedAt:new Date().toISOString(),sourceSha:process.env.GITHUB_SHA||'0000000000000000000000000000000000000000',environment:'PREPROD',companyId:'fenix'};
  for(let i=2;i<argv.length;i++){
    const k=argv[i];
    if(k==='--out')out.out=argv[++i];
    else if(k==='--audited-at')out.auditedAt=argv[++i];
    else if(k==='--source-sha')out.sourceSha=argv[++i];
    else if(k==='--environment')out.environment=argv[++i];
    else if(k==='--company-id')out.companyId=argv[++i];
    else throw new Error(`unknown argument ${k}`);
  }
  if(!out.out)throw new Error('--out is required');
  if(!/^\d{4}-\d{2}-\d{2}T/.test(out.auditedAt))throw new Error('--audited-at must be ISO-8601');
  if(!/^[0-9a-f]{40}$/i.test(out.sourceSha))throw new Error('--source-sha must be a 40-char commit SHA');
  if(!['PREPROD','PROD_CONTROL_PLANE'].includes(out.environment))throw new Error('environment must be PREPROD or PROD_CONTROL_PLANE');
  if(!out.companyId.trim())throw new Error('company_id required');
  return out;
}

function criticality(layer){if(['L0','L2'].includes(layer))return 'CRITICAL';if(['L4','L5'].includes(layer))return 'HIGH';return 'MEDIUM';}
export function buildAuditPoint(row,{auditedAt,sourceSha,environment,companyId}){
  const missing=Object.entries(row.gates||{}).filter(([,v])=>v!==true).map(([k])=>k).sort();
  const gateTotal=row.gate_total||Object.keys(row.gates||{}).length||1;
  const gateCount=row.gate_count||0;
  const score=Math.min(100,40+Math.floor((gateCount/gateTotal)*50)+10);
  const executionReview=row.autonomous_prod_ready===true;
  return {
    schema_version:'1.0.0',audit_schema:'P23.AUDIT.INTEGRATION.V1',auditor:'Jarvis (P23)',company_id:companyId,engine_id:row.engine_id,environment,version:row.version||'0.1.0',layer:row.layer,status:executionReview?'PROD_REGISTERED_EXECUTION_REVIEW_REQUIRED':'PROD_REGISTERED_FAIL_CLOSED',score,criticidad:criticality(row.layer),fallos:missing,plan_de_mejora:missing.length?`CLOSE_EVIDENCE_GATES:${missing.join(',')}`:'SEPARATE_GOVERNED_PROMOTION_REQUIRED_BEFORE_EXECUTION',fecha:auditedAt,source_sha:sourceSha,physical_foundation:row.physical_foundation===true,prod_registered:true,prod_execution_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0,human_required:executionReview?null:'POLICY_CONFLICT'};
}

export function runP23Audit({outDir,auditedAt,sourceSha,environment,companyId}){
  const registry=readJson(REGISTRY),governance=readJson(GOVERNANCE),contract=readJson(CONTRACT);
  const governanceProof=validateGovernance(registry,governance,contract);
  const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-p23-readiness-'));
  try{
    execFileSync(process.execPath,[READINESS,'--out',scratch],{cwd:ROOT,stdio:'pipe'});
    const readiness=readJson(path.join(scratch,'AUTONOMY_READINESS_BASELINE.json'));
    if(readiness.registry_total!==179||!Array.isArray(readiness.engines)||readiness.engines.length!==179)throw new Error('readiness audit did not return 179 engines');
    const points=readiness.engines.map(row=>buildAuditPoint(row,{auditedAt,sourceSha,environment,companyId}));
    if(new Set(points.map(x=>x.engine_id)).size!==179)throw new Error('P23 audit points must contain 179 unique engine IDs');
    const required=contract.required_fields||[];
    for(const p of points)for(const field of required)if(p[field]===undefined||p[field]===null&&field!=='human_required')throw new Error(`${p.engine_id}: missing P23 required field ${field}`);
    const summary={schema_version:'1.0.0',state_type:'P23_LIVE_AUDIT_SNAPSHOT_V1',auditor:'Jarvis (P23)',company_id:companyId,engine_id:'FACT-001',environment,version:'v1',status:'GREEN',p23_live:true,audited_at:auditedAt,source_sha:sourceSha,registry_total:179,audit_points:179,prod_registered:179,prod_execution_authorized:0,prod_write_authorized:0,execution_review_required:points.filter(x=>x.status==='PROD_REGISTERED_EXECUTION_REVIEW_REQUIRED').length,fail_closed:points.filter(x=>x.status==='PROD_REGISTERED_FAIL_CLOSED').length,score_min:Math.min(...points.map(x=>x.score)),score_max:Math.max(...points.map(x=>x.score)),additional_cost_eur:0,trading_access:false,secret_values:false,governance:governanceProof};
    fs.rmSync(outDir,{recursive:true,force:true});fs.mkdirSync(outDir,{recursive:true});
    fs.writeFileSync(path.join(outDir,'AUDIT_POINTS.jsonl'),points.map(x=>JSON.stringify(stable(x))).join('\n')+'\n');
    fs.writeFileSync(path.join(outDir,'LATEST.json'),json({...summary,points}));
    fs.writeFileSync(path.join(outDir,'SUMMARY.json'),json(summary));
    return {summary,points};
  }finally{fs.rmSync(scratch,{recursive:true,force:true});}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=parseArgs(process.argv);
  const result=runP23Audit({outDir:path.resolve(args.out),auditedAt:args.auditedAt,sourceSha:args.sourceSha,environment:args.environment,companyId:args.companyId});
  console.log('P23_LIVE_AUDIT='+JSON.stringify(result.summary));
}
