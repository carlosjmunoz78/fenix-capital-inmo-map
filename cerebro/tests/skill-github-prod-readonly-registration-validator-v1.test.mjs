import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {validateGitHubReadonlyAdvisoryRegistry,resolveGitHubReadonlyAdvisoryEntry} from '../skills/skill-github-prod-readonly-registration-validator-v1.mjs';
import {validateObsidianReadonlyAdvisoryRegistry} from '../skills/skill-obsidian-prod-readonly-registration-validator-v1.mjs';
import {validateSkillCreatorReadonlyAdvisoryRegistry} from '../skills/skill-creator-prod-readonly-registration-validator-v1.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const REGISTRY=JSON.parse(fs.readFileSync(path.join(ROOT,'cerebro/registry/autonomous-readonly-skills.v1.json'),'utf8'));
const clone=value=>JSON.parse(JSON.stringify(value));

test('Manejo seguro de GitHub PROD read-only advisory is exact and fail-closed',()=>{
  const verdict=validateGitHubReadonlyAdvisoryRegistry(REGISTRY);
  assert.equal(verdict.green,true);
  assert.deepEqual(verdict.errors,[]);
  assert.equal(verdict.entry.status,'ACTIVE_READONLY_ADVISORY');
  assert.deepEqual(verdict.entry.allowed_capabilities,['REPOSITORY_METADATA_READ_ADVISORY','MAIN_REF_READ_ADVISORY']);
  assert.equal(verdict.entry.safety.prod_write,false);
  assert.equal(verdict.entry.safety.github_write,false);
  assert.equal(verdict.entry.safety.additional_cost_eur,0);
  assert.equal(verdict.entry.mutation_gate,'HIGH_RISK');
});

test('resolver exposes only the governed GitHub read-only advisory entry',()=>{
  const resolved=resolveGitHubReadonlyAdvisoryEntry(REGISTRY,'github');
  assert.equal(resolved.enabled,true);
  assert.equal(resolved.reason,'ACTIVE_READONLY_ADVISORY');
  assert.equal(resolved.entry.technical_id,'github');
  const missing=resolveGitHubReadonlyAdvisoryEntry(REGISTRY,'github-write');
  assert.equal(missing.enabled,false);
  assert.equal(missing.reason,'NOT_REGISTERED');
});

test('GitHub registration preserves Obsidian and Fábrica inteligente de skills contracts',()=>{
  const obsidian=validateObsidianReadonlyAdvisoryRegistry(REGISTRY);
  assert.equal(obsidian.green,true);
  assert.deepEqual(obsidian.errors,[]);
  const creator=validateSkillCreatorReadonlyAdvisoryRegistry(REGISTRY);
  assert.equal(creator.green,true);
  assert.deepEqual(creator.errors,[]);
});

test('registry rejects any GitHub mutation authority expansion',()=>{
  const unsafe=clone(REGISTRY);
  unsafe.entries.github.safety.github_write=true;
  unsafe.entries.github.safety.merge=true;
  unsafe.entries.github.safety.push=true;
  unsafe.entries.github.safety.issue_or_pr_mutation=true;
  unsafe.entries.github.safety.workflow_dispatch=true;
  unsafe.entries.github.activation.github_write_authorized=true;
  const verdict=validateGitHubReadonlyAdvisoryRegistry(unsafe);
  assert.equal(verdict.green,false);
  assert.ok(verdict.errors.includes('ENTRY_SAFETY_GITHUB_WRITE_NOT_FALSE'));
  assert.ok(verdict.errors.includes('ENTRY_SAFETY_MERGE_NOT_FALSE'));
  assert.ok(verdict.errors.includes('ENTRY_SAFETY_PUSH_NOT_FALSE'));
  assert.ok(verdict.errors.includes('ENTRY_SAFETY_ISSUE_OR_PR_MUTATION_NOT_FALSE'));
  assert.ok(verdict.errors.includes('ENTRY_SAFETY_WORKFLOW_DISPATCH_NOT_FALSE'));
  assert.ok(verdict.errors.includes('ACTIVATION_GITHUB_WRITE_NOT_FALSE'));
});

