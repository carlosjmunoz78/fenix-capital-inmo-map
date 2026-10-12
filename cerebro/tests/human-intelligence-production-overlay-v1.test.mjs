import test from 'node:test';
import assert from 'node:assert/strict';
import { applyProductionConversationOverlayV1,PRODUCTION_CONVERSATION_OVERLAY_V1_CONTRACT } from '../human-intelligence/integration/production-conversation-overlay-v1.mjs';

test('action and confirmation semantics pass through byte-for-byte logically unchanged',()=>{
  const upstream={status:'ACTION_PROPOSAL',intent:'seo_zone_activation',executed:false,action:{id:'A1'},message:'Propuesta exacta. ¿Quieres que active exactamente este proceso?'};
  const out=applyProductionConversationOverlayV1({user_message:'hazlo',upstream,history:[]});
  assert.deepEqual(out.response,upstream);
  assert.equal(out.overlay.applied,false);
  assert.equal(out.overlay.reason,'PROTECTED_OR_NONPASSIVE');
});

test('observable concern adds grounding but preserves authoritative factual reply verbatim',()=>{
  const upstream={status:'OK',intent:'finance_knowledge',executed:false,message:'Una cuota mensual existente puede afectar a la capacidad de endeudamiento; el efecto concreto depende del caso.'};
  const out=applyProductionConversationOverlayV1({user_message:'Tengo otra financiación mensual y me preocupa que esto salga mal otra vez',upstream,history:[]});
  assert.equal(out.overlay.applied,true);
  assert.ok(out.response.message.includes(upstream.message));
  assert.equal(out.response.human_intelligence.authoritative_message,upstream.message);
  assert.equal(out.response.human_intelligence.authoritative_preserved,true);
  assert.equal(out.response.human_intelligence.prod_authority_changed,false);
  assert.equal(out.overlay.questions_added,1);
});

test('does not add a second question when canonical upstream already asks one',()=>{
  const upstream={status:'OK',intent:'finance_knowledge',executed:false,message:'La cuota puede afectar. ¿Cuál es el importe mensual?'};
  const out=applyProductionConversationOverlayV1({user_message:'Sigo perdido y no lo entiendo',upstream,history:[]});
  assert.equal(out.overlay.applied,true);
  assert.equal(out.overlay.questions_added,0);
  assert.equal((out.response.message.match(/\?/g)??[]).length,1);
  assert.ok(out.response.message.includes(upstream.message));
});

test('repetition repair preserves factual answer and asks at most one useful repair question',()=>{
  const canonical='La documentación debe revisarse antes de dar la operación por viable.';
  const out=applyProductionConversationOverlayV1({user_message:'No me resuelve',upstream:{status:'OK',intent:'knowledge',executed:false,message:canonical},history:[{role:'cerebro',text:canonical}]});
  assert.equal(out.overlay.applied,true);
  assert.ok(out.response.message.includes(canonical));
  assert.equal(out.overlay.questions_added,1);
  assert.match(out.response.message,/concreto|repetir|factual/i);
});

test('normal passive reply remains unchanged when no human signal justifies overlay',()=>{
  const upstream={status:'OK',intent:'marketing_strategy',executed:false,message:'La estrategia prioriza crecimiento orgánico y reutilización de activos antes de gasto nuevo.',sources:[{id:'x'}]};
  const out=applyProductionConversationOverlayV1({user_message:'Cuál es la estrategia de marketing',upstream,history:[]});
  assert.deepEqual(out.response,upstream);
  assert.equal(out.overlay.applied,false);
});

test('explicit next-step request may add exactly one bounded question without changing facts',()=>{
  const upstream={status:'OK',intent:'finance_knowledge',executed:false,message:'Para valorar una hipoteca hay que revisar ingresos, obligaciones, ahorro y precio de compra.'};
  const out=applyProductionConversationOverlayV1({user_message:'Qué dato necesitas saber de mí para la hipoteca',upstream,history:[]});
  assert.equal(out.overlay.applied,true);
  assert.equal(out.overlay.reason,'NEXT_BEST_QUESTION');
  assert.equal(out.overlay.questions_added,1);
  assert.ok(out.response.message.includes(upstream.message));
});

test('contract changes no authority and adds no paid dependency',()=>{
  assert.equal(PRODUCTION_CONVERSATION_OVERLAY_V1_CONTRACT.action_semantics,'PASS_THROUGH_UNCHANGED');
  assert.equal(PRODUCTION_CONVERSATION_OVERLAY_V1_CONTRACT.max_added_questions,1);
  assert.equal(PRODUCTION_CONVERSATION_OVERLAY_V1_CONTRACT.prod_authority_changed,false);
  assert.equal(PRODUCTION_CONVERSATION_OVERLAY_V1_CONTRACT.additional_cost_eur,0);
});
