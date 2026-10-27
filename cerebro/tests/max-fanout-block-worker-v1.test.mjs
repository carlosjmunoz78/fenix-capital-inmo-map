import test from 'node:test';
import assert from 'node:assert/strict';
import { FANOUT_BLOCKS, blocksForShard } from '../runtime/max-fanout-block-worker-v1.mjs';

test('fanout exposes exactly W00-W24 once', () => {
  assert.equal(FANOUT_BLOCKS.length, 25);
  assert.deepEqual(FANOUT_BLOCKS.map(x => x.id), Array.from({ length: 25 }, (_, i) => `W${String(i).padStart(2,'0')}`));
  assert.equal(new Set(FANOUT_BLOCKS.map(x => x.id)).size, 25);
});

test('8 DeepSeek shards cover every block exactly once', () => {
  const all = Array.from({ length: 8 }, (_, shard) => blocksForShard(shard, 8)).flat();
  assert.equal(all.length, 25);
  assert.equal(new Set(all.map(x => x.id)).size, 25);
});

test('invalid shards fail closed', () => {
  assert.throws(() => blocksForShard(-1, 8));
  assert.throws(() => blocksForShard(8, 8));
  assert.throws(() => blocksForShard(0, 0));
});
