import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEFAULT_LANES = [
  {
    id: 'WATCH_LEARN_47',
    workflow_file: 'cerebro-watch-learn-remote-observation-v0.yml',
    required_runs: 3,
    registry_ref: 'cerebro/registry/watch-learn-remote-observation.v0.json',
    next_gate: 'THREE_GENUINE_SCHEDULED_RUNS_GREEN_AND_RETENTION_REVIEW'
  },
  {
    id: 'COMPET_REAL_SOURCE_SCHEDULED_SOAK',
    workflow_file: 'cerebro-compet-real-targets-v0.yml',
    required_runs: 3,
    registry_ref: 'cerebro/registry/compet-real-targets.v0.json',
    next_gate: 'THREE_CONTINUOUS_REAL_COMPETITOR_SCHEDULED_RUNS_GREEN'
  },
  {
    id: 'CAP_REAL_SOURCE_SCHEDULED_SOAK',
    workflow_file: 'cerebro-cap-ieca-cordoba-v0.yml',
    required_runs: 3,
    registry_ref: 'cerebro/registry/cap-ieca-cordoba.v0.json',
    next_gate: 'THREE_GENUINE_SCHEDULED_PREPROD_RUNS_GREEN'
  }
];

function normalizeRun(run) {
  return {
    id: Number(run.id),
    event: String(run.event ?? ''),
    status: String(run.status ?? ''),
    conclusion: String(run.conclusion ?? ''),
    head_branch: String(run.head_branch ?? ''),
    head_sha: String(run.head_sha ?? ''),
    created_at: String(run.created_at ?? ''),
    updated_at: String(run.updated_at ?? ''),
    run_attempt: Number(run.run_attempt ?? 1),
    html_url: String(run.html_url ?? '')
  };
}

export function genuineGreenScheduledRuns(runs = []) {
  const deduped = new Map();
  for (const raw of runs) {
    const run = normalizeRun(raw);
    if (!Number.isFinite(run.id) || run.id <= 0) continue;
    if (run.event !== 'schedule') continue;
    if (run.status !== 'completed') continue;
    if (run.conclusion !== 'success') continue;
    if (run.head_branch !== 'main') continue;
    const previous = deduped.get(run.id);
    if (!previous || run.run_attempt > previous.run_attempt) deduped.set(run.id, run);
  }
  return [...deduped.values()].sort((a, b) => {
    const time = Date.parse(b.created_at) - Date.parse(a.created_at);
    if (Number.isFinite(time) && time !== 0) return time;
    return b.id - a.id;
  });
}

export function reconcileScheduledSoak({ lanes = DEFAULT_LANES, runs_by_lane = {}, observed_at = new Date().toISOString() } = {}) {
  const results = lanes.map((lane) => {
    const genuine = genuineGreenScheduledRuns(runs_by_lane[lane.id] ?? []);
    const required = Number(lane.required_runs ?? 3);
    const verified = genuine.length;
    const selected = genuine.slice(0, required);
    const ready = verified >= required;
    return {
      id: lane.id,
      workflow_file: lane.workflow_file,
      registry_ref: lane.registry_ref,
      next_gate: lane.next_gate,
      required_scheduled_green_runs: required,
      verified_scheduled_green_runs: verified,
      status: ready ? 'READY_TO_CERTIFY' : 'SOAK_IN_PROGRESS',
      missing_scheduled_green_runs: Math.max(0, required - verified),
      qualifying_run_ids: selected.map((run) => run.id),
      qualifying_runs: selected,
      manual_or_dispatch_runs_count_toward_soak: false,
      failed_or_cancelled_runs_count_toward_soak: false,
      non_main_runs_count_toward_soak: false
    };
  });

  const allReady = results.every((lane) => lane.status === 'READY_TO_CERTIFY');
  return {
    schema_version: '1.0.0',
    state_type: 'CEREBRO_SCHEDULED_SOAK_RECONCILIATION_REPORT',
    company_id: 'GLOBAL',
    engine_id: 'LRN-001',
    environment: 'PREPROD',
    version: 'v1',
    observed_at,
    status: allReady ? 'ALL_SCHEDULED_SOAKS_READY_TO_CERTIFY' : 'SCHEDULED_SOAKS_IN_PROGRESS',
    lanes: results,
    certification_boundary: {
      report_is_evidence_only: true,
      repository_mutation_authorized: false,
      registry_auto_promotion_authorized: false,
      prod_promotion_authorized: false,
      requires_governed_registry_update_after_ready: true
    },
    authority: {
      prod_authorized: false,
      prod_write_authorized: false,
      provider_write_authorized: false,
      crm_write_authorized: false,
      customer_data_authorized: false,
      external_skill_code_execution: false,
      spend_authorized: false,
      trading_access: false,
      additional_cost_eur: 0
    }
  };
}

async function fetchWorkflowRuns({ repository, workflowFile, token }) {
  const [owner, repo] = repository.split('/');
  if (!owner || !repo) throw new Error('GITHUB_REPOSITORY must be owner/repo');
  if (!token) throw new Error('GITHUB_TOKEN is required for live mode');
  const endpoint = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/workflows/${encodeURIComponent(workflowFile)}/runs?event=schedule&status=completed&branch=main&per_page=100`;
  const response = await fetch(endpoint, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'cerebro-scheduled-soak-reconciler-v1'
    }
  });
  if (!response.ok) throw new Error(`GitHub Actions read failed for ${workflowFile}: HTTP ${response.status}`);
  const body = await response.json();
  return Array.isArray(body.workflow_runs) ? body.workflow_runs : [];
}

export async function reconcileLive({ repository, token, lanes = DEFAULT_LANES, observed_at = new Date().toISOString() }) {
  const runs_by_lane = {};
  for (const lane of lanes) {
    runs_by_lane[lane.id] = await fetchWorkflowRuns({ repository, workflowFile: lane.workflow_file, token });
  }
  return reconcileScheduledSoak({ lanes, runs_by_lane, observed_at });
}

function parseArgs(argv) {
  const args = { mode: 'fixture', fixture: null, out: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--mode') args.mode = argv[++i];
    else if (arg === '--fixture') args.fixture = argv[++i];
    else if (arg === '--out') args.out = argv[++i];
    else if (arg === '--help') args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log('Usage: node scheduled-soak-reconciler-v1.mjs --mode live|fixture [--fixture file.json] [--out report.json]');
    return;
  }

  let report;
  if (args.mode === 'live') {
    report = await reconcileLive({
      repository: process.env.GITHUB_REPOSITORY ?? '',
      token: process.env.GITHUB_TOKEN ?? '',
      observed_at: new Date().toISOString()
    });
  } else if (args.mode === 'fixture') {
    if (!args.fixture) throw new Error('--fixture is required in fixture mode');
    const fixture = JSON.parse(fs.readFileSync(args.fixture, 'utf8'));
    report = reconcileScheduledSoak(fixture);
  } else {
    throw new Error(`Unsupported mode: ${args.mode}`);
  }

  const output = `${JSON.stringify(report, null, 2)}\n`;
  if (args.out) fs.writeFileSync(args.out, output, 'utf8');
  else process.stdout.write(output);
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isCli) {
  main().catch((error) => {
    console.error(error?.stack ?? String(error));
    process.exitCode = 1;
  });
}
