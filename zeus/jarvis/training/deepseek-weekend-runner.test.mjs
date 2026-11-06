import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import {readFileSync} from 'node:fs';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {openLifetimeBudget,reserveLifetimeBudget,closeLifetimeBudget,JARVIS_DEEPSEEK_BUDGET} from './deepseek-lifetime-budget.mjs';

import {balanceAvailable,evaluate,reservedUSD} from './deepseek-weekend-runner.mjs';
import {assessJarvisDialogue} from './jarvis-dialogue-quality-lab.mjs';
import {authorizeDeepSeekBalanceDelta} from './deepseek-balance-baseline-lab.mjs';

const dir=dirname(fileURLToPath(import.meta.url));
test('synthetic curriculum has 24 distinct LAB cases, no identifiers',()=>{
 const curr=JSON.parse(readFileSync(join(dir,'deepseek-weekend-20261107-08.curriculum.json'),'utf8'));
 assert.equal(curr.environment,'LAB');
 assert.equal(curr.dataset,'SYNTHETIC_PUBLIC_ONLY');
 assert.equal(curr.cases.length,24);
 assert.equal(new Set(curr.cases.map(x=>x.id)).size,24);
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
 assert.equal(balanceAvailable({is_available:true,balance_infos:[{currency:'USD',total_balance:'6.00'}]}),true);
 assert.equal(balanceAvailable({is_available:false,balance_infos:[{currency:'USD',total_balance:'200'}]}),false);
 assert.equal(balanceAvailable({is_available:true,balance_infos:[{currency:'CNY',total_balance:'2'}]}),false);
 assert.equal(balanceAvailable({is_available:true,balance_infos:[]}),false);
});
test('even passing proposals NEVER auto-promote to CEREBRO knowledge',()=>{
 const result=evaluate({respuesta:'Voy a revisar el estado LAB y no tocaré producción.',intencion:'verificar',diagnostico:'lab',acciones:['test'],riesgos:['costo'],verificaciones:['source'],human_required:false},
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

test('owner cap EUR50 and USD40 cumulative across offline sessions',()=>{
 assert.equal(JARVIS_DEEPSEEK_BUDGET.authorized_eur,50);
 assert.equal(JARVIS_DEEPSEEK_BUDGET.conservative_runtime_cap_usd,40);
 assert.equal(JARVIS_DEEPSEEK_BUDGET.per_run_cap_usd,5);
 assert.equal(JARVIS_DEEPSEEK_BUDGET.auto_recharge,false);
 const dir=mkdtempSync(join(tmpdir(),'jarvis-budget-test-'));
 try{
  let guard=openLifetimeBudget(dir);
  assert.equal(reserveLifetimeBudget(guard,1),1);
  closeLifetimeBudget(guard);
  guard=openLifetimeBudget(dir);
  assert.equal(guard.record.reserved_usd,1);
  assert.throws(()=>openLifetimeBudget(dir));
  for(let i=0;i<7;i++)reserveLifetimeBudget(guard,5);
  assert.equal(guard.record.reserved_usd,36);
  assert.throws(()=>reserveLifetimeBudget(guard,5),/CUMULATIVE_50_EUR_POLICY_STOP/);
  closeLifetimeBudget(guard);
  guard=openLifetimeBudget(dir);
  assert.equal(guard.record.reserved_usd,36);
  assert.throws(()=>reserveLifetimeBudget(guard,-1));
  assert.equal(reserveLifetimeBudget(guard,4),40);
  closeLifetimeBudget(guard);
 }finally{rmSync(dir,{recursive:true,force:true})}
});

test('conversation LAB quality checks real replies and does not promote',()=>{
 const c={respuesta:'Entiendo. Revisaré la conexión sin tocar producción.',intencion:'verificar estado',verificaciones:['estado'],human_required:false};
 const quality=assessJarvisDialogue({candidate:c,critique:{apto_para_revision:true,puntuacion:82},scenario:{id:'ES-13'}});
 assert.equal(quality.reply_valid,true);
 assert.equal(quality.intent_present,true);
 assert.equal(quality.critic_reported_score_unverified,82);
 assert.equal(quality.verified_improvement,false);
 assert.equal(quality.knowledge_promoted,false);
 assert.equal(quality.status,'CANDIDATE_ONLY');
});
test('empty answers, unsupported claims and critic rejection are flagged',()=>{
 const invalid=assessJarvisDialogue({candidate:{respuesta:'',intencion:''},critique:{apto_para_revision:false},scenario:{id:'ES-18'}});
 assert.ok(invalid.issues.includes('EMPTY_REPLY'));
 assert.ok(invalid.issues.includes('CRITIC_REJECTED'));
 const unsupported=assessJarvisDialogue({candidate:{respuesta:'Ya lo he desplegado en producción',intencion:'informar',verificaciones:[],human_required:false}});
 assert.ok(unsupported.issues.includes('UNVERIFIED_EXECUTION_CLAIM'));
});

test('owner account baseline USD 98.23 and cumulative delta USD 40 are fail-closed',()=>{
 const bal=x=>({is_available:true,balance_infos:[{currency:'USD',total_balance:x}]});
 assert.equal(authorizeDeepSeekBalanceDelta(bal('98.23'),{projected_usd:5}).allowed,true);
 assert.equal(authorizeDeepSeekBalanceDelta(bal('58.24'),{projected_usd:0.005}).allowed,true);
 const cap=authorizeDeepSeekBalanceDelta(bal('58.24'),{projected_usd:0.02});
 assert.equal(cap.allowed,false);
 assert.equal(cap.reason,'JARVIS_MONEY_LIMIT');
 assert.equal(authorizeDeepSeekBalanceDelta(bal('100.00')).reason,'BALANCE_REBASE_REQUIRED');
 assert.equal(authorizeDeepSeekBalanceDelta(bal('bad')).allowed,false);
 assert.equal(authorizeDeepSeekBalanceDelta({is_available:false,balance_infos:[]}).allowed,false);
 assert.equal(authorizeDeepSeekBalanceDelta({is_available:true,balance_infos:[]}).allowed,false);
 assert.equal(authorizeDeepSeekBalanceDelta(bal('90.00'),{projected_usd:6}).allowed,false);
});
