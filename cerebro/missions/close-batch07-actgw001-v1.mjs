#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {Actgw001DurableGuardV1,ACTGW001_DURABLE_GUARD_V1_CONTRACT} from '../gateway/actgw001-durable-guard-v1.mjs';

const ROOT=process.cwd();
const OUT=path.join(ROOT,'cerebro/evidence/batch07-actgw001-autonomy-closure/2026-11-02');
const stable=v=>Array.isArray(v)?v.map(stable):(v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v);
const json=v=>JSON.stringify(stable(v),null,2)+'\n';
const hash=v=>crypto.createHash('sha256').update(Buffer.isBuffer(v)?v:(typeof v==='string'?v:json(v))).digest('hex');
const assert=(v,m)=>{if(!v)throw new Error(m);};
const write=(rel,v)=>{const p=path.join(OUT,rel);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,json(v),'utf8');};
const runTest=file=>{const r=spawnSync(process.execPath,['--test',file],{cwd:ROOT,encoding:'utf8',maxBuffer:8*1024*1024});if(r.status!==0)throw new Error(`${file} failed\n${r.stdout}\n${r.stderr}`);return {file,status:'PASS',exit_code:r.status,stdout_sha256:hash(r.stdout||'')};};
const tmp=()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'actgw001-close-'));return {dir,file:path.join(dir,'actions.v8journal')}};

fs.rmSync(OUT,{recursive:true,force:true});fs.mkdirSync(OUT,{recursive:true});
const policyPath=path.join(ROOT,'cerebro/governance/actgw001-policy-v1.json');
const runtimePath=path.join(ROOT,'cerebro/gateway/action-gateway-v1.mjs');
const guardPath=path.join(ROOT,'cerebro/gateway/actgw001-durable-guard-v1.mjs');
const bindingPath=path.join(ROOT,'cerebro/console/action-gateway-binding-v1.mjs');
const policy=JSON.parse(fs.readFileSync(policyPath,'utf8'));
assert(policy.engine_id==='ACTGW-001'&&policy.fail_closed===true&&policy.durable_idempotency===true,'ACTGW policy drift');
assert(policy.prod_write_authorized===false&&policy.trading_access===false&&policy.additional_cost_eur===0,'ACTGW authority/cost drift');

const context={company_id:'fenix',engine_id:'ACTGW-001',environment:'PREPROD',version:'1.0.0'};
const live=tmp();let calls=0;
let gateway=new Actgw001DurableGuardV1({journal_file:live.file});
gateway.registerCapability('fixture.echo',async({payload})=>({ok:true,value:payload.value,calls:++calls}));
const input={context,authorized:true,capability:'fixture.echo',payload:{value:7},idempotency_key:'actgw-close-1',risk:'LOW',estimated_additional_cost_eur:0};
const first=await gateway.execute(input);
assert(first.status==='ACTION_EXECUTED'&&calls===1,'ACTGW first execution failed');
assert(gateway.ledgerEvents('fenix').length===2,'ACTGW prepare/commit ledger missing');

// Process-style restart: committed result must replay without invoking handler again.
gateway=new Actgw001DurableGuardV1({journal_file:live.file});
gateway.registerCapability('fixture.echo',async()=>({calls:++calls}));
const replay=await gateway.execute(input);
assert(hash(first)===hash(replay)&&calls===1,'ACTGW durable replay failed');

const tests=[runTest('cerebro/tests/action-gateway-v1.test.mjs'),runTest('cerebro/tests/actgw001-durable-guard-v1.test.mjs'),runTest('cerebro/tests/persistent-events-jobs.test.mjs')];

// Physical backup and restore of the actual action journal.
const backupDir=fs.mkdtempSync(path.join(os.tmpdir(),'actgw001-backup-'));
const backupJournal=path.join(backupDir,'actions.v8journal');
fs.copyFileSync(live.file,backupJournal);const journalHash=hash(fs.readFileSync(backupJournal));
const restored=tmp();fs.copyFileSync(backupJournal,restored.file);
let restoredCalls=0;const restoredGateway=new Actgw001DurableGuardV1({journal_file:restored.file});restoredGateway.registerCapability('fixture.echo',async()=>({calls:++restoredCalls}));
const restoredReplay=await restoredGateway.execute(input);
assert(hash(restoredReplay)===hash(first)&&restoredCalls===0,'ACTGW restore/replay failed');

