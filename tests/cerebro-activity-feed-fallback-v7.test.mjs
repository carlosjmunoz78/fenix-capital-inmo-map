import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const old=read('cerebro/rollback/operativa-activity-v6-20261112/index.ts');
const now=read('cerebro/ops/operativa-activity-feed-v7-candidate/index.ts');

test('v7 preserves owner-only GET function with unchanged authentication gates',()=>{
 for(const anchor of ['withSupabase({auth:"user"}','authorizedOwner(req)','if(req.method!=="GET")','OWNER_ONLY','ALLOWED_ORIGINS','CARLOS-ADMIN','GITHUB_TOKEN_CONFIGURED'])assert.ok(old.includes(anchor)&&now.includes(anchor),anchor);
 assert.ok(now.includes('GITHUB_AUTHENTICATED_SNAPSHOT'));
 assert.ok(now.includes('source_status:"CACHED"'));
 assert.ok(now.includes('GITHUB_FEED_STALE'));
 assert.ok(now.includes('SNAPSHOT_MAX_AGE_MS'));
 assert.ok(now.includes('if(!GITHUB_TOKEN_CONFIGURED)return loadPublishedSnapshot()'));
 assert.ok(now.includes('cache={at:Date.now(),payload}'));
 assert.ok(now.includes('Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")'));
 assert.ok(old.includes('Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")'));
});
test('v7 is exact v6 plus constrained feed fallback and cache freshness',()=>{
 const marker='async function loadPublishedSnapshot():Promise<ActivityPayload>{';
 const start=now.indexOf(marker);
 const end=now.indexOf('async function loadActivity():Promise<ActivityPayload>{',start);
 assert.ok(start>0&&end>start);
 const snapshot=now.slice(start,end);
 let rebuilt=now.slice(0,start)+now.slice(end);
 const replacements=[
  ['const CACHE_TTL_MS=GITHUB_TOKEN_CONFIGURED?90_000:120_000;\nconst SNAPSHOT_MAX_AGE_MS=20*60_000;\nconst SNAPSHOT_URL="https://raw.githubusercontent.com/carlosjmunoz78/fenix-capital-inmo-map/cerebro-activity-feed-v1/activity.json";','const CACHE_TTL_MS=GITHUB_TOKEN_CONFIGURED?90_000:600_000;'],
  ['async function loadActivity():Promise<ActivityPayload>{const now=Date.now();if(cache&&now-cache.at<CACHE_TTL_MS&&(GITHUB_TOKEN_CONFIGURED||now-Date.parse(cache.payload.observed_at)<SNAPSHOT_MAX_AGE_MS))return{...cache.payload,source_status:"CACHED"};if(!GITHUB_TOKEN_CONFIGURED)return loadPublishedSnapshot();try{','async function loadActivity():Promise<ActivityPayload>{const now=Date.now();if(cache&&now-cache.at<CACHE_TTL_MS)return{...cache.payload,source_status:"CACHED"};try{']
 ];
 for(const [from,to] of replacements){assert.equal(rebuilt.split(from).length,2);rebuilt=rebuilt.replace(from,to);}
 assert.equal(rebuilt,old);
 assert.ok(snapshot.includes('age>SNAPSHOT_MAX_AGE_MS'));
 assert.ok(snapshot.includes('isCerebroWorkflow'));
 assert.ok(snapshot.includes('Number.isSafeInteger'));
 assert.ok(snapshot.includes('projectRun(r,false)'));
});
test('candidate Edge TypeScript source has valid syntax',()=>{
 assert.ok(stripTypeScriptTypes(now,{mode:'strip'}).length>15000);
});
