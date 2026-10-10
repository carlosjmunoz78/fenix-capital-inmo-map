import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runFactoryRequestV1 } from '../runtime/fact001-request-runner-v1.mjs';

const root=path.resolve(new URL('..',import.meta.url).pathname);
const registryFile=path.join(root,'registry','engine-registry.v1.json');
const hci=path.join(root,'factory','requests-v1','hci001-human-cerebro-experience.v0.json');
const motion=path.join(root,'factory','requests-v1','motion001-cerebro-presence-motion.v0.json');

test('FACT-001 V1 creates HCI-001 and MOTION-001 as structural-only safe scaffolds',()=>{
  for(const requestFile of [hci,motion]){
    const out=fs.mkdtempSync(path.join(os.tmpdir(),'fact001-v1-request-'));
    const result=runFactoryRequestV1({requestFile,outDir:out,registryFile});
    assert.equal(result.status,'FACTORY_SCAFFOLD_GREEN');assert.equal(result.generated_file_count,18);assert.equal(result.environment,'SCAFFOLD');assert.equal(result.additional_cost_eur,0);assert.equal(result.prod_authorized,false);assert.equal(result.prod_write_authorized,false);assert.equal(result.trading_access,false);assert.equal(result.external_code_execution,false);assert.equal(result.base_registry_preserved,true);assert.equal(result.next_gate,'PREPROD_CONTRACT_TESTS_AND_EVALUATION_REQUIRED');
    assert.ok(['HCI-001','MOTION-001'].includes(result.engine_id));assert.ok(fs.existsSync(path.join(out,'fact001-result.json')));
  }
});

test('FACT-001 V1 is deterministic per request',()=>{
  const a=fs.mkdtempSync(path.join(os.tmpdir(),'fact001-v1-a-')),b=fs.mkdtempSync(path.join(os.tmpdir(),'fact001-v1-b-'));
  const one=runFactoryRequestV1({requestFile:hci,outDir:a,registryFile});const two=runFactoryRequestV1({requestFile:hci,outDir:b,registryFile});
  assert.equal(one.bundle_sha256,two.bundle_sha256);assert.equal(one.idempotency_key,two.idempotency_key);
});
