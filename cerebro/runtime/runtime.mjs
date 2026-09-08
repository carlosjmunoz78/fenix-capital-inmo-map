import crypto from 'node:crypto';

const HUMAN_REQUIRED_REASONS = new Set([
  'LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK',
  'POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'
]);

function assertContext(ctx) {
  for (const key of ['company_id','engine_id','environment','version']) {
    if (!ctx?.[key]) throw new Error(`missing context.${key}`);
  }
}

function stableId(prefix, value) {
  return `${prefix}_${crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 24)}`;
}

function contextKey(context, key) {
  return `${context.company_id}::${context.engine_id}::${context.environment}::${context.version}::${key}`;
}

export class EventBus {
  constructor() {
    this.outbox = [];
    this.inbox = new Set();
  }

  publish({ type, payload = {}, context, idempotency_key }) {
    assertContext(context);
    if (!type) throw new Error('event type required');
    const key = idempotency_key ?? stableId('evt', { type, payload, context });
    const scoped = contextKey(context, key);
    if (this.inbox.has(scoped)) return { accepted: false, duplicate: true, idempotency_key: key };
    this.inbox.add(scoped);
    const event = {
      event_id: stableId('event', { scoped, type, context }),
      type,
      payload,
      context: { ...context },
      idempotency_key: key,
      status: 'PENDING'
    };
    this.outbox.push(event);
    return { accepted: true, duplicate: false, event };
  }

  listForCompany(company_id) {
    return this.outbox.filter(e => e.context.company_id === company_id).map(e => structuredClone(e));
  }
}

export class JobQueue {
  constructor() {
    this.jobs = [];
    this.keys = new Set();
  }

  enqueue({ name, context, payload = {}, priority = 100, max_attempts = 3, timeout_ms = 30000, idempotency_key }) {
    assertContext(context);
    if (!name) throw new Error('job name required');
    const key = idempotency_key ?? stableId('job', { name, payload, context });
    const scoped = contextKey(context, key);
    if (this.keys.has(scoped)) return { accepted: false, duplicate: true, idempotency_key: key };
    this.keys.add(scoped);
    const job = {
      job_id: stableId('jobid', { scoped, name, context }),
      name,
      context: { ...context },
      payload,
      priority,
      max_attempts,
      timeout_ms,
      attempts: 0,
      status: 'QUEUED',
      idempotency_key: key,
      result: null,
      error: null
    };
    this.jobs.push(job);
    return { accepted: true, duplicate: false, job };
  }

  claim(company_id) {
    const candidates = this.jobs
      .filter(j => j.context.company_id === company_id && j.status === 'QUEUED')
      .sort((a,b) => a.priority - b.priority || a.job_id.localeCompare(b.job_id));
    const job = candidates[0];
    if (!job) return null;
    job.status = 'RUNNING';
    job.attempts += 1;
    return structuredClone(job);
  }

  complete(job_id, company_id, result) {
    const job = this.jobs.find(j => j.job_id === job_id && j.context.company_id === company_id);
    if (!job) throw new Error('job not found for company');
    if (job.status !== 'RUNNING') throw new Error('job not running');
    job.status = 'SUCCEEDED';
    job.result = result;
    return structuredClone(job);
  }

  fail(job_id, company_id, error) {
    const job = this.jobs.find(j => j.job_id === job_id && j.context.company_id === company_id);
    if (!job) throw new Error('job not found for company');
    if (job.status !== 'RUNNING') throw new Error('job not running');
    job.error = String(error);
    job.status = job.attempts < job.max_attempts ? 'QUEUED' : 'FAILED';
    return structuredClone(job);
  }
}

function bindEvents(bus, context) {
  return Object.freeze({
    publish: ({ type, payload = {}, idempotency_key }) => bus.publish({ type, payload, context, idempotency_key }),
    list: () => bus.listForCompany(context.company_id)
      .filter(e => e.context.engine_id === context.engine_id && e.context.environment === context.environment && e.context.version === context.version)
  });
}

