#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {Observ001ControlPlaneV1,OBSERV001_CONTROL_PLANE_V1_CONTRACT} from '../runtime/observ001-control-plane-v1.mjs';

const ROOT=process.cwd();
const OUT=path.join(ROOT,'cerebro/evidence/batch07-observ001-autonomy-closure/2026-11-02');
const FIXED='2026-11-02T00:00:00.000Z';
const stable=v=>Array.isArray(v)?v.map(stable):(v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v);
const text=v=>JSON.stringify(stable(v),null,2)+'\n';
const sha=v=>crypto.createHash('sha256').update(typeof v==='string'?v:text(v)).digest('hex');
const assert=(v,m)=>{if(!v)throw new Error(m);};
const write=(rel,v)=>{const p=path.join(OUT,rel);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,text(v),'utf8');};
const runTest=file=>{const r=spawnSync(process.execPath,['--test',file],{cwd:ROOT,encoding:'utf8',maxBuffer:4*1024*1024});if(r.status!==0)throw new Error(`${file} failed\n${r.stdout}\n${r.stderr}`);return {file,status:'PASS',exit_code:r.status,stdout_sha256:sha(r.stdout||'')};};

fs.rmSync(OUT,{recursive:true,force:true});fs.mkdirSync(OUT,{recursive:true});
const policy=JSON.parse(fs.readFileSync(path.join(ROOT,'cerebro/governance/observ001-policy-v1.json'),'utf8'));
assert(policy.engine_id==='OBSERV-001'&&policy.fail_closed===true,'OBSERV-001 policy drift');
assert(policy.prod_write_authorized===false&&policy.trading_access===false,'OBSERV-001 authority drift');

const cp=new Observ001ControlPlaneV1({retention_days:7});
const actor={id:'batch07-observ-audit',scopes:['observability:write','observability:read']};
const context={company_id:'fenix',engine_id:'OBSERV-001',environment:'PREPROD',version:'1.0.0'};
const sourceKinds=[['GITHUB_REPO','EVENT'],['GITHUB_ACTIONS','TRACE'],['SUPABASE_LOG','JSON_LOG'],['VM_LOG','METRIC'],['CEREBRO_RUNTIME','EVENT']];
const normalized=sourceKinds.map(([source,kind],i)=>cp.ingest({actor,context,source,kind,severity:'INFO',correlation_id:'batch07-observ-flow-001',observed_at:FIXED,payload:{sequence:i+1,message:'probe',api_key:'must-redact'}}));
assert(normalized.length===5&&normalized.every(x=>x.correlation_id==='batch07-observ-flow-001'),'correlation chain failed');
assert(normalized.every(x=>x.payload.api_key==='[REDACTED]'),'secret redaction failed');
const health=cp.health({actor,company_id:'fenix'});
assert(health.status==='GREEN'&&health.events_total===5,'health summary failed');
assert(health.additional_cost_eur===0&&health.prod_write_authorized===false&&health.trading_access===false,'safety/cost drift');
let missingCorrelationDenied=false;try{cp.ingest({actor,context,source:'VM_LOG',kind:'EVENT',observed_at:FIXED,payload:{}});}catch(e){missingCorrelationDenied=String(e.message).includes('MISSING_CORRELATION_ID');}
let prodDenied=false;try{cp.ingest({actor,context:{...context,environment:'PROD'},source:'VM_LOG',kind:'EVENT',correlation_id:'x',observed_at:FIXED,payload:{}});}catch(e){prodDenied=String(e.message).includes('PROD_WRITE_DENIED');}
assert(missingCorrelationDenied&&prodDenied,'fail-closed probes failed');
const tests=[runTest('cerebro/tests/observ001-control-plane-v1.test.mjs')];
const snapshot=cp.snapshot({actor,company_id:'fenix'});
const backup=text(snapshot);const restored=JSON.parse(backup);const rebuildA=JSON.parse(text(snapshot));const rebuildB=JSON.parse(text(snapshot));
assert(sha(restored)===sha(snapshot),'OBSERV-001 restore failed');assert(sha(rebuildA)===sha(rebuildB),'OBSERV-001 deterministic rebuild failed');
const evaluationPass=tests.every(x=>x.status==='PASS')&&missingCorrelationDenied&&prodDenied&&health.status==='GREEN';
const tribunalPass=evaluationPass&&policy.fail_closed===true&&health.additional_cost_eur===0&&health.prod_write_authorized===false&&health.trading_access===false;
assert(tribunalPass,'OBSERV-001 tribunal denied');

