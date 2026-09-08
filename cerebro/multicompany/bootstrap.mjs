import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REGISTRY_PATH = path.resolve(__dirname, '../registry/multicompany-bootstrap.json');
const REGISTRY = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));

const ENGINE_IDS = new Set(REGISTRY.engines.map(e => e.engine_id));
const HUMAN_REQUIRED_REASONS = new Set(REGISTRY.human_required_reasons);
const TYPED_ARRAY_BUFFER_GETTER = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Uint8Array.prototype), 'buffer')?.get;
const DATA_VIEW_BUFFER_GETTER = Object.getOwnPropertyDescriptor(DataView.prototype, 'buffer')?.get;

function requiredString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${label} must be a non-empty string`);
  return value;
}

function intrinsicViewBuffer(value) {
  const getter = value instanceof DataView ? DATA_VIEW_BUFFER_GETTER : TYPED_ARRAY_BUFFER_GETTER;
  if (typeof getter !== 'function') throw new TypeError('unsupported ArrayBuffer view');
  return getter.call(value);
}

function rejectSharedMemory(value, seen = new WeakSet()) {
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) return;
  if (typeof SharedArrayBuffer !== 'undefined' && value instanceof SharedArrayBuffer) {
    throw new TypeError('SharedArrayBuffer is not supported by Phase 4 V0');
  }
  if (ArrayBuffer.isView(value)) {
    const ownBuffer = Object.getOwnPropertyDescriptor(value, 'buffer');
    if (ownBuffer?.get || ownBuffer?.set) throw new TypeError('accessor properties are not supported by Phase 4 V0');
    const buffer = intrinsicViewBuffer(value);
    if (typeof SharedArrayBuffer !== 'undefined' && buffer instanceof SharedArrayBuffer) {
      throw new TypeError('SharedArrayBuffer-backed views are not supported by Phase 4 V0');
    }
    return;
  }
  if (value instanceof ArrayBuffer) return;
  if (seen.has(value)) return;
  seen.add(value);
  if (value instanceof Map) {
    Map.prototype.forEach.call(value, (v, k) => {
      rejectSharedMemory(k, seen);
      rejectSharedMemory(v, seen);
    });
    return;
  }
  if (value instanceof Set) {
    Set.prototype.forEach.call(value, v => rejectSharedMemory(v, seen));
    return;
  }
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor) continue;
    if (descriptor.get || descriptor.set) throw new TypeError('accessor properties are not supported by Phase 4 V0');
    rejectSharedMemory(descriptor.value, seen);
  }
}

function clone(value) {
  rejectSharedMemory(value);
  const cloned = structuredClone(value);
  rejectSharedMemory(cloned);
  return cloned;
}

function assertPreprod(environment) {
  if (environment !== 'PREPROD') throw new Error('Phase 4 V0 requires PREPROD environment');
}

function validateRegistry() {
  if (REGISTRY.engines.length !== 17) throw new Error('Phase 4 registry must contain exactly 17 canonical engines');
  if (ENGINE_IDS.size !== 17) throw new Error('Phase 4 registry contains duplicate engine ids');
  for (const engine of REGISTRY.engines) {
    for (const dep of engine.depends_on) {
      if (!ENGINE_IDS.has(dep)) throw new Error(`${engine.engine_id} depends on unknown engine ${dep}`);
    }
  }
  if (REGISTRY.policy.prod_execution_enabled === true || REGISTRY.prod_execution_enabled === true) throw new Error('Phase 4 V0 cannot enable PROD execution');
  return true;
}

function companyContext({ company_id, environment = 'PREPROD', version = '0.1.0' }) {
  assertPreprod(environment);
  return Object.freeze({
    company_id: requiredString(company_id, 'company_id'),
    environment,
    version: requiredString(version, 'version')
  });
}

export class MultiCompanyBootstrap {
  #companies = new Map();

  constructor({ environment = 'PREPROD', version = '0.1.0' } = {}) {
    validateRegistry();
    assertPreprod(environment);
    this.environment = environment;
    this.version = requiredString(version, 'version');
  }

  registerCompany({ company_id, profile = {} }) {
    const context = companyContext({ company_id, environment: this.environment, version: this.version });
    if (this.#companies.has(context.company_id)) return { accepted: false, duplicate: true, company: this.inspectCompany(context.company_id) };
    const safeProfile = clone(profile);
    const engines = Object.fromEntries(REGISTRY.engines.map(engine => [engine.engine_id, {
      engine_id: engine.engine_id,
      state: engine.engine_id === 'COMP-REG-001' ? 'READY' : 'BLOCKED',
      evidence: [],
      human_required: null,
      dependencies: [...engine.depends_on]
    }]));
    const company = {
      context: { ...context },
      profile: safeProfile,
      state: 'REGISTERED_PREPROD',
      prod_execution_enabled: false,
      supabase_writes: false,
      autonomous_prod: false,
      engines
    };
    this.#companies.set(context.company_id, company);
    this.#refresh(context.company_id);
    return { accepted: true, duplicate: false, company: clone(company) };
  }

  inspectCompany(company_id) {
    const id = requiredString(company_id, 'company_id');
    const company = this.#companies.get(id);
    if (!company) throw new Error('company not registered');
    return clone(company);
  }

  listCompanies() {
    return [...this.#companies.keys()].sort();
  }

  markEngineResult({ company_id, engine_id, status, evidence = [], reason = null }) {
    const id = requiredString(company_id, 'company_id');
    const eid = requiredString(engine_id, 'engine_id');
    const company = this.#companies.get(id);
    if (!company) throw new Error('company not registered');
    if (!ENGINE_IDS.has(eid)) throw new Error('unknown Phase 4 engine');
    const node = company.engines[eid];
    if (!['READY', 'RUNNING'].includes(node.state)) throw new Error(`engine ${eid} is not ready`);

    if (status === 'HUMAN_REQUIRED') {
      if (!HUMAN_REQUIRED_REASONS.has(reason)) throw new Error('invalid HUMAN_REQUIRED reason');
      const safeEvidence = clone(evidence);
      node.state = 'HUMAN_REQUIRED';
      node.human_required = reason;
      node.evidence = safeEvidence;
    } else if (status === 'SUCCESS') {
      const safeEvidence = clone(evidence);
      node.state = 'GREEN';
      node.human_required = null;
      node.evidence = safeEvidence;
    } else {
      throw new Error('status must be SUCCESS or HUMAN_REQUIRED');
    }
    this.#refresh(id);
    return this.inspectCompany(id);
  }

  startEngine({ company_id, engine_id }) {
    const id = requiredString(company_id, 'company_id');
    const eid = requiredString(engine_id, 'engine_id');
    const company = this.#companies.get(id);
    if (!company) throw new Error('company not registered');
    if (!ENGINE_IDS.has(eid)) throw new Error('unknown Phase 4 engine');
    const node = company.engines[eid];
    if (node.state !== 'READY') throw new Error(`engine ${eid} is not ready`);
    node.state = 'RUNNING';
    return clone(node);
  }

  nextReady(company_id) {
    const company = this.inspectCompany(company_id);
    return REGISTRY.engines
      .filter(engine => company.engines[engine.engine_id].state === 'READY')
      .sort((a, b) => a.stage - b.stage || a.engine_id.localeCompare(b.engine_id))
      .map(engine => engine.engine_id);
  }

  canPromote(company_id) {
    const company = this.inspectCompany(company_id);
    const allGreen = REGISTRY.engines.every(engine => company.engines[engine.engine_id].state === 'GREEN');
    return { allowed: false, reason: allGreen ? 'PROD_PROMOTION_NOT_IMPLEMENTED_V0' : 'PHASE4_NOT_ALL_GREEN', all_green: allGreen };
  }

  #refresh(company_id) {
    const company = this.#companies.get(company_id);
    for (const engine of REGISTRY.engines) {
      const node = company.engines[engine.engine_id];
      if (['GREEN', 'RUNNING', 'HUMAN_REQUIRED'].includes(node.state)) continue;
      const depsGreen = engine.depends_on.every(dep => company.engines[dep].state === 'GREEN');
      node.state = depsGreen ? 'READY' : 'BLOCKED';
    }
  }
}

export function getPhase4Registry() {
  validateRegistry();
  return clone(REGISTRY);
}

export const PHASE4_CONTRACT = Object.freeze({
  environment: 'PREPROD',
  engine_count: 17,
  additional_cost_target_eur: 0,
  cross_company_access: 'deny',
  prod_execution_enabled: false,
  supabase_writes: false,
  autonomous_prod: false,
  trading_access: false,
  ai_required: false
});
