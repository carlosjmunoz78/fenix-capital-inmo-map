import fs from 'node:fs/promises';

const registryPath = new URL('../cerebro/knowledge/creative-media-knowledge-registry-v1.json', import.meta.url);
const registry = JSON.parse(await fs.readFile(registryPath, 'utf8'));

const fail = (message) => { throw new Error(message); };
const assert = (condition, message) => { if (!condition) fail(message); };

assert(registry.registry_id === 'CEREBRO-CREATIVE-MEDIA-KNOWLEDGE-REGISTRY-V1', 'Unexpected registry_id');
assert(registry.status === 'ACTIVE_SHARED_KNOWLEDGE_REGISTRY', 'Registry is not active');
assert(/^[0-9a-f]{40}$/.test(registry.source_commit_sha || ''), 'source_commit_sha must be a 40-char SHA');
assert(Array.isArray(registry.authoritative_contracts) && registry.authoritative_contracts.length === 5, 'Expected exactly 5 authoritative creative knowledge contracts');
assert(new Set(registry.authoritative_contracts).size === registry.authoritative_contracts.length, 'Duplicate authoritative contracts');
assert(registry.authoritative_contracts.includes('knowledge/canva-license-hardening-2026-10-23.json'), 'Missing Canva license hardening seed');

const base = `https://raw.githubusercontent.com/${registry.source_repository}/${registry.source_commit_sha}/`;
const docs = new Map();
for (const path of registry.authoritative_contracts) {
  const response = await fetch(base + path);
  assert(response.ok, `Cannot fetch ${path}: HTTP ${response.status}`);
  const text = await response.text();
  let json;
  try { json = JSON.parse(text); } catch (error) { fail(`Invalid JSON in ${path}: ${error.message}`); }
  docs.set(path, json);
}

const master = docs.get('config/creative-media-knowledge-master-v1.json');
assert(master.contract_id === 'CEREBRO-CREATIVE-MEDIA-KNOWLEDGE-MASTER-V1', 'Master contract id mismatch');
assert(master.status === 'MANDATORY_TRANSVERSAL_CONTRACT', 'Creative master not mandatory');
assert(master.source_validation?.last_verified_at === '2026-10-23', 'Creative source validation date missing');
assert(master.tool_routing?.canva_voice_rule?.includes('NOT_DEFAULT'), 'Canva voice must not be default');
assert(master.licensing_baseline?.canva_license_hardening_required === true, 'Canva license hardening not required');
assert(master.licensing_baseline?.music_rights_must_be_checked_per_destination_and_use_case === true, 'Music rights destination check missing');
assert(master.qa_gates?.includes('FINAL_NATIVE_PREVIEW_QA'), 'Final native preview QA missing');
assert(master.qa_gates?.includes('LICENSE_PROVENANCE_QA'), 'License provenance QA missing');
assert(master.qa_gates?.includes('ACCESSIBILITY_QA'), 'Accessibility QA missing');
assert(master.knowledge_sources?.includes('knowledge/canva-license-hardening-2026-10-23.json'), 'Master does not load Canva license hardening');

const canva = docs.get('knowledge/canva-creative-knowledge-seed-2026-10-23.json');
assert(canva.seed_id === 'CEREBRO-CANVA-CREATIVE-KNOWLEDGE-SEED-2026-10-23', 'Canva seed id mismatch');
assert(Array.isArray(canva.knowledge?.resize_and_repurposing), 'Canonical Canva repurposing key missing');
assert(canva.legacy_aliases?.resize_and_repuposing === 'resize_and_repurposing', 'Canva legacy alias missing');
assert(canva.anti_patterns?.includes('USING_CANVA_VOICE_BY_DEFAULT_WITHOUT_COMPARISON'), 'Canva voice anti-pattern missing');
assert(canva.anti_patterns?.includes('ASSUMING_MAGIC_RESIZE_IS_NATIVE_ADAPTATION'), 'Magic Resize anti-pattern missing');

const hardening = docs.get('knowledge/canva-license-hardening-2026-10-23.json');
assert(hardening.status === 'OFFICIAL_SOURCE_VERIFIED', 'Canva license hardening not official-source verified');
assert(Array.isArray(hardening.rules) && hardening.rules.length >= 8, 'Canva license hardening rules incomplete');
assert(hardening.rules.some(r => r.id === 'CANVA-LIC-HARD-004'), 'Separate music licensing rule missing');
assert(hardening.rules.some(r => r.id === 'CANVA-LIC-HARD-005'), 'Online publication pixel constraint rule missing');

const platform = docs.get('knowledge/creative-platform-production-specs-2026-10-23.json');
assert(platform.seed_id === 'CEREBRO-CREATIVE-PLATFORM-PRODUCTION-SPECS-2026-10-23', 'Platform seed id mismatch');
assert(platform.cross_platform_repurposing_rule, 'Canonical cross-platform repurposing rule missing');
assert(platform.legacy_aliases?.cross_platform_repuposing_rule === 'cross_platform_repurposing_rule', 'Platform legacy alias missing');
for (const key of ['facebook_instagram','tiktok','youtube','linkedin','web_google']) {
  assert(platform.platforms?.[key], `Missing platform creative knowledge: ${key}`);
}

const accessibility = docs.get('knowledge/creative-accessibility-licensing-seed-2026-10-23.json');
assert(accessibility.seed_id === 'CEREBRO-CREATIVE-ACCESSIBILITY-LICENSING-SEED-2026-10-23', 'Accessibility seed id mismatch');
assert(accessibility.source_validation?.wcag_current_reference === 'WCAG_2_2', 'WCAG 2.2 validation missing');
assert(accessibility.qa_checklists?.video?.includes('CAPTIONS'), 'Video captions QA missing');
assert(accessibility.risk_policy?.unknown_license === 'BLOCK_OR_REPLACE', 'Unknown-license block policy missing');

console.log(JSON.stringify({
  status: 'GREEN',
  registry_id: registry.registry_id,
  source_commit_sha: registry.source_commit_sha,
  authoritative_contracts_checked: registry.authoritative_contracts.length,
  canva_voice_default: false,
  license_hardening: true,
  accessibility_qa: true,
  platform_native_qa: true,
  note: 'Static knowledge integrity only; runtime consumption remains a separate per-engine certification gate.'
}, null, 2));
