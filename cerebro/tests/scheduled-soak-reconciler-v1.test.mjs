import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_LANES, genuineGreenScheduledRuns, reconcileScheduledSoak } from '../runtime/scheduled-soak-reconciler-v1.mjs';

const scheduled = (id, created_at, overrides = {}) => ({
  id,
  event: 'schedule',
  status: 'completed',
  conclusion: 'success',
  head_branch: 'main',
  head_sha: `sha-${id}`,
  created_at,
  updated_at: created_at,
  run_attempt: 1,
  html_url: `https://github.com/example/repo/actions/runs/${id}`,
  ...overrides
});

test('only genuine completed successful schedule runs on main count', () => {
  const runs = [
    scheduled(1, '2026-10-14T04:17:00Z'),
    scheduled(2, '2026-10-15T04:17:00Z'),
    scheduled(3, '2026-10-16T04:17:00Z'),
    scheduled(4, '2026-10-16T05:00:00Z', { event: 'workflow_dispatch' }),
    scheduled(5, '2026-10-16T05:01:00Z', { conclusion: 'failure' }),
    scheduled(6, '2026-10-16T05:02:00Z', { status: 'in_progress', conclusion: '' }),
    scheduled(7, '2026-10-16T05:03:00Z', { head_branch: 'feature' }),
    scheduled(3, '2026-10-16T04:17:00Z', { run_attempt: 2 })
  ];

  const genuine = genuineGreenScheduledRuns(runs);
  assert.equal(genuine.length, 3);
  assert.deepEqual(genuine.map((run) => run.id), [3, 2, 1]);
  assert.equal(genuine[0].run_attempt, 2);
});

test('two genuine runs remain SOAK_IN_PROGRESS and manual runs cannot satisfy the gate', () => {
  const lane = DEFAULT_LANES[0];
  const report = reconcileScheduledSoak({
    lanes: [lane],
    observed_at: '2026-10-17T00:00:00Z',
    runs_by_lane: {
      [lane.id]: [
        scheduled(10, '2026-10-15T04:17:00Z'),
        scheduled(11, '2026-10-16T04:17:00Z'),
        scheduled(12, '2026-10-16T06:00:00Z', { event: 'workflow_dispatch' })
      ]
    }
  });

  assert.equal(report.status, 'SCHEDULED_SOAKS_IN_PROGRESS');
  assert.equal(report.lanes[0].status, 'SOAK_IN_PROGRESS');
  assert.equal(report.lanes[0].verified_scheduled_green_runs, 2);
  assert.equal(report.lanes[0].missing_scheduled_green_runs, 1);
  assert.equal(report.lanes[0].manual_or_dispatch_runs_count_toward_soak, false);
});

test('all three lanes require three distinct genuine scheduled GREEN runs before READY_TO_CERTIFY', () => {
  const runs_by_lane = {};
  for (const [index, lane] of DEFAULT_LANES.entries()) {
    runs_by_lane[lane.id] = [
      scheduled(100 + index * 10 + 1, '2026-10-14T07:00:00Z'),
      scheduled(100 + index * 10 + 2, '2026-10-15T07:00:00Z'),
      scheduled(100 + index * 10 + 3, '2026-10-16T07:00:00Z')
    ];
  }

  const report = reconcileScheduledSoak({ runs_by_lane, observed_at: '2026-10-17T00:00:00Z' });
  assert.equal(report.status, 'ALL_SCHEDULED_SOAKS_READY_TO_CERTIFY');
  assert.equal(report.lanes.length, 3);
  assert.ok(report.lanes.every((lane) => lane.status === 'READY_TO_CERTIFY'));
  assert.ok(report.lanes.every((lane) => lane.verified_scheduled_green_runs === 3));
  assert.ok(report.lanes.every((lane) => lane.missing_scheduled_green_runs === 0));
});

test('reconciler is evidence-only and cannot expand authority', () => {
  const report = reconcileScheduledSoak({ runs_by_lane: {}, observed_at: '2026-10-17T00:00:00Z' });
  assert.equal(report.certification_boundary.report_is_evidence_only, true);
  assert.equal(report.certification_boundary.repository_mutation_authorized, false);
  assert.equal(report.certification_boundary.registry_auto_promotion_authorized, false);
  assert.equal(report.certification_boundary.prod_promotion_authorized, false);
  assert.equal(report.authority.prod_authorized, false);
  assert.equal(report.authority.prod_write_authorized, false);
  assert.equal(report.authority.provider_write_authorized, false);
  assert.equal(report.authority.crm_write_authorized, false);
  assert.equal(report.authority.customer_data_authorized, false);
  assert.equal(report.authority.external_skill_code_execution, false);
  assert.equal(report.authority.spend_authorized, false);
  assert.equal(report.authority.trading_access, false);
  assert.equal(report.authority.additional_cost_eur, 0);
});
