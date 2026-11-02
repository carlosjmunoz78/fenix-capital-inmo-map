#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {ActionGatewayV1} from '../gateway/action-gateway-v1.mjs';
import {CerebroGatewayV0} from '../console/gateway.mjs';
import {bindConsoleToActionGatewayV1} from '../console/action-gateway-binding-v1.mjs';

const ROOT=process.cwd();
const OUT=path.join(ROOT,'cerebro/evidence/batch07-actgw001-autonomy-closure/2026-11-02');
const stable=v=>Array.isArray(v)?v.map(stable):(v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v);
const json=v=>JSON.stringify(stable(v),null,2)+'\n';
const hash=v=>crypto.createHash('sha256').update(Buffer.isBuffer(v)?v:(typeof v==='string'?v:json(v))).digest('hex');
const assert=(v,m)=>{if(!v)throw new Error(m);};
const write=(rel,v)=>{const p=path.join(OUT,rel);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,json(v),'utf8');};
const runTest=file=>{const r=spawnSync(process.execPath,['--test',file],{cwd:ROOT,encoding:'utf8',maxBuffer:8*1024*1024});if(r.status!==0)throw new Error(`${file} failed\n${r.stdout}\n${r.stderr}`);return {file,status:'PASS',exit_code:r.status,stdout_sha256:hash(r.stdout||'')};};

fs.rmSync(OUT,{recursive:true,force:true});
const runtimePath=path.join(ROOT,'cerebro/gateway/action-gateway-v1.mjs');
const bindingPath=path.join(ROOT,'cerebro/console/action-gateway-binding-v1.mjs');
const policyPath=path.join(ROOT,'cerebro/governance/actgw001-policy-v1.json');
const policy=JSON.parse(fs.readFileSync(policyPath,'utf8'));
assert(policy.engine_id==='ACTGW-001'&&policy.fail_closed===true,'ACTGW policy drift');
assert(policy.prod_write_authorized===false&&policy.prod_execution_authorized===false&&policy.trading_access===false,'ACTGW authority drift');
assert(policy.additional_cost_eur===0,'ACTGW cost drift');

const context={company_id:'fenix',engine_id:'ACTGW-001',environment:'PREPROD',version:'1.0.0'};
const makeGateway=()=>{const g=new ActionGatewayV1({environment:'PREPROD'});g.registerCapability('fixture.echo',async({context:ctx,payload})=>({ok:true,company_id:ctx.company_id,value:payload.value}));return g;};
const gateway=makeGateway();
const input={context,authorized:true,capability:'fixture.echo',payload:{value:7},idempotency_key:'actgw-close-1',risk:'LOW',estimated_additional_cost_eur:0};
const first=await gateway.execute(input);
const replay=await gateway.execute(input);
assert(first.status==='ACTION_EXECUTED'&&first.executed===true&&first.result.value===7,'ACTGW execution failed');
assert(JSON.stringify(first)===JSON.stringify(replay),'ACTGW idempotent replay drift');
assert(gateway.auditLog().at(-1)?.type==='ACTION_REPLAYED','ACTGW replay audit missing');

const conflict=await gateway.execute({...input,payload:{value:8}});
const unauthorized=await gateway.execute({...input,idempotency_key:'actgw-unauthorized',authorized:false});
const unknown=await gateway.execute({...input,idempotency_key:'actgw-unknown',capability:'unknown.capability'});
const prod=await gateway.execute({...input,idempotency_key:'actgw-prod',requires_prod_write:true});
const trading=await gateway.execute({...input,idempotency_key:'actgw-trading',trading_access:true});
const signature=await gateway.execute({...input,idempotency_key:'actgw-sign',signature_required:true});
const high=await gateway.execute({...input,idempotency_key:'actgw-high',risk:'HIGH'});
const paid=await gateway.execute({...input,idempotency_key:'actgw-paid',estimated_additional_cost_eur:1});
assert(conflict.reason==='POLICY_CONFLICT','idempotency conflict not denied');
assert(unauthorized.reason==='POLICY_CONFLICT','missing authorization not denied');
assert(unknown.reason==='LOW_CONFIDENCE','unknown capability not fail-closed');
assert(prod.reason==='HIGH_RISK'&&trading.reason==='POLICY_CONFLICT'&&signature.reason==='SIGNATURE_REQUIRED'&&high.reason==='HIGH_RISK'&&paid.reason==='MONEY_LIMIT','canonical exception mapping drift');
assert([conflict,unauthorized,unknown,prod,trading,signature,high,paid].every(x=>x.executed===false),'denied action executed');

let prodContextDenied=false;try{await gateway.execute({...input,idempotency_key:'actgw-prod-context',context:{...context,environment:'PROD'}});}catch(e){prodContextDenied=/requires PREPROD/.test(String(e.message));}
assert(prodContextDenied,'PROD context did not fail closed');

const consoleGateway=new CerebroGatewayV0({environment:'PREPROD',version:'1.0.0'});
const boundGateway=makeGateway();
const binding=bindConsoleToActionGatewayV1({consoleGateway,actionGateway:boundGateway});
consoleGateway.createSession({session_id:'actgw-close-session',company_id:'fenix'});
const consoleResult=await consoleGateway.execute({session_id:'actgw-close-session',command:'action.execute',payload:{authorized:true,capability:'fixture.echo',payload:{value:9},idempotency_key:'actgw-console-1',risk:'LOW'}});
assert(binding.status==='BOUND'&&binding.command==='action.execute','console binding failed');
assert(consoleResult.status==='ACTION_EXECUTED'&&consoleResult.context.engine_id==='ACTGW-001','console did not route through ACTGW');

