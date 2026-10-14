#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { fetchPublicEvidenceV0 } from './public-source-adapter-v0.mjs';
import { learnProcedureV0, replayProcedureV0 } from './fact001-gap-capabilities-v0.mjs';

const PREPROD='PREPROD';
function ctx(engine_id){return {company_id:'fenix',engine_id,environment:PREPROD,version:'v0'};}
function hash(value){return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');}
function observation(evidence){return Object.freeze({http_status:evidence.http_status,content_type:evidence.content_type,body_sha256:evidence.body_sha256,final_url:evidence.final_url,summary:evidence.summary});}

export async function runWatchLearnRemoteObservationV0({target_url}={}){
  if(typeof target_url!=='string'||!target_url.trim())throw new TypeError('target_url required');
  const common={...ctx('RSH-001'),target_url:target_url.trim(),authorized_public_research:true,robots_allowed:true,timeout_ms:15000,max_bytes:1_500_000};
  const first=await fetchPublicEvidenceV0(common);
  if(first.status!=='REMOTE_READ_GREEN')throw new Error('initial remote observation not green');
  const expected=observation(first);
  const procedure=learnProcedureV0({
    context:ctx('LRN-001'),
    procedure_id:`remote-observation:${hash({url:first.final_url,body:first.body_sha256}).slice(0,24)}`,
    steps:[{
      step_id:'observe-public-preprod',
      action:'OBSERVE_AUTHORIZED_PUBLIC_PREPROD',
      target:first.final_url,
      input:{source_ref:`public:${hash(first.final_url).slice(0,16)}`},
      expected_result:expected,
      side_effect_class:'READ_ONLY'
    }]
  });
  const second=await fetchPublicEvidenceV0(common);
  const actual=observation(second);
  const replay=replayProcedureV0({procedure,adapter:{mode:'SAFE_PREPROD_SIMULATION',execute:()=>actual}});
  const stable=replay.status==='REPLAY_MATCH';
  return Object.freeze({
    schema_version:'1.0.0',state_type:'CEREBRO_WATCH_LEARN_REMOTE_OBSERVATION_V0',company_id:'fenix',engine_id:'LRN-001',environment:PREPROD,
    status:stable?'REMOTE_OBSERVATION_REPLAY_GREEN':'REMOTE_OBSERVATION_CHANGED_DURING_REPLAY',
    target_url:first.final_url,procedure_id:procedure.procedure_id,procedure_checksum:procedure.checksum,
    first_observation:expected,second_observation:actual,replay_status:replay.status,stable,
    network_reads:2,external_writes:0,auth_used:false,cookies_used:false,customer_data_used:false,
    prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0,
    next_gate:stable?'CONTINUOUS_AUTHORIZED_OBSERVATION_POLICY_AND_SCHEDULER':'REOBSERVE_STABLE_TARGET_BEFORE_CONTINUOUS_MODE'
  });
}

function args(argv){const out={};for(let i=2;i<argv.length;i++){if(argv[i]==='--url')out.target_url=argv[++i];else if(argv[i]==='--out')out.out=argv[++i];else throw new Error(`unknown argument:${argv[i]}`);}if(!out.target_url)throw new Error('--url required');return out;}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const a=args(process.argv);runWatchLearnRemoteObservationV0(a).then(report=>{const json=JSON.stringify(report,null,2)+'\n';if(a.out){fs.mkdirSync(path.dirname(path.resolve(a.out)),{recursive:true});fs.writeFileSync(a.out,json,'utf8');}process.stdout.write(json);if(report.status!=='REMOTE_OBSERVATION_REPLAY_GREEN')process.exitCode=2;}).catch(error=>{process.stderr.write(JSON.stringify({status:'REMOTE_OBSERVATION_RED',error:String(error?.stack??error),prod_authorized:false,trading_access:false,additional_cost_eur:0})+'\n');process.exitCode=1;});
}
