import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const file = path.resolve(process.argv[2] || 'cerebro/runtime/cerebro-supervisor-daemon-v0.mjs');
const apply = process.argv.includes('--apply');
let text = fs.readFileSync(file, 'utf8');
const before = text;

function replaceOnce(anchor, replacement, label) {
  const count = text.split(anchor).length - 1;
  if (count !== 1) throw new Error(`WIRE_ANCHOR_${label}_COUNT:${count}`);
  text = text.replace(anchor, replacement);
}

if (!text.includes('NEURONAL_AUTOFILL_V1_WIRED')) {
  replaceOnce(
    "import { createRepoSandboxJobHandlerV1, REPO_SANDBOX_JOB_HANDLER_V1_CONTRACT } from './repo-sandbox-job-handler-v1.mjs';",
    "import { createRepoSandboxJobHandlerV1, REPO_SANDBOX_JOB_HANDLER_V1_CONTRACT } from './repo-sandbox-job-handler-v1.mjs';\nimport { ensureNeuronalSourceV1 } from './neuronal-source-integrity-v1.mjs';\nimport { NeuronalHierarchicalJob001SourceV1, neuronalJob001ContextV1, registerNeuronalAuditHandlerV1 } from './neuronal-hierarchical-job001-adapter-v1.mjs'; // NEURONAL_AUTOFILL_V1_WIRED",
    'IMPORTS'
  );

  replaceOnce(
    "const REPO_SANDBOX_CONTEXT = Object.freeze({\n  company_id: DEFAULT_CONTEXT.company_id,\n  engine_id: 'FACT-001',\n  environment: ENV,\n  version: process.env.CEREBRO_REPO_SANDBOX_VERSION || 'repo-sandbox-v1',\n});",
    "const REPO_SANDBOX_CONTEXT = Object.freeze({\n  company_id: DEFAULT_CONTEXT.company_id,\n  engine_id: 'FACT-001',\n  environment: ENV,\n  version: process.env.CEREBRO_REPO_SANDBOX_VERSION || 'repo-sandbox-v1',\n});\nconst NEURONAL_AUTOFILL_FLAG = String(process.env.CEREBRO_ENABLE_NEURONAL_AUTOFILL || 'AUTO').toUpperCase();\nif (!['AUTO', 'YES', 'NO'].includes(NEURONAL_AUTOFILL_FLAG)) throw new Error('CEREBRO_ENABLE_NEURONAL_AUTOFILL must be AUTO, YES or NO');\nconst NEURONAL_AUTOFILL_ENABLED = NEURONAL_AUTOFILL_FLAG !== 'NO';\nconst NEURONAL_CONTEXT = neuronalJob001ContextV1({\n  company_id: DEFAULT_CONTEXT.company_id,\n  version: process.env.CEREBRO_NEURONAL_QUEUE_VERSION || 'neuronal-hierarchical-v1',\n});",
    'CONTEXT'
  );

  replaceOnce(
    "  if (REPO_SANDBOX_ENABLED && !contexts.some(context => contextKey(context) === contextKey(REPO_SANDBOX_CONTEXT))) contexts.push(REPO_SANDBOX_CONTEXT);",
    "  if (REPO_SANDBOX_ENABLED && !contexts.some(context => contextKey(context) === contextKey(REPO_SANDBOX_CONTEXT))) contexts.push(REPO_SANDBOX_CONTEXT);\n  if (NEURONAL_AUTOFILL_ENABLED && !contexts.some(context => contextKey(context) === contextKey(NEURONAL_CONTEXT))) contexts.push(NEURONAL_CONTEXT);",
    'RUNTIME_CONTEXT'
  );

  replaceOnce(
    "worker.register({\n  name: 'runtime.health.probe',\n  handler: async () => ({ ok: true, environment: ENV, host: os.hostname(), at: new Date().toISOString() }),\n});",
    "worker.register({\n  name: 'runtime.health.probe',\n  handler: async () => ({ ok: true, environment: ENV, host: os.hostname(), at: new Date().toISOString() }),\n});\nif (NEURONAL_AUTOFILL_ENABLED) registerNeuronalAuditHandlerV1({ worker_runner: worker });",
    'HANDLER'
  );

  replaceOnce(
    "const workPump = new AdaptiveHierarchicalAgentWorkPumpV3({",
    "let neuronalSource = null;\nif (NEURONAL_AUTOFILL_ENABLED) {\n  ensureNeuronalSourceV1();\n  neuronalSource = new NeuronalHierarchicalJob001SourceV1({\n    job_runtime: queue,\n    queue_context: NEURONAL_CONTEXT,\n    model_context: MODEL_CONTEXT,\n    target_active: positiveInt('CEREBRO_NEURONAL_TARGET_ACTIVE', Math.min(40, maxGlobal), Math.min(64, maxGlobal)),\n    max_enqueue_per_reconcile: positiveInt('CEREBRO_NEURONAL_MAX_ENQUEUE_PER_RECONCILE', Math.min(48, maxGlobal), Math.min(64, maxGlobal)),\n    model_active_cap: maxDeepSeek,\n    model_enabled: WORK_PUMP_ENABLED,\n  });\n}\n\nconst workPump = new AdaptiveHierarchicalAgentWorkPumpV3({",
    'SOURCE'
  );

  replaceOnce(
    "  enabled: WORK_PUMP_ENABLED,\n});",
    "  enabled: WORK_PUMP_ENABLED,\n  additional_sources: neuronalSource ? [neuronalSource] : [],\n});",
    'ADDITIONAL_SOURCE'
  );

  replaceOnce(
    "  repo_sandbox_enabled: REPO_SANDBOX_ENABLED,\n  repo_sandbox_mode: REPO_SANDBOX_MODE,",
    "  repo_sandbox_enabled: REPO_SANDBOX_ENABLED,\n  repo_sandbox_mode: REPO_SANDBOX_MODE,\n  neuronal_autofill_enabled: NEURONAL_AUTOFILL_ENABLED,\n  neuronal_autofill_mode: NEURONAL_AUTOFILL_FLAG,\n  neuronal_queue: neuronalSource ? neuronalSource.snapshot() : null,",
    'HEARTBEAT'
  );
}

const required = [
  'NEURONAL_AUTOFILL_V1_WIRED',
  'additional_sources: neuronalSource ? [neuronalSource] : []',
  'registerNeuronalAuditHandlerV1({ worker_runner: worker })',
  'ensureNeuronalSourceV1()',
  'neuronal_autofill_enabled: NEURONAL_AUTOFILL_ENABLED',
];
for (const marker of required) if (!text.includes(marker)) throw new Error(`WIRE_MARKER_MISSING:${marker}`);
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const receipt = Object.freeze({ ok:true, changed:text!==before, applied:apply, file, before_sha256:digest(before), after_sha256:digest(text) });
if (apply && text !== before) fs.writeFileSync(file, text, 'utf8');
console.log(JSON.stringify(receipt));
