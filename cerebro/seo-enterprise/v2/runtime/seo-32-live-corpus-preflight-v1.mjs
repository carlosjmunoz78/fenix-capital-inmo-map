/**
 * CEREBRO SEO V2 · read-only, deterministic 32-department preflight against
 * the authenticated official WordPress source snapshot.
 * Evidence preparation, NOT real agent identities, browser QA, GSC, or publication.
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const load = p => JSON.parse(readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const inventory = load('data/fenix-prod-wp-url-media-inventory-2026-11-05-v1.json');
const playbooks = load('seo-32-department-live-knowledge-playbooks-v1.json');
const cases = load('seo-official-firstpass-findings-and-32-dispatch-2026-11-05.json');
const docs = Array.from({length: 10}, (_, i) =>
  load('data/live-copy-chunk-' + String(i + 1).padStart(2,'0') + '.json')
).flatMap(chunk => chunk.documents);

const unique = xs => new Set(xs).size === xs.length;
const safeScope = x => typeof x === 'string' && /^[a-zA-Z0-9._-]{2,50}$/.test(x);

export function runSeo32LiveCorpusPreflight(context = {}) {
  const {
    company_id = 'fenix', environment = 'LAB', version = '1.0.0',
    external_writes = false, paid_ai_calls = 0, budget_eur = 0,
    case_limit = 5
  } = context;
  if (company_id !== 'fenix' || !safeScope(version) || environment !== 'LAB')
    throw Error('SEO_SCOPE_DENIED');
  if (external_writes !== false || paid_ai_calls !== 0 || budget_eur !== 0)
    throw Error('SEO_READONLY_ZERO_COST_DENIED');
  if (!Number.isInteger(case_limit) || case_limit < 1 || case_limit > 20)
    throw Error('SEO_CASE_LIMIT_INVALID');
  if (inventory.documents.length !== 200 || inventory.images.length !== 629 || docs.length !== 200)
    throw Error('SEO_SOURCE_COVERAGE_FAILED');
  if (!unique(docs.map(d => d.post_id)) || !unique(docs.map(d => d.url)))
    throw Error('SEO_DUPLICATE_SOURCE_DENIED');
  const inventoryById = new Map(inventory.documents.map(d => [d.post_id, d]));
  for (const doc of docs) {
    const original = inventoryById.get(doc.post_id);
    if (!original || original.url !== doc.url || original.modified !== doc.modified ||
        typeof doc.copy_text !== 'string' || doc.copy_text.trim().length < 1)
      throw Error('SEO_CORPUS_SOURCE_MISMATCH');
  }
  if (playbooks.departments.length !== 32 || !unique(playbooks.departments.map(d => d.department_id)))
    throw Error('SEO_DEPARTMENT_COVERAGE_INVALID');
  if (cases.department_dispatch.length !== 32)
    throw Error('SEO_INITIAL_DISPATCH_INCOMPLETE');
  const casesById = new Map(cases.cases.map(c => [c.id, c]));
  const preflights = [];
  for (const dept of playbooks.departments) {
    if (!dept.department_id.match(/^SEO-D\d{2}$/) || dept.actor_identity.real_agent_active !== false ||
        dept.controls.writes_to_prod !== false || dept.controls.publish !== false ||
        dept.training.independent_qa_department !== 'SEO-D31')
      throw Error('SEO_ROLE_POLICY_DENIED');
    const assignment = cases.department_dispatch.find(x => x.department_id === dept.department_id);
    if (!assignment || assignment.candidate_case_ids.some(id => !casesById.has(id)))
      throw Error('SEO_ROLE_ASSIGNMENT_INVALID');
    const assigned = assignment.candidate_case_ids.slice(0, case_limit);
    const preflight = {
      department_id: dept.department_id, family_id: dept.family_id,
      mission: dept.mission, actor_role_template: dept.actor_identity.role,
      source_corpus_documents: docs.length, media_library: inventory.images.length,
      sources_verified_from_official_wordpress_snapshot: true,
      live_website_render_verified: false, snapshot_requires_url_refresh: true,
      specialist_instruction: dept.work_item.specialist_action,
      expected_deliverable: dept.work_item.expected_artifact,
      assigned_candidate_case_ids: assigned,
      assigned_case_count: assigned.length,
      qa_required: 'SEO-D31', training_required: 'SEO-D32',
      evidence_sha256: digest([company_id, dept.department_id, assigned, inventory.captured_on]),
      status: 'LAB_READONLY_PREFLIGHT_EXECUTED_AGENT_NOT_CERTIFIED',
      identity_certified: false, independent_judge_certified: false,
      external_writes: false, publish_allowed: false, cost_eur: 0
    };
    preflights.push(preflight);
  }
  return {
    schema_version: '1.0.0', company_id, engine_id: 'SEO-001', environment, version,
    status: 'THIRTY_TWO_LAB_SOURCE_PREFLIGHTS_EXECUTED_NO_PROD_AUTONOMY',
    source_snapshot_date: inventory.captured_on,
    department_count: preflights.length,
    family_count: new Set(preflights.map(x => x.family_id)).size,
    unique_source_ids: inventoryById.size,
    documents_with_copy: docs.filter(d => d.copy_text.length > 0).length,
    library_media: inventory.images.length,
    candidate_cases_count: cases.cases.length,
    qa_status: 'INDEPENDENT_REAL_IAM_AND_BROWSER_QA_STILL_REQUIRED',
    production_autonomy_certified: 0, permissions_increased: 0,
    wordpress_mutations: 0, paid_ai_calls: 0, additional_eur: 0,
    source_integrity_sha256: digest(docs.map(d => [d.post_id, d.modified, d.copy_text.length])),
    preflights
  };
}
