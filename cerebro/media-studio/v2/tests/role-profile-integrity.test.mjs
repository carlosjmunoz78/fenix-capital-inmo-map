import test from 'node:test';
import assert from 'node:assert/strict';
import { materializeRoleProfiles,roleProfileSummary,getRoleProfile } from '../registry/role-profile-factory.mjs';

test('all 529 logical roles receive an executable professional profile',()=>{
  const s=roleProfileSummary();
  assert.equal(s.total,529);
  assert.equal(s.knowledge_bootstrap_required,529);
  assert.equal(s.by_class.BRAIN,1);
  assert.equal(s.by_class.HEAD,48);
  assert.equal(s.by_class.SPECIALIST,384);
  assert.equal(s.by_class.SUPERVISOR,32);
  assert.equal(s.by_class.JUDGE,48);
  assert.equal(s.by_class.GUARDIAN,16);
});

test('critical voice and digital-human specialists have daily learning and governance gates',()=>{
  for(const id of ['D09-A01','D10-A03','D11-A03','D11-A04','D12-A04','D28-A08','D48-A01']){
    const p=getRoleProfile(id);
    assert.ok(p,id);
    assert.equal(p.learning.daily_inbox,true);
    assert.equal(p.learning.requires_old_vs_new,true);
    assert.equal(p.safety.rights_gate,true);
    assert.equal(p.safety.license_gate,true);
    assert.equal(p.evidence.provenance_required,true);
  }
});

test('independent review roles are not configured as ordinary executors',()=>{
  const profiles=materializeRoleProfiles();
  for(const p of profiles.filter(x=>['SUPERVISOR','JUDGE','GUARDIAN'].includes(x.role_class))) assert.notEqual(p.autonomy,'EXECUTE_WITHIN_CONTRACT');
});