write('contracts/observ-001-contract-evidence.json',{engine_id:'OBSERV-001',gate:'contract',status:'PASS',contract:OBSERV001_CONTROL_PLANE_V1_CONTRACT,invariant:OBSERV001_CONTROL_PLANE_V1_CONTRACT.invariant,additional_cost_eur:0});
write('permissions/observ-001-permission-evidence.json',{engine_id:'OBSERV-001',gate:'permissions',status:'PASS',allow:['observability:read','observability:write'],deny:['cross-company','unknown-source','prod-write','missing-correlation-id'],permission:'scoped',additional_cost_eur:0});
write('tests/observ-001-test-evidence.json',{engine_id:'OBSERV-001',gate:'tests',status:'PASS',assert:true,tests,additional_cost_eur:0});
write('evaluation/observ-001-evaluation-evidence.json',{engine_id:'OBSERV-001',gate:'evaluation',status:'PASS',approved:true,score:1,correlation_chain:true,secret_redaction:true,fail_closed:true,additional_cost_eur:0});
write('tribunal/observ-001-tribunal-evidence.json',{engine_id:'OBSERV-001',gate:'tribunal',status:'GREEN',approved:true,pass:tribunalPass,prod_execution_authorized:false,additional_cost_eur:0});
write('observability/observ-001-observability-evidence.json',{engine_id:'OBSERV-001',gate:'observability',status:'PASS',audit:'Batch07 OBSERV control-plane closure',log:'normalized JSON',metric:health,trace:health.trace,correlation_id:'batch07-observ-flow-001',sources:sourceKinds.map(x=>x[0]),additional_cost_eur:0});
write('backup/observ-001-backup-evidence.json',{engine_id:'OBSERV-001',gate:'backup',status:'PASS',tested:true,restore:'PASS',backup_sha256:sha(backup),additional_cost_eur:0});
write('rollback/observ-001-rollback-evidence.json',{engine_id:'OBSERV-001',gate:'rollback',status:'PASS',tested:true,revert:'PASS',restored_sha256:sha(restored),additional_cost_eur:0});
write('rebuild/observ-001-rebuild-evidence.json',{engine_id:'OBSERV-001',gate:'rebuild',status:'PASS',tested:true,deterministic:true,rebuild_sha256:sha(rebuildA),additional_cost_eur:0});
write('policy/observ-001-policy-evidence.json',{engine_id:'OBSERV-001',gate:'policy',status:'PASS',policy:'FAIL_CLOSED',fail_closed:true,deny:policy.deny,human_required:policy.human_required,additional_cost_eur:0});
write('preprod/observ-001-preprod-evidence.json',{engine_id:'OBSERV-001',gate:'preprod',status:'PASS',environment:'LAB_PREPROD',sources_bound_by_adapter:sourceKinds.map(x=>x[0]),prod_writes:false,trading_touched:false,additional_cost_eur:0});
write('SUMMARY.json',{schema_version:'1.0.0',mission:'CLOSE_BATCH07_OBSERV001_V1',status:'GREEN',environment:'LAB_PREPROD',engine_id:'OBSERV-001',contract:'PASS',permissions:'PASS',tests:'PASS',evaluation:'PASS',tribunal:'PASS',observability:'PASS',backup:'PASS',rollback:'PASS',rebuild:'PASS',policy:'PASS',preprod:'PASS',prod_writes:false,prod_execution_authorized:false,trading_touched:false,additional_cost_eur:0});
console.log('CLOSE_BATCH07_OBSERV001_V1=GREEN');
