import fs from 'node:fs';
import path from 'node:path';

const PRIORITIES=Object.freeze(['p0','p1','p2']);

function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,`${JSON.stringify(value,null,2)}\n`,'utf8');}

function hasCandidate(report,candidateId,key){
  return (report?.[key]??[]).some((item)=>item?.candidate_id===candidateId);
}

export function resolveCandidatePriority(sourceDir,candidateId){
  const matches=[];
  for(const priority of PRIORITIES){
    const valuePath=path.join(sourceDir,`cerebro-skill-value-${priority}.json`);
    if(!fs.existsSync(valuePath)) continue;
    const report=readJson(valuePath);
    if(hasCandidate(report,candidateId,'results')) matches.push(priority);
  }
  if(matches.length!==1) throw new Error(`candidate ${candidateId} must exist in exactly one priority value report; found ${matches.length}`);
  return matches[0];
}

export function normalizeCandidateSourceEvidence(sourceDir,candidateId,outputDir){
  const priority=resolveCandidatePriority(sourceDir,candidateId);
  const required=[
    [`cerebro-skill-value-${priority}.json`,'value.json'],
    [`cerebro-skill-wrapper-plans-${priority}.json`,'wrappers.json'],
    [`cerebro-skill-prelab-reviewed-${priority}.json`,'prelab.json'],
    ['cerebro-skill-manifests.json','manifests.json'],
    ['cerebro-skill-license-evidence.json','licenses.json'],
    ['cerebro-skill-shortlist.json','shortlist.json']
  ];
  for(const [srcName,dstName] of required){
    const src=path.join(sourceDir,srcName);
    if(!fs.existsSync(src)) throw new Error(`missing required immutable source evidence: ${srcName}`);
    fs.mkdirSync(outputDir,{recursive:true});
    fs.copyFileSync(src,path.join(outputDir,dstName));
  }
  const meta={
    schema_version:'0.1.0',
    candidate_id:candidateId,
    source_priority:priority.toUpperCase(),
    normalized:true,
    external_code_executed:false,
    prod_authorized:false,
    prod_write:false,
    customer_data_used:false,
    trading_access:false,
    paid_fallback:false,
    additional_cost_eur:0
  };
  writeJson(path.join(outputDir,'source-meta.json'),meta);
  return Object.freeze(meta);
}

function argValue(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){
  const source=argValue('--source');
  const candidate=argValue('--candidate');
  const output=argValue('--output');
  if(!source||!candidate||!output) throw new Error('REQUIRED: --source --candidate --output');
  const result=normalizeCandidateSourceEvidence(source,candidate,output);
  console.log(JSON.stringify(result));
}
