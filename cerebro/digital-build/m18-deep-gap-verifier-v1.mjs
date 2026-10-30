import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { ALIASES } from './m18-capability-crosswalk-v1.mjs';

const VERSION='m18-deep-gap-verifier-v1';
const RECEIPT='cerebro/evidence/M18_DIGITAL_INDUSTRY_WAVE2_CROSSWALK_2026-10-30.json';
const MISSION='cerebro/missions/M18-DIGITAL-INDUSTRY-2026-10-30.json';
const MAX_READ_BYTES=500000;
const TEXT_EXT=/\.(?:md|json|ya?ml|mjs|cjs|js|ts|tsx|jsx|py|php|sh|sql|toml|txt|css|scss|html)$/i;
const EXCLUDE_PREFIXES=[
  'cerebro/evidence/M18_DIGITAL_INDUSTRY_WAVE2_CROSSWALK_2026-10-30.json',
  'cerebro/digital-build/m18-capability-crosswalk-v1.mjs',
  'cerebro/digital-build/m18-deep-gap-verifier-v1.mjs',
  'cerebro/tests/m18-capability-crosswalk-v1.test.mjs',
  'cerebro/tests/m18-deep-gap-verifier-v1.test.mjs',
  'cerebro/missions/M18-DIGITAL-INDUSTRY-2026-10-30.json',
  '.github/workflows/cerebro-m18-digital-industry-wave1-preprod.yml',
  '.github/workflows/cerebro-m18-digital-industry-wave2-crosswalk-preprod.yml',
  '.github/workflows/cerebro-m18-digital-industry-wave3-deep-gap-preprod.yml',
  '28_MACROFRENTES.md'
];
const STOP=new Set(['factory','and','the','for','with','from','into','builder','registry','feature']);
const sha=v=>crypto.createHash('sha256').update(typeof v==='string'?v:JSON.stringify(v)).digest('hex');
const norm=v=>String(v||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();

function loadJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function assertGuards(){
  const mission=loadJson(MISSION);
  if(mission.environment!=='PREPROD') throw new Error('PREPROD required');
  const g=mission.hard_guards||{};
  if(g.prod_write_allowed!==false||g.paid_ai_allowed!==false||g.trading_access!==false||Number(g.additional_cost_eur)!==0) throw new Error('M18 guards invalid');
  return mission;
}
function candidates(){
  const receipt=loadJson(RECEIPT);
  if(receipt.environment!=='PREPROD'||receipt.final_decisions_made!==0) throw new Error('Wave2 receipt invalid');
  return receipt.BUILD_CANDIDATES_REQUIRING_DEEP_VERIFICATION;
}
function termsFor(capability){
  const base=norm(capability).split(/[^a-z0-9]+/).filter(x=>x.length>=3&&!STOP.has(x));
  return [...new Set([...base,...(ALIASES[capability]||[]).map(norm)])];
}
function fileKind(file){
  const p=norm(file);
  if(p.includes('/tests/')||/\.test\./.test(p)) return 'test';
  if(p.includes('/registry/')) return 'registry';
  if(p.startsWith('.github/workflows/')) return 'workflow';
  if(/policy|guard|constitution|security|compliance/.test(p)) return 'policy';
  if(/integration|connector|adapter|plugin|wordpress|mcp|gateway/.test(p)) return 'integration';
  if(/\.(?:mjs|cjs|js|ts|tsx|jsx|py|php|sh|sql)$/.test(p)) return 'runtime_code';
  if(p.includes('/docs/')||p.endsWith('.md')) return 'docs';
  return 'other';
}
function safeText(file){
  try{
    const st=fs.statSync(file);
    if(!st.isFile()||st.size>MAX_READ_BYTES||!TEXT_EXT.test(file)) return '';
    return norm(fs.readFileSync(file,'utf8'));
  }catch{return '';}
}
function listFiles(){
  return execFileSync('git',['ls-files'],{encoding:'utf8',maxBuffer:30_000_000}).split(/\r?\n/).filter(Boolean);
}
function evidenceFor(capability,files=listFiles()){
  const terms=termsFor(capability);
  const rows=[];
  for(const file of files){
    if(EXCLUDE_PREFIXES.includes(file)) continue;
    const p=norm(file);
    const text=safeText(file);
    if(!text&&!terms.some(t=>p.includes(t))) continue;
    const pathHits=terms.filter(t=>p.includes(t));
    const contentHits=text?terms.filter(t=>text.includes(t)):[];
    if(!pathHits.length&&!contentHits.length) continue;
    const kind=fileKind(file);
    const score=pathHits.length*8+contentHits.length*2+(kind==='runtime_code'?6:0)+(kind==='test'?5:0)+(kind==='registry'?5:0)+(kind==='integration'?4:0)+(kind==='policy'?3:0);
    rows.push({path:file,kind,score,path_hits:pathHits,content_hit_count:contentHits.length});
  }
  rows.sort((a,b)=>b.score-a.score||a.path.localeCompare(b.path));
  return {terms,rows};
}
function dimensionStatus(count){return count>0?'EVIDENCE_FOUND':'NO_DIRECT_EVIDENCE';}
function classify(rows){
  const counts={runtime_code:0,test:0,registry:0,workflow:0,policy:0,integration:0,docs:0,other:0};
  for(const r of rows) counts[r.kind]=(counts[r.kind]||0)+1;
  const physical=counts.runtime_code+counts.test+counts.registry+counts.integration;
  let verified_state='BUILD_GAP_STILL_PLAUSIBLE';
  let disposition_candidate='BUILD';
  let confidence='MEDIUM';
  if(counts.runtime_code>0&&counts.test>0&&(counts.registry>0||counts.integration>0)){
    verified_state='EXISTING_PHYSICAL_STACK'; disposition_candidate='REUSE_OR_EXTEND'; confidence='HIGH';
  }else if(counts.runtime_code>0&&(counts.integration>0||counts.registry>0||counts.policy>0)){
    verified_state='EXISTING_PHYSICAL_PARTIAL'; disposition_candidate='EXTEND'; confidence='HIGH';
  }else if(counts.integration>0||counts.registry>0||counts.policy>0){
    verified_state='EXISTING_GOVERNED_SURFACE'; disposition_candidate='WRAP_OR_EXTEND'; confidence='MEDIUM';
  }else if(physical>0){
    verified_state='EXISTING_FRAGMENT'; disposition_candidate='EXTEND'; confidence='MEDIUM';
  }else if(counts.docs>0||counts.workflow>0){
    verified_state='DEFINED_ONLY'; disposition_candidate='BUILD_PENDING_BUSINESS_VALUE'; confidence='MEDIUM';
  }else{
    verified_state='NO_EVIDENCE'; disposition_candidate='BUILD_PENDING_BUSINESS_VALUE'; confidence='HIGH';
  }
  return {counts,verified_state,disposition_candidate,confidence};
}

export function verifyGap(capability,{files=null}={}){
  const mission=assertGuards();
  if(!candidates().includes(capability)) throw new Error(`not a Wave2 BUILD candidate: ${capability}`);
  const {terms,rows}=evidenceFor(capability,files||listFiles());
  const c=classify(rows);
  const dimensions={
    implementation:dimensionStatus(c.counts.runtime_code),
    tests:dimensionStatus(c.counts.test),
    registry:dimensionStatus(c.counts.registry),
    workflows:dimensionStatus(c.counts.workflow),
    policy:dimensionStatus(c.counts.policy),
    integrations:dimensionStatus(c.counts.integration),
    documentation:dimensionStatus(c.counts.docs),
    cost:'ZERO_ADDITIONAL_COST_GUARD_ACTIVE',
    prod:'PROD_WRITE_DISABLED',
    trading:'TRADING_DISABLED'
  };
  const report={
    schema_version:'1.0.0',version:VERSION,mission_id:mission.mission_id,canonical_root:'M18',company_id:mission.company_id,
    environment:'PREPROD',capability_family:capability,terms,...c,dimensions,
    evidence_count:rows.length,top_evidence:rows.slice(0,30),
    final_build_decision:false,
    next_gate:['REUSE_OR_EXTEND','EXTEND','WRAP_OR_EXTEND'].includes(c.disposition_candidate)?'CONTRACT_BEHAVIOR_AND_OWNERSHIP_MATCH':'BUSINESS_VALUE_PLUS_FACTORY_GAP_REVIEW',
    guards:{prod_write:false,paid_ai:false,trading:false,additional_cost_eur:0,external_publish:false,destructive_migration:false}
  };
  return {...report,report_fingerprint:sha(report)};
}

export function aggregate(reports){
  const ordered=[...reports].sort((a,b)=>a.capability_family.localeCompare(b.capability_family));
  const states={}; const dispositions={};
  for(const r of ordered){states[r.verified_state]=(states[r.verified_state]||0)+1;dispositions[r.disposition_candidate]=(dispositions[r.disposition_candidate]||0)+1;}
  const trueBuild=ordered.filter(r=>r.disposition_candidate==='BUILD_PENDING_BUSINESS_VALUE').map(r=>r.capability_family);
  return {
    schema_version:'1.0.0',version:VERSION,mission_id:'M18-DIGITAL-INDUSTRY-2026-10-30',environment:'PREPROD',
    candidate_count:ordered.length,verified_states:states,disposition_candidates:dispositions,
    build_pending_business_value:trueBuild,final_build_decisions:0,
    safety:{prod_write:false,paid_ai:false,trading:false,additional_cost_eur:0},reports:ordered,
    aggregate_fingerprint:sha(ordered.map(r=>[r.capability_family,r.report_fingerprint,r.disposition_candidate]))
  };
}
function args(){return Object.fromEntries(process.argv.slice(2).map(x=>{const [k,...v]=x.replace(/^--/,'').split('=');return [k,v.join('=')||'true'];}));}
function main(){
  const a=args();
  if(a.aggregate){
    const reports=[]; for(const name of fs.readdirSync(a.aggregate,{recursive:true})){
      const file=path.join(a.aggregate,name); if(!name.endsWith('.json')) continue;
      try{const r=loadJson(file);if(r.version===VERSION&&r.capability_family)reports.push(r);}catch{}
    }
    const out=aggregate(reports); const target=a.out||'artifacts/m18-wave3/aggregate.json';
    fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify(out,null,2)+'\n');
    console.log(JSON.stringify({ok:true,candidate_count:out.candidate_count,verified_states:out.verified_states,disposition_candidates:out.disposition_candidates,build_pending_business_value:out.build_pending_business_value,final_build_decisions:0,prod_write:false,paid_ai:false,trading:false,additional_cost_eur:0}));return;
  }
  if(!a.capability) throw new Error('--capability required');
  const out=verifyGap(a.capability); const target=a.out||`artifacts/m18-wave3/${a.capability}.json`;
  fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify(out,null,2)+'\n');
  console.log(JSON.stringify({ok:true,capability_family:out.capability_family,verified_state:out.verified_state,disposition_candidate:out.disposition_candidate,confidence:out.confidence,evidence_count:out.evidence_count,final_build_decision:false,prod_write:false,paid_ai:false,trading:false,additional_cost_eur:0}));
}
if(import.meta.url===`file://${process.argv[1]}`) main();
