import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const SOURCE_DIR = path.join(ROOT, 'cerebro/missions/jarvis-v1/backlog');
const OUT = path.join(ROOT, 'runtime-artifacts/jarvis-v1');
const EXPECTED_COMPACT_SHA256 = '8a7a94dbe8047987d6cde18bf4ca8b3ba3dcc747b4575b78a4f3a8f2bf7ce57d';
const EXPECTED = { phases: 26, tasks: 394, microtasks: 5692 };

fs.mkdirSync(OUT, { recursive: true });
const parts = fs.readdirSync(SOURCE_DIR)
  .filter((name) => /^compact\.part-\d+\.b64$/.test(name))
  .sort();
if (!parts.length) throw new Error('Missing JARVIS compact backlog parts');
const encoded = parts.map((name) => fs.readFileSync(path.join(SOURCE_DIR, name), 'utf8').trim()).join('');
const raw = zlib.brotliDecompressSync(Buffer.from(encoded, 'base64'));
const compactHash = crypto.createHash('sha256').update(raw).digest('hex');
if (compactHash !== EXPECTED_COMPACT_SHA256) throw new Error(`JARVIS compact backlog SHA256 mismatch: ${compactHash}`);
const compact = JSON.parse(raw.toString('utf8'));

const phases = compact.phases.map(([phase_id, title, depends_on, compactTasks]) => ({
  phase_id,
  title,
  depends_on,
  tasks: compactTasks.map(([taskTitle, profile, priority], taskIndex) => {
    const task_id = `${phase_id}-T${String(taskIndex + 1).padStart(3, '0')}`;
    const template = compact.profiles[profile];
    if (!template) throw new Error(`Missing microtask profile ${profile}`);
    return {
      phase_id,
      phase_title: title,
      phase_dependencies: depends_on,
      task_id,
      title: taskTitle,
      profile,
      priority,
      status: 'PLANIFICADO',
      microtasks: template.map((microTitle, microIndex) => ({
        micro_id: `${task_id}-M${String(microIndex + 1).padStart(2, '0')}`,
        title: microTitle,
        status: 'PLANIFICADO'
      }))
    };
  })
}));
const tasks = phases.flatMap((p) => p.tasks);
const microtasks = tasks.flatMap((t) => t.microtasks);
const actual = { phases: phases.length, tasks: tasks.length, microtasks: microtasks.length };
for (const [key, expected] of Object.entries(EXPECTED)) {
  if (actual[key] !== expected) throw new Error(`JARVIS backlog count mismatch ${key}: expected ${expected}, got ${actual[key]}`);
}

const backlog = {
  spec: compact.spec,
  date: compact.date,
  principle: 'VISIBLE_FIRST_FUNCTIONAL_INCREMENTALLY',
  phase_count: actual.phases,
  task_count: actual.tasks,
  microtask_count: actual.microtasks,
  phases
};
const reconstructed = Buffer.from(JSON.stringify(backlog, null, 2), 'utf8');
const taskGraphSha256 = crypto.createHash('sha256').update(reconstructed).digest('hex');
const p00 = phases.find((p) => p.phase_id === 'P00');
if (!p00) throw new Error('Missing P00');
const initialTasks = p00.tasks.filter((t) => t.priority === 'P0');
const initialQueue = initialTasks.flatMap((t) => t.microtasks.map((m, index) => ({
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
})) ;

const validation = {
  schema: 'JARVIS_BACKLOG_VALIDATION_V1',
  generated_at: new Date().toISOString(),
  compact_sha256: compactHash,
  task_graph_sha256: taskGraphSha256,
  source_parts: parts,
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
  task_graph_sha256: taskGraphSha256,
  counts: actual,
  human_required: [],
  active_tasks: initialTasks.map((t) => t.task_id),
  safe_parallelism: true,
  cost_policy: 'ZERO_COST_FIRST'
};

fs.writeFileSync(path.join(OUT, 'jarvis-master-backlog-reconstructed.json'), reconstructed);
fs.writeFileSync(path.join(OUT, 'jarvis-backlog-validation.json'), JSON.stringify(validation, null, 2));
fs.writeFileSync(path.join(OUT, 'jarvis-initial-queue.json'), JSON.stringify(initialQueue, null, 2));
fs.writeFileSync(path.join(OUT, 'jarvis-state.json'), JSON.stringify(state, null, 2));
console.log(JSON.stringify(validation, null, 2));
