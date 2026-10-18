#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCompetRealTargetsV0 } from './compet-real-targets-v0.mjs';

const DEFAULT_RETRY_DELAYS_MS=Object.freeze([250,1000]);
function wait(ms){return new Promise(resolve=>setTimeout(resolve,ms));}

export function isRetryableCompetTransientV1(error){
  const message=String(error?.message??error??'');
  if(/remote HTTP status\s+(429|5\d\d)\b/i.test(message))return true;
  return /(fetch failed|aborted|aborterror|eai_again|econnreset|etimedout|enetunreach|ehostunreach|econnrefused|und_err|socket hang up)/i.test(message);
}

export async function runCompetRealTargetsResilientV1({
  config_path,
  observed_at,
  workdir,
  run_v0=runCompetRealTargetsV0,
  sleep_fn=wait,
  retry_delays_ms=DEFAULT_RETRY_DELAYS_MS
}={}){
  if(typeof run_v0!=='function'||typeof sleep_fn!=='function')throw new TypeError('COMPET resilient dependencies invalid');
  if(!Array.isArray(retry_delays_ms)||retry_delays_ms.length>4||retry_delays_ms.some(ms=>!Number.isSafeInteger(ms)||ms<0||ms>5000))throw new TypeError('COMPET retry delays invalid');
  let attempts=0;
  for(;;){
    attempts+=1;
    try{
      const base=await run_v0({config_path,observed_at,workdir});
      if(!base||base.environment!=='PREPROD'||base.engine_id!=='COMPET-001')throw new Error('COMPET preserved V0 returned invalid scope');
      if(base.prod_authorized!==false||base.prod_write_authorized!==false||base.provider_writes!==0||base.customer_data_used!==false||base.trading_access!==false||base.additional_cost_eur!==0)throw new Error('COMPET preserved V0 authority boundary violated');
      return Object.freeze({
        ...base,
        schema_version:'1.0.0',
        state_type:'CEREBRO_COMPET_REAL_TARGET_SCAN_RESILIENT_V1',
        resilience_wrapper:'compet-real-targets-resilient-v1',
        base_runtime_preserved:true,
        attempt_count:attempts,
        retry_count:attempts-1,
        retry_policy:Object.freeze({transient_only:true,max_attempts:retry_delays_ms.length+1,retry_delays_ms:[...retry_delays_ms],non_transient_fail_closed:true}),
        prod_authorized:false,
        prod_write_authorized:false,
        trading_access:false,
        additional_cost_eur:0
      });
    }catch(error){
      const delay=retry_delays_ms[attempts-1];
      if(delay===undefined||!isRetryableCompetTransientV1(error))throw error;
      await sleep_fn(delay);
    }
  }
}

function args(argv){const out={};for(let i=2;i<argv.length;i++){if(argv[i]==='--config')out.config_path=argv[++i];else if(argv[i]==='--observed-at')out.observed_at=argv[++i];else if(argv[i]==='--workdir')out.workdir=argv[++i];else if(argv[i]==='--out')out.out=argv[++i];else throw new Error(`unknown argument:${argv[i]}`);}return out;}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const a=args(process.argv);
  runCompetRealTargetsResilientV1(a).then(report=>{
    const json=JSON.stringify(report,null,2)+'\n';
    if(a.out){fs.mkdirSync(path.dirname(path.resolve(a.out)),{recursive:true});fs.writeFileSync(a.out,json,'utf8');}
    process.stdout.write(json);
  }).catch(error=>{
    process.stderr.write(JSON.stringify({status:'COMPET_REAL_TARGET_RESILIENT_SCAN_RED',error:String(error?.stack??error),prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0})+'\n');
    process.exitCode=1;
  });
}
