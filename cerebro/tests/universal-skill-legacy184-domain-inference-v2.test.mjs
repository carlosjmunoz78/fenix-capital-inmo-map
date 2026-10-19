import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {inferLegacyDomains} from '../runtime/universal-skill-legacy184-normalizer-v1.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));const skills=path.resolve(here,'../skills');
function item(file,id){const doc=JSON.parse(fs.readFileSync(path.join(skills,file),'utf8'));const out=doc.items.find((x)=>x.id===id);assert.ok(out);return out;}
function ids(row){return inferLegacyDomains(row).map((x)=>x.domain_id);}
test('B11 textual evidence breaks generic-owner ties instead of over-binding legacy gaps',()=>{assert.deepEqual(ids(item('cerebro-184-items-51-61-live-reconciliation.v2.json',57)),['external-information-retrieval']);assert.deepEqual(ids(item('cerebro-184-items-62-68-live-reconciliation.v2.json',62)),['marketing-growth-social']);assert.deepEqual(ids(item('cerebro-184-items-152-161-live-reconciliation.v2.json',157)).sort(),['seo-search-content','web-wordpress-frontend'].sort());assert.deepEqual(ids(item('cerebro-184-items-176-184-live-reconciliation.v2.json',176)),['marketing-growth-social']);assert.deepEqual(ids(item('cerebro-184-items-176-184-live-reconciliation.v2.json',181)),['software-engineering-devops']);assert.deepEqual(ids(item('cerebro-184-items-176-184-live-reconciliation.v2.json',183)),['web-wordpress-frontend']);});
test('B11 call cadence routes to canonical voice/multimedia semantics, not generic JOB integration',()=>{assert.deepEqual(ids(item('cerebro-184-items-93-104-live-reconciliation.v2.json',101)),['multimedia-voice-video-design']);});
test('B11 normalizer remains generic and contains no legacy candidate-id switch table',()=>{const runtime=fs.readFileSync(path.resolve(here,'../runtime/universal-skill-legacy184-normalizer-v1.mjs'),'utf8');assert.equal(/item\.id\s*===|case\s+[0-9]+|legacy184:[0-9]+/.test(runtime),false);});
