import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../nia-notion-cloudflare-lab/worker.mjs';
import { readFileSync } from 'node:fs';
const source=readFileSync(new URL('../nia-notion-cloudflare-lab/worker.mjs',import.meta.url),'utf8');
test('Cloudflare Worker supports manual redirects and no automatic follow',()=>{assert.match(source,/redirect: 'manual'/);assert.doesNotMatch(source,/redirect: 'error'/)});
test('NIA Worker is closed to public HTTP and has no residual queue handler',async()=>{assert.equal((await worker.fetch()).status,404);assert.equal(typeof worker.queue,'undefined');assert.equal(await worker.scheduled({}, {NIA_ENABLED:'false'}),'OFF')});
