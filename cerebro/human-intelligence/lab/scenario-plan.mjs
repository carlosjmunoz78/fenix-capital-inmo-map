import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const LIBRARY_PATH=path.resolve(__dirname,'../scenarios/fenix-human-60.v1.json');
export const CANONICAL_SCENARIO_PAGE='3c081b1a-756d-8120-8fec-f068faf5e35a';
export const VARIANTS=Object.freeze(['NORMAL_COOPERATIVE','AMBIGUOUS_INCOMPLETE','FRICTION_HIGH_LOAD','ADVERSARIAL_CONTRADICTORY']);
export const VARIANT_CONTRACT=Object.freeze({
  NORMAL_COOPERATIVE:{strategy:'REPRESENTATIVE',dimensions:{cooperation_posture:'HIGH',privacy_posture:'OPEN',urgency:'MEDIUM',adversariality:'NONE',conversation_style:'DIRECT'},initial_state:{trust:0.68,cooperation:0.82,friction:0.10,cognitive_load:0.30,uncertainty:0.45,patience:0.82}},
  AMBIGUOUS_INCOMPLETE:{strategy:'COVERAGE',dimensions:{cooperation_posture:'CONDITIONAL',privacy_posture:'MINIMAL_DISCLOSURE',urgency:'MEDIUM',adversariality:'LOW',conversation_style:'INDIRECT'},initial_state:{trust:0.45,cooperation:0.55,friction:0.24,cognitive_load:0.55,uncertainty:0.78,patience:0.65}},
  FRICTION_HIGH_LOAD:{strategy:'STRESS',dimensions:{cooperation_posture:'RESISTANT',privacy_posture:'CAUTIOUS',urgency:'HIGH',adversariality:'MEDIUM',conversation_style:'CHAOTIC'},initial_state:{trust:0.36,cooperation:0.40,friction:0.67,cognitive_load:0.84,uncertainty:0.72,patience:0.30}},
  ADVERSARIAL_CONTRADICTORY:{strategy:'ADVERSARIAL',dimensions:{cooperation_posture:'RESISTANT',privacy_posture:'PRIVACY_SENSITIVE',urgency:'HIGH',adversariality:'HIGH',conversation_style:'QUESTION_HEAVY'},initial_state:{trust:0.24,cooperation:0.28,friction:0.64,cognitive_load:0.62,uncertainty:0.58,patience:0.40}}
});

function reqString(value,label,{max=240}={}){if(typeof value!=='string'||!value.trim())throw new Error(`${label} required`);const out=value.trim();if(out.length>max)throw new Error(`${label} too long`);return out;}
function stableHash(value){return crypto.createHash('sha256').update(String(value),'utf8').digest('hex');}
function loadLibrary(){
  const library=JSON.parse(fs.readFileSync(LIBRARY_PATH,'utf8'));
  if(library?.library_id!=='FENIX_HUMAN_60_V1')throw new Error('canonical_scenario_library_id_invalid');
  if(library?.source?.page_id!==CANONICAL_SCENARIO_PAGE)throw new Error('canonical_scenario_page_mismatch');
  if(!Array.isArray(library?.cases)||library.cases.length!==60)throw new Error('canonical_scenario_library_must_have_60_cases');
  for(let i=0;i<60;i++){
    const c=library.cases[i];
    if(Number(c?.case)!==i+1)throw new Error(`canonical_scenario_sequence_invalid:${i+1}`);
    for(const field of ['category','title','signal','human_objective','response_pattern','avoid','next_step','initial_utterance'])reqString(String(c?.[field]??''),`case_${i+1}_${field}`,{max:1200});
  }
  if(library?.safety?.contains_customer_data!==false||library?.safety?.prod_authorized!==false)throw new Error('canonical_scenario_library_unsafe');
  return library;
}
function scenarioPublic(caseItem){return {source_case_number:Number(caseItem.case),category:String(caseItem.category),title:String(caseItem.title),signal:String(caseItem.signal),human_objective:String(caseItem.human_objective),response_pattern:String(caseItem.response_pattern),avoid:String(caseItem.avoid),next_step:String(caseItem.next_step),initial_human_utterance:String(caseItem.initial_utterance)};}

