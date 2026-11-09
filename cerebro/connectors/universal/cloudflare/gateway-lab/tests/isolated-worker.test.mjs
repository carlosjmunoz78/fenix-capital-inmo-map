import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import worker from '../src/index.mjs';
const config=JSON.parse(readFileSync(new URL('../wrangler.lab.jsonc',import.meta.url),'utf8'));
const EXPECTED='cerebro-fact001-gateway-lab-eu-20261109';
const ACCOUNT='e39a57e1ac42650ca5a6d5307cf0ac8e';
test('distinct immutable target and account; never touches any existing named Worker',()=>{
 assert.equal(config.name,EXPECTED);assert.equal(config.account_id,ACCOUNT);
 assert.notEqual(config.name,'cerebro-jarvis-lab-eu');
 assert.notEqual(config.name,'cerebro-instagram-autoqual-lab');
 assert.notEqual(config.name,'cerebro-facebook-autoqual-lab');
});
test('no public entry point, preview, zones, custom domains, cron or secrets',()=>{
 assert.equal(config.workers_dev,false);assert.equal(config.preview_urls,false);
 assert.deepEqual(config.routes,[]);assert.deepEqual(config.triggers,{crons:[]});
 assert.equal('route' in config,false);assert.equal('d1_databases' in config,false);
 assert.equal('kv_namespaces' in config,false);assert.equal('r2_buckets' in config,false);
 assert.equal('services' in config,false);assert.equal('observability' in config,false);
});
test('gate disabled until human-approved auth/access policies and evaluations',()=>{
 assert.deepEqual(config.vars,{GATEWAY_ENABLED:'false',CLOUDFLARE_API_ENABLED:'false',ALLOW_MUTATIONS:'false'});
});
test('worker always denies fetch and never runs Cloudflare operations',async()=>{
 const response=await worker.fetch(new Request('https://example.invalid/'),{},{});
 assert.equal(response.status,403);assert.equal(response.headers.get('cache-control'),'no-store');
 const body=await response.json();assert.equal(body.executed,false);assert.equal(body.status,'DISABLED');
});