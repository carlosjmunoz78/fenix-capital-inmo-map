import test from 'node:test';
import assert from 'node:assert/strict';
import { FANOUT_BLOCKS, blocksForShard, buildDeepSeekBlockInput, evidenceForBlockShard } from '../runtime/max-fanout-block-worker-v1.mjs';

test('fanout exposes exactly W00-W24 once', () => {
  assert.equal(FANOUT_BLOCKS.length,25);
  assert.deepEqual(FANOUT_BLOCKS.map(x=>x.id),Array.from({length:25},(_,i)=>`W${String(i).padStart(2,'0')}`));
  assert.equal(new Set(FANOUT_BLOCKS.map(x=>x.id)).size,25);
});

test('8 DeepSeek shards cover every block exactly once', () => {
  const all=Array.from({length:8},(_,shard)=>blocksForShard(shard,8)).flat();
  assert.equal(all.length,25);
  assert.equal(new Set(all.map(x=>x.id)).size,25);
});

test('10 evidence shards partition one block without overlapping paths', () => {
  const packets=Array.from({length:10},(_,shard)=>evidenceForBlockShard('W13',shard,10));
  assert.deepEqual(packets.map(x=>x.shard),[0,1,2,3,4,5,6,7,8,9]);
  assert.ok(packets.every(x=>x.shards===10&&x.block_id==='W13'));
  const paths=packets.flatMap(x=>x.matching_paths);
  assert.equal(new Set(paths).size,paths.length);
  assert.equal(packets.reduce((sum,x)=>sum+x.matching_path_count,0),Math.min(packets[0].matching_path_total,1200));
});

test('one-block DeepSeek agent prompt requests hierarchical parallel work instead of serial shard planning', () => {
  const packet=buildDeepSeekBlockInput('W00');
  assert.equal(packet.block.id,'W00');
  assert.equal(packet.evidence.block_id,'W00');
  assert.match(packet.input,/independent_subtasks/);
  assert.match(packet.input,/dependency_edges/);
  assert.match(packet.input,/sibling subtasks can execute in parallel/);
});

test('invalid shards fail closed', () => {
  assert.throws(()=>blocksForShard(-1,8));
  assert.throws(()=>blocksForShard(8,8));
  assert.throws(()=>blocksForShard(0,0));
  assert.throws(()=>evidenceForBlockShard('W13',10,10));
  assert.throws(()=>evidenceForBlockShard('W13',0,0));
});
