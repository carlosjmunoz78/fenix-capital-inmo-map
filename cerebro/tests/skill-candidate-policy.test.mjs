import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCandidatePolicyReport} from '../skills/skill-candidate-policy.mjs';

function fixture({
  sourceId = 'mcpservers-agent-skills',
  candidateId = 'c1',
  license = 'MIT',
  archived = false,
  flags = [],
  overlapState = 'EXISTING_DOMAIN_OVERLAP',
  manifestStatus = 'MANIFEST_RESOLVED_STATIC_ONLY'
} = {}) {
  const discovery = {results: [{source_id: sourceId, candidates: [{
    candidate_id: candidateId,
    source_ref: `https://directory.test/skills/${candidateId}`,
    primary_upstream_hint: sourceId === 'fragroger-skills' ? null : 'https://github.com/acme/skill'
  }]}]};
  const upstreams = {results: sourceId === 'fragroger-skills' ? [] : [{
    status: 'RESOLVED', full_name: 'acme/skill', head_commit: 'abc123', license_spdx: license,
    archived, disabled: false, discovery_candidate_ids: [candidateId]
  }]};
  const overlap = {candidates: [{
    candidate_id: candidateId,
    overlap_state: overlapState,
    top_domains: [{domain_id: 'agent-ai-orchestration'}],
    suggested_engine_bindings: ['ORCH-001', 'FACT-001']
  }]};
  const manifests = {results: [{
    candidate_id: candidateId,
    status: manifestStatus,
    manifest_path: 'skills/x/SKILL.md',
    upstream_head_commit: 'abc123',
    sha256: '0'.repeat(64),
    static_flags: flags
  }]};
  return {discovery, upstreams, overlap, manifests};
}

function only(options) {
  const f = fixture(options);
  return buildCandidatePolicyReport(f.discovery, f.upstreams, f.overlap, f.manifests).results[0];
}

test('safe permissive metadata candidate reaches LAB review but is never install-authorized', () => {
  const item = only();
  assert.equal(item.disposition, 'LAB_REVIEW_CANDIDATE');
  assert.equal(item.priority, 'P0');
  assert.equal(item.install_authorized, false);
  assert.equal(item.prod_authorized, false);
  assert.equal(item.license_compatibility, 'NOT_FINAL_LEGAL_DETERMINATION');
});

test('FragRoger remains reference-only independent of apparent fit', () => {
  const item = only({sourceId: 'fragroger-skills'});
  assert.equal(item.disposition, 'REFERENCE_ONLY');
  assert.equal(item.gate, 'SOURCE_LICENSE_POLICY');
});

test('archived upstream is quarantined', () => {
  assert.equal(only({archived: true}).disposition, 'QUARANTINE_ARCHIVED');
});

test('critical prohibited behavior is rejected', () => {
  const item = only({flags: ['CAPTCHA_BYPASS_TERMS']});
  assert.equal(item.disposition, 'REJECTED_SECURITY_POLICY');
  assert.equal(item.gate, 'SECURITY_GATE');
});

test('shell pipe execution requires security review', () => {
  const item = only({flags: ['SHELL_PIPE_EXEC']});
  assert.equal(item.disposition, 'QUARANTINE_SECURITY_REVIEW');
});

test('secret access mention requires permission review, not automatic rejection', () => {
  const item = only({flags: ['SECRET_ACCESS_MENTION']});
  assert.equal(item.disposition, 'PERMISSION_REVIEW_REQUIRED');
});

test('missing or non-permissive license metadata does not pass license gate', () => {
  assert.equal(only({license: null}).disposition, 'LICENSE_REVIEW_REQUIRED');
  assert.equal(only({license: 'GPL-3.0'}).disposition, 'LICENSE_REVIEW_REQUIRED');
});

test('unresolved manifest remains quarantined', () => {
  assert.equal(only({manifestStatus: 'SKILL_MD_AMBIGUOUS'}).disposition, 'QUARANTINE');
});

test('semantic gap cannot create an engine automatically', () => {
  const item = only({overlapState: 'CAPABILITY_GAP_CANDIDATE'});
  assert.equal(item.disposition, 'GAP_REVIEW_REQUIRED');
  assert.equal(item.install_authorized, false);
});

test('report exposes counts and never authorizes install or PROD', () => {
  const f = fixture();
  const report = buildCandidatePolicyReport(f.discovery, f.upstreams, f.overlap, f.manifests);
  assert.equal(report.disposition_counts.LAB_REVIEW_CANDIDATE, 1);
  assert.equal(report.lab_review_candidates, 1);
  assert.equal(report.install_authorized, false);
  assert.equal(report.prod_authorized, false);
});
