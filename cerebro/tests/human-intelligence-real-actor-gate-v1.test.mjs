import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RealCerebroActorUnavailable,
  validateRealActorTarget,
  verifyRealActorEvidence,
  createRealCerebroActorAdapter,
  preflightRealCerebroActor
} from '../human-intelligence/lab/real-cerebro-actor-adapter.mjs';
import { runConversation, runPairedReplay } from '../human-intelligence/lab/conversation-harness.mjs';

const PREPROD='https://hnqlnvakzaywtafeiybt.supabase.co/functions/v1/cerebro-human-old-actor-preprod-v0/chat';
const PROD='https://cluhljgonannaafpmblx.supabase.co/functions/v1/cerebro-console-gateway-v0/chat';
const EVIDENCE={
  real_cerebro_actor:true,
  environment:'PREPROD',
  project_ref:'hnqlnvakzaywtafeiybt',
  prod_write_authorized:false,
  prod_execution_enabled:false,
  customer_data:false,
  trading_access:false,
  additional_cost_eur:0,
  source_version:'prod-v33-frozen-old',
  source_sha256:'a32fc26e4b328d0477bc53f0ae9085c0d5d280703779db5ac8593fd9b718553a',
  source_mode:'FROZEN_PROD_V33_SANDBOX',
  source_scope:'SAFE_CONVERSATIONAL_CORE',
  auth_mode:'GITHUB_OIDC'
};
const NEW_EVIDENCE={
  ...EVIDENCE,
  source_service:'cerebro-human-new-actor-preprod-v1',
  source_version:'human-intelligence-new-v1.2@9c137a419ebf2eb983c1e22e8912f69580c2d164',
  provenance_kind:'GIT_COMMIT_BLOB',
  source_commit_sha:'9c137a419ebf2eb983c1e22e8912f69580c2d164',
  source_blob_sha:'c6a6197b18e50a228014d984cc92b5c59254dab5',
  source_sha256:undefined,
  source_mode:'HUMAN_INTELLIGENCE_NEW_V1_PREPROD'
};

function response(body,status=200){return {ok:status>=200&&status<300,status,json:async()=>body};}
const observer=async()=> 'GROUNDING_CONFIRMATION';
const evaluator=async({transcript})=>({complete:transcript.length>=1,reason:'TEST_COMPLETE'});

test('real actor target rejects PROD and non-PREPROD routes',()=>{
  assert.throws(()=>validateRealActorTarget(PROD),error=>error instanceof RealCerebroActorUnavailable&&error.reason==='PROD_TARGET_FORBIDDEN');
  assert.throws(()=>validateRealActorTarget('http://hnqlnvakzaywtafeiybt.supabase.co/functions/v1/cerebro-human-old-actor-preprod-v0/chat'),/HTTPS_REQUIRED/);
  assert.throws(()=>validateRealActorTarget('https://example.com/functions/v1/cerebro-human-old-actor-preprod-v0/chat'),/PREPROD_TARGET_REQUIRED/);
  assert.equal(validateRealActorTarget(PREPROD),PREPROD);
});

test('real actor evidence is fail-closed and accepts frozen OLD lineage',()=>{
  assert.equal(verifyRealActorEvidence(EVIDENCE),true);
  assert.equal(verifyRealActorEvidence({...EVIDENCE,environment:'PROD'}),false);
  assert.equal(verifyRealActorEvidence({...EVIDENCE,prod_write_authorized:true}),false);
  assert.equal(verifyRealActorEvidence({...EVIDENCE,customer_data:true}),false);
  assert.equal(verifyRealActorEvidence({...EVIDENCE,source_mode:'UNKNOWN'}),false);
  assert.equal(verifyRealActorEvidence({...EVIDENCE,source_sha256:'bad'}),false);
});

test('NEW actor provenance is tied to exact Git commit and planner blob',()=>{
  assert.equal(verifyRealActorEvidence(NEW_EVIDENCE),true);
  assert.equal(verifyRealActorEvidence({...NEW_EVIDENCE,source_commit_sha:'0'.repeat(40)}),false);
  assert.equal(verifyRealActorEvidence({...NEW_EVIDENCE,source_blob_sha:'bad'}),false);
  assert.equal(verifyRealActorEvidence({...NEW_EVIDENCE,source_version:'human-intelligence-new-v1.2@0000000000000000000000000000000000000000'}),false);
});

test('OIDC adapter requires token but no static secret or anon key',()=>{
  assert.throws(()=>createRealCerebroActorAdapter({url:PREPROD}),/ACCESS_TOKEN_MISSING/);
  assert.doesNotThrow(()=>createRealCerebroActorAdapter({url:PREPROD,accessToken:'github-oidc',fetchImpl:async()=>response({})}));
  assert.throws(()=>createRealCerebroActorAdapter({url:PREPROD,accessToken:'jwt',authMode:'supabase_jwt'}),/ANON_KEY_MISSING/);
});

