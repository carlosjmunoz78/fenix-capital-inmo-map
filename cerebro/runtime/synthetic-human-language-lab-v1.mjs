#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const CEREBRO_ROOT=path.resolve(HERE,'..');
const DEFAULT_CONFIG=path.join(CEREBRO_ROOT,'registry','synthetic-human-language-lab-v1.json');

function loadJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function authority(){return Object.freeze({prod_authorized:false,prod_write_authorized:false,prod_mutation_authorized:false,automatic_prod_prompt_mutation:false,automatic_prod_persona_mutation:false,external_skill_code_execution:false,customer_data:false,trading_access:false,paid_fallback:false,additional_cost_eur:0});}
function stableId(parts){return crypto.createHash('sha256').update(parts.join('|')).digest('hex').slice(0,20);}
function clampScore(value){const n=Number(value);if(!Number.isFinite(n))return null;return Math.max(0,Math.min(1,n));}

export function buildSyntheticHumanPlan(config){
  const personas=config?.personas??[];
  const scenarios=config?.scenarios??[];
  const dimensions=config?.dimensions??[];
  const cases=[];
  for(const persona of personas){
    for(const scenario of scenarios){
      cases.push(Object.freeze({
        case_id:`shcase:${stableId([persona.id,scenario.id,config.version])}`,
        persona_id:persona.id,
        persona_label:persona.label,
        persona_traits:Object.freeze([...(persona.traits??[])]),
        scenario_id:scenario.id,
        scenario_label:scenario.label,
        scenario_goal:scenario.goal,
        required_dimensions:Object.freeze(dimensions.map((d)=>d.id)),
        evidence_scope:'SYNTHETIC_NON_CUSTOMER',
        environment:'LAB_PREPROD'
      }));
    }
  }
  return Object.freeze({
    schema_version:'1.0.0',state_type:'CEREBRO_SYNTHETIC_HUMAN_LANGUAGE_PLAN_V1',company_id:config.company_id??'GLOBAL',engine_id:'SIM-001',environment:'LAB_PREPROD',version:config.version??'1.0.0',
    status:'GREEN_SYNTHETIC_HUMAN_EVAL_PLAN_READY',persona_count:personas.length,scenario_count:scenarios.length,dimension_count:dimensions.length,case_count:cases.length,max_parallel_scenarios:Number(config?.execution?.max_parallel_scenarios??1),cases:Object.freeze(cases),
    learning_contract:config?.learning_contract??null,...authority()
  });
}

export function evaluateSyntheticHumanResults({config,results=[]}={}){
  const dimensions=new Map((config?.dimensions??[]).map((d)=>[d.id,d]));
  const personas=new Set((config?.personas??[]).map((p)=>p.id));
  const scenarios=new Set((config?.scenarios??[]).map((s)=>s.id));
  const normalized=[];
  const aggregate=new Map();
  const improvementMap=new Map();
  for(const row of results){
    if(!personas.has(row?.persona_id)||!scenarios.has(row?.scenario_id))continue;
    const scores={};
    const failed=[];
    for(const [id,dimension] of dimensions){
      const score=clampScore(row?.scores?.[id]);
      if(score==null)continue;
      scores[id]=score;
      const agg=aggregate.get(id)??{sum:0,count:0,min:1};agg.sum+=score;agg.count+=1;agg.min=Math.min(agg.min,score);aggregate.set(id,agg);
      if(score<Number(dimension.minimum)){failed.push(id);const item=improvementMap.get(id)??{dimension_id:id,label:dimension.label,threshold:Number(dimension.minimum),observations:0,worst_score:1};item.observations+=1;item.worst_score=Math.min(item.worst_score,score);improvementMap.set(id,item);}
    }
    normalized.push(Object.freeze({case_id:row.case_id??null,persona_id:row.persona_id,scenario_id:row.scenario_id,scores:Object.freeze(scores),failed_dimensions:Object.freeze(failed),pass:failed.length===0}));
  }
  const dimensionSummary=[];
  for(const [id,dimension] of dimensions){const agg=aggregate.get(id);dimensionSummary.push(Object.freeze({dimension_id:id,label:dimension.label,threshold:Number(dimension.minimum),observations:agg?.count??0,average:agg?.count?Number((agg.sum/agg.count).toFixed(4)):null,minimum_observed:agg?.count?agg.min:null,below_threshold:Boolean(agg?.count&&agg.sum/agg.count<Number(dimension.minimum))}));}
  const improvements=[...improvementMap.values()].sort((a,b)=>a.worst_score-b.worst_score||b.observations-a.observations||a.dimension_id.localeCompare(b.dimension_id)).map((x)=>Object.freeze({...x,action:'CREATE_BOUNDED_IMPROVEMENT_CANDIDATE',target:'LRN-001',old_vs_new_required:true,independent_judge_required:true,tribunal_required_before_prod_behavior_change:true,direct_prod_mutation:false}));
  const complete=normalized.length>0;
  return Object.freeze({
    schema_version:'1.0.0',state_type:'CEREBRO_SYNTHETIC_HUMAN_LANGUAGE_EVAL_V1',company_id:config?.company_id??'GLOBAL',engine_id:'SIM-001',learning_engine_id:'LRN-001',environment:'LAB_PREPROD',version:config?.version??'1.0.0',
    status:complete?(improvements.length?'IMPROVEMENT_CANDIDATES_READY':'GREEN_BASELINE_KEEP'):'NO_EVALUATION_RESULTS',evaluated_cases:normalized.length,passed_cases:normalized.filter((x)=>x.pass).length,failed_cases:normalized.filter((x)=>!x.pass).length,
    dimension_summary:Object.freeze(dimensionSummary),improvement_candidates:Object.freeze(improvements),results:Object.freeze(normalized),learning_signal_family:config?.learning_contract?.signal_family??'SYNTHETIC_HUMAN_COMMUNICATION_EVAL',
    ...authority()
  });
}

export function buildLab({configFile=DEFAULT_CONFIG,resultsFile=null}={}){
  const config=loadJson(configFile);
  if(resultsFile){return evaluateSyntheticHumanResults({config,results:loadJson(resultsFile)?.results??loadJson(resultsFile)});}
  return buildSyntheticHumanPlan(config);
}

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){
  const configFile=arg('--config')??DEFAULT_CONFIG;
  const resultsFile=arg('--results');
  const out=arg('--output');
  const report=buildLab({configFile,resultsFile});
  const text=`${JSON.stringify(report,null,2)}\n`;
  if(out){fs.mkdirSync(path.dirname(path.resolve(out)),{recursive:true});fs.writeFileSync(out,text,'utf8');}
  process.stdout.write(text);
}
