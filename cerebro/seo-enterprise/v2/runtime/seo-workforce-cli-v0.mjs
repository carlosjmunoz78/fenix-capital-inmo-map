#!/usr/bin/env node
/** Read-only SEO work unit: stdin JSON -> stdout evidence JSON. No network or external writes. */
import {runSeoEditorialMission} from './seo-workforce-lab-v0.mjs';
let raw='';
try{
 for await (const chunk of process.stdin){
  raw+=chunk;
  if(raw.length>170000)throw Error('INPUT_TOO_LARGE');
 }
 const mission=JSON.parse(raw);
 const result=runSeoEditorialMission(mission);
 process.stdout.write(JSON.stringify(result,null,2)+'\n');
}catch(err){
 // Never print input, secrets or page content to stderr.
 process.stderr.write(JSON.stringify({ok:false,code:String(err?.message||'WORK_UNIT_FAILED').slice(0,120),prod_authorized:false})+'\n');
 process.exitCode=1;
}
