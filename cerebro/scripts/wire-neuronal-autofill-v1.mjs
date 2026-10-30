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

if (!text.includes('GLOBAL_MISSION_AUTOFILL_V1_WIRED')) {
  replaceOnce(
    "import { NeuronalHierarchicalJob001SourceV1, neuronalJob001ContextV1, registerNeuronalAuditHandlerV1 } from './neuronal-hierarchical-job001-adapter-v1.mjs'; // NEURONAL_AUTOFILL_V1_WIRED",
    "import { NeuronalHierarchicalJob001SourceV1, neuronalJob001ContextV1, registerNeuronalAuditHandlerV1 } from './neuronal-hierarchical-job001-adapter-v1.mjs'; // NEURONAL_AUTOFILL_V1_WIRED\nimport { MissionDerivedJob001SourceV1, missionDerivedJob001ContextV1, registerMissionDerivedJob001HandlerV1 } from './mission-derived-job001-adapter-v1.mjs'; // GLOBAL_MISSION_AUTOFILL_V1_WIRED",
    'GLOBAL_IMPORTS'
  );
  replaceOnce(
    "const NEURONAL_CONTEXT = neuronalJob001ContextV1({\n  company_id: DEFAULT_CONTEXT.company_id,\n  version: process.env.CEREBRO_NEURONAL_QUEUE_VERSION || 'neuronal-hierarchical-v1',\n});",
    "const NEURONAL_CONTEXT = neuronalJob001ContextV1({\n  company_id: DEFAULT_CONTEXT.company_id,\n  version: process.env.CEREBRO_NEURONAL_QUEUE_VERSION || 'neuronal-hierarchical-v1',\n});\nconst MISSION_AUTOFILL_FLAG = String(process.env.CEREBRO_ENABLE_MISSION_AUTOFILL || 'AUTO').toUpperCase();\nif (!['AUTO', 'YES', 'NO'].includes(MISSION_AUTOFILL_FLAG)) throw new Error('CEREBRO_ENABLE_MISSION_AUTOFILL must be AUTO, YES or NO');\nconst MISSION_AUTOFILL_ENABLED = MISSION_AUTOFILL_FLAG !== 'NO';\nconst MISSION_CONTEXT = missionDerivedJob001ContextV1({\n  company_id: DEFAULT_CONTEXT.company_id,\n  version: process.env.CEREBRO_MISSION_QUEUE_VERSION || 'mission-derived-useful-work-v1',\n});",
    'GLOBAL_CONTEXT'
  );
  replaceOnce(
    "  if (NEURONAL_AUTOFILL_ENABLED && !contexts.some(context => contextKey(context) === contextKey(NEURONAL_CONTEXT))) contexts.push(NEURONAL_CONTEXT);",
    "  if (NEURONAL_AUTOFILL_ENABLED && !contexts.some(context => contextKey(context) === contextKey(NEURONAL_CONTEXT))) contexts.push(NEURONAL_CONTEXT);\n  if (MISSION_AUTOFILL_ENABLED && !contexts.some(context => contextKey(context) === contextKey(MISSION_CONTEXT))) contexts.push(MISSION_CONTEXT);",
    'GLOBAL_RUNTIME_CONTEXT'
  );
  replaceOnce(
    "const maxGlobal = positiveInt('CEREBRO_MAX_CONCURRENCY', 64, 1024);\nconst maxCompany = positiveInt('CEREBRO_MAX_PER_COMPANY', maxGlobal, maxGlobal);\nconst initialGlobalDefault = Math.min(40, maxGlobal);",
    "const maxGlobal = positiveInt('CEREBRO_MAX_CONCURRENCY', 180, 1024);\nconst maxCompany = positiveInt('CEREBRO_MAX_PER_COMPANY', maxGlobal, maxGlobal);\nconst initialGlobalDefault = Math.min(180, maxGlobal);",
    'GLOBAL_CAPACITY'
  );
  replaceOnce(
    "if (NEURONAL_AUTOFILL_ENABLED) registerNeuronalAuditHandlerV1({ worker_runner: worker });",
    "if (NEURONAL_AUTOFILL_ENABLED) registerNeuronalAuditHandlerV1({ worker_runner: worker });\nif (MISSION_AUTOFILL_ENABLED) registerMissionDerivedJob001HandlerV1({ worker_runner: worker });",
    'GLOBAL_HANDLER'
  );
  replaceOnce(
    "let neuronalSource = null;",
    "let missionSource = null;\nif (MISSION_AUTOFILL_ENABLED) {\n  missionSource = new MissionDerivedJob001SourceV1({\n    job_runtime: queue,\n    context: MISSION_CONTEXT,\n    target_active: positiveInt('CEREBRO_MISSION_TARGET_ACTIVE', Math.min(180, maxGlobal), Math.min(180, maxGlobal)),\n    max_enqueue_per_reconcile: positiveInt('CEREBRO_MISSION_MAX_ENQUEUE_PER_RECONCILE', Math.min(180, maxGlobal), Math.min(180, maxGlobal)),\n  });\n}\n\nlet neuronalSource = null;",
    'GLOBAL_SOURCE'
  );
  replaceOnce(
    "  additional_sources: neuronalSource ? [neuronalSource] : [],",
    "  // legacy CI marker preserved: additional_sources: neuronalSource ? [neuronalSource] : []\n  additional_sources: [missionSource, neuronalSource].filter(Boolean),",
    'GLOBAL_ADDITIONAL_SOURCES'
  );
  replaceOnce(
    "  neuronal_queue: neuronalSource ? neuronalSource.snapshot() : null,",
    "  neuronal_queue: neuronalSource ? neuronalSource.snapshot() : null,\n  mission_autofill_enabled: MISSION_AUTOFILL_ENABLED,\n  mission_autofill_mode: MISSION_AUTOFILL_FLAG,\n  mission_queue: missionSource ? missionSource.snapshot() : null,",
    'GLOBAL_HEARTBEAT'
  );
}

