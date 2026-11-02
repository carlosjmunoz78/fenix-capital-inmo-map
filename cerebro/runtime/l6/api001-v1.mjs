import { assertLabContext, assertNonEmptyString, assertNonNegativeNumber, clone, deepFreeze, result } from '../l0/shared-v1.mjs';

export const API_001=deepFreeze({engine_id:'API-001',version:'0.1.0',layer:'L6',capability:'LOGICAL_API_GATEWAY_FOUNDATION',network_execution:false,prod_writes:false,additional_cost_eur:0});
const METHODS=new Set(['GET','POST','PUT','PATCH','DELETE']);

export function buildIntegrationRequest(input){
  const context=assertLabContext(input?.context);
  const integration_id=assertNonEmptyString(input?.integration_id,'integration_id');
  const method=assertNonEmptyString(input?.method,'method').toUpperCase();
  if(!METHODS.has(method))throw new TypeError('unsupported method');
  const route=assertNonEmptyString(input?.route,'route');
  const rate_limit_per_minute=assertNonNegativeNumber(input?.rate_limit_per_minute ?? 0,'rate_limit_per_minute');
  const max_retries=assertNonNegativeNumber(input?.max_retries ?? 0,'max_retries');
  const timeout_ms=assertNonNegativeNumber(input?.timeout_ms ?? 0,'timeout_ms');
  return result('API-001',{status:'REQUEST_PLAN',context,integration_id,method,route,rate_limit_per_minute,max_retries,timeout_ms,headers:clone(input?.headers ?? {}),body:clone(input?.body ?? null),auditable:true,network_execution:false});
}
