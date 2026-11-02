import { assertLabContext, assertNonEmptyString, assertPlainObject, assertSafeNumber, clone, deepFreeze, result } from '../l0/shared-v1.mjs';

export const TWIN_001=deepFreeze({
  engine_id:'TWIN-001',version:'0.1.0',layer:'L1',capability:'DIGITAL_TWIN_SIMULATION_FOUNDATION',
  simulation_only:true,prod_writes:false,additional_cost_eur:0
});

function numericMap(value,label){assertPlainObject(value,label);const out={};for(const [k,v] of Object.entries(value)){assertSafeNumber(v,`${label}.${k}`);out[k]=v;}return out;}

export function createTwinSnapshot(input){
  const context=assertLabContext(input?.context);
  const snapshot_id=assertNonEmptyString(input?.snapshot_id,'snapshot_id');
  const source_kind=assertNonEmptyString(input?.source_kind ?? 'SYNTHETIC','source_kind').toUpperCase();
  if(!['SYNTHETIC','ANONYMIZED','APPROVED_FIXTURE'].includes(source_kind))throw new TypeError('source_kind must be synthetic, anonymized or approved fixture');
  return result('TWIN-001',{
    status:'SNAPSHOT_READY',context,snapshot_id,source_kind,
    metrics:numericMap(input?.metrics ?? {},'metrics'),
    entities:clone(input?.entities ?? {}),simulation_only:true,persist:false
  });
}

export function simulateTwinScenario(input){
  assertPlainObject(input?.snapshot,'snapshot');
  if(input.snapshot.engine_id!=='TWIN-001'||input.snapshot.simulation_only!==true)throw new TypeError('snapshot must come from TWIN-001 simulation foundation');
  const scenario_id=assertNonEmptyString(input?.scenario_id,'scenario_id');
  const deltas=numericMap(input?.metric_deltas ?? {},'metric_deltas');
  const before=numericMap(input.snapshot.metrics ?? {},'snapshot.metrics');
  const after={...before};for(const [k,v] of Object.entries(deltas))after[k]=(after[k] ?? 0)+v;
  return result('TWIN-001',{status:'SIMULATED',scenario_id,before,metric_deltas:deltas,after,simulation_only:true,prod_write:false});
}
