import {
  LocalCapabilityRegistry,
  FreeFirstBroker,
  LocalOffloadStore,
  BudgetModelRouterV0
} from './zero-cost-runtime.mjs';

const PREPROD = 'PREPROD';

function contextOf(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('context must be an object');
  for (const key of ['company_id','engine_id','environment','version']) {
    if (typeof value[key] !== 'string' || value[key].length === 0) throw new TypeError(`context.${key} must be a non-empty string`);
  }
  if (value.environment !== PREPROD) throw new Error('zero-cost harness V0 is PREPROD-only');
  return { company_id:value.company_id, engine_id:value.engine_id, environment:value.environment, version:value.version };
}

function sameContext(a, b) {
  return a.company_id === b.company_id && a.engine_id === b.engine_id && a.environment === b.environment && a.version === b.version;
}

export class ZeroCostRuntimeHarnessV0 {
  #decisionStore;

  constructor({ capabilities = [], db_file_path, storage_file_path, decision_file_path, environment } = {}) {
    const env = environment === undefined ? PREPROD : environment;
    if (env !== PREPROD) throw new Error('zero-cost harness V0 accepts exact PREPROD only');
    if (typeof db_file_path !== 'string' || db_file_path.length === 0) throw new TypeError('db_file_path must be a non-empty string');
    if (typeof storage_file_path !== 'string' || storage_file_path.length === 0) throw new TypeError('storage_file_path must be a non-empty string');
    const decisionsPath = decision_file_path ?? `${db_file_path}.decisions`;
    this.local = new LocalCapabilityRegistry(capabilities);
    this.broker = new FreeFirstBroker();
    this.router = new BudgetModelRouterV0({ broker:this.broker });
    this.dboff = new LocalOffloadStore({ file_path:db_file_path, kind:'DBOFF-001', environment:env });
    this.storoff = new LocalOffloadStore({ file_path:storage_file_path, kind:'STOROFF-001', environment:env });
    this.#decisionStore = new LocalOffloadStore({ file_path:decisionsPath, kind:'AIBUD-001', environment:env });
    this.contract = Object.freeze({
      engine_ids:['LOCAL-001','FREE-001','DBOFF-001','STOROFF-001','AIBUD-001','ROUTE-001'],
      environment:PREPROD,
      additional_cost_target_eur:0,
      supabase_preprod_required:false,
      prod_writes:false,
      autonomous_prod:false,
      trading_access:false
    });
  }

  route(input) {
    const context = contextOf(input?.context);
    const result = this.router.route(input);
    const decision = Object.freeze({
      context,
      route_type:result.route_type,
      human_reason:result.human_reason ?? null,
      incremental_cost_eur:result.selected?.cost_eur ?? 0,
      provider:result.selected?.provider ?? null,
      reason:result.reason
    });
    const key = `decision:${String(this.#decisionStore.operation_count).padStart(12, '0')}`;
    this.#decisionStore.put({ context, key, value:decision });
    return { ...result, decision:{ ...decision, context:{...decision.context} } };
  }

  health(context) {
    const ctx = contextOf(context);
    return Object.freeze({
      context:ctx,
      local_capabilities:this.local.list(ctx),
      dboff:'AVAILABLE',
      storoff:'AVAILABLE',
      broker:'AVAILABLE',
      router:'AVAILABLE',
      decisions:'AVAILABLE',
      additional_cost_target_eur:0,
      supabase_preprod_required:false
    });
  }

  decisions(context) {
    const ctx = contextOf(context);
    return this.#decisionStore.backup(ctx)
      .filter(op => typeof op.key === 'string' && op.key.startsWith('decision:'))
      .map(op => op.value)
      .filter(item => item?.context && sameContext(item.context, ctx))
      .map(item => ({ ...item, context:{ ...item.context } }));
  }

  backup(context) {
    const ctx = contextOf(context);
    return Object.freeze({
      context:ctx,
      dboff:this.dboff.backup(ctx),
      storoff:this.storoff.backup(ctx),
      decisions:this.#decisionStore.backup(ctx)
    });
  }

  restore({ context, backup }) {
    const ctx = contextOf(context);
    if (!backup || typeof backup !== 'object') throw new TypeError('backup must be an object');
    if (!backup.context || !sameContext(contextOf(backup.context), ctx)) throw new Error('backup context mismatch');

    const previous = {
      dboff:this.dboff.backup(ctx),
      storoff:this.storoff.backup(ctx),
      decisions:this.#decisionStore.backup(ctx)
    };
    const prepared = {
      dboff:this.dboff.prepareRestore({ context:ctx, snapshot:backup.dboff }),
      storoff:this.storoff.prepareRestore({ context:ctx, snapshot:backup.storoff }),
      decisions:this.#decisionStore.prepareRestore({ context:ctx, snapshot:backup.decisions ?? [] })
    };

    try {
      const dboff = this.dboff.commitPrepared(prepared.dboff);
      const storoff = this.storoff.commitPrepared(prepared.storoff);
      const decisions = this.#decisionStore.commitPrepared(prepared.decisions);
      return Object.freeze({ dboff_operations:dboff, storoff_operations:storoff, decision_operations:decisions });
    } catch (error) {
      const rollbackErrors = [];
      for (const [store, snapshot] of [
        [this.#decisionStore, previous.decisions],
        [this.storoff, previous.storoff],
        [this.dboff, previous.dboff]
      ]) {
        try { store.recoverRestore({ context:ctx, snapshot }); }
        catch (rollbackError) { rollbackErrors.push(rollbackError); }
      }
      if (rollbackErrors.length > 0) throw new AggregateError([error, ...rollbackErrors], 'coordinated restore failed and rollback was incomplete');
      throw error;
    }
  }
}
