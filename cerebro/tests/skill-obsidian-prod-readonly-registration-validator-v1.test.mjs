import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {validateObsidianReadonlyAdvisoryRegistry,resolveReadonlyAdvisoryEntry} from '../skills/skill-obsidian-prod-readonly-registration-validator-v1.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const REGISTRY=JSON.parse(fs.readFileSync(path.join(ROOT,'cerebro/registry/autonomous-readonly-skills.v1.json'),'utf8'));
const clone=value=>JSON.parse(JSON.stringify(value));

test('Obsidian PROD read-only advisory registry is active, exact and fail-closed',()=>{
  const verdict=validateObsidianReadonlyAdvisoryRegistry(REGISTRY);
  assert.equal(verdict.green,true);
  assert.deepEqual(verdict.errors,[]);
  assert.equal(verdict.entry.status,'ACTIVE_READONLY_ADVISORY');
  assert.equal(verdict.entry.environment,'PROD_READONLY_ADVISORY');
  assert.equal(verdict.entry.safety.prod_write,false);
  assert.equal(verdict.entry.safety.real_vault_used,false);
  assert.equal(verdict.entry.safety.additional_cost_eur,0);
  assert.equal(verdict.entry.mutation_gate,'HIGH_RISK');
});

test('resolver exposes only registered Obsidian read-only advisory entry',()=>{
  const resolved=resolveReadonlyAdvisoryEntry(REGISTRY,'obsidian');
  assert.equal(resolved.enabled,true);
  assert.equal(resolved.reason,'ACTIVE_READONLY_ADVISORY');
  assert.equal(resolved.entry.technical_id,'obsidian');
  assert.deepEqual(resolved.entry.allowed_capabilities,['KNOWLEDGE_READ_SEARCH_ADVISORY','KNOWLEDGE_LINK_ANALYSIS_ADVISORY']);
  const missing=resolveReadonlyAdvisoryEntry(REGISTRY,'github');
  assert.equal(missing.enabled,false);
  assert.equal(missing.reason,'NOT_REGISTERED');
});

test('registry rejects any PROD write authority expansion',()=>{
  const unsafe=clone(REGISTRY);
  unsafe.entries.obsidian.safety.prod_write=true;
  unsafe.entries.obsidian.activation.prod_write_authorized=true;
  const verdict=validateObsidianReadonlyAdvisoryRegistry(unsafe);
  assert.equal(verdict.green,false);
  assert.ok(verdict.errors.includes('ENTRY_SAFETY_PROD_WRITE_NOT_FALSE'));
  assert.ok(verdict.errors.includes('ACTIVATION_PROD_WRITE_NOT_FALSE'));
  const resolved=resolveReadonlyAdvisoryEntry(unsafe,'obsidian');
  assert.equal(resolved.enabled,false);
  assert.equal(resolved.reason,'REGISTRY_VALIDATION_FAILED');
});

test('registry rejects real vault, canonical migration or external code authority',()=>{
  const unsafe=clone(REGISTRY);
  unsafe.entries.obsidian.safety.real_vault_used=true;
  unsafe.entries.obsidian.safety.canonical_knowledge_migration=true;
  unsafe.entries.obsidian.safety.external_skill_code_execution=true;
  const verdict=validateObsidianReadonlyAdvisoryRegistry(unsafe);
  assert.equal(verdict.green,false);
  assert.ok(verdict.errors.includes('ENTRY_SAFETY_REAL_VAULT_USED_NOT_FALSE'));
  assert.ok(verdict.errors.includes('ENTRY_SAFETY_CANONICAL_KNOWLEDGE_MIGRATION_NOT_FALSE'));
  assert.ok(verdict.errors.includes('ENTRY_SAFETY_EXTERNAL_SKILL_CODE_EXECUTION_NOT_FALSE'));
});

test('registry rejects altered immutable canary evidence',()=>{
  const unsafe=clone(REGISTRY);
  unsafe.entries.obsidian.prod_canary_evidence.artifact_digest='sha256:bad';
  const verdict=validateObsidianReadonlyAdvisoryRegistry(unsafe);
  assert.equal(verdict.green,false);
  assert.ok(verdict.errors.includes('CANARY_EVIDENCE_MISMATCH'));
});

test('registry rejects capability expansion beyond proven read-only advisory operations',()=>{
  const unsafe=clone(REGISTRY);
  unsafe.entries.obsidian.allowed_capabilities.push('VAULT_WRITE');
  const verdict=validateObsidianReadonlyAdvisoryRegistry(unsafe);
  assert.equal(verdict.green,false);
  assert.ok(verdict.errors.includes('CAPABILITIES_SCOPE_MISMATCH'));
});
