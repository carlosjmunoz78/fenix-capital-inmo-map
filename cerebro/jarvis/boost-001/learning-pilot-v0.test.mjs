import test from 'node:test';
import assert from 'node:assert/strict';
import {CAMPAIGN,LEARNING_SLOTS,PILOT_TASKS,evaluateCandidate,preflight} from './learning-pilot-v0.mjs';
test('strict 50EUR total allocation and 0.20EUR conservative pilot',()=>{
 assert.equal(LEARNING_SLOTS.reduce((s,x)=>s+x.cap_eur,0),50);
 assert.equal(CAMPAIGN.user_budget_envelope_eur,50);
 assert.equal(CAMPAIGN.pilot_max_reserved_eur,0.20);
 assert.equal(CAMPAIGN.per_request_max_reserved_eur*PILOT_TASKS.length,0.20);
 assert.equal(CAMPAIGN.auto_recharge,false);
});
test('five distinct domains, synthetic-only source cases, no external customer content',()=>{
 assert.equal(PILOT_TASKS.length,5);
 assert.equal(new Set(PILOT_TASKS.map(x=>x.domain)).size,5);
 assert.ok(PILOT_TASKS.every(x=>x.evidence_refs.length>=1));
});
test('branch, hosted actions, secret and exact budget mandatory before live use',()=>{
 const valid={GITHUB_REF:'refs/heads/cerebro/boost-001-reconciled-20261027',GITHUB_ACTIONS:'true',GITHUB_EVENT_NAME:'push',GITHUB_RUN_ATTEMPT:'1',CEREBRO_ALLOW_PAID_CANARY:'YES',DEEPSEEK_API_KEY:'synthetic-only',CEREBRO_JARVIS_LEARNING_BUDGET_EUR:'50',CEREBRO_JARVIS_PILOT_MAX_EUR:'0.20'};
 assert.equal(preflight({env:valid}),true);
 for(const [k,v] of [['GITHUB_REF','refs/heads/main'],['CEREBRO_JARVIS_LEARNING_BUDGET_EUR','200'],['CEREBRO_JARVIS_PILOT_MAX_EUR','5'],['CEREBRO_PROD_WRITE','true'],['CEREBRO_TRADING_ACCESS','true'],['DEEPSEEK_API_KEY',''],['GITHUB_RUN_ATTEMPT','2'],['GITHUB_EVENT_NAME','workflow_dispatch']]){
  assert.throws(()=>preflight({env:{...valid,[k]:v}}));
 }
});
test('rejects model claim of production permission, wrong domain, unsupported evidence or false completed action',()=>{
 const t=PILOT_TASKS[0];
 const good={schema_version:'1.0.0',company_id:'fenix',domain:t.domain,action:'PLAN',summary_es:'Primero comprobaré los controles disponibles y no afirmaré trabajo realizado.',reusable_rule:{when:'Cuando no existe evidencia de ejecución',then:'Marcarlo por auditar y solicitar comprobaciones',guard:'Solo asumir hechos corroborados con pruebas y registros'},evidence_refs:t.evidence_refs,prod_authorized:false,trading_access:false};
 assert.equal(evaluateCandidate(t,JSON.stringify(good)).accepted,true);
 for(const delta of [{prod_authorized:true},{domain:'executive'},{evidence_refs:['secret:123']},{summary_es:'Ya he publicado todo en PROD para el cliente'}, {action:'EXECUTE_PROD'}]){
  assert.equal(evaluateCandidate(t,JSON.stringify({...good,...delta})).accepted,false);
 }
 assert.equal(evaluateCandidate(t,'NO_JSON').accepted,false);
});