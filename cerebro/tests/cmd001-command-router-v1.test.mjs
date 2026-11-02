import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyCmd001,CMD001_CONTRACT_V1} from '../runtime/cmd001-command-router-v1.mjs';
const ctx={company_id:'fenix',engine_id:'CMD-001',environment:'PREPROD',version:'1.0.0'};
const route=message=>classifyCmd001({message,context:ctx,user_id:'carlos',permissions:['cerebro:read','cerebro:command']});

test('maps canonical intents rules-first and delegates to ORCH without executing',()=>{
  const cases=[
    ['dime el estado de los motores','STATUS'],['analiza este expediente','ANALYSIS'],['ejecuta esta tarea','ACTION'],
    ['cambiar regla de publicación','RULE_CHANGE'],['abre la pantalla de motores','NAVIGATION'],['qué motores faltan','QUERY'],['crear nueva empresa Sevilla','COMPANY_CREATE']
  ];
  for(const [msg,intent] of cases){const r=route(msg);assert.equal(r.intent,intent);assert.equal(r.route_target,'ORCH-001');assert.equal(r.execute,false);assert.equal(r.company_id,'fenix');}
  assert.equal(CMD001_CONTRACT_V1.additional_cost_eur,0);
});

test('is deterministic and flags genuinely ambiguous commands as LOW_CONFIDENCE',()=>{
  const a=route('haz lo de antes');const b=route('haz lo de antes');
  assert.deepEqual(a,b);assert.equal(a.confidence,0.55);assert.equal(a.human_required,'LOW_CONFIDENCE');assert.match(a.correlation_id,/^cmd-/);
});

test('fails closed on invalid context, empty command and PROD',()=>{
  assert.throws(()=>classifyCmd001({message:'estado',context:{...ctx,company_id:''},user_id:'u',permissions:[]}),/INVALID_CONTEXT/);
  assert.throws(()=>classifyCmd001({message:' ',context:ctx,user_id:'u',permissions:[]}),/EMPTY_COMMAND/);
  assert.throws(()=>classifyCmd001({message:'estado',context:{...ctx,environment:'PROD'},user_id:'u',permissions:[]}),/PROD_ROUTE_DENIED/);
});
