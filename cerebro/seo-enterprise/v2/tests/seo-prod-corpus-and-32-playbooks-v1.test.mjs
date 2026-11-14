import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const readJson = relative => JSON.parse(readFileSync(new URL(relative, import.meta.url), 'utf8'));
const inventory = readJson('../data/fenix-prod-wp-url-media-inventory-2026-11-05-v1.json');
const playbooks = readJson('../seo-32-department-live-knowledge-playbooks-v1.json');
const chunks = Array.from({ length: 10 }, (_, n) =>
  readJson(`../data/live-copy-chunk-${String(n + 1).padStart(2, '0')}.json`)
);
const documents = chunks.flatMap(c => c.documents);

test('official WordPress source covers exactly 166 pages + 34 posts, not a staging snapshot', () => {
  assert.equal(inventory.environment, 'PROD_READ_ONLY_SNAPSHOT');
  assert.equal(inventory.historical_staging_not_used, true);
  assert.equal(inventory.documents.length, 200);
  assert.equal(inventory.documents.filter(d => d.post_type === 'page').length, 166);
  assert.equal(inventory.documents.filter(d => d.post_type === 'post').length, 34);
  assert.equal(inventory.images.length, 629);
  assert.equal(new Set(inventory.documents.map(d => d.post_id)).size, 200);
  assert.ok(inventory.documents.every(d => d.url.startsWith('https://fenixcapital.es/')));
});

test('all ten live copy chunks are complete, correctly joined and sourced from official WP', () => {
  assert.equal(chunks.length, 10);
  assert.ok(chunks.every((chunk, i) => chunk.part === i + 1 && chunk.documents.length === 20));
  assert.equal(documents.length, 200);
  assert.equal(new Set(documents.map(d => d.post_id)).size, 200);
  const expected = new Map(inventory.documents.map(d => [d.post_id, d]));
  for (const document of documents) {
    const source = expected.get(document.post_id);
    assert.ok(source, `Unexpected ID ${document.post_id}`);
    assert.equal(document.url, source.url);
    assert.equal(document.modified, source.modified);
    assert.ok(document.copy_text.length > 0, `Missing copy for ${document.post_id}`);
    assert.ok(Array.isArray(document.images));
    assert.ok(Array.isArray(document.headings));
    assert.ok(Array.isArray(document.internal_links));
    assert.ok(document.yoast?.title);
    assert.ok(document.yoast?.description);
  }
  const home = documents.find(d => d.post_id === 52376);
  assert.equal(home.resolved_reusable_block.block_id, 52377);
  assert.ok(home.copy_text.length > 1000);
  assert.equal(home.rendered_content_complete, false);
});

test('32 playbooks map one-to-one to the canonical departments, all fail-closed', () => {
  assert.equal(playbooks.departments.length, 32);
  assert.equal(new Set(playbooks.departments.map(d => d.department_id)).size, 32);
  const families = new Set(playbooks.departments.map(d => d.family_id));
  assert.equal(families.size, 8);
  assert.equal(playbooks.site_baseline.total_published_urls, 200);
  assert.equal(playbooks.global_instructions.no_stage_work, true);
  assert.equal(playbooks.global_instructions.self_certification_forbidden, true);
  for (const dept of playbooks.departments) {
    assert.equal(dept.actor_identity.real_agent_active, false);
    assert.equal(dept.actor_identity.iam_principal_id, null);
    assert.equal(dept.controls.writes_to_prod, false);
    assert.equal(dept.controls.publish, false);
    assert.equal(dept.controls.manage_money, false);
    assert.ok(dept.work_item.specialist_action);
    assert.ok(dept.work_item.expected_artifact);
    assert.equal(dept.training.real_passed_missions, 0);
    assert.equal(dept.training.independent_qa_department, 'SEO-D31');
    assert.equal(dept.training.training_supervisor, 'SEO-D32');
    assert.equal(dept.promotion_state.startsWith('BLOCKED_'), true);
  }
});
