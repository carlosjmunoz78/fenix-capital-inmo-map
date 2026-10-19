#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {runB19UniversalE2EReal} from '../runtime/universal-skill-b19-universal-e2e-real-v1.mjs';

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
function req(value,label){if(typeof value!=='string'||!value.trim())throw new Error(`${label} required`);return value.trim();}
async function planner(root,tag){
  const file=path.resolve(root,'cerebro/platform/auto001-preprod-patch-planner-v0.mjs');
  const mod=await import(`${pathToFileURL(file).href}?b19=${encodeURIComponent(tag)}`);
  if(typeof mod.planAuto001Patch!=='function')throw new Error(`planAuto001Patch missing:${tag}`);
  return mod.planAuto001Patch;
}

const oldRoot=req(arg('--old-root'),'--old-root');
const newRoot=req(arg('--new-root'),'--new-root');
const baselineSha=req(arg('--baseline-sha'),'--baseline-sha');
const candidateSha=req(arg('--candidate-sha'),'--candidate-sha');
const out=req(arg('--out'),'--out');
const ledger=req(arg('--ledger'),'--ledger');
const root=req(arg('--root'),'--root');
const sourceRunId=Number(arg('--source-run-id')??19);
if(!Number.isSafeInteger(sourceRunId)||sourceRunId<1)throw new Error('--source-run-id must be positive integer');

const oldPlanner=await planner(oldRoot,baselineSha);
const newPlanner=await planner(newRoot,candidateSha);
const report=await runB19UniversalE2EReal({oldPlanner,newPlanner,baselineSha,candidateSha,learningLedgerFile:ledger,rootDir:root,sourceRunId});
fs.mkdirSync(path.dirname(path.resolve(out)),{recursive:true});
fs.writeFileSync(out,`${JSON.stringify(report,null,2)}\n`);
console.log(JSON.stringify({status:report.status,old:report.measured_loop.old_score,new:report.measured_loop.new_score,registry:report.registration.final_status,promotion:report.promotion.healthy_decision,rollback:report.promotion.controlled_breach_decision,audit_records:report.audit.records,cost_eur:report.additional_cost_eur}));
if(report.status!=='B19_GREEN_PREPROD')process.exitCode=1;
