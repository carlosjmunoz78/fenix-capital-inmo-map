import fs from 'node:fs';
import path from 'node:path';

function clone(value){return JSON.parse(JSON.stringify(value??{}));}

export function mergeDiscoveryReports(reports,{observedAt=new Date().toISOString()}={}){
  const sources=[];
  const candidateIds=new Set();
  let deduped=0;
  for(const report of reports??[]){
    for(const source of report?.results??[]){
      const copy=clone(source);
      copy.candidates=[];
      for(const candidate of source?.candidates??[]){
        if(!candidate?.candidate_id||candidateIds.has(candidate.candidate_id)){deduped+=1;continue;}
        candidateIds.add(candidate.candidate_id);
        copy.candidates.push(clone(candidate));
      }
      sources.push(copy);
    }
  }
  const candidates=sources.reduce((n,s)=>n+(s.candidates?.length??0),0);
  const upstreamHints=sources.reduce((n,s)=>n+(s.candidates??[]).reduce((m,c)=>m+(c.upstream_hints?.length??0),0),0);
  const primary=sources.reduce((n,s)=>n+(s.candidates??[]).filter((c)=>c.primary_upstream_hint).length,0);
  return Object.freeze({
    schema_version:'0.3.0',execution_mode:'MERGED_READ_ONLY_DISCOVERY',observed_at:observedAt,
    sources_total:sources.length,sources_ok:sources.filter((s)=>['OK','PARTIAL_RATE_LIMIT'].includes(s.status)).length,
    candidates_discovered:candidates,upstream_hints_found:upstreamHints,primary_upstreams_found:primary,
    deduped_candidates:deduped,results:sources,code_executed:false,instructions_interpreted:false,
    external_skill_code_executed:false,prod_authorized:false,additional_cost_eur:0
  });
}

function argValues(name){
  const values=[];for(let i=0;i<process.argv.length;i+=1) if(process.argv[i]===name&&process.argv[i+1]) values.push(process.argv[i+1]);return values;
}
function argValue(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){
  const inputs=argValues('--input');
  if(!inputs.length) throw new Error('At least one --input is required');
  const output=argValue('--output')??'artifacts/cerebro-skill-discovery.json';
  const reports=inputs.map((p)=>JSON.parse(fs.readFileSync(p,'utf8')));
  const merged=mergeDiscoveryReports(reports);
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,`${JSON.stringify(merged,null,2)}\n`,'utf8');
  console.log(JSON.stringify({output,sources_total:merged.sources_total,sources_ok:merged.sources_ok,candidates_discovered:merged.candidates_discovered,deduped_candidates:merged.deduped_candidates,external_skill_code_executed:false,prod_authorized:false,additional_cost_eur:0}));
}
