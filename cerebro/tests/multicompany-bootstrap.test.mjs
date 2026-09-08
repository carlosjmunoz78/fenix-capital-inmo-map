import test from 'node:test';
import assert from 'node:assert/strict';
import { MultiCompanyBootstrap, getPhase4Registry, PHASE4_CONTRACT } from '../multicompany/bootstrap.mjs';

const IDS = [
  'COMP-REG-001','COMP-ONB-001','SCAN-001','KW-001','WAUD-001','SOCAUD-001','LOCALP-001','KBOOT-001',
  'SEOBOOT-001','SOCBOOT-001','MKTBOOT-001','CRMBOOT-001','APPBOOT-001','AUTBOOT-001','TRNBOOT-001','ENGACT-001','TENANT-001'
];

test('Phase 4 registry covers exactly the 17 canonical multi-company bootstrap engines', () => {
  const registry = getPhase4Registry();
  assert.equal(registry.engines.length, 17);
  assert.deepEqual(new Set(registry.engines.map(e => e.engine_id)), new Set(IDS));
  assert.equal(registry.prod_execution_enabled, false);
  assert.equal(registry.policy.cross_company_access, 'deny');
  assert.equal(registry.policy.supabase_writes, false);
  assert.equal(registry.additional_cost_target_eur, 0);
  const activation = registry.engines.find(e => e.engine_id === 'ENGACT-001');
  assert.ok(activation.depends_on.includes('TENANT-001'));
});

test('Phase 4 V0 is PREPROD-only and never claims PROD promotion', () => {
  assert.throws(() => new MultiCompanyBootstrap({ environment: 'PROD' }), /PREPROD/);
  assert.throws(() => new MultiCompanyBootstrap({ environment: 'prod' }), /PREPROD/);
  assert.throws(() => new MultiCompanyBootstrap({ environment: 'DEV' }), /PREPROD/);
  const bootstrap = new MultiCompanyBootstrap();
  assert.equal(bootstrap.environment, 'PREPROD');
  assert.equal(PHASE4_CONTRACT.prod_execution_enabled, false);
});

test('Phase 4 environment and version are immutable after construction', () => {
  const bootstrap = new MultiCompanyBootstrap({ environment: 'PREPROD', version: '0.1.0' });
  assert.throws(() => { bootstrap.environment = 'PROD'; }, TypeError);
  assert.throws(() => { bootstrap.version = '9.9.9'; }, TypeError);
  assert.equal(bootstrap.environment, 'PREPROD');
  assert.equal(bootstrap.version, '0.1.0');
  const company = bootstrap.registerCompany({ company_id: 'company-a' }).company;
  assert.equal(company.context.environment, 'PREPROD');
  assert.equal(company.context.version, '0.1.0');
});

test('company registration is isolated and idempotent per company', () => {
  const bootstrap = new MultiCompanyBootstrap();
  const a = bootstrap.registerCompany({ company_id: 'company-a', profile: { name: 'A' } });
  const b = bootstrap.registerCompany({ company_id: 'company-b', profile: { name: 'B' } });
  assert.equal(a.accepted, true);
  assert.equal(b.accepted, true);
  assert.deepEqual(bootstrap.listCompanies(), ['company-a', 'company-b']);
  const duplicate = bootstrap.registerCompany({ company_id: 'company-a', profile: { name: 'mutated' } });
  assert.equal(duplicate.accepted, false);
  assert.equal(bootstrap.inspectCompany('company-a').profile.name, 'A');
  assert.equal(bootstrap.inspectCompany('company-b').profile.name, 'B');
});

test('company profile and evidence reject SharedArrayBuffer-backed data', () => {
  if (typeof SharedArrayBuffer === 'undefined') return;
  const bootstrap = new MultiCompanyBootstrap();
  const shared = new Uint8Array(new SharedArrayBuffer(8));
  assert.throws(
    () => bootstrap.registerCompany({ company_id: 'company-shared', profile: { bytes: shared } }),
    /SharedArrayBuffer/
  );
  assert.deepEqual(bootstrap.listCompanies(), []);

  bootstrap.registerCompany({ company_id: 'company-a' });
  bootstrap.startEngine({ company_id: 'company-a', engine_id: 'COMP-REG-001' });
  assert.throws(
    () => bootstrap.markEngineResult({ company_id: 'company-a', engine_id: 'COMP-REG-001', status: 'SUCCESS', evidence: [shared] }),
    /SharedArrayBuffer/
  );
  assert.equal(bootstrap.inspectCompany('company-a').engines['COMP-REG-001'].state, 'RUNNING');
});

