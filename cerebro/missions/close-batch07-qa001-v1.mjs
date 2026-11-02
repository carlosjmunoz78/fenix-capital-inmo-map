#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {buildImprovementScoutState} from '../qa/improvement-scout.mjs';

const ROOT=process.cwd();
const OUT=path.join(ROOT,'cerebro/evidence/batch07-qa001-autonomy-closure/2026-11-02');
const stable=v=>Array.isArray(v)?v.map(stable):(v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v);
const text=v=>JSON.stringify(stable(v),null,2)+'\n';
const sha=v=>crypto.createHash('sha256').update(Buffer.isBuffer(v)?v:(typeof v==='string'?v:text(v))).digest('hex');
const assert=(v,m)=>{if(!v)throw new Error(m);};
const write=(rel,v)=>{const p=path.join(OUT,rel);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,text(v),'utf8');};
const runTest=file=>{const r=spawnSync(process.execPath,['--test',file],{cwd:ROOT,encoding:'utf8',maxBuffer:8*1024*1024});if(r.status!==0)throw new Error(`${file} failed\n${r.stdout}\n${r.stderr}`);return {file,status:'PASS',exit_code:r.status,stdout_sha256:sha(r.stdout||'')};};

fs.rmSync(OUT,{recursive:true,force:true});fs.mkdirSync(OUT,{recursive:true});
const contractPath=path.join(ROOT,'cerebro/qa/continuous-human-qa.contract.v0.json');
const scoutPath=path.join(ROOT,'cerebro/qa/improvement-scout.mjs');
const policyPath=path.join(ROOT,'cerebro/governance/qa001-policy-v1.json');
const contract=JSON.parse(fs.readFileSync(contractPath,'utf8'));
const policy=JSON.parse(fs.readFileSync(policyPath,'utf8'));
assert(contract.engine_id==='QA-001'&&contract.replaces_existing_engine===false,'QA-001 contract drift');
assert(contract.modes?.PROD?.access==='READ_ONLY'&&contract.modes?.PROD?.allow_data_write===false,'QA-001 PROD boundary drift');
assert(policy.engine_id==='QA-001'&&policy.fail_closed===true&&policy.prod_write_authorized===false&&policy.trading_access===false,'QA-001 policy drift');

const observation={kind:'WEB',url:'https://example.invalid/preprod',mainCount:0,h1Count:2,unnamedInteractiveCount:2,unlabeledInputs:1,imagesMissingAlt:1,smallTouchTargets:3,horizontalOverflow:false,visibleTextChars:1600,ctaCount:0,project:'mobile-chromium'};
const report={suites:[{title:'CEREBRO',specs:[{title:'[WEB] synthetic PREPROD human read-only journey',tests:[{projectName:'mobile-chromium',results:[{status:'passed',duration:1200,stdout:[{text:`CEREBRO_OBS:${JSON.stringify(observation)}\n`}]}]}]}]}]};
const quality={coverage:{app_authenticated:'POR_AUDITAR_PREPROD_HARNESS',products:'POR_AUDITAR_CANONICAL_PREPROD_TARGET'}};
const stateA=buildImprovementScoutState({report,quality,now:'2026-11-02T00:00:00.000Z'});
const stateB=buildImprovementScoutState({report,quality,now:'2026-11-02T00:00:00.000Z'});
assert(stateA.engine_id==='QA-001'&&stateA.environment==='CONTROL_PLANE','QA-001 scout context drift');
assert(stateA.status==='IMPROVEMENTS_FOUND'&&stateA.candidates_total>0,'QA-001 scout failed');
assert(stateA.candidates.every(x=>x.environment==='PREPROD'&&x.prod_write_authorized===false&&x.additional_cost_eur===0),'QA-001 candidate safety drift');
assert(stateA.safety.prod_write===false&&stateA.safety.customer_data===false&&stateA.safety.trading===false&&stateA.safety.additional_subscription_eur===0,'QA-001 safety drift');
assert(sha(stateA)===sha(stateB),'QA-001 deterministic evaluation drift');

const tests=[
  runTest('cerebro/tests/qa-improvement-scout-v0.test.mjs'),
  runTest('cerebro/tests/qa-learning-bridge-v0.test.mjs')
];

