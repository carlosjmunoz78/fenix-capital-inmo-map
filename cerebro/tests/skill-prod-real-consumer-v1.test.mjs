import test from 'node:test';
import assert from 'node:assert/strict';
import {executeProdSkillCapability} from '../runtime/skill-prod-real-consumer-v1.mjs';

const DREI='repo:fc81dac4018cb6cdf3b2e98a901f';

test('Drei dynamic skill is really consumed in PROD capability runtime through internal wrapper',async()=>{
  const receipt=await executeProdSkillCapability({request_id:'test:drei:product-viewer',candidate_id:DREI,company_id:'fenix',engine_id:'WEB-001',requested_mode:'GENERATE',request:{task:'PRODUCT_VIEWER',goal:'Generate a deterministic internal product viewer scaffold',options:{auto_rotate:true}}});
  assert.equal(receipt.status,'PROD_CAPABILITY_REAL_INTERNAL_EXECUTION_GREEN');
  assert.equal(receipt.environment,'PROD_CAPABILITY');
  assert.equal(receipt.wrapper_id,'skillwrap:drei-internal-v1');
  assert.equal(receipt.result.technical_name,'drei');
  assert.ok(receipt.result.output.recommended_components.includes('Stage'));
  assert.ok(receipt.result.output.recommended_components.includes('OrbitControls'));
  assert.match(receipt.result.output.generated_scaffold,/Stage/);
  assert.equal(receipt.result.provenance.raw_external_skill_code_executed,false);
  assert.equal(receipt.authority.direct_prod_write_authorized,false);
  assert.equal(receipt.authority.external_side_effects_authorized,false);
  assert.equal(receipt.authority.trading_access,false);
  assert.equal(receipt.authority.additional_cost_eur,0);
});

test('same normalized request is semantically deterministic',async()=>{
  const input={candidate_id:DREI,company_id:'fenix',engine_id:'WEB-001',requested_mode:'GENERATE',request:{task:'SCROLL_HERO',goal:'Hero'}};
  const a=await executeProdSkillCapability({request_id:'req:a',...input});
  const b=await executeProdSkillCapability({request_id:'req:b',...input});
  assert.equal(a.result.result_hash,b.result.result_hash);
  assert.deepEqual(a.result.output,b.result.output);
});

test('wrong binding direct WRITE Trading and unknown candidate fail closed',async()=>{
  await assert.rejects(()=>executeProdSkillCapability({request_id:'bad:binding',candidate_id:DREI,engine_id:'FINOPS-001',requested_mode:'GENERATE',request:{task:'PRODUCT_VIEWER'}}),/CAPABILITY_NOT_OPERATIONAL/);
  await assert.rejects(()=>executeProdSkillCapability({request_id:'bad:write',candidate_id:DREI,engine_id:'WEB-001',requested_mode:'WRITE',request:{task:'PRODUCT_VIEWER'}}),/REQUESTED_MODE_NOT_SAFE_INTERNAL/);
  await assert.rejects(()=>executeProdSkillCapability({request_id:'bad:trading',candidate_id:DREI,engine_id:'TRADING-001',requested_mode:'GENERATE',request:{task:'PRODUCT_VIEWER'}}),/TRADING_BINDING_DENIED/);
  await assert.rejects(()=>executeProdSkillCapability({request_id:'bad:unknown',candidate_id:'missing',engine_id:'WEB-001',requested_mode:'GENERATE',request:{task:'PRODUCT_VIEWER'}}),/CAPABILITY_NOT_OPERATIONAL/);
});