test('failed evidence cloning is atomic and does not mark engine GREEN', () => {
  const bootstrap = new MultiCompanyBootstrap();
  bootstrap.registerCompany({ company_id: 'company-a' });
  bootstrap.startEngine({ company_id: 'company-a', engine_id: 'COMP-REG-001' });
  assert.throws(
    () => bootstrap.markEngineResult({ company_id: 'company-a', engine_id: 'COMP-REG-001', status: 'SUCCESS', evidence: [() => 'not cloneable'] })
  );
  const state = bootstrap.inspectCompany('company-a');
  assert.equal(state.engines['COMP-REG-001'].state, 'RUNNING');
  assert.deepEqual(state.engines['COMP-REG-001'].evidence, []);
});

test('dependencies unlock deterministically without cross-company leakage', () => {
  const bootstrap = new MultiCompanyBootstrap();
  bootstrap.registerCompany({ company_id: 'company-a' });
  bootstrap.registerCompany({ company_id: 'company-b' });

  assert.deepEqual(bootstrap.nextReady('company-a'), ['COMP-REG-001']);
  bootstrap.startEngine({ company_id: 'company-a', engine_id: 'COMP-REG-001' });
  bootstrap.markEngineResult({ company_id: 'company-a', engine_id: 'COMP-REG-001', status: 'SUCCESS', evidence: ['registered'] });

  const readyA = bootstrap.nextReady('company-a');
  assert.ok(readyA.includes('COMP-ONB-001'));
  assert.ok(readyA.includes('TENANT-001'));
  assert.deepEqual(bootstrap.nextReady('company-b'), ['COMP-REG-001']);
});

test('HUMAN_REQUIRED accepts only canonical reasons and blocks that node', () => {
  const bootstrap = new MultiCompanyBootstrap();
  bootstrap.registerCompany({ company_id: 'company-a' });
  bootstrap.startEngine({ company_id: 'company-a', engine_id: 'COMP-REG-001' });
  assert.throws(() => bootstrap.markEngineResult({ company_id: 'company-a', engine_id: 'COMP-REG-001', status: 'HUMAN_REQUIRED', reason: 'OTHER' }), /invalid HUMAN_REQUIRED/);

  const state = bootstrap.markEngineResult({ company_id: 'company-a', engine_id: 'COMP-REG-001', status: 'HUMAN_REQUIRED', reason: 'LEGAL_REQUIRED' });
  assert.equal(state.engines['COMP-REG-001'].state, 'HUMAN_REQUIRED');
  assert.equal(state.engines['COMP-REG-001'].human_required, 'LEGAL_REQUIRED');
  assert.deepEqual(bootstrap.nextReady('company-a'), []);
});

test('ENGACT-001 stays blocked until TENANT-001 is GREEN', () => {
  const bootstrap = new MultiCompanyBootstrap();
  bootstrap.registerCompany({ company_id: 'company-a' });

  for (let guard = 0; guard < 100; guard++) {
    const ready = bootstrap.nextReady('company-a').filter(id => id !== 'TENANT-001' && id !== 'ENGACT-001');
    if (ready.length === 0) break;
    for (const engine_id of ready) {
      bootstrap.startEngine({ company_id: 'company-a', engine_id });
      bootstrap.markEngineResult({ company_id: 'company-a', engine_id, status: 'SUCCESS', evidence: [`green:${engine_id}`] });
    }
  }

  let state = bootstrap.inspectCompany('company-a');
  assert.equal(state.engines['TENANT-001'].state, 'READY');
  assert.equal(state.engines['ENGACT-001'].state, 'BLOCKED');
  assert.ok(!bootstrap.nextReady('company-a').includes('ENGACT-001'));

  bootstrap.startEngine({ company_id: 'company-a', engine_id: 'TENANT-001' });
  bootstrap.markEngineResult({ company_id: 'company-a', engine_id: 'TENANT-001', status: 'SUCCESS', evidence: ['tenant-boundary-green'] });
  state = bootstrap.inspectCompany('company-a');
  assert.equal(state.engines['ENGACT-001'].state, 'READY');
});

test('even when all Phase 4 nodes are green, V0 refuses autonomous PROD promotion', () => {
  const bootstrap = new MultiCompanyBootstrap();
  bootstrap.registerCompany({ company_id: 'company-a' });

  for (let guard = 0; guard < 100; guard++) {
    const ready = bootstrap.nextReady('company-a');
    if (ready.length === 0) break;
    for (const engine_id of ready) {
      bootstrap.startEngine({ company_id: 'company-a', engine_id });
      bootstrap.markEngineResult({ company_id: 'company-a', engine_id, status: 'SUCCESS', evidence: [`green:${engine_id}`] });
    }
  }

  const state = bootstrap.inspectCompany('company-a');
  assert.ok(IDS.every(id => state.engines[id].state === 'GREEN'));
  assert.deepEqual(bootstrap.canPromote('company-a'), {
    allowed: false,
    reason: 'PROD_PROMOTION_NOT_IMPLEMENTED_V0',
    all_green: true
  });
});
