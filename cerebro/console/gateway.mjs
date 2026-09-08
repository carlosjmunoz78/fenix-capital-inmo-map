import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REGISTRY = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../registry/console-v0.json'), 'utf8'));
const ENGINE_IDS = new Set(REGISTRY.engines.map(e => e.engine_id));
const HUMAN_REQUIRED = new Set(REGISTRY.human_required_reasons);
const TYPED_ARRAY_BUFFER_GETTER = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Uint8Array.prototype), 'buffer')?.get;
const DATA_VIEW_BUFFER_GETTER = Object.getOwnPropertyDescriptor(DataView.prototype, 'buffer')?.get;

function requiredString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${label} must be a non-empty string`);
  return value;
}

function assertPreprod(value) {
  if (value !== 'PREPROD') throw new Error('Console V0 requires PREPROD');
}

function intrinsicViewBuffer(value) {
  const getter = value instanceof DataView ? DATA_VIEW_BUFFER_GETTER : TYPED_ARRAY_BUFFER_GETTER;
  if (typeof getter !== 'function') throw new TypeError('unsupported ArrayBuffer view');
  return getter.call(value);
}

function rejectUnsafeCloneValue(value, seen = new WeakSet()) {
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) return;
  if (typeof WebAssembly !== 'undefined' && typeof WebAssembly.Memory === 'function' && value instanceof WebAssembly.Memory) {
    throw new TypeError('WebAssembly.Memory not supported');
  }
  if (typeof SharedArrayBuffer !== 'undefined' && value instanceof SharedArrayBuffer) {
    throw new TypeError('shared memory not supported');
  }
  if (ArrayBuffer.isView(value)) {
    const buffer = intrinsicViewBuffer(value);
    if (typeof SharedArrayBuffer !== 'undefined' && buffer instanceof SharedArrayBuffer) throw new TypeError('shared memory view not supported');
    return;
  }
  if (value instanceof ArrayBuffer) return;
  if (seen.has(value)) return;
  seen.add(value);
  if (value instanceof Map) {
    Map.prototype.forEach.call(value, (v, k) => { rejectUnsafeCloneValue(k, seen); rejectUnsafeCloneValue(v, seen); });
    return;
  }
  if (value instanceof Set) {
    Set.prototype.forEach.call(value, v => rejectUnsafeCloneValue(v, seen));
    return;
  }
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor) continue;
    if (descriptor.get || descriptor.set) throw new TypeError('accessor properties not supported');
    rejectUnsafeCloneValue(descriptor.value, seen);
  }
}

function safeClone(value) {
  rejectUnsafeCloneValue(value);
  const cloned = structuredClone(value);
  rejectUnsafeCloneValue(cloned);
  return cloned;
}

function safeErrorText(error) {
  try { return String(error); } catch { return '[unstringifiable error]'; }
}

function canonicalContext({ company_id, engine_id = 'CONSOLE-001', environment = 'PREPROD', version = '0.1.0' }) {
  assertPreprod(environment);
  const eid = requiredString(engine_id, 'engine_id');
  if (!ENGINE_IDS.has(eid)) throw new Error('unknown Console V0 engine');
  return Object.freeze({
    company_id: requiredString(company_id, 'company_id'),
    engine_id: eid,
    environment,
    version: requiredString(version, 'version')
  });
}

export class CerebroGatewayV0 {
  #environment;
  #version;
  #sessions = new Map();
  #audit = [];
  #commands = new Map();
  #chatAdapter = null;

  constructor({ environment = 'PREPROD', version = '0.1.0' } = {}) {
    assertPreprod(environment);
    this.#environment = environment;
    this.#version = requiredString(version, 'version');
  }

  get environment() { return this.#environment; }
  get version() { return this.#version; }

  createSession({ session_id, company_id, context = {} }) {
    assertPreprod(this.#environment);
    const sid = requiredString(session_id, 'session_id');
    if (this.#sessions.has(sid)) throw new Error('session already exists');
    if (context === null || typeof context !== 'object' || Array.isArray(context)) throw new TypeError('context must be an object');
    const engine_id = context.engine_id ?? 'CONSOLE-001';
    const ctx = canonicalContext({ company_id, engine_id, environment: this.#environment, version: this.#version });
    const session = { session_id: sid, context: ctx, history: [] };
    this.#sessions.set(sid, session);
    this.#audit.push({ type: 'SESSION_CREATED', session_id: sid, context: ctx });
    return safeClone(session);
  }

  selectContext({ session_id, company_id, engine_id = 'CONSOLE-001' }) {
    assertPreprod(this.#environment);
    const session = this.#getSession(session_id);
    if (company_id !== session.context.company_id) throw new Error('cross-company context switch denied');
    session.context = canonicalContext({ company_id, engine_id, environment: this.#environment, version: this.#version });
    this.#audit.push({ type: 'CONTEXT_SELECTED', session_id, context: session.context });
    return safeClone(session.context);
  }

  registerCommand(name, handler) {
    assertPreprod(this.#environment);
    const command = requiredString(name, 'command');
    if (typeof handler !== 'function') throw new TypeError('handler must be a function');
    if (this.#commands.has(command)) throw new Error('command already registered');
    this.#commands.set(command, handler);
  }

  setChatAdapter(adapter) {
    assertPreprod(this.#environment);
    if (adapter !== null && typeof adapter !== 'function') throw new TypeError('chat adapter must be a function or null');
    this.#chatAdapter = adapter;
  }

  async execute({ session_id, command, payload = {} }) {
    assertPreprod(this.#environment);
    const session = this.#getSession(session_id);
    const name = requiredString(command, 'command');
    const handler = this.#commands.get(name);
    if (!handler) return this.#humanRequired(session, 'LOW_CONFIDENCE', `unknown command:${name}`);
    const operationContext = Object.freeze({ ...session.context });
    try {
      const input = safeClone(payload);
      const result = await handler({ context: operationContext, payload: input });
      const safeResult = safeClone(result);
      this.#validateHumanRequired(safeResult);
      session.history.push({ kind: 'COMMAND', command: name, context: operationContext, result: safeResult });
      this.#audit.push({ type: 'COMMAND_EXECUTED', session_id, command: name, context: operationContext, result: safeResult });
      return safeClone(safeResult);
    } catch (error) {
      const failure = { status: 'ERROR', error: safeErrorText(error) };
      session.history.push({ kind: 'COMMAND_ERROR', command: name, context: operationContext, result: failure });
      this.#audit.push({ type: 'COMMAND_ERROR', session_id, command: name, context: operationContext, result: failure });
      throw error;
    }
  }

  async chat({ session_id, message }) {
    assertPreprod(this.#environment);
    const session = this.#getSession(session_id);
    const text = requiredString(message, 'message');
    if (!this.#chatAdapter) return this.#humanRequired(session, 'LOW_CONFIDENCE', 'chat adapter unavailable');
    const operationContext = Object.freeze({ ...session.context });
    try {
      const result = await this.#chatAdapter({ context: operationContext, message: text });
      const safeResult = safeClone(result);
      this.#validateHumanRequired(safeResult);
      session.history.push({ kind: 'CHAT', message: text, context: operationContext, result: safeResult });
      this.#audit.push({ type: 'CHAT_MEDIATED', session_id, context: operationContext, result: safeResult });
      return safeClone(safeResult);
    } catch (error) {
      const failure = { status: 'ERROR', error: safeErrorText(error) };
      session.history.push({ kind: 'CHAT_ERROR', message: text, context: operationContext, result: failure });
      this.#audit.push({ type: 'CHAT_ERROR', session_id, context: operationContext, result: failure });
      throw error;
    }
  }

  inspectSession(session_id) {
    return safeClone(this.#getSession(session_id));
  }

  auditLog() {
    return safeClone(this.#audit);
  }

  queryEngines() {
    assertPreprod(this.#environment);
    return safeClone(REGISTRY.engines);
  }

  contract() {
    return safeClone({
      environment: 'PREPROD',
      gateway_required: true,
      direct_model_access: false,
      prod_execution_enabled: false,
      supabase_writes: false,
      live_writes: false,
      autonomous_prod: false,
      trading_access: false,
      additional_cost_target_eur: 0,
      engines: [...ENGINE_IDS].sort()
    });
  }

  #getSession(session_id) {
    const sid = requiredString(session_id, 'session_id');
    const session = this.#sessions.get(sid);
    if (!session) throw new Error('session not found');
    return session;
  }

  #validateHumanRequired(result) {
    if (!result || result.status !== 'HUMAN_REQUIRED') return;
    if (!HUMAN_REQUIRED.has(result.reason)) throw new Error('invalid HUMAN_REQUIRED reason');
  }

  #humanRequired(session, reason, detail) {
    if (!HUMAN_REQUIRED.has(reason)) throw new Error('invalid HUMAN_REQUIRED reason');
    const operationContext = Object.freeze({ ...session.context });
    const result = { status: 'HUMAN_REQUIRED', reason, detail };
    session.history.push({ kind: 'HUMAN_REQUIRED', context: operationContext, result });
    this.#audit.push({ type: 'HUMAN_REQUIRED', session_id: session.session_id, context: operationContext, result });
    return safeClone(result);
  }
}

export function getConsoleRegistry() {
  return safeClone(REGISTRY);
}
