import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REGISTRY_PATH = path.resolve(__dirname, '../registry/jarvis-project-registry.v1.json');
const AUDIT_INDEX_PATH = path.resolve(__dirname, '../audit/jarvis-audit-index.v1.json');
const BASE_REGISTRY = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
const BASE_AUDITS = JSON.parse(fs.readFileSync(AUDIT_INDEX_PATH, 'utf8'));

const PREPROD = 'PREPROD';
const ACTORS = new Set(['CARLOS', 'JARVIS']);
const STATUSES = new Set(['HECHO', 'EXISTENTE', 'PARCIAL', 'DEFINIDO', 'PLANIFICADO', 'POR_AUDITAR']);
const PROTECTED_AUTHORITY_FIELDS = new Set([
  'prod_authorized',
  'prod_write_authorized',
  'prod_mutation_authorized',
  'spend_authorized',
  'trading_access',
  'live_writes',
  'autonomous_prod'
]);

function requiredString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${label} must be a non-empty string`);
  return value.trim();
}

function safeClone(value) {
  return structuredClone(value);
}

function ensureArray(value, label) {
  if (!Array.isArray(value)) throw new TypeError(`${label} must be an array`);
  return value.map(item => typeof item === 'string' ? item.trim() : item);
}

function canonicalActor(actor) {
  const value = requiredString(actor, 'actor').toUpperCase();
  if (!ACTORS.has(value)) throw new Error('actor not authorized for Project Hub');
  return value;
}

function id(prefix, payload) {
  return `${prefix}_${crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 24)}`;
}

function appendJsonl(file, entry) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify(entry)}\n`, { encoding: 'utf8', mode: 0o600 });
}

function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line, index) => {
      try { return JSON.parse(line); }
      catch (error) { throw new Error(`Project Hub journal line ${index + 1} invalid: ${error.message}`); }
    });
}

function assertNoAuthorityEscalation(value, pathPrefix = '') {
  if (value === null || typeof value !== 'object') return;
  for (const [key, nested] of Object.entries(value)) {
    const pathName = pathPrefix ? `${pathPrefix}.${key}` : key;
    if (PROTECTED_AUTHORITY_FIELDS.has(key)) {
      if (nested !== false) throw new Error(`Project metadata cannot grant authority: ${pathName}`);
    }
    assertNoAuthorityEscalation(nested, pathName);
  }
}

function baseProject(raw) {
  return {
    company_id: BASE_REGISTRY.company_id,
    engine_id: 'PROJECT-001',
    environment: BASE_REGISTRY.environment,
    version: BASE_REGISTRY.version,
    ...safeClone(raw)
  };
}

function canonicalOrder(a, b) {
  const aOrder = Number.isFinite(a.order) ? a.order : Number.MAX_SAFE_INTEGER;
  const bOrder = Number.isFinite(b.order) ? b.order : Number.MAX_SAFE_INTEGER;
  if (aOrder !== bOrder) return aOrder - bOrder;
  return a.project_id.localeCompare(b.project_id);
}

function validateProject(project) {
  requiredString(project.project_id, 'project_id');
  requiredString(project.company_id, 'company_id');
  if (project.engine_id !== 'PROJECT-001') throw new Error('project engine_id must be PROJECT-001');
  if (project.environment !== PREPROD) throw new Error('Project Hub V1 requires PREPROD');
  requiredString(project.version, 'version');
  requiredString(project.title, 'title');
  if (!Number.isSafeInteger(project.order) || project.order < 0) throw new TypeError('order must be a non-negative safe integer');
  if (!STATUSES.has(project.status)) throw new Error('invalid project status');
  requiredString(project.owner, 'owner');
  ensureArray(project.editors, 'editors');
  requiredString(project.autonomy_state, 'autonomy_state');
  requiredString(project.objective, 'objective');
  ensureArray(project.subprojects, 'subprojects');
  ensureArray(project.dependencies, 'dependencies');
  ensureArray(project.audit_refs, 'audit_refs');
  requiredString(project.source, 'source');
  assertNoAuthorityEscalation(project);
  return project;
}

export class JarvisProjectHubV1 {
  #environment;
  #stateDir;
  #journal;
  #projects = new Map();
  #auditEvidence;
  #auditSummary;
  #auditSummaryRevisions;

