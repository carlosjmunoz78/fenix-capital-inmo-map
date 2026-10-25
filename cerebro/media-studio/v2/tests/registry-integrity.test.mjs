import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSourceRegistry, materializeRoles, registrySummary } from '../registry/role-registry.mjs';

test('UMS V2 materializes exactly 529 logical base roles', () => {
  const summary = registrySummary();
  assert.deepEqual(summary, {
    studio_brain: 1,
    departments: 48,
    specialists: 384,
    supervisors: 32,
    tribunals: 12,
    judges: 48,
    guardians: 16,
    total_roles: 529,
  });
});

test('all role IDs are unique', () => {
  const roles = materializeRoles();
  const ids = roles.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('every department has exactly eight specialists', () => {
  const d = loadSourceRegistry();
  assert.equal(d.departments.length, 48);
  for (const dept of d.departments) {
    assert.equal(dept.specialists?.length, 8, `${dept.id} must have 8 specialists`);
    for (const specialist of dept.specialists) {
      assert.match(specialist.id, new RegExp(`^${dept.id}-A0[1-8]$`));
    }
  }
});

test('every tribunal has exactly four judges', () => {
  const d = loadSourceRegistry();
  assert.equal(d.tribunals.length, 12);
  for (const tribunal of d.tribunals) assert.equal(tribunal.judges?.length, 4, `${tribunal.id} must have 4 judges`);
});

test('critical clone and learning departments are present', () => {
  const d = loadSourceRegistry();
  const ids = new Set(d.departments.map((x) => x.id));
  for (const id of ['D09', 'D10', 'D11', 'D12', 'D48']) assert.ok(ids.has(id), `${id} missing`);
});

test('identity/voice guardians are present and independent', () => {
  const d = loadSourceRegistry();
  const ids = new Set(d.guardians.map((x) => x.id));
  for (const id of ['GRD-02', 'GRD-03', 'GRD-04', 'GRD-06', 'GRD-11', 'GRD-12', 'GRD-13']) assert.ok(ids.has(id), `${id} missing`);
});
