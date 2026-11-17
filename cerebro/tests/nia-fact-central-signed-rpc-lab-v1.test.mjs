import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const src=fs.readFileSync(new URL('../nia-notion-cloudflare-lab/nia-central-receiver-v1.mjs',import.meta.url),'utf8');
const old=fs.readFileSync(new URL('../fact001-nia-parallel-lab/original/fact001-media-gateway-lab.mjs',import.meta.url),'utf8');
const patch=fs.readFileSync(new URL('../fact001-nia-parallel-lab/fact001-media-gateway-nia-patch.mjs',import.meta.url),'utf8');
test('old UMS queue implementation fully preserved in NIA patch',()=>{
 const i=old.indexOf("if(batch.queue!=='cerebro-fact001-ums001-read-lab-eu'");
 assert.ok(i>0);
 assert.ok(patch.includes(old.slice(i)));
 assert.ok(patch.includes('async niaDiscoveryFromRuntime('));
 assert.ok(patch.includes("batch.queue===NIA_INPUT_QUEUE"));
 assert.ok(patch.includes('NIA_ISSUER_ENABLED'));
});
test('read-only private receiver uses real ACTGW + durable ledger, HTTP denied',()=>{
 assert.match(src,/dispatchNiaVerifiedLabV1/);
 assert.match(src,/makeNiaNonceStoreV1/);
 assert.match(src,/CEREBRO_NIA_NOTION_READ_TOKEN/);
 assert.match(src,/NIA_DISPATCH_ENABLED/);
 assert.match(src,/status:404/);
 assert.doesNotMatch(src,/method:\s*['"]POST['"]/);
 assert.doesNotMatch(src,/NIA_CENTRAL_RECEIVER_GATE.*envelope/);
});
