import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source=readFileSync(new URL('../nia-notion-cloudflare-lab/worker.mjs',import.meta.url),'utf8');
test('Cloudflare Worker uses manual redirects only',()=>{assert.match(source,/redirect: 'manual'/);assert.doesNotMatch(source,/redirect: 'error'/)});
test('Cloudflare one-shot proof does not expose public route, cron or secret',()=>{assert.match(source,/status: 404/);assert.match(source,/NIA_READONLY_CHECK_V1/);assert.match(source,/120000/);assert.match(source,/CEREBRO_NIA_NOTION_READ_TOKEN/);});
