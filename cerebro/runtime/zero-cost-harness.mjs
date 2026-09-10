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

export class ZeroCostRuntimeHarnessV0 {
  #decisions = [];

  constructor({ capabilities = [], db_file_path, storage_file_path, environment } = {}) {
    const env = environment === undefined ? PREPROD : environment;
    if (env !== PREPROD) throw new Error('zero-cost harness V0 accepts exact PREPROD only');
    this.local = new LocalCapabilityRegistry(capabilities);
    this.broker = new FreeFirstBroker();
    this.router = new BudgetModelRouterV0({ broker:this.broker });
    this.dboff = new LocalOffloadStore({ file_path:db_file_path, kind:'DBOFF-001', environment:env });
    this.storoff = new LocalOffloadStore({ file_path:storage_file_path, kind:'STOROFF-001', environment:env });
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
    this.#decisions.push(decision);
    return { ...result, decision:{ ...decision } };
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
      additional_cost_target_eur:0,
      supabase_preprod_required:false
    });
  }

  decisions(context) {
    const ctx = contextOf(context);
    return this.#decisions.filter(item => item.context.company_id === ctx.company_id && item.context.engine_id === ctx.engine_id && item.context.environment === ctx.environment && item.context.version === ctx.version).map(item => ({ ...item, context:{ ...item.context } }));
  }

  backup(context) {
    const ctx = contextOf(context);
    return Object.freeze({
      context:ctx,
      dboff:this.dboff.backup(ctx),
      storoff:this.storoff.backup(ctx)
    });
  }

  restore({ context, backup }) {
    const ctx = contextOf(context);
    if (!backup || typeof backup !== 'object') throw new TypeError('backup must be an object');
    if (!backup.context || JSON.stringify(contextOf(backup.context)) !== JSON.stringify(ctx)) throw new Error('backup context mismatch');
    const dboff = this.dboff.restore({ context:ctx, snapshot:backup.dboff });
    const storoff = this.storoff.restore({ context:ctx, snapshot:backup.storoff });
    return Object.freeze({ dboff_operations:dboff, storoff_operations:storoff });
  }
}
