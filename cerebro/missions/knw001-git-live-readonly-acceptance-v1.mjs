#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { Knw001KnowledgeStoreV1 } from '../runtime/foundation-holds-v1.mjs';

const source='cerebro/registry/engine-registry.v1.json';
const bytes=fs.readFileSync(source);
const registry=JSON.parse(bytes.toString('utf8'));
const sha256=crypto.createHash('sha256').update(bytes).digest('hex');
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const committed=execFileSync('git',['show','HEAD:'+source],{encoding:'utf8'});
const committedHash=crypto.createHash('sha256').update(committed).digest('hex');
assert.match(commit,/^[a-f0-9]{40}$/);
assert.equal(sha256,committedHash,'working registry must match committed live Git source');
assert.equal(registry.count,179);
assert.equal(registry.engine_ids.length,179);
const store=new Knw001KnowledgeStoreV1();
const base={company_id:'fenix',engine_id:'KNW-001',environment:'PREPROD',version:'v1',subject:'canonical-registry-count',
 source:{type:'GIT_COMMIT_READONLY',ref:`${commit}:${source}#sha256=${sha256}`},
 confidence:1,created_at:'2026-11-03T00:00:00Z'};
store.put({...base,knowledge_id:'git-live-1',value:registry.count,lifecycle:'CURRENT'});
assert.equal(store.query({company_id:'fenix',subject:base.subject}).length,1);
assert.equal(store.query({company_id:'other-company',subject:base.subject}).length,0);
store.put({...base,knowledge_id:'git-conflict-fixture',value:180,lifecycle:'UNCERTAIN',confidence:0.1});
assert.equal(store.conflicts({company_id:'fenix',subject:base.subject}).requires_review,true);
store.put({...base,knowledge_id:'git-conflict-resolved',value:registry.count,lifecycle:'VALIDATED',supersedes:'git-conflict-fixture'});
assert.equal(store.conflicts({company_id:'fenix',subject:base.subject}).requires_review,false);
assert.throws(()=>store.put({...base,environment:'PROD',knowledge_id:'prod-forbidden',value:179,lifecycle:'CURRENT'}),/PROD_WRITE_DENIED/);
const evidence={schema_version:'1.0.0',engine_id:'KNW-001',environment:'PREPROD',status:'GREEN_GIT_LIVE_READONLY_SCOPE',
 source:{repository:'carlosjmunoz78/fenix-capital-inmo-map',path:source,commit_sha:commit,file_sha256:sha256,verified_against_git_show:true},
 checks:{actual_registry_read:true,provenance:true,tenant_isolation:true,conflict_detection:true,supersession:true,prod_write_denied:true},
 write_external:false,prod_writes:false,trading_access:false,additional_cost_eur:0,
 remaining:['Notion/document live source bindings','freshness across multiple actual Git revisions','governed deployment acceptance']};
const dir=process.env.CEREBRO_EVIDENCE_OUT||'/tmp/cerebro-knw001-live-git';
fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(dir+'/SUMMARY.json',JSON.stringify(evidence,null,2)+'\n');
console.log('KNW_GIT_ACCEPTANCE='+JSON.stringify(evidence));
