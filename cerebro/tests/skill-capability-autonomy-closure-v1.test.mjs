import test from 'node:test';
import assert from 'node:assert/strict';
import {decideSkillCapabilityAutonomy,SKILL_AUTONOMY_DECISIONS} from '../runtime/skill-capability-autonomy-closure-v1.mjs';

function base(overrides={}){
  const seed={
    company_id:'fenix',environment:'PREPROD',version:'1.0.0',skill_id:'skill-x',skill_version:'abc123',risk_class:'LOW',
    source_ref:'evidence:skill-x@abc123',
    security:{provenance_ok:true,supply_chain_ok:true,license_ok:true,incident:false,legal_required:false},
    evidence:{complete:true,confidence:0.93},
    policy_locked:true,permissions_locked:true,rollback_ready:true,rebuild_ready:true,
    duplicate:{exact:false},demand:{needed_now:true},impact:{existing_engine_bindings:['SEO-001']},
    old_vs_new:{decision:'PASS',reasons:[]},tribunal:{decision:'PASS'},
    cost:{additional_cost_eur:0,zero_cost_alternative:false,roi_positive:false,money_limit_exceeded:false},
    internal_wrapper_ready:true,external_code_execution_required:false
  };
  return structuredClone(Object.assign(seed,overrides));
}

test('canonical decision enum contains exactly the seven governed outcomes',()=>{
  assert.deepEqual(SKILL_AUTONOMY_DECISIONS,[
    'REUTILIZAR','ENVOLVER','CATALOGAR','FABRICAR_GRATIS','HOLD','DESCARTAR','PAGO_JUSTIFICADO'
  ]);
});

test('produces every canonical outcome deterministically',()=>{
  const cases=[
    ['REUTILIZAR',base({duplicate:{exact:true}})],
    ['ENVOLVER',base()],
    ['CATALOGAR',base({impact:{existing_engine_bindings:[]},demand:{needed_now:false}})],
    ['FABRICAR_GRATIS',base({impact:{existing_engine_bindings:[]},demand:{needed_now:true}})],
    ['HOLD',base({evidence:{complete:true,confidence:0.40}})],
    ['DESCARTAR',base({old_vs_new:{decision:'FAIL',reasons:['QUALITY_REGRESSION']}})],
    ['PAGO_JUSTIFICADO',base({cost:{additional_cost_eur:15,zero_cost_alternative:false,roi_positive:true,money_limit_exceeded:false}})]
  ];
  for(const [expected,input] of cases){
    const first=decideSkillCapabilityAutonomy(input);
    const second=decideSkillCapabilityAutonomy(input);
    assert.equal(first.decision,expected);
    assert.equal(second.decision_id,first.decision_id);
  }
});

test('ENVOLVER only authorizes an internal PREPROD wrapper when safety invariants are green',()=>{
  const green=decideSkillCapabilityAutonomy(base());
  assert.equal(green.decision,'ENVOLVER');
  assert.equal(green.preprod_internal_wrapper_activation_authorized,true);
  assert.equal(green.factory_create_authorized,false);
  assert.equal(green.prod_authorized,false);
  assert.equal(green.prod_write_authorized,false);
  assert.equal(green.trading_access,false);
  assert.equal(green.external_code_execution_authorized,false);

  const external=decideSkillCapabilityAutonomy(base({external_code_execution_required:true}));
  assert.equal(external.decision,'ENVOLVER');
  assert.equal(external.preprod_internal_wrapper_activation_authorized,false);
  assert.equal(external.next_gate,'INTERNAL_WRAPPER_REQUIRED');
});

test('verified free capability gap can only become a FACT-001 candidate, never direct engine creation',()=>{
  const out=decideSkillCapabilityAutonomy(base({impact:{existing_engine_bindings:[]}}));
  assert.equal(out.decision,'FABRICAR_GRATIS');
  assert.equal(out.factory_candidate_authorized,true);
  assert.equal(out.factory_create_authorized,false);
  assert.equal(out.next_gate,'FACT001_CAPABILITY_GAP_REVIEW');
  assert.equal(out.additional_cost_eur,0);
});

test('zero-cost alternative rejects paid option before paid exception review',()=>{
  const out=decideSkillCapabilityAutonomy(base({cost:{additional_cost_eur:9,zero_cost_alternative:true,roi_positive:true,money_limit_exceeded:false}}));
  assert.equal(out.decision,'DESCARTAR');
  assert.deepEqual(out.reasons,['ZERO_COST_ALTERNATIVE_AVAILABLE']);
  assert.equal(out.paid_activation_authorized,false);
});

test('money limit stays human-by-exception and does not authorize paid activation',()=>{
  const out=decideSkillCapabilityAutonomy(base({cost:{additional_cost_eur:50,zero_cost_alternative:false,roi_positive:true,money_limit_exceeded:true}}));
  assert.equal(out.decision,'PAGO_JUSTIFICADO');
  assert.equal(out.human_required,'MONEY_LIMIT');
  assert.equal(out.paid_activation_authorized,false);
  assert.equal(out.prod_authorized,false);
});

test('security incident and high risk use only canonical HUMAN_REQUIRED reasons',()=>{
  const security=decideSkillCapabilityAutonomy(base({security:{provenance_ok:true,supply_chain_ok:true,license_ok:true,incident:true}}));
  assert.equal(security.decision,'HOLD');
  assert.equal(security.human_required,'SECURITY_INCIDENT');

  const risk=decideSkillCapabilityAutonomy(base({risk_class:'HIGH'}));
  assert.equal(risk.decision,'HOLD');
  assert.equal(risk.human_required,'HIGH_RISK');
});

test('fails closed outside PREPROD and rejects non-canonical human reason',()=>{
  assert.throws(()=>decideSkillCapabilityAutonomy(base({environment:'PROD'})),/PREPROD-only/);
  assert.throws(()=>decideSkillCapabilityAutonomy(base({tribunal:{decision:'HUMAN_REQUIRED',human_required:'OTHER'}})),/invalid HUMAN_REQUIRED/);
});
