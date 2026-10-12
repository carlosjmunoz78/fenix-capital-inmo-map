import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const CANONICAL_SCENARIO_PAGE='3c081b1a-756d-8120-8fec-f068faf5e35a';
export const VARIANTS=Object.freeze([
  'NORMAL_COOPERATIVE',
  'AMBIGUOUS_INCOMPLETE',
  'FRICTION_HIGH_LOAD',
  'ADVERSARIAL_CONTRADICTORY'
]);

function reqString(value,label,{max=240}={}){
  if(typeof value!=='string'||!value.trim()) throw new Error(`${label} required`);
  const out=value.trim();
  if(out.length>max) throw new Error(`${label} too long`);
  return out;
}
function stableHash(value){
  return crypto.createHash('sha256').update(String(value),'utf8').digest('hex');
}

export function buildScenarioPlan({
  company_id='fenix',
  scenario_count=60,
  baseline_sha,
  suite_version='1.0.0',
  seed_namespace='FENIX_HUMAN_60_V1'
}={}){
  const companyId=reqString(company_id,'company_id',{max:160});
  const baselineSha=reqString(baseline_sha,'baseline_sha',{max:64});
  if(!/^[a-f0-9]{40}$/i.test(baselineSha)) throw new Error('baseline_sha must be a 40-char git SHA');
  const count=Number(scenario_count);
  if(!Number.isInteger(count)||count<1||count>500) throw new Error('scenario_count must be integer 1..500');
  const suiteVersion=reqString(suite_version,'suite_version',{max:40});
  const namespace=reqString(seed_namespace,'seed_namespace',{max:160});

  const episodes=[];
  for(let caseNumber=1;caseNumber<=count;caseNumber+=1){
    for(let variantIndex=0;variantIndex<VARIANTS.length;variantIndex+=1){
      const variant=VARIANTS[variantIndex];
      const seed=stableHash(`${namespace}|${caseNumber}|${variant}`).slice(0,16);
      const episodeId=`hi:${caseNumber.toString().padStart(2,'0')}:${variantIndex+1}:${seed.slice(0,8)}`;
      episodes.push(Object.freeze({
        episode_id:episodeId,
        company_id:companyId,
        engine_id:'SIM-001',
        environment:'LAB',
        version:suiteVersion,
        scenario_id:`FENIX-HUMAN-${caseNumber.toString().padStart(2,'0')}`,
        scenario_ref:`notion:${CANONICAL_SCENARIO_PAGE}#case-${caseNumber}`,
        source_case_number:caseNumber,
        variant,
        seed,
        baseline_sha:baselineSha.toLowerCase(),
        status:'PLANNED',
        contains_customer_data:false,
        contains_secrets:false,
        prod_authorized:false,
        prod_write_authorized:false,
        trading_access:false,
        additional_cost_eur:0
      }));
    }
  }

  return Object.freeze({
    schema_version:'1.0.0',
    state_type:'CEREBRO_HUMAN_INTELLIGENCE_SCENARIO_PLAN_V1',
    company_id:companyId,
    engine_id:'SIM-001',
    environment:'LAB',
    baseline_sha:baselineSha.toLowerCase(),
    canonical_scenario_page:CANONICAL_SCENARIO_PAGE,
    scenarios_total:count,
    variants_total:VARIANTS.length,
    episodes_total:episodes.length,
    episodes,
    safety:Object.freeze({
      contains_customer_data:false,
      contains_secrets:false,
      prod_authorized:false,
      prod_write_authorized:false,
      trading_access:false,
      additional_cost_eur:0
    })
  });
}

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
const isEntrypoint=Boolean(process.argv[1])&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isEntrypoint){
  try{
    const baselineSha=reqString(arg('--baseline-sha'),'--baseline-sha',{max:64});
    const out=reqString(arg('--out')??'artifacts/human-intelligence/scenario-plan.v1.json','--out',{max:1000});
    const scenarioCount=arg('--scenario-count')==null?60:Number(arg('--scenario-count'));
    const plan=buildScenarioPlan({baseline_sha:baselineSha,scenario_count:scenarioCount});
    const output=path.resolve(out);
    fs.mkdirSync(path.dirname(output),{recursive:true});
    fs.writeFileSync(output,`${JSON.stringify(plan,null,2)}\n`,'utf8');
    console.log(JSON.stringify({status:'HUMAN_INTELLIGENCE_SCENARIO_PLAN_GREEN',episodes_total:plan.episodes_total,output,prod_authorized:false,additional_cost_eur:0}));
  }catch(error){
    console.error(error?.stack??String(error));
    process.exitCode=4;
  }
}
