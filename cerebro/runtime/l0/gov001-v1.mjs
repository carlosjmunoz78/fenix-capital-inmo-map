import fs from 'node:fs';
import { deepFreeze, result } from './shared-v1.mjs';
export const GOV_001 = deepFreeze({ engine_id:'GOV-001', version:'0.1.0', layer:'L0', mode:'READ_ONLY_REGISTRY', prod_writes:false, additional_cost_eur:0 });
export function validateRegistry(registry) {
  const ids = Array.isArray(registry?.engine_ids) ? registry.engine_ids : [];
  const duplicate_ids = ids.filter((id,i)=>ids.indexOf(id)!==i);
  const valid = Number.isInteger(registry?.count) && registry.count===ids.length && duplicate_ids.length===0 && ids.every(id=>typeof id==='string'&&id.trim());
  return result('GOV-001', { status:valid?'GREEN':'INVALID', valid, count:ids.length, duplicate_ids:[...new Set(duplicate_ids)].sort() });
}
export function readRegistry(registryPath) {
  const registry = JSON.parse(fs.readFileSync(registryPath,'utf8'));
  return deepFreeze({ registry, validation:validateRegistry(registry) });
}
