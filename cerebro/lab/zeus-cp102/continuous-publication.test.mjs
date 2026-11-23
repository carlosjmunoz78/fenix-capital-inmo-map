import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validate} from './continuous-publication-writer.mjs';
const c={run_id:'45198055197',run_attempt:'1',sha:'902022f5d4dcc4aab29e6d35411a63c38fe438e7',event_name:'workflow_run'};
const m={
 schema:'zeus-lrn-publication-auto/v1',repository:'carlosjmunoz78/fenix-capital-inmo-map',workflow_id:403468557,
 source_branch:'cerebro-rsi-learning-state-v0',scope:{company_id:'fenix',engine_id:'LRN-001',environment:'PREPROD',version:'0.6.0'},
 run_id:45198055197,run_attempt:1,publisher_job_id:137773725781,
 source_head_sha:c.sha,state_commit:'c9d7a17bf3632413facd6439a1b8738d69f2e023',
 event:'workflow_run',execution_state:'PUBLISHER_JOB_SUCCESS',health_state:'GREEN_AT_OBSERVATION',
 autonomy_state:'PREPROD_POLICY_ONLY',promotion_allowed:false,additional_cost_eur:0,
 summary:{path:'cerebro/runtime/rsi-learning-state/last-control-plane-run.json',git_blob:'a'.repeat(40),sha256:'b'.repeat(64)},
 daily_result:{status:'NO_DAILY_RESULT'}
};
test('accepts only exact provider-attested scope and no-daily publication',()=>assert.doesNotThrow(()=>validate(m,c)));
test('accepts valid new DAILY lock key without implying canonical cursor advancement',()=>assert.doesNotThrow(()=>validate({...m,daily_result:{status:'ELIGIBLE',lock_key:'c'.repeat(64)}},c)));
const bad=[
 ['cross company', {...m,scope:{...m.scope,company_id:'aion'}}],
 ['cross engine', {...m,scope:{...m.scope,engine_id:'FACT-001'}}],
 ['prod environment', {...m,scope:{...m.scope,environment:'PROD'}}],
 ['run spoof', {...m,run_id:45198055198}],
 ['attempt spoof', {...m,run_attempt:2}],
 ['head spoof', {...m,source_head_sha:'c'.repeat(40)}],
 ['bad commit', {...m,state_commit:'x'}],
 ['prod promotion',{...m,promotion_allowed:true}],
 ['cost violation',{...m,additional_cost_eur:10}],
 ['wrong workflow',{...m,workflow_id:1}],
 ['missing daily key',{...m,daily_result:{status:'ELIGIBLE'}}],
 ['invented daily key',{...m,daily_result:{status:'NO_DAILY_RESULT',lock_key:'c'.repeat(64)}}],
 ['forged state',{...m,execution_state:'COMPLETED'}],
 ['bad summary',{...m,summary:{...m.summary,sha256:'broken'}}]
];
for(const [name,manifest] of bad)test('reject '+name,()=>assert.throws(()=>validate(manifest,c)));
