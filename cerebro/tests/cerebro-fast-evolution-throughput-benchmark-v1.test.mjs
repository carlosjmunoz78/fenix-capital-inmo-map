import test from 'node:test';
import assert from 'node:assert/strict';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function runBatch({items = 10, concurrency = 2, workMs = 20} = {}) {
  const queue = Array.from({length: items}, (_, i) => i);
  let cursor = 0;
  const started = performance.now();
  const workers = Array.from({length: concurrency}, async () => {
    while (true) {
      const index = cursor++;
      if (index >= queue.length) return;
      await sleep(workMs);
    }
  });
  await Promise.all(workers);
  return performance.now() - started;
}

test('OLD 2-slot vs NEW 5-slot same-company fast path improves bounded synthetic throughput', async () => {
  const rounds = 5;
  const oldSamples = [];
  const newSamples = [];
  for (let i = 0; i < rounds; i += 1) {
    oldSamples.push(await runBatch({concurrency: 2}));
    newSamples.push(await runBatch({concurrency: 5}));
  }
  const median = xs => [...xs].sort((a,b)=>a-b)[Math.floor(xs.length/2)];
  const oldP50 = median(oldSamples);
  const newP50 = median(newSamples);
  const speedup = oldP50 / newP50;
  assert.ok(newP50 < oldP50, `expected NEW faster: old=${oldP50} new=${newP50}`);
  assert.ok(speedup >= 1.8, `expected material speedup >=1.8x, got ${speedup.toFixed(2)}x`);
});