  constructor({ environment = PREPROD, state_dir = path.resolve(process.cwd(), '.cerebro-project-hub') } = {}) {
    if (environment !== PREPROD) throw new Error('Project Hub V1 requires PREPROD');
    this.#environment = environment;
    this.#stateDir = path.resolve(state_dir);
    this.#journal = path.join(this.#stateDir, 'project-revisions.jsonl');

    for (const raw of BASE_REGISTRY.projects) {
      const project = validateProject(baseProject(raw));
      this.#projects.set(project.project_id, project);
    }

    this.#auditEvidence = safeClone(BASE_AUDITS.immutable_evidence || []);
    this.#auditSummary = safeClone(BASE_AUDITS.current_summary);
    this.#auditSummaryRevisions = safeClone(BASE_AUDITS.summary_revisions || []);
    this.#replayJournal();
  }

  get environment() { return this.#environment; }
  get state_dir() { return this.#stateDir; }
  get journal_path() { return this.#journal; }

  listProjects({ company_id = BASE_REGISTRY.company_id } = {}) {
    const company = requiredString(company_id, 'company_id');
    return [...this.#projects.values()]
      .filter(project => project.company_id === company)
      .sort(canonicalOrder)
      .map(safeClone);
  }

  getProject(project_id) {
    const project = this.#projects.get(requiredString(project_id, 'project_id'));
    if (!project) throw new Error('project not found');
    return safeClone(project);
  }

  createProject({ actor, project }) {
    const by = canonicalActor(actor);
    if (!project || typeof project !== 'object' || Array.isArray(project)) throw new TypeError('project must be an object');
    assertNoAuthorityEscalation(project);
    const projectId = requiredString(project.project_id, 'project.project_id');
    if (this.#projects.has(projectId)) throw new Error('project already exists');
    if (projectId === 'PRJ-AUDITORIAS' || /^PRJ-\d{3}$/.test(projectId)) throw new Error('canonical project IDs are reserved');

    const maxOrder = Math.max(...[...this.#projects.values()].map(item => item.order), 18);
    const candidate = validateProject({
      company_id: BASE_REGISTRY.company_id,
      engine_id: 'PROJECT-001',
      environment: PREPROD,
      version: 'v1',
      title: requiredString(project.title, 'project.title'),
      order: Number.isSafeInteger(project.order) ? project.order : maxOrder + 1,
      status: project.status || 'PLANIFICADO',
      owner: project.owner || 'CARLOS',
      editors: project.editors || ['CARLOS', 'JARVIS'],
      autonomy_state: project.autonomy_state || 'ACTIVE',
      objective: project.objective || 'Pendiente de definición.',
      subprojects: project.subprojects || [],
      dependencies: project.dependencies || [],
      audit_refs: project.audit_refs || ['PRJ-AUDITORIAS'],
      last_reconciled_at: new Date().toISOString(),
      source: project.source || `CREATED_BY_${by}`,
      project_id: projectId
    });

    this.#commit({ type: 'PROJECT_CREATED', actor: by, project: candidate });
    this.#projects.set(projectId, candidate);
    return safeClone(candidate);
  }

  updateProject({ actor, project_id, patch }) {
    const by = canonicalActor(actor);
    const projectId = requiredString(project_id, 'project_id');
    const current = this.#projects.get(projectId);
    if (!current) throw new Error('project not found');
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new TypeError('patch must be an object');
    assertNoAuthorityEscalation(patch);

    const immutable = new Set(['project_id', 'company_id', 'engine_id', 'environment', 'version']);
    for (const key of Object.keys(patch)) if (immutable.has(key)) throw new Error(`immutable project field: ${key}`);

    const next = validateProject({
      ...safeClone(current),
      ...safeClone(patch),
      last_reconciled_at: new Date().toISOString()
    });
    if (next.company_id !== current.company_id) throw new Error('cross-company project edit denied');

    this.#commit({ type: 'PROJECT_UPDATED', actor: by, project_id: projectId, before: current, after: next });
    this.#projects.set(projectId, next);
    return safeClone(next);
  }

  listAudits() {
    return safeClone({
      current_summary: this.#auditSummary,
      immutable_evidence: this.#auditEvidence,
      summary_revisions: this.#auditSummaryRevisions,
      categories: BASE_AUDITS.categories
    });
  }

  recordAudit({ actor, category, summary, evidence_refs = [], evidence = null }) {
    const by = canonicalActor(actor);
    const auditCategory = requiredString(category, 'category');
    const text = requiredString(summary, 'summary');
    const refs = ensureArray(evidence_refs, 'evidence_refs');
    const now = new Date().toISOString();

    let evidenceRecord = null;
    if (evidence !== null) {
      if (typeof evidence !== 'object' || Array.isArray(evidence)) throw new TypeError('evidence must be an object or null');
      assertNoAuthorityEscalation(evidence);
      evidenceRecord = {
        evidence_id: id('audit', [auditCategory, text, evidence, now]),
        recorded_at: now,
        source: `PROJECT_HUB_${by}`,
        category: auditCategory,
        summary: text,
        evidence: safeClone(evidence)
      };
    }

    const nextRevision = Number(this.#auditSummary?.revision || 0) + 1;
    const nextSummary = { revision: nextRevision, updated_at: now, updated_by: by, text };
    const revision = { revision: nextRevision, updated_at: now, updated_by: by, reason: `AUDIT_RECONCILIATION:${auditCategory}`, evidence_refs: refs };
    const entry = { type: 'AUDIT_RECORDED', actor: by, category: auditCategory, evidence_refs: refs, evidence_record: evidenceRecord, current_summary: nextSummary, summary_revision: revision };
    this.#commit(entry);
    if (evidenceRecord) this.#auditEvidence.push(evidenceRecord);
    this.#auditSummary = nextSummary;
    this.#auditSummaryRevisions.push(revision);
    return safeClone(entry);
  }

  revisions() {
    return safeClone(readJsonl(this.#journal));
  }

  contract() {
    return safeClone({
      company_id: BASE_REGISTRY.company_id,
      engine_id: 'PROJECT-001',
      environment: PREPROD,
      version: 'v1',
      editors: [...ACTORS].sort(),
      canonical_projects: 18,
      audit_project: 'PRJ-AUDITORIAS',
      project_count: this.#projects.size,
      project_metadata_only: true,
      prod_authorized: false,
      prod_write_authorized: false,
      prod_mutation_authorized: false,
      spend_authorized: false,
      trading_access: false,
      additional_cost_target_eur: 0,
      persistence: 'APPEND_ONLY_JSONL_REFERENCE',
      rebuild: 'REGISTRY_PLUS_JOURNAL_REPLAY'
    });
  }

  #commit(entry) {
    const envelope = {
      schema_version: '1.0.0',
      revision_id: id('rev', [entry, Date.now(), crypto.randomUUID()]),
      recorded_at: new Date().toISOString(),
      ...safeClone(entry)
    };
    assertNoAuthorityEscalation(envelope);
    appendJsonl(this.#journal, envelope);
  }

  #replayJournal() {
    for (const entry of readJsonl(this.#journal)) {
      assertNoAuthorityEscalation(entry);
      if (entry.type === 'PROJECT_CREATED') {
        const project = validateProject(entry.project);
        this.#projects.set(project.project_id, project);
      } else if (entry.type === 'PROJECT_UPDATED') {
        const project = validateProject(entry.after);
        this.#projects.set(project.project_id, project);
      } else if (entry.type === 'AUDIT_RECORDED') {
        if (entry.evidence_record) this.#auditEvidence.push(entry.evidence_record);
        if (entry.current_summary) this.#auditSummary = entry.current_summary;
        if (entry.summary_revision) this.#auditSummaryRevisions.push(entry.summary_revision);
      } else {
        throw new Error(`unsupported Project Hub journal event: ${entry.type}`);
      }
    }
  }
}

export const JARVIS_PROJECT_HUB_V1 = Object.freeze({
  company_id: BASE_REGISTRY.company_id,
  engine_id: 'PROJECT-001',
  environment: PREPROD,
  version: 'v1',
  canonical_projects: 18,
  audit_project: 'PRJ-AUDITORIAS',
  editors: ['CARLOS', 'JARVIS'],
  additional_cost_target_eur: 0,
  prod_authorized: false,
  prod_write_authorized: false,
  spend_authorized: false,
  trading_access: false
});
