import test from 'node:test';
import assert from 'node:assert/strict';
import { episodeMetrics, aggregateConversationMetrics } from '../human-intelligence/evaluation/conversation-metrics-v1.mjs';

function episode(transcript,real=true){return {real_cerebro_actor:real,completion_reason:'BASELINE_THREE_TURNS',transcript};}

test('episode metrics detect duplicate replies ignored concerns and ontology leaks',()=>{
  const e=episode([
    {human:'Hola',actor:'Respuesta uno',observed_event:'CLEAR_PROPORTIONATE_EXPLANATION',revealed_facts:[]},
    {human:'Concreta',actor:'Respuesta uno',observed_event:'IGNORED_CONCERN',revealed_facts:[]},
    {human:'UNDECLARED_FINANCIAL_OBLIGATION',actor:'Respuesta dos',observed_event:'USEFUL_QUESTION',revealed_facts:[{fact_id:'HF-1',type:'UNDECLARED_FINANCIAL_OBLIGATION'}]}
  ]);
  const m=episodeMetrics(e);
  assert.equal(m.actor_turns,3);
  assert.equal(m.duplicate_consecutive_actor_replies,1);
  assert.equal(m.ignored_concern_count,1);
  assert.equal(m.useful_question_count,1);
  assert.equal(m.hidden_facts_revealed,1);
  assert.equal(m.ontology_leaks,1);
  assert.equal(m.signal_repeated_exact_turns,1);
});

test('multi-label signals can score question grounding explanation and concern acknowledgement on the same turn',()=>{
  const e=episode([
    {
      human:'La última vez salió mal y ahora desconfío un poco.',
      actor:'Entiendo que vayas con cuidado. Una mala experiencia anterior cambia lo que necesitas verificar antes de decidir. ¿Qué fue exactamente lo que salió mal?',
      observed_event:'USEFUL_QUESTION',
      revealed_facts:[]
    }
  ]);
  const m=episodeMetrics(e);
  assert.equal(m.signal_question_turns,1);
  assert.equal(m.signal_grounding_turns,1);
  assert.equal(m.signal_clear_explanation_turns,1);
  assert.equal(m.signal_human_concern_turns,1);
  assert.equal(m.signal_acknowledged_concern_turns,1);
  assert.equal(m.signal_question_budget_ok_turns,1);
  assert.equal(m.signal_ignored_concern_turns,0);
});

test('aggregate multi-label rates are independent from the single simulator transition event',()=>{
  const e=episode([
    {
      human:'No me termina de cuadrar y sigo dudando.',
      actor:'Veo que la explicación anterior no te ha dejado una decisión clara. Vamos a reducirlo a una sola cosa porque así podemos verificar qué falta. ¿Qué te preocupa más ahora mismo?',
      observed_event:'USEFUL_QUESTION',
      revealed_facts:[]
    },
    {
      human:'Voy con prisa, dime qué hago ahora.',
      actor:'Voy al punto. ¿Necesitas que te diga el siguiente paso o el dato que falta?',
      observed_event:'USEFUL_QUESTION',
      revealed_facts:[]
    }
  ]);
  const m=aggregateConversationMetrics([e],{baselineLabel:'NEW_TEST'});
  assert.equal(m.useful_question_rate,1);
  assert.equal(m.signal_question_rate,1);
  assert.equal(m.signal_grounding_rate,1);
  assert.ok(m.signal_clear_explanation_rate>=0.5);
  assert.equal(m.signal_acknowledged_concern_rate,1);
  assert.equal(m.signal_question_budget_ok_rate,1);
  assert.equal(m.signal_ignored_concern_rate,0);
});

test('aggregate metrics preserve fail-closed safety and real actor rate',()=>{
  const episodes=[
    episode([{human:'A',actor:'X',observed_event:'USEFUL_QUESTION',revealed_facts:[]}],true),
    episode([{human:'B',actor:'Y',observed_event:'GROUNDING_CONFIRMATION',revealed_facts:[]}],false)
  ];
  const m=aggregateConversationMetrics(episodes,{baselineLabel:'OLD_TEST'});
  assert.equal(m.episodes_total,2);
  assert.equal(m.episodes_verified_real_actor,1);
  assert.equal(m.verified_real_actor_rate,0.5);
  assert.equal(m.actor_turns_total,2);
  assert.equal(m.useful_question_rate,0.5);
  assert.deepEqual(m.safety,{prod_write_authorized:false,prod_execution_enabled:false,customer_data:false,trading_access:false,additional_cost_eur:0});
});

test('aggregate requires at least one episode',()=>{
  assert.throws(()=>aggregateConversationMetrics([]),/episodes_required/);
});
