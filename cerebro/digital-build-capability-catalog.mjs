import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_CATALOG = path.join(HERE, 'factory', 'catalogs', 'digital-build-capabilities.v0.json');
const DEFAULT_REGISTRY = path.join(HERE, 'registry', 'engine-registry.seed.json');
const REQUIRED_CONTEXT = ['company_id', 'engine_id', 'environment', 'version'];
const ALLOWED_STATUS = new Set(['SCAFFOLD', 'DEFINED_NOT_BUILT']);
const SEMVER = /^\d+\.\d+\.\d+$/;

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function assertPlainObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`);
}

function canonicalEngineIds(registry) {
  assertPlainObject(registry, 'registry');
  if (!Array.isArray(registry.engine_ids)) throw new Error('registry engine_ids required');
  if (registry.count !== 177 || registry.engine_ids.length !== 177) throw new Error('canonical registry must contain exactly 177 engine IDs');
  for (const engineId of registry.engine_ids) {
    if (typeof engineId !== 'string' || engineId.length === 0) throw new Error('registry engine_ids must be non-empty strings');
  }
  const ids = new Set(registry.engine_ids);
  if (ids.size !== 177) throw new Error('canonical registry must contain 177 unique engine IDs');
  return ids;
}

export function loadDigitalBuildCatalog(file = DEFAULT_CATALOG) {
  return readJson(file);
}

export function validateDigitalBuildCatalog({ catalog = loadDigitalBuildCatalog(), registry = readJson(DEFAULT_REGISTRY) } = {}) {
  assertPlainObject(catalog, 'catalog');
  if (catalog.owner_engine_id !== 'FACT-001') throw new Error('catalog owner_engine_id must be FACT-001');
  if (catalog.environment !== 'SCAFFOLD') throw new Error('catalog environment must be SCAFFOLD');
  if (catalog.autonomous_prod !== false) throw new Error('catalog autonomous_prod must be false');
  if (catalog.prod_writes !== false) throw new Error('catalog prod_writes must be false');
  if (catalog.trading_access !== false) throw new Error('catalog trading_access must be false');
  if (catalog.additional_cost_target_eur !== 0) throw new Error('catalog additional_cost_target_eur must be 0');
  if (!Array.isArray(catalog.required_context) || JSON.stringify(catalog.required_context) !== JSON.stringify(REQUIRED_CONTEXT)) {
    throw new Error('catalog required_context must be canonical');
  }
  if (!Array.isArray(catalog.capabilities) || catalog.capabilities.length === 0) throw new Error('catalog capabilities required');

  const canonicalIds = canonicalEngineIds(registry);
  const capabilityIds = new Set();
  const templateIds = new Set();
  const skillIds = new Set();

  for (const capability of catalog.capabilities) {
    assertPlainObject(capability, 'capability');
    if (typeof capability.capability_id !== 'string' || !capability.capability_id.startsWith('cap:')) throw new Error('invalid capability_id');
    if (capabilityIds.has(capability.capability_id)) throw new Error(`duplicate capability_id ${capability.capability_id}`);
    capabilityIds.add(capability.capability_id);
    if (!SEMVER.test(capability.version)) throw new Error(`invalid capability version ${capability.capability_id}`);
    if (!ALLOWED_STATUS.has(capability.status)) throw new Error(`unsafe capability status ${capability.capability_id}`);
    if (!Array.isArray(capability.engine_bindings) || capability.engine_bindings.length === 0) throw new Error(`engine_bindings required ${capability.capability_id}`);
    for (const engineId of capability.engine_bindings) {
      if (!canonicalIds.has(engineId)) throw new Error(`noncanonical engine binding ${engineId}`);
    }
    if (!Array.isArray(capability.templates) || capability.templates.length === 0) throw new Error(`templates required ${capability.capability_id}`);
    if (!Array.isArray(capability.skills) || capability.skills.length === 0) throw new Error(`skills required ${capability.capability_id}`);

    for (const template of capability.templates) {
      assertPlainObject(template, 'template');
      if (typeof template.template_id !== 'string' || !template.template_id.startsWith('tpl:')) throw new Error('invalid template_id');
      if (templateIds.has(template.template_id)) throw new Error(`duplicate template_id ${template.template_id}`);
      templateIds.add(template.template_id);
      if (!SEMVER.test(template.version)) throw new Error(`invalid template version ${template.template_id}`);
      if (template.enabled !== false || template.autonomous_prod !== false || template.prod_writes !== false || template.trading_access !== false) {
        throw new Error(`unsafe template defaults ${template.template_id}`);
      }
      if (template.additional_cost_target_eur !== 0) throw new Error(`nonzero cost target ${template.template_id}`);
    }

    for (const skill of capability.skills) {
      assertPlainObject(skill, 'skill');
      if (typeof skill.skill_id !== 'string' || !skill.skill_id.startsWith('skill:')) throw new Error('invalid skill_id');
      if (skillIds.has(skill.skill_id)) throw new Error(`duplicate skill_id ${skill.skill_id}`);
      skillIds.add(skill.skill_id);
      if (!SEMVER.test(skill.version)) throw new Error(`invalid skill version ${skill.skill_id}`);
      if (skill.execution !== 'DETERMINISTIC_FIRST') throw new Error(`unsafe skill execution ${skill.skill_id}`);
    }
  }

  return {
    capabilities: capabilityIds.size,
    templates: templateIds.size,
    skills: skillIds.size,
    canonical_engine_ids: canonicalIds.size,
  };
}

export function selectTemplate(capabilityId, { catalog = loadDigitalBuildCatalog() } = {}) {
  validateDigitalBuildCatalog({ catalog });
  const capability = catalog.capabilities.find((item) => item.capability_id === capabilityId);
  if (!capability) throw new Error(`unknown capability ${capabilityId}`);
  const candidates = capability.templates
    .filter((template) => template.enabled === false)
    .slice()
    .sort((a, b) => (a.priority - b.priority) || a.template_id.localeCompare(b.template_id));
  if (!candidates.length) throw new Error(`no safe template for ${capabilityId}`);
  return structuredClone(candidates[0]);
}
