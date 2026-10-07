import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeCandidateOverlap,
  analyzeDiscoveryOverlap,
  buildCandidateText,
  scoreDomains
} from '../skills/skill-overlap-analyzer.mjs';

const index = {
  known_upstreams: ['acme/already-used'],
  domains: [
    {domain_id: 'seo-search-content', engine_bindings: ['SEO-001', 'KW-001'], keywords: ['seo', 'keyword', 'search']},
    {domain_id: 'browser-automation-scraping', engine_bindings: ['AUTO-001', 'QA-001'], keywords: ['browser', 'playwright', 'automation']},
    {domain_id: 'agent-ai-orchestration', engine_bindings: ['ORCH-001', 'FACT-001'], keywords: ['agent', 'skills', 'mcp']}
  ]
};

test('buildCandidateText combines source slug and resolved repo metadata', () => {
  const text = buildCandidateText(
    {source_ref: 'https://directory.test/skills/seo-audit'},
    {full_name: 'acme/seo-tool', name: 'seo-tool', description: 'Keyword search auditor', topics: ['seo'], language: 'TypeScript'}
  );
  assert.match(text, /seo audit/);
  assert.match(text, /keyword search auditor/);
});

test('scoreDomains maps candidate semantics to existing engine domains', () => {
  const result = scoreDomains('seo keyword search audit', index);
  assert.equal(result[0].domain_id, 'seo-search-content');
  assert.deepEqual(result[0].engine_bindings, ['SEO-001', 'KW-001']);
});

test('existing domain produces wrap-or-extend disposition without claiming duplicate', () => {
  const result = analyzeCandidateOverlap(
    {candidate_id: 'c1', source_ref: 'https://directory/skills/playwright-helper', primary_upstream_hint: 'https://github.com/acme/browser'},
    {full_name: 'acme/browser', head_commit: 'abc', license_spdx: 'MIT', archived: false, disabled: false, description: 'Browser automation with Playwright'},
    index
  );
  assert.equal(result.overlap_state, 'EXISTING_DOMAIN_OVERLAP');
  assert.equal(result.disposition, 'WRAP_OR_EXTEND_EXISTING_DOMAIN');
  assert.ok(result.suggested_engine_bindings.includes('AUTO-001'));
  assert.equal(result.executed, false);
});

test('known upstream is exact reuse candidate', () => {
  const result = analyzeCandidateOverlap(
    {candidate_id: 'c2', source_ref: 'https://directory/skills/x', primary_upstream_hint: 'https://github.com/acme/already-used'},
    {full_name: 'acme/already-used', head_commit: 'abc', license_spdx: 'MIT', archived: false, disabled: false},
    index
  );
  assert.equal(result.overlap_state, 'EXACT_KNOWN_UPSTREAM');
  assert.equal(result.disposition, 'DEDUP_REUSE_EXISTING');
});

test('unknown semantic area remains capability gap candidate', () => {
  const result = analyzeCandidateOverlap(
    {candidate_id: 'c3', source_ref: 'https://directory/skills/quantum-hardware'},
    {full_name: 'acme/quantum', head_commit: 'abc', license_spdx: 'MIT', archived: false, disabled: false, description: 'Quantum hardware calibration'},
    index
  );
  assert.equal(result.overlap_state, 'CAPABILITY_GAP_CANDIDATE');
  assert.equal(result.disposition, 'GAP_REVIEW_REQUIRED');
});

test('quality flags surface archived and incomplete license metadata', () => {
  const result = analyzeCandidateOverlap(
    {candidate_id: 'c4', source_ref: 'https://directory/skills/agent'},
    {full_name: 'acme/agent', head_commit: null, license_spdx: 'NOASSERTION', archived: true, disabled: false, description: 'Agent skills'},
    index
  );
  assert.ok(result.quality_flags.includes('UPSTREAM_ARCHIVED'));
  assert.ok(result.quality_flags.includes('LICENSE_METADATA_INCOMPLETE'));
  assert.ok(result.quality_flags.includes('HEAD_COMMIT_UNRESOLVED'));
});

test('full report keeps candidate attribution and never executes code', () => {
  const discovery = {results: [{candidates: [{
    candidate_id: 'c5', source_ref: 'https://directory/skills/seo', primary_upstream_hint: 'https://github.com/acme/seo'
  }]}]};
  const upstreams = {results: [{
    status: 'RESOLVED', full_name: 'acme/seo', head_commit: 'abc', license_spdx: 'MIT', archived: false, disabled: false,
    description: 'SEO keyword tooling', discovery_candidate_ids: ['c5']
  }]};
  const report = analyzeDiscoveryOverlap(discovery, upstreams, index);
  assert.equal(report.candidates_total, 1);
  assert.equal(report.overlap_counts.EXISTING_DOMAIN_OVERLAP, 1);
  assert.equal(report.code_executed, false);
});
