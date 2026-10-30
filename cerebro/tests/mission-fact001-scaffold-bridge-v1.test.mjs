import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fact001TargetsForMission, runMissionFact001ScaffoldV1 } from '../runtime/mission-fact001-scaffold-bridge-v1.mjs';

test('canonical mission mapping is bounded to Console/Gateway and Digital Build/App Factory', () => {
  assert.deepEqual(fact001TargetsForMission('M16'), ['CONSOLE-001','ACTGW-001']);
  assert.deepEqual(fact001TargetsForMission('M18'), ['WEB-001','APPBOOT-001']);
  assert.deepEqual(fact001TargetsForMission('M01'), []);
});

test('M16 generates two real governed FACT-001 scaffolds without PROD authority', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cerebro-m16-fact001-test-'));
  try {
    const result = runMissionFact001ScaffoldV1({ mission_id:'M16', out_root:root });
    assert.equal(result.status, 'FACT001_SCAFFOLDS_GENERATED');
    assert.equal(result.generated_file_count, 36);
    assert.equal(result.results.length, 2);
    assert.equal(result.additional_cost_eur, 0);
    assert.equal(result.prod_authorized, false);
    assert.equal(result.prod_write_authorized, false);
    assert.equal(result.trading_access, false);
    for (const item of result.results) {
      assert.equal(item.status, 'FACTORY_SCAFFOLD_GREEN');
      assert.equal(item.generated_file_count, 18);
      assert.equal(fs.existsSync(path.join(root, 'M16', item.engine_id, 'fact001-result.json')), true);
    }
  } finally { fs.rmSync(root, { recursive:true, force:true }); }
});

test('M18 generates WEB-001 and APPBOOT-001 scaffolds and remains SCAFFOLD/PREPROD bounded', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cerebro-m18-fact001-test-'));
  try {
    const result = runMissionFact001ScaffoldV1({ mission_id:'M18', out_root:root });
    assert.equal(result.status, 'FACT001_SCAFFOLDS_GENERATED');
    assert.deepEqual(result.target_engines, ['WEB-001','APPBOOT-001']);
    assert.equal(result.generated_file_count, 36);
    assert.ok(result.results.every(item => item.environment === 'SCAFFOLD'));
    assert.ok(result.results.every(item => item.next_gate === 'PREPROD_CONTRACT_TESTS_AND_EVALUATION_REQUIRED'));
  } finally { fs.rmSync(root, { recursive:true, force:true }); }
});