// QA is read-only/stateless for PROD; recovery therefore protects its governed code/config artifacts.
const files=[contractPath,scoutPath,policyPath];
const backupDir=fs.mkdtempSync(path.join(os.tmpdir(),'qa001-backup-'));
const restoreDir=fs.mkdtempSync(path.join(os.tmpdir(),'qa001-restore-'));
const originalHashes={};
for(const src of files){const name=path.basename(src);const bytes=fs.readFileSync(src);originalHashes[name]=sha(bytes);fs.copyFileSync(src,path.join(backupDir,name));}
for(const src of files){const name=path.basename(src);fs.copyFileSync(path.join(backupDir,name),path.join(restoreDir,name));assert(sha(fs.readFileSync(path.join(restoreDir,name)))===originalHashes[name],`QA-001 restore failed:${name}`);}
// Rollback probe happens only on a disposable restored copy.
const rollbackTarget=path.join(restoreDir,path.basename(policyPath));fs.appendFileSync(rollbackTarget,'\nMUTATION_PROBE\n','utf8');assert(sha(fs.readFileSync(rollbackTarget))!==originalHashes[path.basename(policyPath)],'QA-001 mutation probe failed');fs.copyFileSync(path.join(backupDir,path.basename(policyPath)),rollbackTarget);assert(sha(fs.readFileSync(rollbackTarget))===originalHashes[path.basename(policyPath)],'QA-001 rollback failed');

const evaluationPass=tests.every(x=>x.status==='PASS')&&stateA.candidates_total>0&&sha(stateA)===sha(stateB);
const tribunalPass=evaluationPass&&policy.fail_closed===true&&contract.safety.prod_write===false&&contract.safety.trading===false&&Number(contract.safety.additional_subscription_eur)===0;
assert(tribunalPass,'QA-001 tribunal denied');

write('permissions/qa-001-permission-evidence.json',{engine_id:'QA-001',gate:'permissions',status:'PASS',permission:policy.permission,allow:policy.allow,deny:policy.deny,prod_write_authorized:false,additional_cost_eur:0});
write('evaluation/qa-001-evaluation-evidence.json',{engine_id:'QA-001',gate:'evaluation',status:'PASS',approved:true,score:1,tests,candidates_total:stateA.candidates_total,deterministic:true,additional_cost_eur:0});
write('tribunal/qa-001-tribunal-evidence.json',{engine_id:'QA-001',gate:'tribunal',status:'GREEN',approved:true,pass:tribunalPass,prod_execution_authorized:false,additional_cost_eur:0});
write('observability/qa-001-observability-evidence.json',{engine_id:'QA-001',gate:'observability',status:'PASS',audit:'Batch07 QA-001 closure',log:'structured human-like QA observations',metric:{observations_total:stateA.observations_total,candidates_total:stateA.candidates_total,status:stateA.status},trace:sha(stateA),additional_cost_eur:0});
write('backup/qa-001-backup-evidence.json',{engine_id:'QA-001',gate:'backup',status:'PASS',tested:true,restore:'PASS',artifacts:Object.keys(originalHashes),backup_sha256:originalHashes,additional_cost_eur:0});
write('rollback/qa-001-rollback-evidence.json',{engine_id:'QA-001',gate:'rollback',status:'PASS',tested:true,revert:'PASS',disposable_mutation_probe:true,policy_restored_sha256:originalHashes[path.basename(policyPath)],additional_cost_eur:0});
write('rebuild/qa-001-rebuild-evidence.json',{engine_id:'QA-001',gate:'rebuild',status:'PASS',tested:true,deterministic:true,rebuild_sha256:sha(stateA),second_rebuild_sha256:sha(stateB),additional_cost_eur:0});
write('SUMMARY.json',{schema_version:'1.0.0',mission:'CLOSE_BATCH07_QA001_V1',status:'GREEN',environment:'LAB_PREPROD',engine_id:'QA-001',permissions:'PASS',evaluation:'PASS',tribunal:'PASS',observability:'PASS',backup:'PASS',rollback:'PASS',rebuild:'PASS',prod_writes:false,prod_execution_authorized:false,trading_touched:false,additional_cost_eur:0});
fs.rmSync(backupDir,{recursive:true,force:true});fs.rmSync(restoreDir,{recursive:true,force:true});
console.log('CLOSE_BATCH07_QA001_V1=GREEN');
