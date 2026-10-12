import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSyntheticHuman } from '../human-intelligence/lab/synthetic-human-population.mjs';
import { revealedFactUtterance, nextSyntheticHumanUtterance, assertNoOntologyLeak } from '../human-intelligence/lab/synthetic-human-utterance.mjs';
import { observeActorBehavior } from '../human-intelligence/evaluation/behavior-observer-v1.mjs';

const FACT_TYPES=['UNSTATED_CONSTRAINT','PRIOR_BAD_EXPERIENCE','MISSING_DOCUMENT','CONFLICTING_COMMITMENT','UNDECLARED_FINANCIAL_OBLIGATION','PRIVATE_DECISION_CRITERION','THIRD_PARTY_DEPENDENCY','PREVIOUS_CONTRADICTORY_ADVICE'];

test('revealed hidden facts become natural language and never ontology labels',()=>{
  const profile=generateSyntheticHuman('natural-fact-test');
  for(const type of FACT_TYPES){
    const text=revealedFactUtterance({type},profile,2);
    assert.ok(text.length>20);
    assert.equal(text.includes(type),false);
    assert.doesNotThrow(()=>assertNoOntologyLeak(text));
  }
});

test('next synthetic turn varies by dynamic human state without exposing private keys',()=>{
  const profile=generateSyntheticHuman('dynamic-turn-test');
  profile.private_state.internal_state.friction=0.9;
  const text=nextSyntheticHumanUtterance({profile,turn:2,lastActorText:'respuesta'});
  assert.match(text,/resolviendo|vueltas|punto/i);
  const serialized=JSON.stringify(text);
  for(const key of ['private_state','hidden_facts','reveal_rules','internal_state']) assert.equal(serialized.includes(key),false);
});

test('independent observer flags verbatim repeated answer as ignored concern',()=>{
  const answer='En financiación puedo ayudarte con preanálisis, documentación y bancos.';
  const event=observeActorBehavior({actor_text:answer,human_message:'Necesito que me lo concretes.',history:[{human:'Tengo dudas sobre la hipoteca.',actor:answer}]});
  assert.equal(event,'IGNORED_CONCERN');
});

test('independent observer recognizes a useful question',()=>{
  const event=observeActorBehavior({actor_text:'¿Qué cuota mensual estás pagando ahora mismo?',human_message:'Tengo otra financiación.',history:[]});
  assert.equal(event,'USEFUL_QUESTION');
});