test('registry rejects data, credential, direct-tool or external-code authority',()=>{
  const unsafe=clone(REGISTRY);
  unsafe.entries.github.safety.direct_tool_execution=true;
  unsafe.entries.github.safety.customer_data=true;
  unsafe.entries.github.safety.prod_data=true;
  unsafe.entries.github.safety.credentials_exposed=true;
  unsafe.entries.github.safety.external_skill_code_execution=true;
  const verdict=validateGitHubReadonlyAdvisoryRegistry(unsafe);
  assert.equal(verdict.green,false);
  assert.ok(verdict.errors.includes('ENTRY_SAFETY_DIRECT_TOOL_EXECUTION_NOT_FALSE'));
  assert.ok(verdict.errors.includes('ENTRY_SAFETY_CUSTOMER_DATA_NOT_FALSE'));
  assert.ok(verdict.errors.includes('ENTRY_SAFETY_PROD_DATA_NOT_FALSE'));
  assert.ok(verdict.errors.includes('ENTRY_SAFETY_CREDENTIALS_EXPOSED_NOT_FALSE'));
  assert.ok(verdict.errors.includes('ENTRY_SAFETY_EXTERNAL_SKILL_CODE_EXECUTION_NOT_FALSE'));
});

test('registry rejects any read capability beyond the two physically proven observations',()=>{
  const unsafe=clone(REGISTRY);
  unsafe.entries.github.allowed_capabilities.push('PULL_REQUEST_READ_ADVISORY');
  const verdict=validateGitHubReadonlyAdvisoryRegistry(unsafe);
  assert.equal(verdict.green,false);
  assert.ok(verdict.errors.includes('CAPABILITIES_SCOPE_MISMATCH'));
});

test('registry rejects drift in immutable FULL SAFE PREPROD or PROD canary evidence',()=>{
  const unsafe=clone(REGISTRY);
  unsafe.entries.github.full_safe_preprod_evidence.artifact_digest='sha256:bad-full';
  unsafe.entries.github.prod_canary_evidence.artifact_digest='sha256:bad-canary';
  unsafe.entries.github.prod_canary_evidence.observed_main_sha='0'.repeat(40);
  const verdict=validateGitHubReadonlyAdvisoryRegistry(unsafe);
  assert.equal(verdict.green,false);
  assert.ok(verdict.errors.includes('FULL_SAFE_PREPROD_EVIDENCE_MISMATCH'));
  assert.ok(verdict.errors.includes('CANARY_EVIDENCE_MISMATCH'));
});

test('registry rejects canary scope expansion beyond GET repository metadata and main ref',()=>{
  const unsafe=clone(REGISTRY);
  unsafe.entries.github.prod_canary_evidence.allowed_http_methods=['GET','POST'];
  unsafe.entries.github.prod_canary_evidence.allowed_observations.push('PULL_REQUESTS');
  const verdict=validateGitHubReadonlyAdvisoryRegistry(unsafe);
  assert.equal(verdict.green,false);
  assert.ok(verdict.errors.includes('CANARY_READONLY_METHOD_SCOPE_MISMATCH'));
  assert.ok(verdict.errors.includes('CANARY_OBSERVATION_SCOPE_MISMATCH'));
});

test('registry rejects standing registration scope expansion',()=>{
  const unsafe=clone(REGISTRY);
  unsafe.entries.github.registration_basis.scope='autonomous_github_write';
  const verdict=validateGitHubReadonlyAdvisoryRegistry(unsafe);
  assert.equal(verdict.green,false);
  assert.ok(verdict.errors.includes('REGISTRATION_SCOPE_MISMATCH'));
});
