import fs from 'node:fs/promises';

const registryPath = new URL('../cerebro/knowledge/creative-media-knowledge-registry-v1.json', import.meta.url);
const registry = JSON.parse(await fs.readFile(registryPath, 'utf8'));

const fail = (message) => { throw new Error(message); };
const assert = (condition, message) => { if (!condition) fail(message); };

assert(registry.registry_id === 'CEREBRO-CREATIVE-MEDIA-KNOWLEDGE-REGISTRY-V1', 'Unexpected registry_id');
assert(registry.status === 'ACTIVE_SHARED_KNOWLEDGE_REGISTRY', 'Registry is not active');
assert(registry.scope === 'CEREBRO_OS_ALL_DEPARTMENTS', 'Unexpected registry scope');
assert(/^[0-9a-f]{40}$/.test(registry.source_commit_sha || ''), 'source_commit_sha must be a 40-char SHA');
assert(Array.isArray(registry.authoritative_contracts) && registry.authoritative_contracts.length === 5, 'Expected exactly 5 authoritative creative knowledge contracts');
assert(new Set(registry.authoritative_contracts).size === registry.authoritative_contracts.length, 'Duplicate authoritative contracts');
for (const path of [
  'config/creative-media-knowledge-master-v1.json',
  'knowledge/canva-creative-knowledge-seed-2026-10-23.json',
  'knowledge/canva-license-hardening-2026-10-23.json',
  'knowledge/creative-platform-production-specs-2026-10-23.json',
  'knowledge/creative-accessibility-licensing-seed-2026-10-23.json'
]) assert(registry.authoritative_contracts.includes(path), `Missing authoritative contract ${path}`);

const validation = registry.source_validation || {};
assert(validation.workflow === 'CEREBRO Creative Media Knowledge Integrity', 'Unexpected source validation workflow');
assert(Number.isInteger(validation.workflow_run_id) && validation.workflow_run_id > 0, 'Source validation run id missing');
assert(validation.conclusion === 'success', 'Source validation did not conclude success');
assert(validation.validated_commit_sha === registry.source_commit_sha, 'Pinned source SHA does not match source-validated SHA');
assert(validation.cross_repo_secret_required === false, 'Cross-repository secret must not be required');

assert(registry.governance?.knowledge_snapshot_pin_required === true, 'Knowledge snapshot pin must be required');
assert(registry.governance?.source_repo_must_validate_its_private_content === true, 'Private source repo validation must be required');
assert(registry.governance?.canonical_human_required_only === true, 'Canonical HUMAN_REQUIRED enforcement missing');
assert(registry.governance?.no_new_paid_subscription_by_default === true, 'Zero-additional-cost default missing');

for (const behavior of [
  'LOAD_CREATIVE_MEDIA_MASTER_BEFORE_HIGH_VALUE_CREATIVE_EXECUTION',
  'LOAD_CANVA_LICENSE_HARDENING_FOR_CANVA_LIBRARY_ASSETS',
  'USE_CANVA_AS_CREATIVE_WORKSPACE_WHEN_USEFUL_NOT_AS_DEFAULT_VOICE_PROVIDER',
  'PREFER_CEREBRO_OWN_OR_BEST_ALLOWED_ZERO_COST_EXPRESSIVE_VOICE',
  'RUN_BRAND_VISUAL_AUDIO_CAPTION_ACCESSIBILITY_LICENSE_AND_PLATFORM_QA',
  'PRESERVE_HIGH_QUALITY_SOURCE_MASTERS',
  'STORE_LICENSE_AND_ASSET_PROVENANCE',
  'APPLY_MOST_RESTRICTIVE_RELEVANT_CONTENT_LICENSE_CLASS',
  'CHECK_MUSIC_RIGHTS_SEPARATELY_FROM_VISUAL_ASSET_RIGHTS',
  'LEARN_FROM_FIRST_PARTY_CREATIVE_PERFORMANCE'
]) assert(registry.mandatory_behavior?.includes(behavior), `Missing mandatory behavior ${behavior}`);

console.log(JSON.stringify({
  status: 'GREEN',
  registry_id: registry.registry_id,
  source_repository: registry.source_repository,
  source_commit_sha: registry.source_commit_sha,
  source_validation_run_id: validation.workflow_run_id,
  source_validation_conclusion: validation.conclusion,
  authoritative_contracts_registered: registry.authoritative_contracts.length,
  cross_repo_secret_required: false,
  note: 'Core registry/pin integrity passed. Detailed private source content is validated by the source-repository CI recorded in source_validation. Runtime consumption remains a separate per-engine E2E certification gate.'
}, null, 2));
