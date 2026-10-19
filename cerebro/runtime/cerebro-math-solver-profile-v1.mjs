#!/usr/bin/env node
import crypto from 'node:crypto';

const PREPROD='PREPROD';
const VERSION='1.0.0';
const MAX_VALUES=10000;
const MAX_CANDIDATES=5000;
const MAX_HORIZON=1000;
const TASK_KINDS=Object.freeze(['DESCRIPTIVE_STATS','EXPECTED_VALUE','BOUNDED_OPTIMIZATION','LINEAR_FORECAST']);
const CANONICAL_CONSUMERS=Object.freeze(['OPT-001','SIM-001','DATA-001','FINOPS-001','EXP-001','QA-001']);

function authority(){return Object.freeze({prod_authorized:false,prod_write_authorized:false,prod_mutation_authorized:false,permission_expansion_authorized:false,external_code_execution:false,external_skill_code_execution:false,dependency_install_authorized:false,customer_data_used:false,paid_fallback:false,spend_authorized:false,trading_access:false,additional_cost_eur:0});}
function stable(v){if(v===null||typeof v!=='object')return v;if(Array.isArray(v))return v.map(stable);return Object.fromEntries(Object.keys(v).sort().map((k)=>[k,stable(v[k])]));}
function hash(v){return crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');}
function req(value,label){if(typeof value!=='string'||!value.trim())throw new Error(`${label} required`);return value.trim();}
function finite(value,label){if(typeof value!=='number'||!Number.isFinite(value))throw new Error(`${label} must be finite number`);return value;}
function boundedArray(value,label,max,min=1){if(!Array.isArray(value)||value.length<min||value.length>max)throw new Error(`${label} length must be ${min}..${max}`);return value;}
function context(input){const company_id=req(input.company_id,'company_id');if(input.environment!=='PREPROD')throw new Error('MATH_PREPROD_ONLY');if(input.version!=null&&input.version!==VERSION)throw new Error('MATH_VERSION_MISMATCH');return Object.freeze({company_id,environment:PREPROD,version:VERSION});}
function numbers(values,label='values'){return boundedArray(values,label,MAX_VALUES).map((x,i)=>finite(x,`${label}[${i}]`));}
function envelope(ctx,task_kind,input_fingerprint,result,calculation_trace,resource_evidence){const base={schema_version:'1.0.0',state_type:'CEREBRO_MATH_SOLVER_RESULT_V1',company_id:ctx.company_id,engine_id:'OPT-001',profile_owner_engine_id:'FACT-001',environment:PREPROD,version:VERSION,task_kind,input_fingerprint,result,calculation_trace:Object.freeze(calculation_trace),resource_evidence:Object.freeze(resource_evidence),...authority()};return Object.freeze({...base,result_hash:hash(base)});}
function median(sorted){const n=sorted.length;const m=Math.floor(n/2);return n%2?sorted[m]:(sorted[m-1]+sorted[m])/2;}
function isConstraintGreen(c){const lhs=finite(c.lhs,'constraint.lhs'),rhs=finite(c.rhs,'constraint.rhs');if(c.op==='<=')return lhs<=rhs;if(c.op==='>=')return lhs>=rhs;if(c.op==='===')return lhs===rhs;throw new Error(`unsupported constraint op:${c.op}`);}

export function mathSolverProfile(){return Object.freeze({schema_version:'1.0.0',state_type:'CEREBRO_MATH_SOLVER_PROFILE_V1',alias:'MATH',company_scope:'GLOBAL_OR_SCOPED',engine_id:'FACT-001',primary_engine_ids:Object.freeze(['OPT-001','SIM-001']),consumer_engine_ids:CANONICAL_CONSUMERS,environment:PREPROD,version:VERSION,execution_strategy:'DETERMINISTIC_FIRST_NO_AI_REQUIRED',task_kinds:TASK_KINDS,limits:Object.freeze({max_values:MAX_VALUES,max_candidates:MAX_CANDIDATES,max_horizon:MAX_HORIZON}),purpose:'Shared deterministic mathematics, statistics, bounded optimization and forecasting capability. Reuses canonical engines and creates no new engine.',...authority()});}

export function runMathTask(input={}){
  const ctx=context(input);const task_kind=req(input.task_kind,'task_kind');if(!TASK_KINDS.includes(task_kind))throw new Error(`unsupported math task:${task_kind}`);
  if(task_kind==='DESCRIPTIVE_STATS'){
    const xs=numbers(input.values);const sorted=[...xs].sort((a,b)=>a-b);const sum=xs.reduce((a,b)=>a+b,0);const mean=sum/xs.length;const variance=xs.reduce((acc,x)=>acc+(x-mean)**2,0)/xs.length;const result=Object.freeze({count:xs.length,sum,mean,median:median(sorted),min:sorted[0],max:sorted.at(-1),population_variance:variance,population_stddev:Math.sqrt(variance)});return envelope(ctx,task_kind,hash({values:xs}),result,[`count=${xs.length}`,`sum=${sum}`,`mean=sum/count=${mean}`],{bounded:true,input_count:xs.length,max_input_count:MAX_VALUES});
  }
  if(task_kind==='EXPECTED_VALUE'){
    const outcomes=boundedArray(input.outcomes,'outcomes',MAX_VALUES).map((row,i)=>Object.freeze({value:finite(row?.value,`outcomes[${i}].value`),probability:finite(row?.probability,`outcomes[${i}].probability`)}));for(const row of outcomes)if(row.probability<0||row.probability>1)throw new Error('probability out of range');const p=outcomes.reduce((a,b)=>a+b.probability,0);if(Math.abs(p-1)>1e-9)throw new Error('probabilities must sum to 1');const expected_value=outcomes.reduce((a,b)=>a+b.value*b.probability,0);const result=Object.freeze({expected_value,probability_sum:p,outcome_count:outcomes.length});return envelope(ctx,task_kind,hash({outcomes}),result,[`probability_sum=${p}`,`expected_value=${expected_value}`],{bounded:true,input_count:outcomes.length,max_input_count:MAX_VALUES});
  }
  if(task_kind==='BOUNDED_OPTIMIZATION'){
    const direction=input.direction??'MAX';if(!['MAX','MIN'].includes(direction))throw new Error('direction must be MAX or MIN');const candidates=boundedArray(input.candidates,'candidates',MAX_CANDIDATES).map((row,i)=>{const candidate_id=req(row?.candidate_id,`candidates[${i}].candidate_id`);const objective=finite(row?.objective,`candidates[${i}].objective`);const constraints=Array.isArray(row?.constraints)?row.constraints:[];if(constraints.length>100)throw new Error('too many constraints');const constraint_results=constraints.map((c)=>isConstraintGreen(c));return Object.freeze({candidate_id,objective,constraint_results:Object.freeze(constraint_results),feasible:constraint_results.every(Boolean)});});const feasible=candidates.filter((x)=>x.feasible).sort((a,b)=>direction==='MAX'?(b.objective-a.objective||a.candidate_id.localeCompare(b.candidate_id)):(a.objective-b.objective||a.candidate_id.localeCompare(b.candidate_id)));if(!feasible.length)throw new Error('NO_FEASIBLE_CANDIDATE');const winner=feasible[0];const result=Object.freeze({selected_candidate_id:winner.candidate_id,selected_objective:winner.objective,direction,feasible_count:feasible.length,total_candidates:candidates.length});return envelope(ctx,task_kind,hash({direction,candidates}),result,[`feasible=${feasible.length}/${candidates.length}`,`winner=${winner.candidate_id}`,`objective=${winner.objective}`],{bounded:true,input_count:candidates.length,max_input_count:MAX_CANDIDATES});
  }
  const xs=numbers(input.values);if(xs.length<2)throw new Error('LINEAR_FORECAST requires at least 2 values');const horizon=Number(input.horizon??1);if(!Number.isInteger(horizon)||horizon<1||horizon>MAX_HORIZON)throw new Error(`horizon must be integer 1..${MAX_HORIZON}`);const n=xs.length;const xMean=(n-1)/2;const yMean=xs.reduce((a,b)=>a+b,0)/n;let numerator=0,denominator=0;for(let i=0;i<n;i++){numerator+=(i-xMean)*(xs[i]-yMean);denominator+=(i-xMean)**2;}const slope=denominator===0?0:numerator/denominator;const intercept=yMean-slope*xMean;const forecast=Array.from({length:horizon},(_,j)=>intercept+slope*(n+j));const result=Object.freeze({slope,intercept,horizon,forecast:Object.freeze(forecast)});return envelope(ctx,task_kind,hash({values:xs,horizon}),result,[`n=${n}`,`slope=${slope}`,`intercept=${intercept}`,`horizon=${horizon}`],{bounded:true,input_count:n,max_input_count:MAX_VALUES,horizon,max_horizon:MAX_HORIZON});
}

if(process.argv[1]&&process.argv[1].endsWith('cerebro-math-solver-profile-v1.mjs'))process.stdout.write(`${JSON.stringify(mathSolverProfile(),null,2)}\n`);
