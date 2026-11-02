import { assertLabContext, assertNonEmptyString, assertPlainObject, deepFreeze, clone, result } from './shared-v1.mjs';
export const CORE_001 = deepFreeze({ engine_id:'CORE-001', version:'0.1.0', layer:'L0', mode:'DETERMINISTIC', prod_writes:false, additional_cost_eur:0 });
export function buildCoreEnvelope(input) {
  assertPlainObject(input, 'input');
  const context = assertLabContext(input.context);
  const command = assertNonEmptyString(input.command, 'command');
  const correlation_id = assertNonEmptyString(input.correlation_id ?? `${context.company_id}:${command}`, 'correlation_id');
  return result('CORE-001', { status:'OK', context, command, correlation_id, payload:clone(input.payload ?? null) });
}
