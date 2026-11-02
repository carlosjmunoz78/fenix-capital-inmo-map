import { assertNonEmptyString, assertPlainObject, deepFreeze, result } from '../l0/shared-v1.mjs';

export const ARCH_001=deepFreeze({engine_id:'ARCH-001',version:'0.1.0',layer:'L6',capability:'ARCHITECTURE_ANALYSIS_FOUNDATION',mutation_execution:false,prod_writes:false,additional_cost_eur:0});

export function analyzeArchitecture(input){
  if(!Array.isArray(input?.components))throw new TypeError('components must be an array');
  if(!Array.isArray(input?.dependencies))throw new TypeError('dependencies must be an array');
  const components=input.components.map((c,i)=>({id:assertNonEmptyString(c?.id,`components[${i}].id`),contract_version:assertNonEmptyString(c?.contract_version ?? '0.0.0',`components[${i}].contract_version`),source_of_truth:assertNonEmptyString(c?.source_of_truth ?? 'UNKNOWN',`components[${i}].source_of_truth`)}));
  const ids=new Set(components.map(x=>x.id));
  const duplicate_components=components.filter((x,i,a)=>a.findIndex(y=>y.id===x.id)!==i).map(x=>x.id);
  const dependencies=input.dependencies.map((d,i)=>{assertPlainObject(d,`dependencies[${i}]`);return {from:assertNonEmptyString(d.from,`dependencies[${i}].from`),to:assertNonEmptyString(d.to,`dependencies[${i}].to`)};});
  const missing_targets=dependencies.filter(d=>!ids.has(d.from)||!ids.has(d.to));
  const duplicate_sources=[];const bySot=new Map();for(const c of components){const k=c.source_of_truth;if(k==='UNKNOWN')continue;if(!bySot.has(k))bySot.set(k,[]);bySot.get(k).push(c.id);}for(const [source,cs] of bySot)if(cs.length>1)duplicate_sources.push({source_of_truth:source,components:cs});
  const violations=[...duplicate_components.map(id=>({type:'DUPLICATE_COMPONENT',id})),...missing_targets.map(d=>({type:'MISSING_DEPENDENCY_TARGET',...d})),...duplicate_sources.map(x=>({type:'SOURCE_OF_TRUTH_DUPLICATION',...x}))];
  return result('ARCH-001',{status:violations.length?'VIOLATIONS':'GREEN',violations,mutation_execution:false});
}
