import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../nia-notion-cloudflare-lab/worker.mjs';
test('NIA cloudflare lab: all HTTP requests fail closed',async()=>{
  const response=await worker.fetch(new Request('https://example.invalid/nia-proof'),{});
  assert.equal(response.status,404);
  assert.equal(response.headers.get('Cache-Control'),'no-store');
});
test('NIA cloudflare lab: scheduled is inert until authorized enable',async()=>{
  const prior=globalThis.fetch;
  let called=0;
  globalThis.fetch=async()=>{called++; throw new Error('Unexpected network');};
  try {
    assert.equal(await worker.scheduled({}, {NIA_ENABLED:'false'}), 'OFF');
    assert.equal(await worker.scheduled({}, {NIA_ENABLED:'true'}), 'BLOCKED_CLOUDFLARE_SECRET_MISSING');
    assert.equal(called,0);
  } finally {globalThis.fetch=prior;}
});