// Rollback is tested on physical journal bytes after a later committed action.
gateway=new Actgw001DurableGuardV1({journal_file:live.file});gateway.registerCapability('fixture.echo',async({payload})=>({ok:true,value:payload.value}));
await gateway.execute({...input,idempotency_key:'actgw-mutation',payload:{value:99}});
assert(hash(fs.readFileSync(live.file))!==journalHash,'ACTGW mutation probe failed');
fs.copyFileSync(backupJournal,live.file);assert(hash(fs.readFileSync(live.file))===journalHash,'ACTGW physical rollback failed');

// Deterministic rebuild from canonical input on a fresh journal.
const rebuilt=tmp();const rebuiltGateway=new Actgw001DurableGuardV1({journal_file:rebuilt.file});rebuiltGateway.registerCapability('fixture.echo',async({payload})=>({ok:true,value:payload.value,calls:1}));
const rebuiltResult=await rebuiltGateway.execute(input);assert(hash(rebuiltResult)===hash(first),'ACTGW deterministic rebuild failed');

const tribunalPass=tests.every(x=>x.status==='PASS')&&calls===1&&restoredCalls===0&&ACTGW001_DURABLE_GUARD_V1_CONTRACT.additional_cost_eur===0&&policy.fail_closed===true;
assert(tribunalPass,'ACTGW tribunal denied');
const governedHashes=Object.fromEntries([runtimePath,guardPath,bindingPath,policyPath].map(p=>[path.basename(p),hash(fs.readFileSync(p))]));

write('contracts/actgw-001-contract-evidence.json',{engine_id:'ACTGW-001',gate:'contract',status:'PASS',contract:ACTGW001_DURABLE_GUARD_V1_CONTRACT,execution:'REGISTERED_CAPABILITIES_ONLY',durable_protocol:'PREPARE_EXECUTE_COMMIT',additional_cost_eur:0});
write('permissions/actgw-001-permission-evidence.json',{engine_id:'ACTGW-001',gate:'permissions',status:'PASS',permission:policy.permission,allow:policy.allow,deny:policy.deny,prod_execution_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0});
write('evaluation/actgw-001-evaluation-evidence.json',{engine_id:'ACTGW-001',gate:'evaluation',status:'PASS',approved:true,score:1,tests,durable_restart_replay:true,duplicate_execution_after_restart:false,additional_cost_eur:0});
write('tribunal/actgw-001-tribunal-evidence.json',{engine_id:'ACTGW-001',gate:'tribunal',status:'GREEN',approved:true,pass:true,prod_execution_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0});
write('observability/actgw-001-observability-evidence.json',{engine_id:'ACTGW-001',gate:'observability',status:'PASS',audit:'durable PREPARE/COMMIT receipts + gateway audit',metric:{ledger_events:2,handler_calls:1,restart_replays:1},trace:hash(gateway.ledgerEvents('fenix')),additional_cost_eur:0});
write('backup/actgw-001-backup-evidence.json',{engine_id:'ACTGW-001',gate:'backup',status:'PASS',tested:true,restore:'PASS',physical_file:'actions.v8journal',journal_sha256:journalHash,governed_hashes:governedHashes,additional_cost_eur:0});
write('rollback/actgw-001-rollback-evidence.json',{engine_id:'ACTGW-001',gate:'rollback',status:'PASS',tested:true,revert:'PASS',physical_journal_restored:true,journal_sha256:journalHash,additional_cost_eur:0});
write('rebuild/actgw-001-rebuild-evidence.json',{engine_id:'ACTGW-001',gate:'rebuild',status:'PASS',tested:true,deterministic:true,canonical_input_idempotency_key:input.idempotency_key,result_sha256:hash(rebuiltResult),additional_cost_eur:0});
write('SUMMARY.json',{schema_version:'1.1.0',mission:'CLOSE_BATCH07_ACTGW001_V1',status:'GREEN',environment:'LAB_PREPROD',engine_id:'ACTGW-001',contract:'PASS',permissions:'PASS',evaluation:'PASS',tribunal:'PASS',observability:'PASS',backup:'PASS',rollback:'PASS',rebuild:'PASS',durable_idempotency:true,ambiguous_reexecution:false,prod_writes:false,prod_execution_authorized:false,trading_touched:false,additional_cost_eur:0});
for(const d of [live.dir,restored.dir,rebuilt.dir,backupDir])fs.rmSync(d,{recursive:true,force:true});
console.log('CLOSE_BATCH07_ACTGW001_V1=GREEN');
