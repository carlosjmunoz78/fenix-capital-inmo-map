#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { fetchPublicEvidenceV0 } from './public-source-adapter-v0.mjs';
import { runCompetContinuousV0 } from './fact001-gap-capabilities-v0.mjs';
import { PersistentJobQueue } from './persistent-runtime.mjs';

const PREPROD='PREPROD';
const DEFAULT_CONFIG=new URL('../registry/compet-real-targets.v0.json',import.meta.url);
const CONTEXT=Object.freeze({company_id:'fenix',engine_id:'COMPET-001',environment:PREPROD,version:'v0'});

function readConfig(configPath){
  const raw=fs.readFileSync(configPath??DEFAULT_CONFIG,'utf8');
  const config=JSON.parse(raw);
  if(config.company_id!=='fenix'||config.engine_id!=='COMPET-001'||config.environment!==PREPROD)throw new Error('COMPET real target config scope invalid');
  if(!Array.isArray(config.targets)||config.targets.length<1||config.targets.length>20)throw new Error('COMPET real target count invalid');
  return config;
}
function isoNow(value){const d=value?new Date(value):new Date();if(Number.isNaN(d.valueOf()))throw new Error('observed_at invalid');return d.toISOString();}
function previousRows(config){
  const rows=[];
  for(const target of config.targets){
    if(!target.baseline)continue;
    for(const [dimension,value] of [['public_page_sha256',target.baseline.body_sha256],['public_page_title',target.baseline.title??null]]){
      rows.push({competitor_id:target.competitor_id,dimension,value,source_url:target.url,source_access:'PUBLIC',observed_at:target.baseline.observed_at,confidence:1});
    }
  }
  return rows;
}
export async function runCompetRealTargetsV0({config_path,observed_at,workdir}={}){
  const config=readConfig(config_path);
  const observedAt=isoNow(observed_at);
  const snapshots=[];
  for(const target of config.targets){
    const evidence=await fetchPublicEvidenceV0({
      company_id:'fenix',engine_id:'RSH-001',environment:PREPROD,version:'v0',
      target_url:target.url,authorized_public_research:true,robots_allowed:true,timeout_ms:20000,max_bytes:1_500_000
    });
    if(evidence.status!=='REMOTE_READ_GREEN'||evidence.http_status!==200||evidence.read_only!==true)throw new Error(`COMPET target not green:${target.competitor_id}`);
    snapshots.push({competitor_id:target.competitor_id,name:target.name,url:evidence.final_url,title:evidence.summary.title??null,body_sha256:evidence.body_sha256,body_bytes:evidence.body_bytes,observed_at:observedAt,http_status:evidence.http_status,read_only:true});
  }
  const previous=previousRows(config);
  const current=snapshots.flatMap(s=>[
    {competitor_id:s.competitor_id,dimension:'public_page_sha256',value:s.body_sha256,source_url:s.url,source_access:'PUBLIC',observed_at:observedAt,confidence:1},
    {competitor_id:s.competitor_id,dimension:'public_page_title',value:s.title,source_url:s.url,source_access:'PUBLIC',observed_at:observedAt,confidence:1}
  ]);
  const root=workdir?path.resolve(workdir):fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-compet-real-'));
  const owns=!workdir;fs.mkdirSync(root,{recursive:true});
  try{
    const queue=new PersistentJobQueue({file_path:path.join(root,'compet-real.v8journal'),environment:PREPROD});
    const anchor=observedAt;
    const payload={previous,current,cycle_anchor:anchor,cadence_hours:Number(config.cadence_hours??24)};
    const enqueued=queue.enqueue({name:'COMPET-001_REAL_PUBLIC_TARGET_SCAN',context:CONTEXT,payload,idempotency_key:`compet-real:${anchor.slice(0,10)}`});
    if(!enqueued.accepted)throw new Error('COMPET real scan enqueue failed');
    const claim=queue.claimContext(CONTEXT);if(!claim)throw new Error('COMPET real scan claim failed');
    const result=runCompetContinuousV0({context:CONTEXT,...claim.payload});
    const complete=queue.completeContext(claim.job_id,CONTEXT,result);if(complete.status!=='SUCCEEDED')throw new Error('COMPET real scan complete failed');
    const baselineComplete=config.targets.every(t=>t.baseline&&typeof t.baseline.body_sha256==='string');
    return Object.freeze({
      schema_version:'1.0.0',state_type:'CEREBRO_COMPET_REAL_TARGET_SCAN_V0',company_id:'fenix',engine_id:'COMPET-001',environment:PREPROD,
      status:baselineComplete?'REAL_COMPETITOR_CONTINUOUS_SCAN_GREEN':'REAL_COMPETITOR_BASELINE_CAPTURE_GREEN',
      observed_at:observedAt,target_count:snapshots.length,snapshots,baseline_complete:baselineComplete,change_count:result.change_count,changes:result.changes,
      job_id:claim.job_id,job_status:complete.status,next_scheduled_for:result.next_job.scheduled_for,
      network_reads:snapshots.length,provider_writes:0,customer_data_used:false,personal_data_extracted:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0,
      next_gate:baselineComplete?'THREE_CONTINUOUS_REAL_COMPETITOR_RUNS_GREEN':'FREEZE_CAPTURED_REAL_BASELINES'
    });
  } finally {if(owns)fs.rmSync(root,{recursive:true,force:true});}
}

function args(argv){const out={};for(let i=2;i<argv.length;i++){if(argv[i]==='--config')out.config_path=argv[++i];else if(argv[i]==='--observed-at')out.observed_at=argv[++i];else if(argv[i]==='--workdir')out.workdir=argv[++i];else if(argv[i]==='--out')out.out=argv[++i];else throw new Error(`unknown argument:${argv[i]}`);}return out;}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const a=args(process.argv);runCompetRealTargetsV0(a).then(report=>{const json=JSON.stringify(report,null,2)+'\n';if(a.out){fs.mkdirSync(path.dirname(path.resolve(a.out)),{recursive:true});fs.writeFileSync(a.out,json,'utf8');}process.stdout.write(json);}).catch(error=>{process.stderr.write(JSON.stringify({status:'COMPET_REAL_TARGET_SCAN_RED',error:String(error?.stack??error),prod_authorized:false,trading_access:false,additional_cost_eur:0})+'\n');process.exitCode=1;});
}
