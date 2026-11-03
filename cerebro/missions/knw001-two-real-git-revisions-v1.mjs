#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {Knw001KnowledgeStoreV1} from '../runtime/foundation-holds-v1.mjs';

const repo='carlosjmunoz78/fenix-capital-inmo-map';
const tracked='cerebro/registry/engine-registry.v1.json';
const token=process.env.GITHUB_TOKEN;
assert.ok(typeof token==='string'&&token.length>10,'GITHUB_REPO_READ_TOKEN_REQUIRED');
assert.equal(process.env.GITHUB_REPOSITORY,repo,'REPO_IDENTITY_MISMATCH');
const headers={Accept:'application/vnd.github+json',Authorization:'Bearer '+token,'User-Agent':'CEREBRO-KNW001-REVISION-PROBE','X-GitHub-Api-Version':'2022-11-28'};
async function api(url){
 const response=await fetch(url,{headers,signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new Error('KNW001_GITHUB_READ_FAILED:'+response.status);
 return response.json();
}
const pathQ=encodeURIComponent(tracked),prefix='https://api.github.com/repos/'+repo;
const commits=await api(prefix+'/commits?path='+pathQ+'&per_page=3');
assert.ok(Array.isArray(commits)&&commits.length>=2,'KNW001_TWO_REAL_REVISIONS_REQUIRED');
const revisions=[];
for(const c of commits.slice(0,2).reverse()){
 assert.match(c.sha,/^[0-9a-f]{40}$/);
 const data=await api(prefix+'/contents/'+tracked+'?ref='+c.sha);
 assert.equal(data.encoding,'base64');assert.equal(data.path,tracked);
 const bytes=Buffer.from(String(data.content).replace(/\s+/g,''),'base64');
 const parsed=JSON.parse(bytes.toString('utf8'));
 assert.ok(Array.isArray(parsed.engine_ids),'KNW001_REGISTRY_SHAPE_MISMATCH');
 const checksum=crypto.createHash('sha256').update(bytes).digest('hex');
 revisions.push({commit_sha:c.sha,file_sha256:checksum,count:parsed.count,source_commit_time:c.commit?.committer?.date??null});
}
const store=new Knw001KnowledgeStoreV1();
const context={company_id:'fenix',engine_id:'KNW-001',environment:'PREPROD',version:'v1',subject:'registry-canonic-count'};
for(const [index,rev] of revisions.entries()){
 const id='git-revision-'+index;
 store.put({...context,knowledge_id:id,value:{count:rev.count,sha256:rev.file_sha256},
  lifecycle:index===0?'CURRENT':'VALIDATED',
  source:{type:'GIT_REPOSITORY_VERSIONED_READONLY',ref:rev.commit_sha+':'+tracked},
  confidence:1,
  created_at:'2026-11-03T18:00:00Z',
  ...(index===1?{supersedes:'git-revision-0'}:{})});
}
const records=store.query({company_id:'fenix',subject:context.subject,include_uncertain:true});
assert.equal(records.length,1);
assert.equal(records[0].knowledge_id,'git-revision-1');
assert.equal(records[0].source.ref,revisions[1].commit_sha+':'+tracked);
assert.equal(store.query({company_id:'other-company',include_uncertain:true}).length,0);
assert.throws(()=>store.put({...context,environment:'PROD',knowledge_id:'forbidden',value:1,
 lifecycle:'CURRENT',source:{type:'GIT',ref:'x'},confidence:1,created_at:'2026-11-03T18:00:00Z'}),/PROD_WRITE_DENIED/);
const result={schema_version:'1.0.0',status:'GREEN_TWO_REAL_GIT_REVISIONS_PROVENANCE',
 engine_id:'KNW-001',environment:'PREPROD',repository:repo,tracked_path:tracked,
 revisions,revisions_distinct:revisions[0].commit_sha!==revisions[1].commit_sha,
 content_hash_changed:revisions[0].file_sha256!==revisions[1].file_sha256,
 source_replacement_proven:true,reference_immutable_by_commit:true,tenant_isolation:true,
 conflicts_observed:false,automated_canonical_promotion:false,
 limits:{notion_persistent_binding:false,rights_for_external_documents_unverified:true,host_persistent:false,prod_authorized:false},
 external_writes:false,prod_writes:false,trading_access:false,additional_cost_eur:0};
const dest=process.env.CEREBRO_KNW_REVISION_OUT||'/tmp/cerebro-knw-git-revisions';
fs.mkdirSync(dest,{recursive:true});fs.writeFileSync(dest+'/SUMMARY.json',JSON.stringify(result,null,2)+'\n');
console.log('KNW001_REVISION_STATUS='+JSON.stringify({status:result.status,changed:result.content_hash_changed,first:revisions[0].commit_sha,second:revisions[1].commit_sha}));