test('preflight accepts only attested PREPROD actor',async()=>{
  const calls=[];
  const fetchImpl=async(url,init)=>{calls.push({url,init});return response({status:'ok',actor_evidence:EVIDENCE});};
  const out=await preflightRealCerebroActor({url:PREPROD,accessToken:'github-oidc',fetchImpl});
  assert.equal(out.ok,true);
  assert.equal(out.auth_mode,'github_oidc');
  assert.equal(out.actor_evidence.environment,'PREPROD');
  assert.equal(calls.length,1);
  assert.match(calls[0].url,/\/health$/);
  assert.equal('apikey' in calls[0].init.headers,false);
});

test('harness marks actor real only when every completed actor turn is attested',async()=>{
  const actor=async()=>({text:'Te escucho. Vamos a concretarlo.',actor_evidence:EVIDENCE});
  const episode=await runConversation({seed:'real-actor-gate',scenario:{scenario_id:'TEST-REAL'},actorAdapter:actor,behaviorObserver:observer,outcomeEvaluator:evaluator,maxTurns:2,actorLabel:'OLD_PREPROD'});
  assert.equal(episode.real_cerebro_actor,true);
  assert.equal(episode.actor_evidence_summary.verified_real_actor_turns,1);
  assert.equal(episode.actor_evidence_summary.actor_environment,'PREPROD');
  assert.equal(episode.safety.prod_write_authorized,false);
});

test('harness refuses forged unsafe real-actor evidence',async()=>{
  const actor=async()=>({text:'respuesta',actor_evidence:{...EVIDENCE,prod_write_authorized:true}});
  const episode=await runConversation({seed:'forged-real',actorAdapter:actor,behaviorObserver:observer,outcomeEvaluator:evaluator,maxTurns:1});
  assert.equal(episode.real_cerebro_actor,false);
  assert.equal(episode.completion_reason,'ACTOR_ERROR');
  assert.match(episode.transcript[0].actor_error,/unsafe_or_unverified_real_actor_evidence/);
});

test('network adapter never sends simulator private state and carries only LAB context',async()=>{
  let captured;
  const fetchImpl=async(_url,init)=>{captured=JSON.parse(init.body);return response({status:'OK',message:'Respuesta OLD segura.',actor_evidence:EVIDENCE});};
  const adapter=createRealCerebroActorAdapter({url:PREPROD,accessToken:'github-oidc',fetchImpl});
  const output=await adapter({seed:'1',scenario_id:'S1',turn:1,human_message:'Hola',history:[],human_profile:{role:'CLIENT'},environment:'LAB',prod_write_authorized:false,trading_access:false});
  assert.equal(output.text,'Respuesta OLD segura.');
  assert.equal(output.actor_evidence.real_cerebro_actor,true);
  const raw=JSON.stringify(captured);
  for(const forbidden of ['private_state','private_goal','hidden_facts','misbeliefs','reveal_rules','internal_state']) assert.equal(raw.includes(forbidden),false);
  assert.deepEqual(captured.lab_context,{scenario_id:'S1',turn:1,seed:'1',company_id:'fenix',engine_id:'SIM-001',environment:'LAB',version:'v1',prod_write_authorized:false,trading_access:false,customer_data:false});
});

test('adapter carries safe actor truth metadata into conversation evidence',async()=>{
  const fetchImpl=async()=>response({status:'OK',message:'Respuesta NEW segura.',executed:false,truth_basis:'DETERMINISTIC_BOUNDED_RULESET_V1',epistemic_state:'BOUNDED_DOMAIN_REASONING',context_applied:true,actor_evidence:NEW_EVIDENCE});
  const adapter=createRealCerebroActorAdapter({url:'https://hnqlnvakzaywtafeiybt.supabase.co/functions/v1/cerebro-human-new-actor-preprod-v1/chat',expectedFunction:'cerebro-human-new-actor-preprod-v1',allowedSourceModes:new Set(['HUMAN_INTELLIGENCE_NEW_V1_PREPROD']),accessToken:'github-oidc',fetchImpl});
  const output=await adapter({seed:'2',scenario_id:'S2',turn:1,human_message:'Tengo una duda de hipoteca',history:[],environment:'LAB',prod_write_authorized:false,trading_access:false});
  assert.equal(output.actor_executed,false);
  assert.equal(output.actor_truth_basis,'DETERMINISTIC_BOUNDED_RULESET_V1');
  assert.equal(output.actor_epistemic_state,'BOUNDED_DOMAIN_REASONING');
  assert.equal(output.actor_context_applied,true);
});

test('paired replay is real only when OLD and NEW are both attested',async()=>{
  const oldActor=async()=>({text:'Respuesta OLD',actor_evidence:EVIDENCE});
  const newActor=async()=>({text:'Respuesta NEW',actor_evidence:NEW_EVIDENCE});
  const pair=await runPairedReplay({seed:'pair-real',actorOld:oldActor,actorNew:newActor,behaviorObserver:observer,outcomeEvaluator:evaluator,maxTurns:1});
  assert.equal(pair.real_cerebro_actor,true);
  assert.equal(pair.same_initial_public_profile,true);
  assert.equal(pair.comparable,true);
});
