import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_LEDGER = path.join(__dirname, 'cerebro-184-live-convergence.v2.json');
const REPO_ROOT = path.resolve(__dirname, '..', '..');

export function parseRange(value) {
  const match = /^(\d+)-(\d+)$/.exec(String(value || '').trim());
  if (!match) throw new Error(`INVALID_RANGE:${value}`);
  const start = Number(match[1]);
  const end = Number(match[2]);
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start) {
    throw new Error(`INVALID_RANGE:${value}`);
  }
  return { start, end, count: end - start + 1 };
}

export function validateConvergenceLedger(ledger, { repoRoot = REPO_ROOT, checkFiles = true } = {}) {
  if (!ledger || ledger.state_type !== 'CEREBRO_184_LIVE_CONVERGENCE_V2') {
    throw new Error('INVALID_STATE_TYPE');
  }
  if (ledger.catalog_size !== 184) throw new Error('CATALOG_SIZE_MUST_BE_184');
  if (ledger.company_id !== 'GLOBAL' || ledger.engine_id !== 'FACT-001') {
    throw new Error('INVALID_EXECUTION_IDENTITY');
  }
  if (ledger.environment !== 'PREPROD') throw new Error('PREPROD_ONLY');

  const normalizedItemCount = Number(ledger.normalized_item_count ?? 0);
  const remainingItemCount = Number(ledger.remaining_item_normalization_count ?? ledger.catalog_size);
  if (!Number.isInteger(normalizedItemCount) || normalizedItemCount < 0 || normalizedItemCount > ledger.catalog_size) {
    throw new Error('NORMALIZED_ITEM_COUNT_INVALID');
  }
  if (!Number.isInteger(remainingItemCount) || remainingItemCount < 0 || remainingItemCount > ledger.catalog_size) {
    throw new Error('REMAINING_ITEM_COUNT_INVALID');
  }
  if (normalizedItemCount + remainingItemCount !== ledger.catalog_size) {
    throw new Error('ITEM_NORMALIZATION_COUNTS_MUST_SUM_TO_CATALOG');
  }

  const authority = ledger.authority || {};
  const deniedAuthority = [
    'prod_authorized',
    'prod_write_authorized',
    'auto_merge_authorized',
    'external_skill_code_execution_authorized',
    'customer_data_authorized',
    'trading_access',
    'automatic_paid_fallback'
  ];
  for (const key of deniedAuthority) {
    if (authority[key] !== false) throw new Error(`AUTHORITY_MUST_REMAIN_FALSE:${key}`);
  }
  if (authority.additional_cost_eur !== 0) throw new Error('ADDITIONAL_COST_MUST_BE_ZERO');

  if (ledger.deployment_boundary?.main_is_cloudflare_production_branch !== false) {
    throw new Error('MAIN_MUST_NOT_BE_CLOUDFLARE_PRODUCTION_BRANCH');
  }
  if (ledger.deployment_boundary?.cloudflare_production_branch !== 'deploy/cloudflare-prod') {
    throw new Error('UNEXPECTED_CLOUDFLARE_PRODUCTION_BRANCH');
  }

  const coverage = new Map();
  const missingEvidenceFiles = [];
  const blocks = Array.isArray(ledger.blocks) ? ledger.blocks : [];
  if (blocks.length === 0) throw new Error('NO_BLOCKS');

  for (const block of blocks) {
    const range = parseRange(block.range);
    if (block.count !== range.count) throw new Error(`BLOCK_COUNT_MISMATCH:${block.range}`);
    if (!block.state) throw new Error(`BLOCK_STATE_MISSING:${block.range}`);
    if (!block.next_gate) throw new Error(`NEXT_GATE_MISSING:${block.range}`);

    for (let item = range.start; item <= range.end; item += 1) {
      if (coverage.has(item)) throw new Error(`DUPLICATE_ITEM:${item}`);
      coverage.set(item, block.range);
    }

    for (const relative of [block.registry, block.item_level_reconciliation].filter(Boolean)) {
      if (checkFiles && !fs.existsSync(path.join(repoRoot, relative))) missingEvidenceFiles.push(relative);
    }
  }

  const missingItems = [];
  for (let item = 1; item <= ledger.catalog_size; item += 1) {
    if (!coverage.has(item)) missingItems.push(item);
  }
  if (missingItems.length) throw new Error(`MISSING_ITEMS:${missingItems.join(',')}`);
  if (coverage.size !== ledger.catalog_size) throw new Error('COVERAGE_SIZE_MISMATCH');
  if (missingEvidenceFiles.length) {
    throw new Error(`MISSING_EVIDENCE_FILES:${[...new Set(missingEvidenceFiles)].join(',')}`);
  }

  const active = blocks.filter((block) =>
    block.state.includes('REAUDIT') ||
    block.state.includes('CHILD_GAPS') ||
    block.state.includes('PLAN_ONLY') ||
    block.state.includes('SIMULATION_ONLY') ||
    block.state.includes('CATALOG_ONLY') ||
    block.state.includes('SIDE_EFFECTS_DISABLED')
  );
  const terminalAtDeclaredScope = blocks.filter((block) =>
    block.state === 'INTEGRATED_MAIN_VALIDATED_TRANSVERSAL' ||
    block.state === 'INTEGRATED_MAIN_ITEM_LEVEL_RECONCILED'
  );

  return {
    schema_version: '1.1.0',
    state_type: 'CEREBRO_184_LIVE_CONVERGENCE_REPORT_V1',
    status: active.length ? 'GREEN_COVERAGE_ACTIVE_CONVERGENCE' : 'GREEN_TERMINAL',
    company_id: ledger.company_id,
    engine_id: ledger.engine_id,
    environment: ledger.environment,
    version: ledger.version,
    base_main_sha: ledger.base_main_sha,
    catalog_size: ledger.catalog_size,
    covered_items: coverage.size,
    coverage_complete: coverage.size === ledger.catalog_size,
    blocks_total: blocks.length,
    blocks_terminal_at_declared_scope: terminalAtDeclaredScope.map((block) => block.range),
    blocks_active_or_partial: active.map((block) => ({
      range: block.range,
      state: block.state,
      next_gate: block.next_gate
    })),
    next: ledger.priority_queue?.[0] || null,
    full_item_count: normalizedItemCount,
    remaining_item_count: remainingItemCount,
    item_count_reason: 'FULL counts item-level rollout entries normalized to their justified terminal/integrated state; it does not mean every child capability is physically live or PROD-authorized.',
    human_required: [],
    prod: {
      authorized: false,
      write_authorized: false,
      cloudflare_production_branch: ledger.deployment_boundary.cloudflare_production_branch,
      main_is_production_branch: false
    },
    trading_access: false,
    additional_cost_eur: 0
  };
}

export function runConvergenceController({ ledgerPath = DEFAULT_LEDGER, repoRoot = REPO_ROOT } = {}) {
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  return validateConvergenceLedger(ledger, { repoRoot, checkFiles: true });
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    const report = runConvergenceController();
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${JSON.stringify({ status: 'RED_FAIL_CLOSED', error: error.message })}\n`);
    process.exitCode = 1;
  }
}
