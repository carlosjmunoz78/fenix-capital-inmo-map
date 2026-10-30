import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const VERSION='m18-capability-crosswalk-v1';
const ENVIRONMENT='PREPROD';
const MISSION_PATH='cerebro/missions/M18-DIGITAL-INDUSTRY-2026-10-30.json';
const MAX_READ_BYTES=300000;
const TEXT_EXT=/\.(?:md|json|ya?ml|mjs|cjs|js|ts|tsx|jsx|py|sh|sql|toml|txt)$/i;
const STOP=new Set(['factory','and','the','for','with','from','into','builder','registry','feature']);
const SELF_EXCLUDE=[
  'cerebro/missions/M18-DIGITAL-INDUSTRY-2026-10-30.json',
  '28_MACROFRENTES.md',
  '.github/workflows/cerebro-m18-digital-industry-wave1-preprod.yml',
  '.github/workflows/cerebro-m18-digital-industry-wave2-crosswalk-preprod.yml',
  'cerebro/digital-build/m18-capability-crosswalk-v1.mjs',
  'cerebro/tests/m18-capability-crosswalk-v1.test.mjs'
];

export const ALIASES=Object.freeze({
  business_to_digital_architecture:['business-discovery','digital-build','business-architecture'],
  buy_build_improve_gate:['buy-vs-build','build-parity','parity-gate','build-gate'],
  technology_scout:['tech-scout','technology-scout','scout'],
  brand_factory:['brandboot','brand-token','brand'],
  design_system_factory:['design-system','design-token','tokens'],
  ux_and_prototype_factory:['ux','prototype','figma'],
  web_factory:['web-build','website','webapp'],
  wordpress_factory:['wordpress','gutenberg','block-theme','wp-'],
  funnel_and_landing_factory:['funnel','landing'],
  ecommerce_factory:['ecommerce','commerce','woocommerce','prestashop'],
  saas_factory:['saas'], marketplace_factory:['marketplace'], pwa_factory:['pwa'],
  mobile_app_factory:['mobile-app','react-native','expo','android','ios'],
  desktop_app_factory:['desktop-app','tauri','electron'],
  browser_extension_factory:['browser-extension','extension'],
  plugin_theme_module_factory:['plugin','theme','module'],
  api_backend_factory:['backend','api-','-api','server'],
  connector_mcp_factory:['connector','mcp'], automation_factory:['automation','workflow'],
  data_product_factory:['data-product','analytics','dataset'],
  ai_feature_factory:['model-router','ai-feature','inference'],
  multimedia_factory:['multimedia','creative','video','audio'], content_factory:['content'],
  seo_aso_discoverability_factory:['seo','aso','discoverability','schema-org'],
  localization_factory:['localization','i18n','l10n'], legal_compliance_factory:['legal','compliance'],
  accessibility_factory:['accessibility','a11y'], security_factory:['security','iam','policy'],
  qa_factory:['qa-','test','evaluation'], synthetic_user_and_visual_qa_factory:['visual-qa','browser-qa','synthetic-user'],
  performance_factory:['performance','lighthouse','web-vitals'], deployment_factory:['deployment','deploy','preview'],
  migration_factory:['migration','migrate'], backup_rebuild_factory:['backup','rebuild','rollback','restore'],
  observability_factory:['observability','metrics','telemetry','health'], growth_factory:['growth','experiment','ab-test'],
  monetization_factory:['monetization','pricing','billing','payment'], support_factory:['support','helpdesk'],
  evolution_factory:['evolution','learning','lrn-'], digital_twin_builder:['digital-twin','reverse-inventory','current-state'],
  product_dna_registry:['product-dna','product-manifest','artifact-manifest'],
  template_genome_registry:['template','scaffold','component-registry'],
  white_label_multi_tenant_factory:['white-label','multi-tenant','multitenant','tenant'],
  transformation_factory:['transformation','adapter','migration']
});

