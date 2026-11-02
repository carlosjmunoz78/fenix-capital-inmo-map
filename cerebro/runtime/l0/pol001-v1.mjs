import { deepFreeze, assertNonNegativeNumber, result } from './shared-v1.mjs';
export const POL_001 = deepFreeze({ engine_id:'POL-001', version:'0.1.0', layer:'L0', mode:'DETERMINISTIC_POLICY', prod_writes:false, additional_cost_eur:0 });
const hr = reason => result('POL-001',{ decision:'HUMAN_REQUIRED', reason });
export function evaluatePolicy(input={}) {
  if (input.customer_human_request) return hr('CUSTOMER_HUMAN_REQUEST');
  if (input.legal_required) return hr('LEGAL_REQUIRED');
  if (input.signature_required) return hr('SIGNATURE_REQUIRED');
  if (input.security_incident) return hr('SECURITY_INCIDENT');
  if (input.policy_conflict) return hr('POLICY_CONFLICT');
  if (input.high_risk) return hr('HIGH_RISK');
  if (input.low_confidence) return hr('LOW_CONFIDENCE');
  const cost = assertNonNegativeNumber(input.additional_cost_eur ?? 0,'additional_cost_eur');
  const limit = assertNonNegativeNumber(input.money_limit_eur ?? 0,'money_limit_eur');
  if (cost > limit) return hr('MONEY_LIMIT');
  if ((input.environment ?? '').toUpperCase()==='PROD' && input.write===true) return result('POL-001',{decision:'DENY',reason:'PROD_WRITE_NOT_AUTHORIZED'});
  if (input.explicit_deny===true) return result('POL-001',{decision:'DENY',reason:'EXPLICIT_POLICY_DENY'});
  return result('POL-001',{decision:'ALLOW',reason:'POLICY_PASS'});
}
