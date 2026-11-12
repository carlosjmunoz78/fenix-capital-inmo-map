import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const original=read('cerebro/rollback/operativa-activity-v4-20261112/index.ts');
const diagnostic=read('cerebro/rollback/operativa-activity-v5-20261112/index.ts');
const next=read('supabase/functions/cerebro-console-activity-v0/index.ts');
const insert1='let lastSourceFailureLogAt=0;';
const insert2='if(Date.now()-lastSourceFailureLogAt>=60_000){lastSourceFailureLogAt=Date.now();const errorCode=String(error).match(/GITHUB(?:_RUNS_(?:in_progress|queued))?_\\d{3}/)?.[0]??"FETCH_UNAVAILABLE";console.warn(JSON.stringify({event:"CEREBRO_ACTIVITY_SOURCE_DEGRADED",code:errorCode,github_token_configured:Boolean((Deno.env.get("GITHUB_TOKEN")??"").trim())}));}';
test('v5 differs from exact live v4 only by safe bounded diagnosis',()=>{
 assert.equal(diagnostic.replace(insert1,'').replace(insert2,''),original);
 assert.match(diagnostic,/authorizedOwner\(req\)/);
 assert.match(diagnostic,/auth:"user"/);
 assert.match(diagnostic,/MAX_ACTIVE_RUNS=360/);
 assert.match(diagnostic,/CEREBRO_ACTIVITY_SOURCE_DEGRADED/);
 assert.doesNotMatch(insert2,/console\.log\(token\)|console\.warn\(token\)/);
});
test('v6 reverts exactly to v5 when adaptive pacing changes are reversed',()=>{
 const patches=[
  ['const GITHUB_TOKEN_CONFIGURED=Boolean((Deno.env.get("GITHUB_TOKEN")??"").trim());\nconst CACHE_TTL_MS=GITHUB_TOKEN_CONFIGURED?90_000:600_000;','const CACHE_TTL_MS=45_000;'],
  ['const MAX_ACTIVE_RUN_PAGES=1;','const MAX_ACTIVE_RUN_PAGES=4;'],
  ['const MAX_DETAILED_PROGRESS_RUNS=GITHUB_TOKEN_CONFIGURED?4:0;','const MAX_DETAILED_PROGRESS_RUNS=20;'],
  ['const MAX_JOB_PAGES=1;','const MAX_JOB_PAGES=6;'],
  ['return{...cache.payload,source_status:"CACHED"};','return{...cache.payload,source_status:"CACHED",observed_at:new Date().toISOString()};'],
  ['return{...cache.payload,source_status:"CACHED",reason:String(error)};','return{...cache.payload,source_status:"CACHED",observed_at:new Date().toISOString(),reason:String(error)};']
 ];
 let previous=next;
 for(const [a,b] of patches){assert.equal(previous.split(a).length,2);previous=previous.replace(a,b);}
 assert.equal(previous,diagnostic);
 assert.match(next,/MAX_ACTIVE_RUNS=360/);
 assert.match(next,/GITHUB_TOKEN_CONFIGURED\?90_000:600_000/);
 assert.match(next,/authorizedOwner\(req\)/);
 assert.match(next,/auth:"user"/);
});

test('diagnostic Edge TypeScript source transpiles',()=>{
 const stripped=stripTypeScriptTypes(next,{mode:'strip'});
 assert.ok(stripped.length>100);
});