function bindJobs(queue, context) {
  return Object.freeze({
    enqueue: ({ name, payload = {}, priority = 100, max_attempts = 3, timeout_ms = 30000, idempotency_key }) =>
      queue.enqueue({ name, context, payload, priority, max_attempts, timeout_ms, idempotency_key }),
    claim: () => {
      const job = queue.claim(context.company_id);
      if (!job) return null;
      if (job.context.engine_id !== context.engine_id || job.context.environment !== context.environment || job.context.version !== context.version) {
        job.status = 'QUEUED';
        throw new Error('cross-context job claim blocked');
      }
      return job;
    },
    complete: (job_id, result) => queue.complete(job_id, context.company_id, result),
    fail: (job_id, error) => queue.fail(job_id, context.company_id, error)
  });
}

export class FinOpsGate {
  constructor({ additional_cost_budget_eur = 0 } = {}) {
    if (!Number.isFinite(additional_cost_budget_eur) || additional_cost_budget_eur < 0) throw new Error('budget must be a finite non-negative number');
    this.budget = additional_cost_budget_eur;
    this.spent = 0;
  }

  authorize(additional_cost_eur) {
    if (!Number.isFinite(additional_cost_eur) || additional_cost_eur < 0) throw new Error('cost must be a finite non-negative number');
    if (this.spent + additional_cost_eur > this.budget) {
      return { allowed: false, human_required: 'MONEY_LIMIT', remaining_eur: this.budget - this.spent };
    }
    this.spent += additional_cost_eur;
    return { allowed: true, remaining_eur: this.budget - this.spent };
  }
}

export class SharedRuntime {
  constructor({ environment = 'PREPROD', additional_cost_budget_eur = 0 } = {}) {
    if (environment === 'PROD') throw new Error('RUNTIME-001 V0 cannot run with PROD context');
    this.environment = environment;
    this.events = new EventBus();
    this.jobs = new JobQueue();
    this.finops = new FinOpsGate({ additional_cost_budget_eur });
    this.handlers = new Map();
    this.audit = [];
  }

  registerEngine({ engine_id, version, handler, prod_writes = false }) {
    if (!engine_id || !version || typeof handler !== 'function') throw new Error('invalid engine registration');
    if (prod_writes) throw new Error('RUNTIME-001 V0 forbids PROD writes');
    this.handlers.set(engine_id, { version, handler, prod_writes: false });
  }

  async execute({ company_id, engine_id, version, command, payload = {}, cost_eur = 0 }) {
    const context = { company_id, engine_id, environment: this.environment, version };
    assertContext(context);
    const reg = this.handlers.get(engine_id);
    if (!reg || reg.version !== version) throw new Error('engine not registered for requested version');
    const auditBase = { context: { ...context }, command, cost_eur };
    const cost = this.finops.authorize(cost_eur);
    if (!cost.allowed) {
      this.audit.push({ ...auditBase, outcome: 'HUMAN_REQUIRED', reason: cost.human_required });
      return { status: 'HUMAN_REQUIRED', reason: cost.human_required, context };
    }
    try {
      const result = await reg.handler({
        context: Object.freeze({ ...context }),
        command,
        payload,
        events: bindEvents(this.events, context),
        jobs: bindJobs(this.jobs, context)
      });
      if (result?.status === 'HUMAN_REQUIRED') {
        if (!HUMAN_REQUIRED_REASONS.has(result.reason)) throw new Error(`invalid HUMAN_REQUIRED reason: ${result.reason}`);
        this.audit.push({ ...auditBase, outcome: 'HUMAN_REQUIRED', reason: result.reason });
        return { status: 'HUMAN_REQUIRED', reason: result.reason, context, result };
      }
      this.audit.push({ ...auditBase, outcome: 'SUCCESS' });
      return { status: 'OK', context, result };
    } catch (error) {
      this.audit.push({ ...auditBase, outcome: 'ERROR', error: String(error) });
      throw error;
    }
  }
}

export const RUNTIME_V0_CONTRACT = Object.freeze({
  engine_id: 'RUNTIME-001',
  environment: 'PREPROD',
  shared_workers: true,
  deterministic_first: true,
  prod_writes: false,
  cross_company_access: 'deny',
  event_bus: 'EVT-001/in-memory-reference-with-postgres-contract',
  job_queue: 'JOB-001/in-memory-reference-with-postgres-contract',
  additional_cost_target_eur: 0
});
