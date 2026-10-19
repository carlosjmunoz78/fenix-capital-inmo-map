import fs from 'node:fs';

const CONTRACT_URL = new URL('../registry/cerebro-fast-evolution-execution.v1.json', import.meta.url);

function readContract() {
  const contract = JSON.parse(fs.readFileSync(CONTRACT_URL, 'utf8'));
  if (contract.environment !== 'PREPROD') throw new Error('FAST_EVOLUTION_PREPROD_ONLY');
  if (contract.execution_model?.primary_trigger !== 'EVENT_DRIVEN') throw new Error('FAST_EVOLUTION_EVENT_DRIVEN_REQUIRED');
  if (contract.parallelism?.bounded_parallelism !== true) throw new Error('FAST_EVOLUTION_BOUNDED_PARALLELISM_REQUIRED');
  if (Number(contract.authority?.additional_cost_eur) !== 0) throw new Error('FAST_EVOLUTION_ZERO_COST_REQUIRED');
  if (contract.authority?.prod_authorized !== false || contract.authority?.prod_write_authorized !== false) throw new Error('FAST_EVOLUTION_PROD_DENIED_REQUIRED');
  return contract;
}

const PRIORITY = Object.freeze({P0: 0, P1: 1, P2: 2, P3: 3});

function routeSignal(signal = {}) {
  const type = String(signal.type ?? 'PROACTIVE_IMPROVEMENT').toUpperCase();
  if (type === 'SECURITY_FINDING') return {priority: 'P0', fronts: ['CYBERSECURITY_BLUE_TEAM', 'CYBERSECURITY_PURPLE_TEAM'], engines: ['SEC-001', 'SEC-002', 'RED-001', 'IAM-001', 'INC-001', 'QA-001']};
  if (type === 'ERROR' || type === 'REGRESSION') return {priority: 'P0', fronts: ['RELIABILITY_AND_QA', 'PERFORMANCE_AND_SPEED'], engines: ['LRN-001', 'QA-001', 'OBSERV-001']};
  if (type === 'HUMAN_FEEDBACK') return {priority: 'P1', fronts: ['HUMAN_AI_COMMUNICATION'], engines: ['LRN-001', 'HCI-001', 'CHAT-001', 'CTX-001', 'WHY-001']};
  if (type === 'PERFORMANCE_REGRESSION') return {priority: 'P1', fronts: ['PERFORMANCE_AND_SPEED'], engines: ['LRN-001', 'OBSERV-001', 'FINOPS-001']};
  if (type === 'COST_REGRESSION') return {priority: 'P1', fronts: ['COST_AND_FINOPS'], engines: ['LRN-001', 'FINOPS-001']};
  if (type === 'NEW_CAPABILITY' || type === 'DEPENDENCY_CHANGE' || type === 'NEW_EVIDENCE') return {priority: 'P2', fronts: ['CAPABILITY_ACQUISITION', 'ARCHITECTURE_AND_TECH_DEBT'], engines: ['RSH-001', 'FACT-001', 'LRN-001']};
  if (type === 'MARKET_SIGNAL') return {priority: 'P2', fronts: ['MARKET_AND_COMPETITOR_INTELLIGENCE', 'PRODUCTIZATION'], engines: ['RSH-001', 'COMPET-001', 'LRN-001']};
  return {priority: 'P3', fronts: ['AUTOMATION_AND_AUTONOMY', 'PRODUCTIZATION'], engines: ['LRN-001', 'FACT-001']};
}

function signalKey(signal, index) {
  return String(signal.id ?? `${String(signal.type ?? 'PROACTIVE_IMPROVEMENT').toUpperCase()}:${JSON.stringify(signal.payload ?? null)}:${index}`);
}

export function buildFastEvolutionPlan({signals = [], now = new Date().toISOString()} = {}) {
  const contract = readContract();
  const sourceSignals = Array.isArray(signals) && signals.length ? signals : [{id: 'proactive:default', type: 'PROACTIVE_IMPROVEMENT'}];
  const seen = new Set();
  const tasks = [];

  sourceSignals.forEach((signal, index) => {
    const key = signalKey(signal, index);
    if (seen.has(key)) return;
    seen.add(key);
    const route = routeSignal(signal);
    const front = route.fronts[0];
    tasks.push(Object.freeze({
      task_id: `fast:${key}`,
      signal_id: key,
      signal_type: String(signal.type ?? 'PROACTIVE_IMPROVEMENT').toUpperCase(),
      priority: route.priority,
      front,
      related_fronts: Object.freeze([...route.fronts]),
      engine_chain: Object.freeze([...route.engines, 'EVA-001', 'JDG-001']),
      execution_path: Object.freeze([...contract.fast_path]),
      latency_class: route.priority === 'P0' ? 'MICRO_EXPERIMENT' : 'CANDIDATE_SCORE',
      deterministic_fast_path_before_ai: true,
      old_vs_new_required: true,
      tribunal_required: true,
      prod_authorized: false,
      prod_write_authorized: false,
      additional_cost_eur: 0
    }));
  });

  tasks.sort((a, b) => PRIORITY[a.priority] - PRIORITY[b.priority] || a.task_id.localeCompare(b.task_id));
  const maxActive = Number(contract.parallelism.max_active_fronts);
  const wave = tasks.slice(0, maxActive);
  const deferred = tasks.slice(maxActive);

  return Object.freeze({
    schema_version: '1.0.0',
    state_type: 'CEREBRO_FAST_EVOLUTION_PLAN_V1',
    company_id: 'GLOBAL',
    engine_id: 'LRN-001',
    environment: 'PREPROD',
    generated_at: new Date(now).toISOString(),
    status: 'FAST_PATH_READY_PREPROD',
    trigger_mode: contract.execution_model.primary_trigger,
    batch_coalescing_ms: contract.execution_model.batch_coalescing_ms,
    max_active_fronts: maxActive,
    tasks_total: tasks.length,
    active_wave: Object.freeze(wave),
    deferred_queue: Object.freeze(deferred),
    heavy_work_async: contract.execution_model.heavy_work_async,
    blocked_work_never_blocks_other_safe_fronts: contract.execution_model.blocked_work_never_blocks_other_safe_fronts,
    metrics_required: Object.freeze([...contract.required_cycle_metrics]),
    authority: Object.freeze({...contract.authority}),
    next_gate: 'ENQUEUE_ACTIVE_WAVE_VIA_EXISTING_JOB001_AND_MEASURE_SIGNAL_TO_DECISION_LATENCY'
  });
}

export const CEREBRO_FAST_EVOLUTION_PLANNER_V1_CONTRACT = Object.freeze({
  environment: 'PREPROD',
  event_driven: true,
  deterministic_fast_path_before_ai: true,
  bounded_parallelism: true,
  max_active_fronts: 5,
  existing_job_runtime: 'JOB-001',
  evaluation: 'EVA-001',
  tribunal: 'JDG-001',
  prod_authorized: false,
  prod_write_authorized: false,
  additional_cost_eur: 0
});
