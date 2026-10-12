import test from 'node:test';
import assert from 'node:assert/strict';

import {
  advanceLongitudinalSession,
  applyObservableEvent,
  contract,
  coverageSignature,
  generateSyntheticHuman,
  inferSyntheticScenarioDomain,
  publicActorView
} from '../human-intelligence/lab/synthetic-human-population.mjs';
import {
  selectNextPopulationEpisode,
  updateCoverageLedger
} from '../human-intelligence/lab/population-scheduler.mjs';

test('same seed produces the same complete private synthetic human', () => {
  const a = generateSyntheticHuman('seed-001');
  const b = generateSyntheticHuman('seed-001');
  assert.deepEqual(a, b);
});

test('population is procedural rather than a fixed archetype list', () => {
  const signatures = new Set();
  for (let i = 0; i < 250; i += 1) {
    signatures.add(coverageSignature(generateSyntheticHuman(`population-${i}`)));
  }
  assert.ok(signatures.size >= 220, `expected broad procedural diversity, got ${signatures.size}`);
  assert.equal(contract().raw_cartesian_space_minimum, 3600000000);
});

test('scenario domain inference keeps finance legal SEO platform and multiempresa distinct', () => {
  assert.equal(inferSyntheticScenarioDomain({scenario_id:'FIN-DEBT',initial_human_utterance:'Tengo otra cuota de un préstamo.'}),'finance');
  assert.equal(inferSyntheticScenarioDomain({scenario_id:'LEGAL-ARRAS',initial_human_utterance:'Voy a firmar arras.'}),'legal');
  assert.equal(inferSyntheticScenarioDomain({scenario_id:'SEO-START',initial_human_utterance:'Quiero revisar la indexación.'}),'seo');
  assert.equal(inferSyntheticScenarioDomain({scenario_id:'PLATFORM-ARCH',initial_human_utterance:'No quiero meter todo en Supabase.'}),'platform');
  assert.equal(inferSyntheticScenarioDomain({scenario_id:'MULTI-COMPANY',initial_human_utterance:'Vamos a dar de alta una empresa nueva.'}),'multiempresa');
});

test('domain-aware hidden facts are coherent and do not inject finance ontology into multiempresa', () => {
  const multi=generateSyntheticHuman('coherent-multi',{scenario_domain:'multiempresa'});
  assert.equal(multi.private_state.scenario_domain,'multiempresa');
  assert.ok(multi.private_state.hidden_facts.length>=1);
  for(const fact of multi.private_state.hidden_facts){
    assert.match(fact.semantic_key,/^MULTI_/);
    assert.notEqual(fact.type,'UNDECLARED_FINANCIAL_OBLIGATION');
  }

  const finance=generateSyntheticHuman('coherent-finance',{scenario_domain:'finance'});
  for(const fact of finance.private_state.hidden_facts) assert.match(fact.semantic_key,/^FIN_/);
});

test('actor view cannot read private goals hidden facts semantic keys scenario domain misbeliefs reveal rules or internal state', () => {
  const profile = generateSyntheticHuman('secret-separation',{scenario_domain:'finance'});
  const actor = publicActorView(profile);
  const serialized = JSON.stringify(actor);

  assert.equal('private_state' in actor, false);
  for (const forbidden of ['private_goal', 'hidden_facts', 'semantic_key', 'scenario_domain', 'misbeliefs', 'reveal_rules', 'internal_state']) {
    assert.equal(serialized.includes(forbidden), false, `${forbidden} leaked into actor view`);
  }
});

test('observable actor behavior changes the human internal state deterministically', () => {
  const original = generateSyntheticHuman('dynamic-001');
  const afterUseful = applyObservableEvent(original, 'USEFUL_QUESTION');
  const afterPressure = applyObservableEvent(original, 'UNNECESSARY_PRESSURE');

  assert.ok(afterUseful.private_state.internal_state.trust >= original.private_state.internal_state.trust);
  assert.ok(afterUseful.private_state.internal_state.friction <= original.private_state.internal_state.friction);
  assert.ok(afterPressure.private_state.internal_state.trust <= original.private_state.internal_state.trust);
  assert.ok(afterPressure.private_state.internal_state.friction >= original.private_state.internal_state.friction);

  assert.deepEqual(
    applyObservableEvent(original, 'USEFUL_QUESTION'),
    applyObservableEvent(original, 'USEFUL_QUESTION')
  );
});

test('unsupported state transition fails closed', () => {
  const profile = generateSyntheticHuman('unsupported-event');
  assert.throws(() => applyObservableEvent(profile, 'READ_MIND'), /unsupported_transition_event/);
});

test('longitudinal sessions preserve bounded history while resetting turn-local observations', () => {
  const profile = generateSyntheticHuman('longitudinal-001');
  profile.longitudinal_state.commitments.push('send-document');
  profile.observable_state.explicit_corrections.push('wrong-date');

  const next = advanceLongitudinalSession(profile, 'Client will send the document tomorrow.', ['send-document']);
  assert.equal(next.longitudinal_state.session_index, 2);
  assert.deepEqual(next.longitudinal_state.commitments, ['send-document']);
  assert.deepEqual(next.longitudinal_state.pending_items, ['send-document']);
  assert.equal(next.longitudinal_state.last_interaction_summary, 'Client will send the document tomorrow.');
  assert.deepEqual(next.observable_state.explicit_corrections, []);
});

test('LAB safety invariants remain immutable on generated humans', () => {
  const profile = generateSyntheticHuman('safety-001');
  assert.equal(profile.environment, 'LAB');
  assert.equal(profile.engine_id, 'SIM-001');
  assert.deepEqual(profile.safety, {
    contains_customer_data: false,
    contains_secrets: false,
    prod_authorized: false,
    prod_write_authorized: false,
    prod_promotion_authorized: false,
    trading_access: false,
    additional_cost_eur: 0
  });
});

test('coverage scheduler prefers an unvisited cell over a heavily saturated equivalent candidate set', () => {
  const seeds = ['coverage-a', 'coverage-b', 'coverage-c'];
  const profiles = seeds.map(seed => generateSyntheticHuman(seed, { strategy: 'COVERAGE' }));
  let ledger = {};

  for (let i = 0; i < 20; i += 1) {
    ledger = updateCoverageLedger(ledger, profiles[0], { failed: false, regression: false });
  }

  const next = selectNextPopulationEpisode({ seeds, ledger, strategy: 'COVERAGE' });
  assert.notEqual(next.key, coverageSignature(profiles[0]));
});