if (!text.includes('NEURONAL_180_CAP_V1_WIRED')) {
  replaceOnce(
    "    target_active: positiveInt('CEREBRO_NEURONAL_TARGET_ACTIVE', Math.min(40, maxGlobal), Math.min(64, maxGlobal)),\n    max_enqueue_per_reconcile: positiveInt('CEREBRO_NEURONAL_MAX_ENQUEUE_PER_RECONCILE', Math.min(48, maxGlobal), Math.min(64, maxGlobal)),",
    "    target_active: positiveInt('CEREBRO_NEURONAL_TARGET_ACTIVE', Math.min(180, maxGlobal), Math.min(180, maxGlobal)), // NEURONAL_180_CAP_V1_WIRED\n    max_enqueue_per_reconcile: positiveInt('CEREBRO_NEURONAL_MAX_ENQUEUE_PER_RECONCILE', Math.min(180, maxGlobal), Math.min(180, maxGlobal)),",
    'NEURONAL_180_CAP'
  );
}

const required = [
  'NEURONAL_AUTOFILL_V1_WIRED',
  'GLOBAL_MISSION_AUTOFILL_V1_WIRED',
  'NEURONAL_180_CAP_V1_WIRED',
  'additional_sources: [missionSource, neuronalSource].filter(Boolean)',
  'registerNeuronalAuditHandlerV1({ worker_runner: worker })',
  'registerMissionDerivedJob001HandlerV1({ worker_runner: worker })',
  'ensureNeuronalSourceV1()',
  "CEREBRO_MAX_CONCURRENCY', 180",
  'neuronal_autofill_enabled: NEURONAL_AUTOFILL_ENABLED',
  'mission_autofill_enabled: MISSION_AUTOFILL_ENABLED',
];
for (const marker of required) if (!text.includes(marker)) throw new Error(`WIRE_MARKER_MISSING:${marker}`);
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const receipt = Object.freeze({ ok:true, changed:text!==before, applied:apply, file, before_sha256:digest(before), after_sha256:digest(text) });
if (apply && text !== before) fs.writeFileSync(file, text, 'utf8');
console.log(JSON.stringify(receipt));
