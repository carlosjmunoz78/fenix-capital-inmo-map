import { assertNonEmptyString, assertSafeNumber, deepFreeze, result } from '../l0/shared-v1.mjs';

export const CAN_001=deepFreeze({engine_id:'CAN-001',version:'0.1.0',layer:'L6',capability:'PROGRESSIVE_DELIVERY_FOUNDATION',rollout_execution:false,rollback_execution:false,prod_writes:false,additional_cost_eur:0});
function pct(v,label){assertSafeNumber(v,label);if(v<0||v>100)throw new RangeError(`${label} must be 0..100`);return v;}

export function evaluateCanaryStage(input){
  const release_id=assertNonEmptyString(input?.release_id,'release_id');
  const current=pct(input?.current_percentage,'current_percentage');
  if(![10,50,100].includes(current))throw new TypeError('current_percentage must be 10, 50 or 100');
  const error_rate=pct(input?.error_rate_pct,'error_rate_pct'),max_error_rate=pct(input?.max_error_rate_pct,'max_error_rate_pct');
  const latency=assertSafeNumber(input?.latency_ms,'latency_ms'),max_latency=assertSafeNumber(input?.max_latency_ms,'max_latency_ms');
  const healthy=error_rate<=max_error_rate&&latency<=max_latency;
  const next=healthy?(current===10?50:current===50?100:100):current;
  return result('CAN-001',{release_id,status:healthy?(current===100?'COMPLETE':'PROMOTE_CANDIDATE'):'ROLLBACK_CANDIDATE',current_percentage:current,next_percentage:next,healthy,error_rate_pct:error_rate,max_error_rate_pct:max_error_rate,latency_ms:latency,max_latency_ms:max_latency,rollout_execution:false,rollback_execution:false});
}
