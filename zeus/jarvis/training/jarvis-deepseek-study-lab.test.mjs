import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {canExecuteStudy,dryRun,projectedCallUSD,estimateActualCost,parseModelJSON,
 executeStudy,summarizeStudyRow} from './jarvis-deepseek-study-lab.mjs';

const env={JARVIS_LAB_STUDY_APPROVED:'YES',
 GITHUB_REF:'refs/heads/cerebro/jarvis-deepseek-weekend-lab-20261106',
 GITHUB_RUN_ID:'123456789',GITHUB_RUN_ATTEMPT:'1',
 DEEPSEEK_API_KEY:'SYNTHETIC_KEY_DO_NOT_USE_LIVE'};
const candidate={respuesta:'Voy a revisar primero el estado LAB. No tocaré PROD sin las comprobaciones.',
 intencion:'Comprobar los límites',diagnostico:'Aún no verificado',acciones:['leer'],
 riesgos:['producción'],verificaciones:['prueba'],human_required:false};
const critic={apto_para_revision:true,puntuacion:80,objeciones:[],motivo:'Revisión sintética'};
function mockProvider({balance='98.23',failAfter=null}={}){
 const stats={calls:0,balances:0,paid:0};
 async function fetchImpl(url,opts){
  stats.calls++;
  if(url.endsWith('/user/balance')){
   stats.balances++;
   return {ok:true,json:async()=>({is_available:true,balance_infos:[
    {currency:'USD',total_balance:balance}]})};
  }
  if(url.endsWith('/responses')){
   stats.paid++;
   if(failAfter&&stats.paid>=failAfter)return {ok:false,status:429,json:async()=>({error:{code:'RATE_LIMIT'}})};
   const payload=JSON.parse(opts.body);
   assert.equal(payload.model,'deepseek-flash');
   assert.ok(payload.max_output_tokens<=700);
   assert.equal(payload.reasoning.effort,'none');
   assert.equal(payload.text.format.type,'json_object');
   assert.equal(payload.tool_choice,'none');
   const response=payload.instructions.includes('auditor independiente')?critic:candidate;
   return {ok:true,json:async()=>({model:'deepseek-flash',status:'completed',
     output_text:JSON.stringify(response),usage:{
       input_tokens:190,output_tokens:105,
       input_tokens_details:{cached_tokens:10}}})};
  }
  throw Error('Unexpected external network');
 }
 return {fetchImpl,stats};
}
test('study explicitly guards the correct branch, unique attempt and date',()=>{
 assert.equal(canExecuteStudy(env,'2026-11-06'),true);
 assert.equal(canExecuteStudy({...env,GITHUB_REF:'refs/heads/main'},'2026-11-06'),false);
 assert.equal(canExecuteStudy({...env,GITHUB_RUN_ATTEMPT:'2'},'2026-11-06'),false);
 assert.equal(canExecuteStudy({...env,JARVIS_LAB_STUDY_APPROVED:'NO'},'2026-11-06'),false);
 assert.equal(canExecuteStudy({...env,DEEPSEEK_API_KEY:''},'2026-11-06'),false);
 assert.equal(canExecuteStudy(env,'2026-11-09'),false);
});
test('study is off by default and never auto-promotes',()=>{
 const s=dryRun();
 assert.equal(s.state,'OFF');assert.equal(s.selected,6);
 assert.equal(s.maximum_calls,12);assert.equal(s.hard_cap_usd,0.15);
 assert.equal(s.prod,false);assert.equal(s.auto_promote,false);
});
test('pricing uses peak rates, catches unverified token count',()=>{
 assert.ok(projectedCallUSD({model:'deepseek-flash',input:'hola'})>0);
 assert.throws(()=>projectedCallUSD({input:'x'.repeat(13000)}),/TOO_LARGE/);
 assert.ok(estimateActualCost({input_tokens:1000,output_tokens:100,cached_input_tokens:0})>0);
 assert.throws(()=>estimateActualCost({input_tokens:3,output_tokens:701}),/UNVERIFIABLE/);
 assert.throws(()=>estimateActualCost({input_tokens:3,output_tokens:-1}),/UNVERIFIABLE/);
});
test('parser rejects malformed JSON and does not accept raw output',()=>{
 assert.deepEqual(parseModelJSON('bad'),{invalid_json:true});
 assert.deepEqual(parseModelJSON('null'),{invalid_json:true});
 assert.equal(parseModelJSON(JSON.stringify(candidate)).respuesta,candidate.respuesta);
});
test('independent candidate report stays review-only and sanitizes secret-like strings',()=>{
 const x=summarizeStudyRow({id:'ES-01',area:'comprension'},
  {...candidate,respuesta:'Nunca publiques sk-fakeandverylongtest123456 en registros.'},
  {...critic,objeciones:['Token Bearer secret_example_is_invalid']});
 assert.equal(x.auto_promote,false);
 assert.equal(x.verified_improvement,false);
 assert.equal(x.review_status,'HUMAN_TRIBUNAL_PENDING');
 assert.ok(!x.reply.includes('sk-fakeandverylongtest123456'));
 assert.ok(!x.critic_objections[0].includes('secret_example_is_invalid'));
});
test('one-shot six real-shaped scenarios, twelve mocked paid requests, saved only to private output',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'jarvis-study-'));
 try{
  const provider=mockProvider();
  const summary=await executeStudy({env:{...env,JARVIS_LAB_STUDY_OUTPUT_DIR:dir},
   fetchImpl:provider.fetchImpl,now:'2026-11-06'});
  assert.equal(summary.status,'STUDY_CANDIDATES_ONLY');
  assert.equal(summary.scenarios,6);assert.equal(summary.calls,12);
  assert.equal(provider.stats.paid,12);
  assert.equal(provider.stats.balances,12);
  assert.ok(summary.usd_peak_estimate<0.15);
  const report=JSON.parse(readFileSync(join(dir,'jarvis-study-123456789.json'),'utf8'));
  assert.equal(report.rows.length,6);
  const partial=JSON.parse(readFileSync(join(dir,'partial-study-123456789.json'),'utf8'));
  assert.equal(partial.calls,12);
  assert.equal(partial.completed_scenarios,6);
  assert.equal(partial.auto_promote,false);
  assert.equal(report.auto_promote,false);
  assert.equal(report.independent_human_review_done,false);
  assert.equal(report.model_weights_modified,false);
  assert.equal(report.provider_billing_reconciled,false);
  assert.ok(!JSON.stringify(report).includes(env.DEEPSEEK_API_KEY));
 }finally{rmSync(dir,{recursive:true,force:true})}
});
test('fail closed on balance change, no DeepSeek paid request made',async()=>{
 const provider=mockProvider({balance:'120.00'});
 await assert.rejects(()=>executeStudy({env,fetchImpl:provider.fetchImpl,now:'2026-11-06'}),/BALANCE_DELTA_DENIED/);
 assert.equal(provider.stats.paid,0);
});
test('fail closed on unauthorized branch, no network made',async()=>{
 const provider=mockProvider();
 await assert.rejects(()=>executeStudy({env:{...env,GITHUB_REF:'refs/heads/main'},
  fetchImpl:provider.fetchImpl,now:'2026-11-06'}),/MANUAL_LAB_GATE_NOT_MET/);
 assert.equal(provider.stats.calls,0);
});
