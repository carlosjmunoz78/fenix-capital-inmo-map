import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import {readFileSync} from 'node:fs';
import {balanceAvailable,evaluate,reservedUSD} from './deepseek-weekend-runner.mjs';

const dir=dirname(fileURLToPath(import.meta.url));
test('synthetic curriculum has eight distinct LAB cases, no identifiers',()=>{
 const curr=JSON.parse(readFileSync(join(dir,'deepseek-weekend-20261107-08.curriculum.json'),'utf8'));
 assert.equal(curr.environment,'LAB');
 assert.equal(curr.dataset,'SYNTHETIC_PUBLIC_ONLY');
 assert.equal(curr.cases.length,8);
 assert.equal(new Set(curr.cases.map(x=>x.id)).size,8);
 for(const x of curr.cases){
  assert.match(x.id,/^ES-\d{2}$/);
  assert.ok(x.input.length<=600);
  assert.ok(!/Bearer |sk-[a-zA-Z0-9]{12}|password\s*:/i.test(x.input));
 }
});
test('dry run never needs API key and never touches network',()=>{
 const p=spawnSync(process.execPath,[join(dir,'deepseek-weekend-runner.mjs'),'--dry-run'],
  {encoding:'utf8',env:{PATH:process.env.PATH}});
 assert.equal(p.status,0,p.stderr);
 assert.match(p.stdout,/JARVIS_WEEKEND_DRY_RUN_PASS/);
 assert.match(p.stdout,/OFF_UNTIL_AUTHORIZED/);
});
test('missing explicit enable blocks paid mode',()=>{
 const p=spawnSync(process.execPath,[join(dir,'deepseek-weekend-runner.mjs'),'--execute'],
  {encoding:'utf8',env:{PATH:process.env.PATH}});
 assert.notEqual(p.status,0);
 assert.match(p.stderr,/JARVIS_WEEKEND_STOP/);
});
test('budget worst-case is small and nonnegative',()=>{
 assert.ok(reservedUSD('Hola')>0);
 assert.ok(reservedUSD('A'.repeat(10000))>reservedUSD('Hola'));
 assert.ok(reservedUSD('A'.repeat(10000))<1);
});
test('API balance must be verified, no empty account allowed',()=>{
 assert.equal(balanceAvailable({is_available:true,balance_infos:[{currency:'USD',total_balance:'2.00'}]}),true);
 assert.equal(balanceAvailable({is_available:false,balance_infos:[{currency:'USD',total_balance:'200'}]}),false);
 assert.equal(balanceAvailable({is_available:true,balance_infos:[{currency:'CNY',total_balance:'2'}]}),false);
 assert.equal(balanceAvailable({is_available:true,balance_infos:[]}),false);
});
test('even passing proposals NEVER auto-promote to CEREBRO knowledge',()=>{
 const result=evaluate({diagnostico:'lab',acciones:['test'],riesgos:['costo'],verificaciones:['source'],human_required:false},
  {apto_para_revision:true,objeciones:[],motivo:'synthetic'});
 assert.equal(result.candidate_ok,true);
 assert.equal(result.critic_ok,true);
 assert.equal(result.auto_promote,false);
 assert.equal(result.decision,'CANDIDATE_ONLY_HUMAN_TRIBUNAL_PENDING');
});
test('malformed JSON-shaped results remain unverified',()=>{
 const result=evaluate({foo:'bar'},null);
 assert.equal(result.candidate_ok,false);
 assert.equal(result.critic_ok,false);
 assert.equal(result.auto_promote,false);
});
