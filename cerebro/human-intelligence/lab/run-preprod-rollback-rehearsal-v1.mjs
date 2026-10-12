import fs from 'node:fs';
import path from 'node:path';
import { createRealCerebroActorAdapter, preflightRealCerebroActor } from './real-cerebro-actor-adapter.mjs';
import { runConversation } from './conversation-harness.mjs';
import { observeActorBehavior, assertObserverEvent } from '../evaluation/behavior-observer-v1.mjs';

const BASE='https://hnqlnvakzaywtafeiybt.supabase.co/functions/v1';
const OLD='cerebro-human-old-actor-preprod-v0';
const NEW='cerebro-human-new-actor-preprod-v1';
function arg(name,fallback=null){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:fallback;}
async function token(audience){
  const u=process.env.ACTIONS_ID_TOKEN_REQUEST_URL,t=process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
  if(!u||!t)throw new Error('GITHUB_OIDC_ENV_MISSING');
  const url=new URL(u);url.searchParams.set('audience',audience);
  const r=await fetch(url,{headers:{authorization:`Bearer ${t}`}});const b=await r.json().catch(()=>null);
  if(!r.ok||!b?.value)throw new Error(`OIDC_FAILED:${audience}:${r.status}`);return String(b.value);
}
const observer=async input=>assertObserverEvent(observeActorBehavior(input));
const outcome=async({transcript})=>transcript.filter(x=>x.actor).length>=2?{complete:true,reason:'ROLLBACK_REHEARSAL_TWO_TURNS'}:{complete:false};
async function main(){
  const out=arg('--out','artifacts/human-intelligence/rollback-rehearsal.v1.json');
  const [ot,nt]=await Promise.all([token(OLD),token(NEW)]);
  const oldUrl=`${BASE}/${OLD}/chat`,newUrl=`${BASE}/${NEW}/chat`;
  const [op,np]=await Promise.all([
    preflightRealCerebroActor({url:oldUrl,accessToken:ot,authMode:'github_oidc',expectedFunction:OLD,allowedSourceModes:new Set(['FROZEN_PROD_V33_SANDBOX'])}),
    preflightRealCerebroActor({url:newUrl,accessToken:nt,authMode:'github_oidc',expectedFunction:NEW,allowedSourceModes:new Set(['HUMAN_INTELLIGENCE_NEW_V1_PREPROD'])})
  ]);
  const oldActor=createRealCerebroActorAdapter({url:oldUrl,accessToken:ot,authMode:'github_oidc',expectedFunction:OLD,allowedSourceModes:new Set(['FROZEN_PROD_V33_SANDBOX'])});
  const newActor=createRealCerebroActorAdapter({url:newUrl,accessToken:nt,authMode:'github_oidc',expectedFunction:NEW,allowedSourceModes:new Set(['HUMAN_INTELLIGENCE_NEW_V1_PREPROD'])});
  const scenario={scenario_id:'ROLLBACK-REHEARSAL-V1',initial_human_utterance:'He tenido una mala experiencia antes y quiero saber qué dato necesitas primero.'};
  const candidate=await runConversation({seed:'rollback-v1',scenario,actorAdapter:newActor,actorLabel:'NEW_PREPROD_BEFORE_ROLLBACK',behaviorObserver:observer,outcomeEvaluator:outcome,maxTurns:2});
  const restored=await runConversation({seed:'rollback-v1',scenario,actorAdapter:oldActor,actorLabel:'OLD_PREPROD_AFTER_ROLLBACK_SELECTION',behaviorObserver:observer,outcomeEvaluator:outcome,maxTurns:2});
  const green=op.ok&&np.ok&&candidate.real_cerebro_actor===true&&restored.real_cerebro_actor===true&&candidate.actor_evidence_summary.actor_environment==='PREPROD'&&restored.actor_evidence_summary.actor_environment==='PREPROD';
  const artifact={
    state_type:'CEREBRO_HUMAN_INTELLIGENCE_PHYSICAL_ROLLBACK_REHEARSAL_V1',status:green?'GREEN':'RED',
    semantics:'PHYSICAL_FALLBACK_SELECTION_REHEARSAL_BETWEEN_SEPARATE_PREPROD_ACTORS_NO_SHARED_ROUTE_MUTATION',
    candidate_preflight:np,baseline_preflight:op,candidate_episode:candidate,restored_old_episode:restored,
    final_selected_actor:green?OLD:null,
    route_mutated:false,prod_invoked:false,prod_authorized:false,prod_write_authorized:false,customer_data:false,trading_access:false,additional_cost_eur:0,
    next_gate:'SHARED_PREPROD_ROUTE_SHADOW_AND_ATOMIC_ROLLBACK'
  };
  fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(artifact,null,2)+'\n');
  console.log(JSON.stringify({status:artifact.status,final_selected_actor:artifact.final_selected_actor,route_mutated:false,next_gate:artifact.next_gate}));
  if(!green)process.exitCode=1;
}
main().catch(e=>{console.error(String(e?.stack??e));process.exitCode=1;});
