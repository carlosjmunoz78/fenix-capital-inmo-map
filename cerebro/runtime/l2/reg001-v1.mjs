import { assertNonEmptyString, clone, deepFreeze, result } from '../l0/shared-v1.mjs';

export const REG_001=deepFreeze({engine_id:'REG-001',version:'0.1.0',layer:'L2',capability:'GOLDEN_REGRESSION_FOUNDATION',promotion_execution:false,prod_writes:false,additional_cost_eur:0});
function stable(v){if(Array.isArray(v))return v.map(stable);if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));return v;}
function equal(a,b){return JSON.stringify(stable(a))===JSON.stringify(stable(b));}

export function evaluateGoldenSuite(input){
  const suite_id=assertNonEmptyString(input?.suite_id,'suite_id');
  if(!Array.isArray(input?.cases)||!input.cases.length)throw new TypeError('cases must be a non-empty array');
  const cases=input.cases.map((x,i)=>{
    const case_id=assertNonEmptyString(x?.case_id,`cases[${i}].case_id`),pass=equal(x?.expected,x?.actual);
    return {case_id,pass,expected:clone(x?.expected),actual:clone(x?.actual)};
  });
  const failures=cases.filter(x=>!x.pass);
  return result('REG-001',{suite_id,status:failures.length?'FAIL':'GREEN',passed:cases.length-failures.length,failed:failures.length,failures,promotion_candidate:failures.length===0,promotion_execution:false});
}
