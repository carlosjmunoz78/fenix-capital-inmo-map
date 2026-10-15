import fs from 'node:fs';
import path from 'node:path';
import {CEREBRO_OBSIDIAN_WRAPPER} from './skill-cerebro-obsidian-wrapper.mjs';

const EXPECTED=Object.freeze({
  candidate_id:'lobehub-skills:9a6e3fac20369220df43',
  upstream_full_name:'openclaw/openclaw',
  upstream_head_commit:'b300e0edea5e3e1b0aee58a33e188711380d8e22',
  manifest_path:'skills/obsidian/SKILL.md',
  manifest_sha256:'d4ed3ce53146bd6538c47f81da2382fc790598ec1400d34b7d1f73a8839053b4'
});

function same(a,b){return String(a??'')===String(b??'');}

export function tribunalObsidianAdmission({oldVsNew,staticReview,judge}={}){
  const blockers=[];
  if(judge?.decision!=='GREEN_FOR_ADMISSION_TRIBUNAL'||judge?.green!==true) blockers.push('INDEPENDENT_JUDGE_NOT_GREEN');
  if(oldVsNew?.status!=='GREEN_FOR_GOVERNED_ADMISSION_REVIEW'||oldVsNew?.admitted!==false) blockers.push('OLD_VS_NEW_SCOPE_INVALID');
  if(staticReview?.status!=='GREEN_FOR_SYNTHETIC_BEHAVIORAL_REVIEW') blockers.push('STATIC_REVIEW_NOT_GREEN');
  for(const [key,value] of Object.entries(EXPECTED)) if(!same(staticReview?.target?.[key],value)) blockers.push(`PROVENANCE_MISMATCH:${key}`);
  if(JSON.stringify(staticReview?.engine_bindings??[])!==JSON.stringify([...CEREBRO_OBSIDIAN_WRAPPER.engine_bindings])) blockers.push('ENGINE_BINDINGS_DRIFT');
  const zeroAuthority=oldVsNew?.prod_authorized===false&&oldVsNew?.prod_write_authorized===false&&oldVsNew?.trading_access===false&&oldVsNew?.external_skill_code_execution===false&&oldVsNew?.live_obsidian_cli_execution===false&&oldVsNew?.real_vault_used===false&&oldVsNew?.customer_data_used===false&&oldVsNew?.canonical_knowledge_replaced===false&&oldVsNew?.notion_or_rag_migration_authorized===false&&Number(oldVsNew?.additional_cost_eur??0)===0;
  if(!zeroAuthority) blockers.push('AUTHORITY_PRIVACY_OR_COST_REGRESSION');
  const green=blockers.length===0;
  return Object.freeze({
    schema_version:'1.0.0',
    state_type:'CEREBRO_OBSIDIAN_ADMISSION_TRIBUNAL',
    candidate_id:EXPECTED.candidate_id,
    alias_es:'Asistente seguro de conocimiento en Obsidian',
    decision:green?'ADMIT_TO_FULL_DEBT_QUEUE':'HOLD',
    green,
    blockers,
    admission_authorized:green,
    admission_scope:green?'DOCUMENTED_FULL_DEBT_QUEUE_ONLY':'NONE',
    target_engine_bindings:green?[...CEREBRO_OBSIDIAN_WRAPPER.engine_bindings]:[],
    execution_authorized:false,
    install_authorized:false,
    live_obsidian_cli_execution:false,
    canonical_knowledge_migration_authorized:false,
    prod_authorized:false,
    prod_write_authorized:false,
    trading_access:false,
    additional_cost_eur:0,
    human_required:null,
    next_gate:green?'PREPROD_BINDING_OLD_VS_NEW_PER_RELEVANT_ENGINE':'MORE_EVIDENCE_OR_REJECT'
  });
}

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){
  const oldVsNew=JSON.parse(fs.readFileSync(arg('--old-vs-new'),'utf8'));
  const staticReview=JSON.parse(fs.readFileSync(arg('--static-review'),'utf8'));
  const judge=JSON.parse(fs.readFileSync(arg('--judge'),'utf8'));
  const output=arg('--output')??'artifacts/cerebro-obsidian-admission-tribunal-v1.json';
  const report=tribunalObsidianAdmission({oldVsNew,staticReview,judge});
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,`${JSON.stringify(report,null,2)}\n`,'utf8');
  console.log(JSON.stringify({decision:report.decision,green:report.green,blockers:report.blockers,next_gate:report.next_gate}));
  if(!report.green) process.exitCode=1;
}
