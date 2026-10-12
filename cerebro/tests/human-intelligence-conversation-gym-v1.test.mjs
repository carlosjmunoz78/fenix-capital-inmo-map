import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSyntheticHuman } from '../human-intelligence/lab/synthetic-human-population.mjs';
import { revealedFactUtterance, nextSyntheticHumanUtterance, assertNoOntologyLeak } from '../human-intelligence/lab/synthetic-human-utterance.mjs';
import { observeActorBehavior, observeActorSignals } from '../human-intelligence/evaluation/behavior-observer-v1.mjs';
import { runConversation } from '../human-intelligence/lab/conversation-harness.mjs';

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

test('scenario semantic facts become domain-coherent natural language without leaking semantic keys',()=>{
  const profile=generateSyntheticHuman('multi-semantic',{scenario_domain:'multiempresa'});
  const fact={type:'UNSTATED_CONSTRAINT',semantic_key:'MULTI_LEGACY_STACK_MUST_SURVIVE'};
  const text=revealedFactUtterance(fact,profile,2);
  assert.match(text,/web|crm|automatizaciones|sistemas actuales/i);
  assert.equal(text.includes('MULTI_LEGACY_STACK_MUST_SURVIVE'),false);
  assert.doesNotThrow(()=>assertNoOntologyLeak(text));
});

test('next synthetic turn varies by dynamic human state without exposing private keys',()=>{
  const profile=generateSyntheticHuman('dynamic-turn-test');
  profile.private_state.internal_state.friction=0.9;
  const text=nextSyntheticHumanUtterance({profile,turn:2,lastActorText:'respuesta'});
  assert.match(text,/resolviendo|vueltas|punto/i);
  const serialized=JSON.stringify(text);
  for(const key of ['private_state','hidden_facts','reveal_rules','internal_state','semantic_key','scenario_domain']) assert.equal(serialized.includes(key),false);
});

test('conversation harness uses scenario domain privately and never exposes semantic ontology to actor or transcript',async()=>{
  const actorInputs=[];
  const episode=await runConversation({
    seed:'multi-harness-domain',
    scenario:{scenario_id:'MULTI-COMPANY',initial_human_utterance:'Vamos a dar de alta una empresa nueva en CEREBRO.'},
    actorAdapter:async input=>{actorInputs.push(input);return '¿Qué sistema actual no podemos romper durante el alta?';},
    behaviorObserver:async()=> 'USEFUL_QUESTION',
    outcomeEvaluator:async({transcript})=>({complete:transcript.length>=2,reason:'TEST_COMPLETE'}),
    maxTurns:2
  });
  const publicPayload=JSON.stringify({actorInputs,transcript:episode.transcript});
  for(const forbidden of ['semantic_key','scenario_domain','MULTI_LEGACY_STACK_MUST_SURVIVE','MULTI_ADMIN_ACCESS_MISSING','MULTI_MIGRATION_WINDOW_CONSTRAINT']){
    assert.equal(publicPayload.includes(forbidden),false,`${forbidden} leaked to actor/public transcript`);
  }
  assert.equal(episode.transcript.some(turn=>/pr[eé]stamo|financiaci[oó]n mensual/i.test(turn.human)),false);
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

test('multi-signal observer can recognize grounding explanation and question simultaneously',()=>{
  const signals=observeActorSignals({actor_text:'Entiendo que vayas con cuidado. Esa cuota puede afectar al endeudamiento porque cambia tus obligaciones mensuales. ¿Cuánto pagas al mes?',human_message:'Tengo una deuda y me preocupa que afecte.',history:[]});
  assert.equal(signals.asks_question,true);
  assert.equal(signals.grounding,true);
  assert.equal(signals.clear_explanation,true);
  assert.equal(signals.human_concern,true);
  assert.equal(signals.acknowledges_concern,true);
});
