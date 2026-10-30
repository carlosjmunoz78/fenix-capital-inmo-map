import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {JsonlMemoryStoreV1,JarvisMemoryV1,JARVIS_MEMORY_V1_CONTRACT} from '../jarvis/memory-v1/memory-core-v1.mjs';

const create=()=>{const file=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'jarvis-memory-')),'memory.jsonl');return{file,memory:new JarvisMemoryV1({store:new JsonlMemoryStoreV1({file})})};};

test('memory is company/project scoped and does not leak across companies',()=>{const {memory}=create();memory.remember({memory_id:'m1',company_id:'fenix',project_id:'p1',kind:'PROJECT',subject:'Decision',content:'Use route A',source:'owner',confidence:1,effective_at:'2026-01-01T00:00:00Z',observed_at:'2026-01-01T00:00:00Z',recorded_at:'2026-01-01T00:00:00Z'});memory.remember({memory_id:'m2',company_id:'other',project_id:'p1',kind:'PROJECT',subject:'Decision',content:'Other secret',source:'owner',confidence:1,effective_at:'2026-01-01T00:00:00Z',observed_at:'2026-01-01T00:00:00Z',recorded_at:'2026-01-01T00:00:00Z'});assert.deepEqual(memory.query({company_id:'fenix',project_id:'p1'}).map(x=>x.memory_id),['m1']);assert.deepEqual(memory.query({company_id:'other',project_id:'p1'}).map(x=>x.memory_id),['m2']);});

test('point-in-time query respects effective_at',()=>{const {memory}=create();memory.remember({memory_id:'old',company_id:'fenix',project_id:'p',subject:'State',content:'Old',source:'system',effective_at:'2026-01-01T00:00:00Z',observed_at:'2026-01-01T00:00:00Z',recorded_at:'2026-01-01T00:00:00Z'});memory.remember({memory_id:'future',company_id:'fenix',project_id:'p',subject:'State',content:'Future',source:'system',effective_at:'2026-06-01T00:00:00Z',observed_at:'2026-06-01T00:00:00Z',recorded_at:'2026-06-01T00:00:00Z'});const rows=memory.query({company_id:'fenix',project_id:'p',as_of:'2026-03-01T00:00:00Z'});assert.deepEqual(rows.map(x=>x.memory_id),['old']);});

test('supersession cannot cross company/project scope',()=>{const {memory}=create();memory.remember({memory_id:'base',company_id:'fenix',project_id:'p',subject:'Rule',content:'A',source:'owner'});assert.throws(()=>memory.remember({memory_id:'bad',company_id:'other',project_id:'p',subject:'Rule',content:'B',source:'owner',supersedes:'base'}),/CROSS_SCOPE_SUPERSESSION_DENIED/);const replacement=memory.remember({memory_id:'new',company_id:'fenix',project_id:'p',subject:'Rule',content:'B',source:'owner',supersedes:'base'});assert.equal(replacement.memory_id,'new');assert.equal(memory.query({company_id:'fenix',project_id:'p',text:'Rule'})[0].memory_id,'new');});

test('memory integrity detects file tampering',()=>{const {memory,file}=create();memory.remember({memory_id:'m1',company_id:'fenix',project_id:'p',subject:'Fact',content:'Truth',source:'source'});assert.equal(memory.integrity().ok,true);const rows=fs.readFileSync(file,'utf8').trim().split('\n');const x=JSON.parse(rows[0]);x.content='tampered';fs.writeFileSync(file,JSON.stringify(x)+'\n');assert.equal(memory.integrity().ok,false);assert.deepEqual(memory.integrity().invalid_hashes,['m1']);});

test('contract explicitly remains non-cloud-durable until backend is bound',()=>{assert.equal(JARVIS_MEMORY_V1_CONTRACT.local_jsonl_backend,'CANDIDATE_ONLY');assert.equal(JARVIS_MEMORY_V1_CONTRACT.cloud_durable_backend,'NOT_YET_BOUND');assert.equal(JARVIS_MEMORY_V1_CONTRACT.prod_authorized,false);});
