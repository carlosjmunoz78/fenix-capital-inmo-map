#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {Evt001Native,authorizeEvt001Action,EVT001_NATIVE_CONTRACT} from '../runtime/evt001-native-v1.mjs';

const ROOT=process.cwd();
const OUT=path.join(ROOT,'cerebro/evidence/batch07-evt001-autonomy-closure/2026-11-02');
const stable=v=>Array.isArray(v)?v.map(stable):(v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v);
const text=v=>JSON.stringify(stable(v),null,2)+'\n';
const sha=v=>crypto.createHash('sha256').update(typeof v==='string'?v:text(v)).digest('hex');
const assert=(v,m)=>{if(!v)throw new Error(m);};
const write=(rel,v)=>{const p=path.join(OUT,rel);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,text(v),'utf8');};
const runTest=file=>{const r=spawnSync(process.execPath,['--test',file],{cwd:ROOT,encoding:'utf8',maxBuffer:8*1024*1024});if(r.status!==0)throw new Error(`${file} failed\n${r.stdout}\n${r.stderr}`);return {file,status:'PASS',exit_code:r.status,stdout_sha256:sha(r.stdout||'')};};
const temp=()=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'evt001-close-'));return {root,event_file:path.join(root,'events.v8'),delivery_file:path.join(root,'deliveries.v8')};};

fs.rmSync(OUT,{recursive:true,force:true});fs.mkdirSync(OUT,{recursive:true});
const policy=JSON.parse(fs.readFileSync(path.join(ROOT,'cerebro/governance/evt001-policy-v1.json'),'utf8'));
assert(policy.engine_id==='EVT-001'&&policy.fail_closed===true,'EVT-001 policy drift');
const context={company_id:'fenix',engine_id:'EVT-001',environment:'PREPROD',version:'1.0.0'};
const allow=authorizeEvt001Action({operation:'PUBLISH',context});
const denyProd=authorizeEvt001Action({operation:'PUBLISH',context:{...context,environment:'PROD'}});
const denyUnknown=authorizeEvt001Action({operation:'DROP_ALL',context});
assert(allow.authorized===true&&denyProd.authorized===false&&denyUnknown.authorized===false,'EVT-001 permissions fail-closed drift');

const live=temp();
let deliveryCalls=0;
const transport={publish:async()=>{deliveryCalls+=1;return {ok:true,transport:'deterministic-fixture'};}};
const bus=new Evt001Native({...live,transport,max_attempts:3});
const inputs=[
 {type:'cerebro.engine.checked',schema_version:'1.0.0',payload:{status:'GREEN'},context,idempotency_key:'evt001-close-1'},
 {type:'cerebro.engine.metric',schema_version:'1.0.0',payload:{value:1},context,idempotency_key:'evt001-close-2'}
];
for(const x of inputs)assert(bus.publish(x).accepted===true,'EVT-001 publish failed');
assert(bus.publish(inputs[0]).duplicate===true,'EVT-001 idempotency failed');
const delivery=await bus.deliverContext(context);
const replay=bus.verifyReplay(context);
assert(delivery.delivered_total===2&&delivery.dead_letter_total===0&&deliveryCalls===2,'EVT-001 delivery failed');
assert(replay.status==='REPLAY_VERIFIED'&&replay.event_count===2,'EVT-001 replay failed');
const tests=[runTest('cerebro/tests/evt001-native-v1.test.mjs'),runTest('cerebro/tests/persistent-events-jobs.test.mjs'),runTest('cerebro/tests/runtime-atomicity.test.mjs')];

// Physical backup + restore of the actual persistent journal files.
const backupDir=fs.mkdtempSync(path.join(os.tmpdir(),'evt001-backup-'));
const backupEvent=path.join(backupDir,'events.v8'); const backupDelivery=path.join(backupDir,'deliveries.v8');
fs.copyFileSync(live.event_file,backupEvent); fs.copyFileSync(live.delivery_file,backupDelivery);
const backupHashes={events:sha(fs.readFileSync(backupEvent)),deliveries:sha(fs.readFileSync(backupDelivery))};
const restored=temp(); fs.copyFileSync(backupEvent,restored.event_file); fs.copyFileSync(backupDelivery,restored.delivery_file);
const restoredBus=new Evt001Native(restored); const restoredReplay=restoredBus.verifyReplay(context);
assert(restoredReplay.event_count===2&&restoredReplay.delivery_operations===2,'EVT-001 backup restore failed');