export function buildScenarioPlan({company_id='fenix',scenario_count=60,baseline_sha,suite_version='1.1.0',seed_namespace='FENIX_HUMAN_60_V1'}={}){
  const companyId=reqString(company_id,'company_id',{max:160});const baselineSha=reqString(baseline_sha,'baseline_sha',{max:64});if(!/^[a-f0-9]{40}$/i.test(baselineSha))throw new Error('baseline_sha must be a 40-char git SHA');
  const count=Number(scenario_count);if(!Number.isInteger(count)||count<1||count>60)throw new Error('scenario_count must be integer 1..60 canonical cases');
  const suiteVersion=reqString(suite_version,'suite_version',{max:40});const namespace=reqString(seed_namespace,'seed_namespace',{max:160});const library=loadLibrary();
  const episodes=[];
  for(let caseNumber=1;caseNumber<=count;caseNumber++){
    const caseItem=library.cases[caseNumber-1];const canonical=scenarioPublic(caseItem);
    for(let variantIndex=0;variantIndex<VARIANTS.length;variantIndex++){
      const variant=VARIANTS[variantIndex];const seed=stableHash(`${namespace}|${caseNumber}|${variant}`).slice(0,16);const episodeId=`hi:${String(caseNumber).padStart(2,'0')}:${variantIndex+1}:${seed.slice(0,8)}`;
      episodes.push(Object.freeze({episode_id:episodeId,company_id:companyId,engine_id:'SIM-001',environment:'LAB',version:suiteVersion,scenario_id:`FENIX-HUMAN-${String(caseNumber).padStart(2,'0')}`,scenario_ref:`notion:${CANONICAL_SCENARIO_PAGE}#case-${caseNumber}`,source_case_number:caseNumber,variant,seed,baseline_sha:baselineSha.toLowerCase(),scenario:canonical,simulator_overrides:structuredClone(VARIANT_CONTRACT[variant]),status:'PLANNED',contains_customer_data:false,contains_secrets:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0}));
    }
  }
  return Object.freeze({schema_version:'1.1.0',state_type:'CEREBRO_HUMAN_INTELLIGENCE_SCENARIO_PLAN_V1',company_id:companyId,engine_id:'SIM-001',environment:'LAB',baseline_sha:baselineSha.toLowerCase(),canonical_scenario_page:CANONICAL_SCENARIO_PAGE,canonical_library_id:library.library_id,canonical_library_source_type:library.source.source_type,scenarios_total:count,variants_total:VARIANTS.length,episodes_total:episodes.length,variant_contract:VARIANT_CONTRACT,episodes,safety:Object.freeze({contains_customer_data:false,contains_secrets:false,prod_authorized:false,prod_write_authorized:false,trading_access:false,additional_cost_eur:0})});
}

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
const isEntrypoint=Boolean(process.argv[1])&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isEntrypoint){try{const baselineSha=reqString(arg('--baseline-sha'),'--baseline-sha',{max:64});const out=reqString(arg('--out')??'artifacts/human-intelligence/scenario-plan.v1.json','--out',{max:1000});const scenarioCount=arg('--scenario-count')==null?60:Number(arg('--scenario-count'));const plan=buildScenarioPlan({baseline_sha:baselineSha,scenario_count:scenarioCount});const output=path.resolve(out);fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,`${JSON.stringify(plan,null,2)}\n`,'utf8');console.log(JSON.stringify({status:'HUMAN_INTELLIGENCE_SCENARIO_PLAN_GREEN',episodes_total:plan.episodes_total,canonical_library_id:plan.canonical_library_id,output,prod_authorized:false,additional_cost_eur:0}));}catch(error){console.error(error?.stack??String(error));process.exitCode=4;}}
