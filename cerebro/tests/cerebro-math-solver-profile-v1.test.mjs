import test from 'node:test';
import assert from 'node:assert/strict';
import {mathSolverProfile,runMathTask} from '../runtime/cerebro-math-solver-profile-v1.mjs';

const base={company_id:'fenix',environment:'PREPROD',version:'1.0.0'};

test('MATH is one transversal zero-cost profile over canonical engines, not a new engine',()=>{
  const p=mathSolverProfile();
  assert.equal(p.alias,'MATH');
  assert.equal(p.engine_id,'FACT-001');
  assert.deepEqual(p.primary_engine_ids,['OPT-001','SIM-001']);
  assert.ok(p.consumer_engine_ids.includes('DATA-001'));
  assert.ok(p.consumer_engine_ids.includes('FINOPS-001'));
  assert.equal(p.execution_strategy,'DETERMINISTIC_FIRST_NO_AI_REQUIRED');
  assert.equal(p.additional_cost_eur,0);
  assert.equal(p.prod_authorized,false);
  assert.equal(p.trading_access,false);
});

test('MATH descriptive statistics are deterministic and numerically correct',()=>{
  const input={...base,task_kind:'DESCRIPTIVE_STATS',values:[1,2,3,4]};
  const a=runMathTask(input),b=runMathTask(input);
  assert.deepEqual(a,b);
  assert.equal(a.result.mean,2.5);
  assert.equal(a.result.median,2.5);
  assert.equal(a.result.population_variance,1.25);
  assert.equal(a.result.population_stddev,Math.sqrt(1.25));
});

test('MATH probability and expected value fail closed unless probabilities are valid',()=>{
  const ok=runMathTask({...base,task_kind:'EXPECTED_VALUE',outcomes:[{value:100,probability:0.25},{value:0,probability:0.75}]});
  assert.equal(ok.result.expected_value,25);
  assert.throws(()=>runMathTask({...base,task_kind:'EXPECTED_VALUE',outcomes:[{value:1,probability:0.8},{value:2,probability:0.8}]}),/sum to 1/);
  assert.throws(()=>runMathTask({...base,task_kind:'EXPECTED_VALUE',outcomes:[{value:Infinity,probability:1}]}),/finite number/);
});

test('MATH bounded optimizer selects only feasible best candidate with deterministic tie break',()=>{
  const result=runMathTask({...base,task_kind:'BOUNDED_OPTIMIZATION',direction:'MAX',candidates:[
    {candidate_id:'b',objective:20,constraints:[{lhs:11,op:'<=',rhs:10}]},
    {candidate_id:'c',objective:10,constraints:[{lhs:5,op:'<=',rhs:10}]},
    {candidate_id:'a',objective:10,constraints:[{lhs:6,op:'<=',rhs:10}]}
  ]});
  assert.equal(result.result.selected_candidate_id,'a');
  assert.equal(result.result.feasible_count,2);
});

test('MATH linear forecast is deterministic and bounded',()=>{
  const result=runMathTask({...base,task_kind:'LINEAR_FORECAST',values:[10,20,30,40],horizon:2});
  assert.deepEqual(result.result.forecast,[50,60]);
  assert.equal(result.result.slope,10);
  assert.throws(()=>runMathTask({...base,task_kind:'LINEAR_FORECAST',values:[1,2],horizon:1001}),/horizon/);
});

test('MATH refuses PROD, nonfinite inputs and unsupported work',()=>{
  assert.throws(()=>runMathTask({company_id:'fenix',environment:'PROD',task_kind:'DESCRIPTIVE_STATS',values:[1]}),/PREPROD/);
  assert.throws(()=>runMathTask({...base,task_kind:'DESCRIPTIVE_STATS',values:[NaN]}),/finite number/);
  assert.throws(()=>runMathTask({...base,task_kind:'MAGIC'}),/unsupported math task/);
});
