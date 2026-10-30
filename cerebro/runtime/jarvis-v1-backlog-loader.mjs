import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const SOURCE = path.join(ROOT, 'cerebro/missions/jarvis-v1/JARVIS_MASTER_BACKLOG_V1_2026-10-30.json.br.b64');
const OUT = path.join(ROOT, 'runtime-artifacts/jarvis-v1');
const EXPECTED_SHA256 = '8d2e0793b7ad5afe7a99390dddb650c71892ece883b281e67ac20e966168fb8f';
const EXPECTED = { phases: 26, tasks: 394, microtasks: 5692 };

fs.mkdirSync(OUT, { recursive: true });
const encoded = fs.readFileSync(SOURCE, 'utf8').replace(/\s+/g, '');
const raw = zlib.brotliDecompressSync(Buffer.from(encoded, 'base64'));
const hash = crypto.createHash('sha256').update(raw).digest('hex');
if (hash !== EXPECTED_SHA256) throw new Error(`JARVIS backlog SHA256 mismatch: ${hash}`);
const backlog = JSON.parse(raw.toString('utf8'));
const phases = backlog.phases ?? [];
const tasks = phases.flatMap((p) => p.tasks ?? []);
const microtasks = tasks.flatMap((t) => t.microtasks ?? []);
const actual = { phases: phases.length, tasks: tasks.length, microtasks: microtasks.length };
for (const [k, v] of Object.entries(EXPECTED)) {
  if (actual[k] !== v) throw new Error(`JARVIS backlog count mismatch ${k}: expected ${v}, got ${actual[k]}`);
}

const phaseMap = new Map(phases.map((p) => [p.phase_id, p]));
const p00 = phaseMap.get('P00');
if (!p00) throw new Error('Missing P00');
const initialTasks = (p00.tasks ?? []).filter((t) => t.priority === 'P0');
const initialQueue = initialTasks.flatMap((t) => (t.microtasks ?? []).map((m, index) => ({
  phase_id: 'P00',
  task_id: t.task_id,
  task_title: t.title,
  micro_id: m.micro_id,
  micro_title: m.title,
  priority: t.priority,
  ordinal: index + 1,
  status: index === 0 ? 'EN_COLA' : 'BLOQUEADO_DEPENDENCIA',
  depends_on: index === 0 ? [] : [t.microtasks[index - 1].micro_id],
  environment: 'PREPROD',
  company_id: 'cerebro',
  project_id: 'jarvis-v1'
}));

const validation = {
  schema: 'JARVIS_BACKLOG_VALIDATION_V1',
  generated_at: new Date().toISOString(),
  sha256: hash,
  expected: EXPECTED,
  actual,
  valid: true,
  canonical_spec: backlog.spec,
  date: backlog.date,
  current_phase: 'P00',
  initial_p0_tasks: initialTasks.map((t) => t.task_id),
  initial_queue_microtasks: initialQueue.length,
  production_writes: false,
  paid_ai_usd: 0
};

const state = {
  schema: 'JARVIS_STATE_V1',
  updated_at: new Date().toISOString(),
  mode: 'MAXIMUM_SAFE_THROUGHPUT',
  program_status: 'EJECUTANDO',
  environment: 'PREPROD',
  autonomous_prod: false,
  production_mutation_allowed: false,
  current_milestone: 'BASELINE_GREEN',
  current_phase: 'P00',
  next_block: 'P00 · Gobierno, evidencia y baseline',
  task_graph_sha256: hash,
  counts: actual,
  human_required: [],
  active_tasks: initialTasks.map((t) => t.task_id),
  safe_parallelism: true,
  cost_policy: 'ZERO_COST_FIRST'
};

fs.writeFileSync(path.join(OUT, 'jarvis-backlog-validation.json'), JSON.stringify(validation, null, 2));
fs.writeFileSync(path.join(OUT, 'jarvis-initial-queue.json'), JSON.stringify(initialQueue, null, 2));
fs.writeFileSync(path.join(OUT, 'jarvis-state.json'), JSON.stringify(state, null, 2));
console.log(JSON.stringify(validation, null, 2));
