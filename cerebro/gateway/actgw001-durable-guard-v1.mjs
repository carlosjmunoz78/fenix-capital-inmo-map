import { ActionGatewayV1 } from './action-gateway-v1.mjs';
import { PersistentEventBus } from '../runtime/persistent-runtime.mjs';

export const ACTGW001_DURABLE_GUARD_V1_CONTRACT = Object.freeze({
  engine_id: 'ACTGW-001',
  version: '1.0.0',
  environment: 'PREPROD',
  wraps_existing_gateway: true,
  reuses_existing_persistent_runtime: true,
  protocol: 'PREPARE_EXECUTE_COMMIT',
  ambiguous_restart: 'FAIL_CLOSED_HIGH_RISK_NO_REEXECUTION',
  registered_capabilities_only: true,
  prod_write_authorized: false,
  autonomous_prod: false,
  trading_access: false,
  additional_cost_eur: 0
});

function requiredString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${label} required`);
  return value.trim();
}

function stableJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
}

function clone(value) { return structuredClone(value); }

export class Actgw001DurableGuardV1 {
  #gateway;
  #ledger;

  constructor({ journal_file, gateway = new ActionGatewayV1() } = {}) {
    this.#gateway = gateway;
    this.#ledger = new PersistentEventBus({ file_path: requiredString(journal_file, 'journal_file') });
  }

  registerCapability(name, handler) { return this.#gateway.registerCapability(name, handler); }

  async execute(input) {
    const context = clone(input?.context);
    if (!context || context.engine_id !== 'ACTGW-001' || context.environment !== 'PREPROD') throw new Error('ACTGW001_DURABLE_PREPROD_CONTEXT_REQUIRED');
    const key = requiredString(input?.idempotency_key, 'idempotency_key');
    const capability = requiredString(input?.capability, 'capability');
    const fingerprint = stableJson({ capability, payload: input?.payload ?? {}, company_id: context.company_id, version: context.version });
    const preparedKey = `actgw:${key}:prepared`;
    const commitKey = `actgw:${key}:commit`;
    const events = this.#ledger.listForCompany(context.company_id);
    const prepared = events.find(event => event.idempotency_key === preparedKey);
    const committed = events.find(event => event.idempotency_key === commitKey);

    if (prepared && prepared.payload?.fingerprint !== fingerprint) {
      return Object.freeze({ status: 'HUMAN_REQUIRED', reason: 'POLICY_CONFLICT', detail: 'idempotency key reused with different action', executed: false, context });
    }
    if (committed) return clone(committed.payload.response);
    if (prepared) {
      return Object.freeze({ status: 'HUMAN_REQUIRED', reason: 'HIGH_RISK', detail: 'ambiguous prior execution after restart; automatic re-execution denied', executed: false, context });
    }

    this.#ledger.publish({
      type: 'ACTGW_ACTION_PREPARED',
      context,
      idempotency_key: preparedKey,
      payload: { action_idempotency_key: key, capability, fingerprint }
    });

    const response = await this.#gateway.execute(input);
    this.#ledger.publish({
      type: 'ACTGW_ACTION_COMMITTED',
      context,
      idempotency_key: commitKey,
      payload: { action_idempotency_key: key, capability, fingerprint, response: clone(response) }
    });
    return clone(response);
  }

  auditLog() { return this.#gateway.auditLog(); }
  ledgerEvents(company_id) { return clone(this.#ledger.listForCompany(requiredString(company_id, 'company_id'))); }
  contract() { return ACTGW001_DURABLE_GUARD_V1_CONTRACT; }
}