// Mutate the working journal, then rollback the exact physical files from backup.
bus.publish({type:'cerebro.rollback.probe',schema_version:'1.0.0',payload:{probe:true},context,idempotency_key:'evt001-close-mutation'});
assert(bus.listForContext(context).length===3,'EVT-001 mutation probe failed');
fs.copyFileSync(backupEvent,live.event_file); fs.copyFileSync(backupDelivery,live.delivery_file);
const rolledBack=new Evt001Native(live); const rollbackReplay=rolledBack.verifyReplay(context);
assert(rollbackReplay.event_count===2&&rollbackReplay.delivery_operations===2,'EVT-001 physical rollback failed');

// Deterministic rebuild: rebuild equivalent logical state from canonical inputs.
const rebuilt=temp(); const rebuiltBus=new Evt001Native(rebuilt);
for(const x of inputs)rebuiltBus.publish(x);
const rebuildReplay=rebuiltBus.verifyReplay(context);
assert(rebuildReplay.event_count===2,'EVT-001 rebuild failed');
assert(rebuiltBus.listForContext(context).map(e=>e.idempotency_key).join('|')===inputs.map(x=>x.idempotency_key).join('|'),'EVT-001 logical rebuild drift');

const evaluationPass=tests.every(x=>x.status==='PASS')&&allow.authorized===true&&denyProd.authorized===false&&denyUnknown.authorized===false&&restoredReplay.event_count===2&&rollbackReplay.event_count===2&&rebuildReplay.event_count===2;
const tribunalPass=evaluationPass&&EVT001_NATIVE_CONTRACT.additional_cost_eur===0&&policy.fail_closed===true&&policy.prod_write_authorized===false&&policy.trading_access===false;
assert(tribunalPass,'EVT-001 tribunal denied');

write('permissions/evt-001-permission-evidence.json',{engine_id:'EVT-001',gate:'permissions',status:'PASS',permission:'ALLOW_SCOPED_PREPROD_DENY_PROD_AND_UNKNOWN',allow,deny_prod:denyProd,deny_unknown:denyUnknown,additional_cost_eur:0});
write('evaluation/evt-001-evaluation-evidence.json',{engine_id:'EVT-001',gate:'evaluation',status:'PASS',approved:true,score:1,tests,delivery,replay,additional_cost_eur:0});
write('tribunal/evt-001-tribunal-evidence.json',{engine_id:'EVT-001',gate:'tribunal',status:'GREEN',approved:true,pass:tribunalPass,prod_execution_authorized:false,additional_cost_eur:0});
write('observability/evt-001-observability-evidence.json',{engine_id:'EVT-001',gate:'observability',status:'PASS',audit:'Batch07 EVT persistent event runtime closure',log:'structured delivery receipts',metric:{events_total:replay.event_count,delivery_operations:replay.delivery_operations,delivered_total:delivery.delivered_total,dead_letter_total:delivery.dead_letter_total},trace:sha({delivery,replay}),additional_cost_eur:0});
write('backup/evt-001-backup-evidence.json',{engine_id:'EVT-001',gate:'backup',status:'PASS',tested:true,restore:'PASS',physical_files:['events.v8','deliveries.v8'],backup_sha256:backupHashes,restored_event_count:restoredReplay.event_count,additional_cost_eur:0});
write('rollback/evt-001-rollback-evidence.json',{engine_id:'EVT-001',gate:'rollback',status:'PASS',tested:true,revert:'PASS',physical_files_restored:true,event_count_after_rollback:rollbackReplay.event_count,additional_cost_eur:0});
write('rebuild/evt-001-rebuild-evidence.json',{engine_id:'EVT-001',gate:'rebuild',status:'PASS',tested:true,deterministic:true,canonical_inputs:inputs.map(x=>x.idempotency_key),event_count:rebuildReplay.event_count,additional_cost_eur:0});
write('SUMMARY.json',{schema_version:'1.0.0',mission:'CLOSE_BATCH07_EVT001_V1',status:'GREEN',environment:'LAB_PREPROD',engine_id:'EVT-001',permissions:'PASS',evaluation:'PASS',tribunal:'PASS',observability:'PASS',backup:'PASS',rollback:'PASS',rebuild:'PASS',prod_writes:false,prod_execution_authorized:false,trading_touched:false,additional_cost_eur:0});
for(const d of [live.root,restored.root,rebuilt.root,backupDir])fs.rmSync(d,{recursive:true,force:true});
console.log('CLOSE_BATCH07_EVT001_V1=GREEN');
