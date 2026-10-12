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
