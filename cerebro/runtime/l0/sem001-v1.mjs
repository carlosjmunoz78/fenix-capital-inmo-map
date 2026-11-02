import { assertNonEmptyString, deepFreeze, result } from './shared-v1.mjs';
export const SEM_001 = deepFreeze({ engine_id:'SEM-001', version:'0.1.0', layer:'L0', mode:'CANONICAL_VOCABULARY', prod_writes:false, additional_cost_eur:0 });
const TERMS=deepFreeze({cliente:'Cliente',lead:'Lead',contacto:'Contacto',expediente:'Expediente',firma:'Firma',banco:'Banco',producto:'Producto',documento:'Documento',tarea:'Tarea'});
export function canonicalizeEntity(term){ const raw=assertNonEmptyString(term,'term'); const canonical=TERMS[raw.trim().toLowerCase()] ?? null; return result('SEM-001',{status:canonical?'OK':'UNKNOWN',input:raw,canonical}); }
export function canonicalTerms(){ return Object.values(TERMS); }