const sha=value=>crypto.createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
const normalize=value=>String(value||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();

function mission(){
  const raw=JSON.parse(fs.readFileSync(MISSION_PATH,'utf8'));
  if(raw.environment!==ENVIRONMENT) throw new Error('M18 crosswalk is PREPROD-only');
  if(raw.hard_guards?.prod_write_allowed!==false || raw.hard_guards?.paid_ai_allowed!==false || raw.hard_guards?.trading_access!==false) throw new Error('M18 safety guards invalid');
  return raw;
}

function kindOf(file){
  const p=normalize(file);
  if(p.includes('/tests/')||p.includes('.test.')) return 'test';
  if(p.includes('/registry/')) return 'registry';
  if(p.startsWith('.github/workflows/')) return 'workflow';
  if(p.includes('/skills/')) return 'skill';
  if(p.includes('/runtime/')||(/\/digital-build\//.test(p)&&/\.(mjs|js|ts|py)$/.test(p))) return 'runtime';
  if(p.includes('/docs/')||p.endsWith('.md')) return 'docs';
  return 'code';
}

function termsFor(capability){
  const base=normalize(capability).split(/[^a-z0-9]+/).filter(x=>x.length>=3&&!STOP.has(x));
  const aliases=ALIASES[capability]||[];
  return [...new Set([...base,...aliases.map(normalize)])];
}

function safeRead(file){
  try{
    const stat=fs.statSync(file);
    if(!stat.isFile()||stat.size>MAX_READ_BYTES||!TEXT_EXT.test(file)) return '';
    return normalize(fs.readFileSync(file,'utf8'));
  }catch{return '';}
}

export function classifyEvidence(evidence=[]){
  const counts={runtime:0,test:0,registry:0,workflow:0,skill:0,docs:0,code:0};
  for(const e of evidence) counts[e.kind]=(counts[e.kind]||0)+1;
  let evidence_state='NO_PHYSICAL_EVIDENCE';
  let disposition_candidate='BUILD';
  let confidence='LOW';
  if(counts.runtime>0&&counts.test>0&&(counts.registry>0||counts.docs>0)){
    evidence_state='EXISTING_STRONG_EVIDENCE'; disposition_candidate='REUSE'; confidence='HIGH';
  }else if(counts.runtime>0||counts.skill>0||(counts.test>0&&counts.registry>0)){
    evidence_state='EXISTING_PARTIAL_EVIDENCE'; disposition_candidate='EXTEND'; confidence='MEDIUM';
  }else if(counts.registry>0||counts.workflow>0||counts.docs>0||counts.code>0){
    evidence_state='DEFINED_OR_REFERENCED_ONLY'; disposition_candidate='WRAP'; confidence='LOW';
  }
  return {counts,evidence_state,disposition_candidate,confidence,final_decision:false};
}

export function auditCapability(capability,{files=null}={}){
  const packet=mission();
  if(!packet.capability_families.includes(capability)) throw new Error(`unknown M18 capability family: ${capability}`);
  const terms=termsFor(capability);
  const list=files||execFileSync('git',['ls-files'],{encoding:'utf8',maxBuffer:20_000_000}).split(/\r?\n/).filter(Boolean);
  const candidates=[];
  for(const file of list){
    if(SELF_EXCLUDE.some(x=>file===x||file.includes(x))) continue;
    const p=normalize(file);
    const pathHits=terms.filter(t=>p.includes(t));
    let contentHits=[];
    if(pathHits.length||/cerebro\/(digital-build|runtime|registry|skills|tests|docs)\//.test(p)){
      const text=safeRead(file);
      if(text) contentHits=terms.filter(t=>text.includes(t));
    }
    const score=pathHits.length*6+contentHits.length;
    if(score>0) candidates.push({path:file,kind:kindOf(file),score,path_hits:pathHits,content_hit_count:contentHits.length});
  }
  candidates.sort((a,b)=>b.score-a.score||a.path.localeCompare(b.path));
  const typedEvidence=candidates.filter(x=>x.path_hits.length>0).slice(0,40);
  const classification=classifyEvidence(typedEvidence);
  const report={
    schema_version:'1.0.0', version:VERSION, mission_id:packet.mission_id, canonical_root:'M18',
    company_id:packet.company_id, environment:ENVIRONMENT, capability_family:capability, terms,
    ...classification, evidence_hits:candidates.length, typed_evidence_hits:typedEvidence.length,
    top_evidence:candidates.slice(0,20),
    guards:{prod_write:false,paid_ai:false,trading:false,additional_cost_eur:0,external_side_effect:false},
    required_next_gate:classification.disposition_candidate==='BUILD'?'BUSINESS_VALUE_AND_OVERLAP_REVIEW':'CONTRACT_AND_BEHAVIOR_VERIFICATION'
  };
  return {...report,report_fingerprint:sha(report)};
}

export function aggregateReports(reports){
  const ordered=[...reports].sort((a,b)=>a.capability_family.localeCompare(b.capability_family));
  const counts={REUSE:0,WRAP:0,EXTEND:0,BUILD:0,DEFER:0,REJECT:0};
  for(const r of ordered) counts[r.disposition_candidate]=(counts[r.disposition_candidate]||0)+1;
  return {
    schema_version:'1.0.0',version:VERSION,mission_id:'M18-DIGITAL-INDUSTRY-2026-10-30',environment:ENVIRONMENT,
    capability_count:ordered.length,disposition_candidates:counts,
    final_decisions_made:0,
    safety:{prod_write:false,paid_ai:false,trading:false,additional_cost_eur:0},
    reports:ordered,
    aggregate_fingerprint:sha(ordered.map(r=>[r.capability_family,r.report_fingerprint,r.disposition_candidate]))
  };
}

function args(){return Object.fromEntries(process.argv.slice(2).map(x=>{const [k,...rest]=x.replace(/^--/,'').split('=');return [k,rest.join('=')||'true'];}));}
function main(){
  const a=args(); const packet=mission();
  if(a.aggregate){
    const dir=path.resolve(a.aggregate); const reports=[];
    for(const name of fs.readdirSync(dir,{recursive:true})){
      const file=path.join(dir,name); if(!name.endsWith('.json')) continue;
      try{const r=JSON.parse(fs.readFileSync(file,'utf8'));if(r.version===VERSION&&r.capability_family)reports.push(r);}catch{}
    }
    const out=aggregateReports(reports); const target=path.resolve(a.out||'artifacts/m18-capability-crosswalk/aggregate.json');
    fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify(out,null,2)+'\n');
    console.log(JSON.stringify({ok:true,mode:'aggregate',capability_count:out.capability_count,disposition_candidates:out.disposition_candidates,aggregate_fingerprint:out.aggregate_fingerprint})); return;
  }
  if(!a.capability) throw new Error('--capability required');
  const report=auditCapability(a.capability); const target=path.resolve(a.out||`artifacts/m18-capability-crosswalk/${a.capability}.json`);
  fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({ok:true,capability_family:report.capability_family,evidence_state:report.evidence_state,disposition_candidate:report.disposition_candidate,confidence:report.confidence,evidence_hits:report.evidence_hits,typed_evidence_hits:report.typed_evidence_hits,prod_write:false,paid_ai:false,trading:false,additional_cost_eur:0}));
}

if(import.meta.url===`file://${process.argv[1]}`) main();
