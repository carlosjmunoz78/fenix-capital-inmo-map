import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assessEvidenceFreshness,
  governEvidenceClaim,
  resolveCompanyReadAliases
} from '../marketing/channel-intelligence-evidence-governance-v1.mjs';

test('legacy FENIX_CAPITAL is a read alias only for canonical fenix-capital', () => {
  const scope = resolveCompanyReadAliases('fenix-capital');
  assert.equal(scope.canonical_company_id, 'fenix-capital');
  assert.deepEqual(scope.accepted_read_aliases, ['fenix-capital', 'FENIX_CAPITAL']);
  assert.equal(scope.write_company_id, 'fenix-capital');
  assert.equal(scope.legacy_alias_write_allowed, false);
});

test('freshness policy blocks stale competitor evidence from current decisions', () => {
  const now = Date.parse('2026-10-21T14:41:00.000Z');
  const result = assessEvidenceFreshness({
    watch_type: 'COMPETITOR_RADAR',
    observed_at: '2026-10-03T07:43:59.782Z',
    now_ms: now
  });
  assert.equal(result.freshness_state, 'EXPIRED');
  assert.equal(result.usable_for_current_decision, false);
  assert.equal(result.hard_block_current_claim, true);
});

test('own performance cannot prove a platform trend', () => {
  const result = governEvidenceClaim({
    claim_type: 'PLATFORM_TREND',
    channel_id: 'instagram',
    sources: [{
      source_id: 'source:meta:own',
      source_family: 'SOCIAL_OWN_PERFORMANCE',
      provider: 'Meta',
      fresh: true
    }]
  });
  assert.equal(result.allowed, false);
  assert.match(result.reason, /NOT_PLATFORM_TREND_PROOF/);
});

test('platform trend requires fresh public platform trend evidence', () => {
  const result = governEvidenceClaim({
    claim_type: 'PLATFORM_TREND',
    channel_id: 'youtube',
    sources: [{
      source_id: 'source:youtube:popular',
      source_family: 'SOCIAL_PUBLIC_TRENDS',
      provider: 'YouTube',
      fresh: true
    }]
  });
  assert.equal(result.allowed, true);
});

test('cross-platform trend requires independent evidence groups', () => {
  const one = governEvidenceClaim({
    claim_type: 'CROSS_PLATFORM_TREND',
    sources: [
      {source_id:'a', source_family:'SEARCH_PUBLIC_TRENDS', provider:'Google Trends', independent_group:'google', fresh:true}
    ]
  });
  assert.equal(one.allowed, false);

  const two = governEvidenceClaim({
    claim_type: 'CROSS_PLATFORM_TREND',
    sources: [
      {source_id:'a', source_family:'SEARCH_PUBLIC_TRENDS', provider:'Google Trends', independent_group:'google-trends', fresh:true},
      {source_id:'b', source_family:'SEARCH_DEMAND', provider:'Google Search Console', independent_group:'gsc-first-party-demand', fresh:true}
    ]
  });
  assert.equal(two.allowed, true);
  assert.equal(two.independent_source_groups, 2);
});

test('competitor claim requires fresh public competitor evidence', () => {
  const invalid = governEvidenceClaim({
    claim_type: 'COMPETITOR_SIGNAL',
    sources: [{source_id:'own', source_family:'SOCIAL_OWN_PERFORMANCE', provider:'Meta', fresh:true}]
  });
  assert.equal(invalid.allowed, false);

  const valid = governEvidenceClaim({
    claim_type: 'COMPETITOR_SIGNAL',
    sources: [{source_id:'public', source_family:'PUBLIC_COMPETITOR_OBSERVATION', provider:'Public Web', fresh:true}]
  });
  assert.equal(valid.allowed, true);
});
