#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadVerifiedSourceSnapshot,evaluateSourceFreshness,buildSourceRefreshJobs} from '../knowledge/source-freshness.mjs';

const MEDIA_TERMS=new Set(['media','video','audio','voice','speech','music','sound','image','photo','3d','render','animation','vfx','cinema','film','color','colour','timeline','caption','subtitle','codec','ffmpeg','remotion','hyperframes','blender','usd','openusd','gltf','openexr','ocio','aces','materialx','openvdb','opencue','xr','spatial','volumetric','hologram','motion','foley','mix','mastering']);
const SAFE_STATUSES=new Set(['FULL_SAFE_PREPROD','FULL_SAFE_PREPROD_PENDING_PROD_READONLY_CANARY','PROD_CAPABILITY_AVAILABLE_READONLY']);
const PREPROD='PREPROD';

function authority(){return {prod_authorized:false,prod_write_authorized:false,prod_mutation_authorized:false,permission_expansion_authorized:false,external_skill_code_execution:false,dependency_install_authorized:false,customer_data_authorized:false,paid_fallback:false,spend_authorized:false,trading_access:false,additional_cost_eur:0};}
function textOf(candidate){return [candidate?.technical_name,...(candidate?.target_engine_bindings??[]),...(candidate?.capability_contracts??[]).flatMap((cap)=>[cap?.technical_name,cap?.description,...(cap?.domains??[]).flatMap((d)=>[d?.domain_id,...(d?.engine_bindings??[])])])].filter(Boolean).join(' ').toLowerCase();}
function tokenize(value){return String(value??'').toLowerCase().split(/[^a-z0-9+.-]+/).filter(Boolean);}
function isMediaRelevant(candidate){const tokens=tokenize(textOf(candidate));return tokens.some((token)=>MEDIA_TERMS.has(token)||[...MEDIA_TERMS].some((term)=>token.includes(term)&&term.length>=4));}
function safeCandidate(candidate){const closure=candidate?.closure_summary??{};return SAFE_STATUSES.has(candidate?.status)&&candidate?.learning_impact_status==='LRN_IMPACT_GREEN_PREPROD'&&closure.full_safe_preprod===true&&closure.per_binding_old_vs_new_pass===true&&closure.tribunal_pass===true&&Number(candidate?.additional_cost_eur??0)===0&&candidate?.prod_write_authorized!==true&&candidate?.prod_mutation_authorized!==true&&candidate?.external_skill_code_execution!==true&&candidate?.trading_access!==true;}
function routeDepartments(candidate){const text=textOf(candidate);const routed=[];const rules=[
  ['DPT-VOICE',['voice','speech','tts','audio']],['DPT-AUDIO',['audio','sound','foley','mix','mastering','music']],['DPT-VIDEO',['video','film','cinema','caption','subtitle','timeline']],['DPT-IMAGE',['image','photo','color','colour','aces','ocio','openexr']],['DPT-3D-VFX',['3d','render','vfx','blender','usd','openusd','materialx','openvdb','opencue']],['DPT-XR',['xr','spatial','volumetric','hologram']],['DPT-PIPELINE',['codec','ffmpeg','gltf','pipeline','workflow','remotion','hyperframes']]
];for(const [department,terms] of rules)if(terms.some((term)=>text.includes(term)))routed.push(department);return routed.length?[...new Set(routed)].sort():['DPT-MEDIA-GENERAL'];}

export function buildUmsContinuousLearningProposal({dynamic_registry,source_snapshot=loadVerifiedSourceSnapshot(),now=new Date()}={}){
  if(!dynamic_registry||dynamic_registry.state_type!=='CEREBRO_DYNAMIC_SKILL_ADOPTION_REGISTRY_V1')throw new Error('DYNAMIC_SKILL_ADOPTION_REGISTRY_REQUIRED');
  const capabilities=Array.isArray(dynamic_registry.capabilities)?dynamic_registry.capabilities:[];
  const safe=capabilities.filter(safeCandidate);
  const media=safe.filter(isMediaRelevant);
  const rejectedUnsafe=capabilities.length-safe.length;
  const learning_candidates=media.map((candidate)=>Object.freeze({
    source_candidate_id:candidate.candidate_id,
    technical_name:candidate.technical_name,
    source_locator:candidate.source_locator,
    pinned_sha:candidate.pinned_sha??null,
    capability_hash:candidate.capability_hash??null,
    departments:routeDepartments(candidate),
    status:'BENCHMARK_REQUIRED',
    promotion_authorized:false,
    required_pipeline:['capability_mapping','duplicate_gap_analysis','LAB_benchmark','quality_cost_latency_privacy_score','OLD_vs_NEW','tribunal','knowledge_store_review'],
    evidence_refs:[candidate.current_evidence,candidate.outcome_hash,candidate.snapshot_sha256,candidate.manifest_sha256].filter(Boolean),
    reason:'GOVERNED_CEREBRO_SKILL_CAN_INFORM_UMS_BUT_CANNOT_AUTO_PROMOTE_TO_KNOWLEDGE'
  }));
  const freshness=evaluateSourceFreshness(source_snapshot,{now,maxAgeDays:7});
  const refresh_jobs=freshness.stale?buildSourceRefreshJobs(source_snapshot):[];
  return Object.freeze({schema_version:'1.0.0',state_type:'CEREBRO_UMS_CONTINUOUS_LEARNING_PROPOSAL_V1',status:'PREPROD_REVIEW_REQUIRED',company_id:'GLOBAL',engine_id:'UMS-001',environment:PREPROD,version:'1.0.0',generated_at:now.toISOString(),input_capabilities:capabilities.length,safe_capabilities:safe.length,media_relevant_capabilities:media.length,rejected_unsafe_or_unproven:rejectedUnsafe,learning_candidates:Object.freeze(learning_candidates),professional_source_freshness:freshness,source_refresh_jobs:Object.freeze(refresh_jobs),knowledge_auto_promotion:false,readiness_mutation:false,...authority()});
}

async function cli(){
  const args=process.argv.slice(2);const get=(name)=>{const i=args.indexOf(name);return i>=0?args[i+1]:null;};
  const registryFile=get('--dynamic-registry')??'cerebro/registry/skill-dynamic-adoption-v1.json';
  const output=get('--out')??null;const nowRaw=get('--now');
  const dynamic_registry=JSON.parse(fs.readFileSync(registryFile,'utf8'));
  const report=buildUmsContinuousLearningProposal({dynamic_registry,now:nowRaw?new Date(nowRaw):new Date()});
  const body=`${JSON.stringify(report,null,2)}\n`;if(output){fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});fs.writeFileSync(output,body,{mode:0o600});}process.stdout.write(body);
}
const self=process.argv[1]&&path.resolve(process.argv[1])===path.resolve(fileURLToPath(import.meta.url));if(self)cli().catch((error)=>{process.stderr.write(`${JSON.stringify({status:'RED_FAIL_CLOSED',error:String(error?.message??error)})}\n`);process.exitCode=1;});