const tests=[runTest('cerebro/tests/action-gateway-v1.test.mjs'),runTest('cerebro/tests/console-gateway.test.mjs')];
const contract=gateway.contract();
assert(contract.engine_id==='ACTGW-001'&&contract.environment==='PREPROD'&&contract.prod_writes===false&&contract.autonomous_prod===false&&contract.trading_access===false&&contract.additional_cost_target_eur===0&&contract.idempotency_required===true&&contract.audit_required===true,'ACTGW contract drift');

const rebuiltA=makeGateway();const rebuiltB=makeGateway();
const rebuildInput={context,authorized:true,capability:'fixture.echo',payload:{value:11},idempotency_key:'actgw-rebuild',risk:'LOW'};
const rebuildA=await rebuiltA.execute(rebuildInput);const rebuildB=await rebuiltB.execute(rebuildInput);
assert(hash(rebuildA)===hash(rebuildB),'ACTGW deterministic rebuild drift');

const backupDir=fs.mkdtempSync(path.join(os.tmpdir(),'actgw001-backup-'));
const governed=[runtimePath,bindingPath,policyPath];const hashes={};
for(const src of governed){const name=path.basename(src);const bytes=fs.readFileSync(src);hashes[name]=hash(bytes);fs.copyFileSync(src,path.join(backupDir,name));assert(hash(fs.readFileSync(path.join(backupDir,name)))===hashes[name],`backup failed:${name}`);}
const rollbackTarget=path.join(backupDir,path.basename(policyPath));fs.appendFileSync(rollbackTarget,'\nMUTATION_PROBE\n');assert(hash(fs.readFileSync(rollbackTarget))!==hashes[path.basename(policyPath)],'rollback mutation probe failed');fs.copyFileSync(policyPath,rollbackTarget);assert(hash(fs.readFileSync(rollbackTarget))===hashes[path.basename(policyPath)],'rollback restore failed');

const tribunalPass=tests.every(x=>x.status==='PASS')&&prodContextDenied&&policy.fail_closed===true&&contract.additional_cost_target_eur===0&&contract.prod_writes===false&&contract.trading_access===false;
assert(tribunalPass,'ACTGW tribunal denied');

write('contracts/actgw-001-contract-evidence.json',{engine_id:'ACTGW-001',gate:'contract',status:'PASS',contract,binding,execution:'REGISTERED_CAPABILITIES_ONLY',policy_check:'EXPLICIT_AUTHORIZATION_AND_RUNTIME_GUARDS',idempotency_required:true,audit_required:true,additional_cost_eur:0});
write('permissions/actgw-001-permission-evidence.json',{engine_id:'ACTGW-001',gate:'permissions',status:'PASS',permission:policy.permission,allow:policy.allow,deny:policy.deny,prod_execution_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0});
write('evaluation/actgw-001-evaluation-evidence.json',{engine_id:'ACTGW-001',gate:'evaluation',status:'PASS',approved:true,score:1,tests,idempotent_replay:true,console_binding:true,prod_context_denied:true,canonical_exception_mapping:true,additional_cost_eur:0});
write('tribunal/actgw-001-tribunal-evidence.json',{engine_id:'ACTGW-001',gate:'tribunal',status:'GREEN',approved:true,pass:tribunalPass,prod_execution_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0});
write('observability/actgw-001-observability-evidence.json',{engine_id:'ACTGW-001',gate:'observability',status:'PASS',audit:'ACTION_EXECUTED/ACTION_REPLAYED/HUMAN_REQUIRED receipts',metric:{audit_entries:gateway.auditLog().length,executed:1,replayed:1,denied:8},trace:hash(gateway.auditLog()),additional_cost_eur:0});
write('backup/actgw-001-backup-evidence.json',{engine_id:'ACTGW-001',gate:'backup',status:'PASS',tested:true,restore:'PASS',scope:'STATELESS_PREPROD_GATEWAY_GOVERNED_ARTIFACTS',hashes,additional_cost_eur:0});
write('rollback/actgw-001-rollback-evidence.json',{engine_id:'ACTGW-001',gate:'rollback',status:'PASS',tested:true,revert:'PASS',disposable_mutation_probe:true,policy_restored_sha256:hashes[path.basename(policyPath)],additional_cost_eur:0});
write('rebuild/actgw-001-rebuild-evidence.json',{engine_id:'ACTGW-001',gate:'rebuild',status:'PASS',tested:true,deterministic:true,first_sha256:hash(rebuildA),second_sha256:hash(rebuildB),additional_cost_eur:0});
write('SUMMARY.json',{schema_version:'1.0.0',mission:'CLOSE_BATCH07_ACTGW001_V1',status:'GREEN',environment:'LAB_PREPROD',engine_id:'ACTGW-001',contract:'PASS',permissions:'PASS',evaluation:'PASS',tribunal:'PASS',observability:'PASS',backup:'PASS',rollback:'PASS',rebuild:'PASS',prod_writes:false,prod_execution_authorized:false,trading_touched:false,additional_cost_eur:0});
fs.rmSync(backupDir,{recursive:true,force:true});
console.log('CLOSE_BATCH07_ACTGW001_V1=GREEN');
