import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {materializeRoleProfiles, roleProfileSummary} from '../registry/role-profile-factory.mjs';
import {registrySummary} from '../registry/role-registry.mjs';

const charter = JSON.parse(readFileSync(new URL('../../../governance/universal-agent-excellence-charter.v1.json', import.meta.url), 'utf8'));
test('UMS 529 roles of every class inherit universal merit and owner accountability',()=>{
  const roles=materializeRoleProfiles();
  const summary=roleProfileSummary();
  assert.equal(summary.total,529);
  assert.equal(registrySummary().total_roles,529);
  assert.equal(new Set(roles.map(x=>x.id)).size,529);
  for(const role of roles){
    assert.equal(role.merit_charter_id,charter.policy_id,role.id);
    assert.deepEqual(role.mandatory_merit_instructions,charter.mandatory_instructions,role.id);
    assert.equal(role.accountability.ultimate_human_authority,'AUTHORIZED_OWNER',role.id);
    assert.equal(role.accountability.no_other_human_manager,true,role.id);
    assert.equal(role.accountability.legal_exceptions_preserved,true,role.id);
    assert.equal(role.merit_assessment.no_self_promotion,true,role.id);
    assert.ok(role.merit_assessment.rewards.includes('AUTONOMY_PROMOTION_CANDIDACY'),role.id);
    assert.ok(role.merit_assessment.underperformance.includes('REPLACE_IF_BETTER_CONFIRMED'),role.id);
  }
  for(const category of ['BRAIN','HEAD','SPECIALIST','SUPERVISOR','JUDGE','GUARDIAN']){
    assert.ok(roles.some(x=>x.role_class===category),category);
  }
});
test('internal supervisory independence and external safety limits are preserved',()=>{
  const roles=materializeRoleProfiles();
  const controls=roles.filter(x=>['SUPERVISOR','JUDGE','GUARDIAN'].includes(x.role_class));
  assert.equal(controls.length,96);
  assert.ok(controls.every(x=>x.autonomy!=='EXECUTE_WITHIN_CONTRACT'));
  assert.ok(controls.every(x=>x.safety.rights_gate&&x.safety.license_gate&&x.safety.security_gate&&x.safety.cost_gate));
  assert.equal(charter.accountability.do_not_bypass_legal_human_duties,true);
  assert.equal(charter.accountability.do_not_bypass_customer_human_request,true);
  assert.ok(charter.merit.safeguards.includes('NO_PERMISSIONS_SELF_ESCALATION'));
  assert.ok(charter.merit.safeguards.includes('NO_REMOVAL_WITHOUT_ROLLBACK'));
  assert.equal(charter.integration.prod_unchanged,true);
});
