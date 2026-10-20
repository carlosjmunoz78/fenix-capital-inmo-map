import test from 'node:test';
import assert from 'node:assert/strict';
import {executeProdSkillCapability} from '../runtime/skill-prod-real-consumer-v1.mjs';

const COGNITO='repo:be539f32206970b088329ceaf60b';
const EC2='repo:9a0225a6e15ebccefb2b18c38eaf';
const DESIGN='repo:45634853e08ec0e33ec3f9cceacd';
const DREI='repo:fc81dac4018cb6cdf3b2e98a901f';
const FIGMA='repo:92207779a87a5dd5282b5b69b099';

const CASES=[
  {name:'aws-cognito',candidate_id:COGNITO,engine_id:'APP-001',requested_mode:'PLAN',task:'AUTH_ARCHITECTURE_PLAN',check:r=>assert.ok(r.output.recommended_layers.includes('JWT verification boundary'))},
  {name:'aws-ec2',candidate_id:EC2,engine_id:'SEC-001',requested_mode:'PLAN',task:'INSTANCE_ARCHITECTURE_PLAN',check:r=>assert.ok(r.output.baseline_controls.some(x=>/least-privilege/i.test(x)))},
  {name:'design-md',candidate_id:DESIGN,engine_id:'ARCH-001',requested_mode:'GENERATE',task:'DESIGN_SYSTEM_SCAFFOLD',check:r=>assert.match(r.output.generated_markdown,/## Foundations/)},
  {name:'drei',candidate_id:DREI,engine_id:'WEB-001',requested_mode:'GENERATE',task:'PRODUCT_VIEWER',check:r=>{assert.ok(r.output.recommended_components.includes('Stage'));assert.ok(r.output.recommended_components.includes('OrbitControls'));}},
  {name:'figma-to-code',candidate_id:FIGMA,engine_id:'APP-001',requested_mode:'GENERATE',task:'CODE_SCAFFOLD',check:r=>assert.match(r.output.generated_scaffold,/Page/)}
];

test('all five governed dynamic skills are really consumed through internal wrappers',async()=>{
  for(const item of CASES){
    const receipt=await executeProdSkillCapability({
      request_id:`test:${item.name}`,
      candidate_id:item.candidate_id,
      company_id:'fenix',
      engine_id:item.engine_id,
      requested_mode:item.requested_mode,
      request:{task:item.task,goal:`Representative governed ${item.name} execution`,design_summary:'Normalized internal design evidence for test only'}
    });
    assert.equal(receipt.status,'PROD_CAPABILITY_REAL_INTERNAL_EXECUTION_GREEN');
    assert.equal(receipt.environment,'PROD_CAPABILITY');
    assert.equal(receipt.technical_name,item.name);
    assert.equal(receipt.result.technical_name,item.name);
    item.check(receipt.result);
    assert.equal(receipt.result.provenance.raw_external_skill_code_executed,false);
    assert.equal(receipt.result.authority.dependency_install_authorized,false);
    assert.equal(receipt.authority.direct_prod_write_authorized,false);
    assert.equal(receipt.authority.external_side_effects_authorized,false);
    assert.equal(receipt.authority.external_skill_code_execution,false);
    assert.equal(receipt.authority.trading_access,false);
    assert.equal(receipt.authority.additional_cost_eur,0);
  }
});

test('same normalized request is semantically deterministic for every wrapper',async()=>{
  for(const item of CASES){
    const input={candidate_id:item.candidate_id,company_id:'fenix',engine_id:item.engine_id,requested_mode:item.requested_mode,request:{task:item.task,goal:'Determinism probe',design_summary:'Stable normalized design evidence'}};
    const a=await executeProdSkillCapability({request_id:`det:a:${item.name}`,...input});
    const b=await executeProdSkillCapability({request_id:`det:b:${item.name}`,...input});
    assert.equal(a.result.result_hash,b.result.result_hash,`${item.name} result hash should be deterministic`);
    assert.deepEqual(a.result.output,b.result.output,`${item.name} output should be deterministic`);
  }
});

test('wrong binding direct WRITE Trading and unknown candidate fail closed',async()=>{
  await assert.rejects(()=>executeProdSkillCapability({request_id:'bad:binding',candidate_id:DREI,engine_id:'FINOPS-001',requested_mode:'GENERATE',request:{task:'PRODUCT_VIEWER'}}),/CAPABILITY_NOT_OPERATIONAL/);
  await assert.rejects(()=>executeProdSkillCapability({request_id:'bad:write',candidate_id:DREI,engine_id:'WEB-001',requested_mode:'WRITE',request:{task:'PRODUCT_VIEWER'}}),/REQUESTED_MODE_NOT_SAFE_INTERNAL/);
  await assert.rejects(()=>executeProdSkillCapability({request_id:'bad:trading',candidate_id:DREI,engine_id:'TRADING-001',requested_mode:'GENERATE',request:{task:'PRODUCT_VIEWER'}}),/TRADING_BINDING_DENIED/);
  await assert.rejects(()=>executeProdSkillCapability({request_id:'bad:unknown',candidate_id:'missing',engine_id:'WEB-001',requested_mode:'GENERATE',request:{task:'PRODUCT_VIEWER'}}),/CAPABILITY_NOT_OPERATIONAL/);
});
