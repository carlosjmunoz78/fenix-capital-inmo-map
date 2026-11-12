import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {transformSync} from 'esbuild';
const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const original=read('cerebro/rollback/operativa-activity-v4-20261112/index.ts');
const next=read('supabase/functions/cerebro-console-activity-v0/index.ts');
const insert1='let lastSourceFailureLogAt=0;';
const insert2='if(Date.now()-lastSourceFailureLogAt>=60_000){lastSourceFailureLogAt=Date.now();const errorCode=String(error).match(/GITHUB(?:_RUNS_(?:in_progress|queued))?_\\d{3}/)?.[0]??"FETCH_UNAVAILABLE";console.warn(JSON.stringify({event:"CEREBRO_ACTIVITY_SOURCE_DEGRADED",code:errorCode,github_token_configured:Boolean((Deno.env.get("GITHUB_TOKEN")??"").trim())}));}';
test('v5 differs from exact live v4 only by safe bounded diagnosis',()=>{
 assert.equal(next.replace(insert1,'').replace(insert2,''),original);
 assert.match(next,/authorizedOwner\(req\)/);
 assert.match(next,/auth:"user"/);
 assert.match(next,/MAX_ACTIVE_RUNS=360/);
 assert.match(next,/CEREBRO_ACTIVITY_SOURCE_DEGRADED/);
 assert.doesNotMatch(insert2,/console\.log\(token\)|console\.warn\(token\)/);
});
test('diagnostic Edge TypeScript source transpiles',()=>{
 const compiled=transformSync(next,{loader:'ts',target:'es2022',format:'esm'});
 assert.ok(compiled.code.length>100);
});
