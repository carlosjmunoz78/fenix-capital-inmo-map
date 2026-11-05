import test from 'node:test';
import assert from 'node:assert/strict';
import {AgentAutonomyHandoffBridgeV0} from './agent-autonomy-handoff-bridge-v0.mjs';
// This test uses a mock of the existing router. The canonical router is tested in GitHub CI.
const ctx={company_id:'fenix',engine_id:'SEO-001',environment:'PREPROD',version:'1.0.0'};
const agent={agent_id:'SEO-DRAFT-01',supervisor_id:'CEREBRO-SUP-01',enabled:true,...ctx};
const sup={supervisor_id:'CEREBRO-SUP-01',role:'CEREBRO_SUPERVISOR',active:true,attested_by_runtime:true,company_id:'fenix'};
const task={origin:'AGENT_SELF_INITIATED',source_job_id:'job-001',task_id:'task-001',reason:'SEO broken draft link',evidence_refs:['proof:001'],risk:'LOW',confidence:0.99,estimated_additional_cost_eur:0,capability:'DRAFT_INTERNAL_CONTENT',idempotency_key:'task-001-once',rollback_ref:'rollback:1',verification_plan_ref:'check:1'};
const grant={issuer:'OWNER_APPROVED_POLICY',owner_principal:'OWNER_ONLY',owner_approved:true,verified_by_gateway:true,policy_ref:'owner-approved-policy:seo-1',agent_id:agent.agent_id,supervisor_id:sup.supervisor_id,company_id:ctx.company_id,engine_id:ctx.engine_id,environment:ctx.environment,version:ctx.version,allowed_capabilities:['DRAFT_INTERNAL_CONTENT'],max_additional_cost_eur:0,expires_at:'2026-11-06T12:00:00Z'};
const source={status:'SUCCEEDED',job:{name:'agent.autonomous.intent.v0',job_id:'job-001',context:ctx,provenance:{runtime_verified:true,source_type:'agent.autonomous.intent.v0'},result:{output_text:'CEREBRO_EXECUTION_HANDOFF_JSON={"job_name":"safe.draft","payload":{}}'}}};
function setup(){const calls=[];const router={allowed_job_names:['safe.draft'],handleOutcome({outcome}){calls.push(outcome);return{status:'ENQUEUED',target_job_id:'target001',target_job_name:'safe.draft'}}};return {calls,bridge:new AgentAutonomyHandoffBridgeV0({router})};}
const request={outcome:source,agent,supervisor:sup,context:ctx,task,grant,now:'2026-11-05T09:00:00Z'};
test('approved self-initiated task reaches the existing router once',()=>{const {calls,bridge}=setup();const r=bridge.handle(request);assert.equal(r.status,'ENQUEUED');assert.equal(r.queued,true);assert.equal(calls.length,1);assert.equal(r.physical_pc_control,false)});
for(const [name,override] of [
 ['unsigned source',{outcome:{...source,job:{...source.job,provenance:{runtime_verified:false,source_type:'agent.autonomous.intent.v0'}}}}],
 ['other company',{outcome:{...source,job:{...source.job,context:{...ctx,company_id:'other'}}}}],
 ['unverified owner policy',{grant:{...grant,verified_by_gateway:false}}],
 ['revoked agent',{agent:{...agent,revoked:true}}],
 ['expired grant',{grant:{...grant,expires_at:'2026-11-04T00:00:00Z'}}],
 ['unauthorized Windows',{task:{...task,pc_remote_control:true}}],
 ['new money',{task:{...task,estimated_additional_cost_eur:1}}],
 ['unapproved supervisor',{supervisor:{...sup,attested_by_runtime:false}}],
 ['unknown capability',{task:{...task,capability:'ARBITRARY_SHELL'}}],
 ['mismatched job',{task:{...task,source_job_id:'other'}}],
 ['wrong source name',{outcome:{...source,job:{...source.job,name:'model.deepseek.agent'}}}],
 ['missing provenance',{outcome:{...source,job:{...source.job,provenance:null}}}]
]) test(`does not enqueue: ${name}`,()=>{const {calls,bridge}=setup();const r=bridge.handle({...request,...override});assert.notEqual(r.status,'ENQUEUED');assert.equal(r.queued,false);assert.equal(calls.length,0)});