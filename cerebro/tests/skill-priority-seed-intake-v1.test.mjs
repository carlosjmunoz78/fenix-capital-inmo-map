import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildPrioritySeedEvent} from '../runtime/skill-priority-seed-intake-v1.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,'..');
const seeds=JSON.parse(fs.readFileSync(path.join(ROOT,'registry','skill-priority-seed-sources-v1.json'),'utf8'));

test('priority seed registry provides all requested P0 capability families without search dependence',()=>{
  const families=new Set(seeds.sources.map((x)=>x.capability_family));
  for(const required of ['LANGUAGE_HUMAN_INTERACTION','APP_DEV_CROSS_DEVICE','WEB_BUILD','SOCIAL_PUBLIC_DATA_ACQUISITION','ANALYTICS_STATISTICS','REPORTING_DOCUMENTS']) assert.equal(families.has(required),true,required);
  assert.equal(seeds.status,'VETTED_PINNED_SEEDS_READY');
  assert.equal(seeds.authority.additional_cost_eur,0);
  assert.equal(seeds.authority.external_skill_code_execution,false);
});

test('seed event is exact-commit only, MIT-evidenced and PREPROD fail-closed',()=>{
  const event=buildPrioritySeedEvent({seeds,company_id:'fenix'});
  assert.equal(event.status,'PRIORITY_PINNED_SEEDS_READY');
  assert.equal(event.priority_seed_count,10);
  assert.equal(event.client_payload.github_urls.length,10);
  for(const url of event.client_payload.github_urls) assert.match(url,/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/tree\/[a-f0-9]{40}(?:\/.*)?$/);
  assert.equal(event.environment,'PREPROD');
  assert.equal(event.prod_authorized,false);
  assert.equal(event.prod_write_authorized,false);
  assert.equal(event.prod_mutation_authorized,false);
  assert.equal(event.external_skill_code_execution,false);
  assert.equal(event.trading_access,false);
  assert.equal(event.additional_cost_eur,0);
});

test('seed builder rejects an unpinned source instead of fabricating provenance',()=>{
  const bad=structuredClone(seeds);
  bad.sources[0].github_url='https://github.com/example/repo/tree/main/skills/x';
  assert.throws(()=>buildPrioritySeedEvent({seeds:bad}),/unsafe or unpinned github_url/);
});
