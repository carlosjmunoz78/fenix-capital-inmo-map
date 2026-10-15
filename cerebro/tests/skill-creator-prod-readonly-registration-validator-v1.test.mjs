import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {validateSkillCreatorReadonlyAdvisoryRegistry,resolveSkillCreatorReadonlyAdvisoryEntry} from '../skills/skill-creator-prod-readonly-registration-validator-v1.mjs';
import {validateObsidianReadonlyAdvisoryRegistry} from '../skills/skill-obsidian-prod-readonly-registration-validator-v1.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const REGISTRY=JSON.parse(fs.readFileSync(path.join(ROOT,'cerebro/registry/autonomous-readonly-skills.v1.json'),'utf8'));
const clone=value=>JSON.parse(JSON.stringify(value));

test('Fábrica inteligente de skills PROD read-only advisory is active, exact and fail-closed',()=>{
  const verdict=validateSkillCreatorReadonlyAdvisoryRegistry(REGISTRY);
  assert.equal(verdict.green,true);
  assert.deepEqual(verdict.errors,[]);
  assert.equal(verdict.entry.status,'ACTIVE_READONLY_ADVISORY');
  assert.equal(verdict.entry.environment,'PROD_READONLY_ADVISORY');
  assert.equal(verdict.entry.safety.prod_write,false);
  assert.equal(verdict.entry.safety.github_write,false);
  assert.equal(verdict.entry.safety.direct_tool_execution,false);
  assert.equal(verdict.entry.safety.additional_cost_eur,0);
  assert.equal(verdict.entry.mutation_gate,'HIGH_RISK');
});

test('resolver exposes only registered Skill Creator read-only advisory entry',()=>{
  const resolved=resolveSkillCreatorReadonlyAdvisoryEntry(REGISTRY,'skill-creator');
  assert.equal(resolved.enabled,true);
  assert.equal(resolved.reason,'ACTIVE_READONLY_ADVISORY');
  assert.equal(resolved.entry.technical_id,'skill-creator');
  assert.deepEqual(resolved.entry.allowed_capabilities,['SKILL_CREATION_DESIGN_ADVISORY','SKILL_REPAIR_DESIGN_ADVISORY']);
  const missing=resolveSkillCreatorReadonlyAdvisoryEntry(REGISTRY,'github');
  assert.equal(missing.enabled,false);
  assert.equal(missing.reason,'NOT_REGISTERED');
});

test('registration preserves the existing Obsidian PROD read-only advisory contract',()=>{
  const verdict=validateObsidianReadonlyAdvisoryRegistry(REGISTRY);
  assert.equal(verdict.green,true);
  assert.deepEqual(verdict.errors,[]);
  assert.equal(verdict.entry.technical_id,'obsidian');
});

test('registry rejects any PROD or GitHub mutation authority expansion',()=>{
  const unsafe=clone(REGISTRY);
  unsafe.entries['skill-creator'].safety.prod_write=true;
  unsafe.entries['skill-creator'].safety.github_write=true;
  unsafe.entries['skill-creator'].activation.prod_write_authorized=true;
  unsafe.entries['skill-creator'].activation.github_write_authorized=true;
  const verdict=validateSkillCreatorReadonlyAdvisoryRegistry(unsafe);
  assert.equal(verdict.green,false);
  assert.ok(verdict.errors.includes('ENTRY_SAFETY_PROD_WRITE_NOT_FALSE'));
  assert.ok(verdict.errors.includes('ENTRY_SAFETY_GITHUB_WRITE_NOT_FALSE'));
  assert.ok(verdict.errors.includes('ACTIVATION_PROD_WRITE_NOT_FALSE'));
  assert.ok(verdict.errors.includes('ACTIVATION_GITHUB_WRITE_NOT_FALSE'));
});

test('registry rejects direct-tool, customer/prod data or external-code authority',()=>{
  const unsafe=clone(REGISTRY);
  unsafe.entries['skill-creator'].safety.direct_tool_execution=true;
  unsafe.entries['skill-creator'].safety.customer_data=true;
  unsafe.entries['skill-creator'].safety.prod_data=true;
  unsafe.entries['skill-creator'].safety.external_skill_code_execution=true;
  const verdict=validateSkillCreatorReadonlyAdvisoryRegistry(unsafe);
  assert.equal(verdict.green,false);
  assert.ok(verdict.errors.includes('ENTRY_SAFETY_DIRECT_TOOL_EXECUTION_NOT_FALSE'));
  assert.ok(verdict.errors.includes('ENTRY_SAFETY_CUSTOMER_DATA_NOT_FALSE'));
  assert.ok(verdict.errors.includes('ENTRY_SAFETY_PROD_DATA_NOT_FALSE'));
  assert.ok(verdict.errors.includes('ENTRY_SAFETY_EXTERNAL_SKILL_CODE_EXECUTION_NOT_FALSE'));
});

test('registry rejects altered immutable PREPROD or canary evidence',()=>{
  const unsafe=clone(REGISTRY);
  unsafe.entries['skill-creator'].preprod_evidence.artifact_digest='sha256:bad-preprod';
  unsafe.entries['skill-creator'].prod_canary_evidence.artifact_digest='sha256:bad-canary';
  const verdict=validateSkillCreatorReadonlyAdvisoryRegistry(unsafe);
  assert.equal(verdict.green,false);
  assert.ok(verdict.errors.includes('PREPROD_EVIDENCE_MISMATCH'));
  assert.ok(verdict.errors.includes('CANARY_EVIDENCE_MISMATCH'));
});

test('registry rejects capability expansion beyond the two proven advisory fixtures',()=>{
  const unsafe=clone(REGISTRY);
  unsafe.entries['skill-creator'].allowed_capabilities.push('DIRECT_TOOL_EXECUTION');
  const verdict=validateSkillCreatorReadonlyAdvisoryRegistry(unsafe);
  assert.equal(verdict.green,false);
  assert.ok(verdict.errors.includes('CAPABILITIES_SCOPE_MISMATCH'));
});

test('registry rejects registration outside the standing read-only authorization scope',()=>{
  const unsafe=clone(REGISTRY);
  unsafe.entries['skill-creator'].registration_basis.scope='autonomous_prod_write';
  const verdict=validateSkillCreatorReadonlyAdvisoryRegistry(unsafe);
  assert.equal(verdict.green,false);
  assert.ok(verdict.errors.includes('REGISTRATION_SCOPE_MISMATCH'));
});
