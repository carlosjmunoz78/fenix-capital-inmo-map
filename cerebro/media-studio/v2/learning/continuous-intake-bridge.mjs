#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadVerifiedSourceSnapshot,evaluateSourceFreshness,buildSourceRefreshJobs} from '../knowledge/source-freshness.mjs';

const SAFE_STATUSES=new Set(['FULL_SAFE_PREPROD','FULL_SAFE_PREPROD_PENDING_PROD_READONLY_CANARY','PROD_CAPABILITY_AVAILABLE_READONLY']);
const PREPROD='PREPROD';
const MEDIA_GROUPS=Object.freeze({
  VOICE:['voice','speech','tts','dubbing','lip-sync','lipsync','prosody'],
  AUDIO:['audio','sound','foley','music','mixing','mastering','stem','waveform'],
  VIDEO:['video','film','cinema','timeline','caption','subtitle','codec','transcode','frame','shot'],
  IMAGE:['image','photo','photography','raster','pixel','color-grade','colour-grade'],
  VFX3D:['3d','render','vfx','blender','usd','openusd','gltf','openexr','materialx','openvdb','opencue','compositing','geometry'],
  XR:['xr','spatial','volumetric','hologram','vr','ar'],
  PIPELINE:['ffmpeg','ffprobe','remotion','hyperframes','media-pipeline','render-farm']
});
const ACTION_TERMS=new Set(['generate','generation','render','transcode','encode','decode','convert','conversion','process','processing','analyze','analysis','edit','editing','compose','composite','compositing','capture','extract','inspect','inspection','caption','subtitle','synthesize','synthesis','clone','cloning','mix','mixing','master','mastering','animate','animation']);

function authority(){return {prod_authorized:false,prod_write_authorized:false,prod_mutation_authorized:false,permission_expansion_authorized:false,external_skill_code_execution:false,dependency_install_authorized:false,customer_data_authorized:false,paid_fallback:false,spend_authorized:false,trading_access:false,additional_cost_eur:0};}
function tokenize(value){return String(value??'').toLowerCase().split(/[^a-z0-9+.-]+/).flatMap((token)=>token.split(/[._-]+/)).filter(Boolean);}
function identifiersOf(candidate){return [candidate?.technical_name,...(candidate?.capability_contracts??[]).flatMap((cap)=>[cap?.technical_name,...(cap?.domains??[]).map((d)=>d?.domain_id)])].filter(Boolean).join(' ').toLowerCase();}
function descriptionsOf(candidate){return (candidate?.capability_contracts??[]).map((cap)=>cap?.description).filter(Boolean).join(' ').toLowerCase();}
function groupMatches(text){const tokens=new Set(tokenize(text));const matches=[];for(const [group,terms] of Object.entries(MEDIA_GROUPS)){if(terms.some((term)=>{const termTokens=tokenize(term);return termTokens.every((t)=>tokens.has(t));}))matches.push(group);}return matches;}
function strongMediaSignal(candidate){
  const identifierGroups=groupMatches(identifiersOf(candidate));
  if(identifierGroups.length>0)return {relevant:true,groups:identifierGroups,signal:'IDENTIFIER_OR_DOMAIN'};
  const description=descriptionsOf(candidate);const descriptionGroups=groupMatches(description);const action=tokensContainAction(description);
  if(descriptionGroups.length>=2&&action)return {relevant:true,groups:descriptionGroups,signal:'MULTI_GROUP_OPERATIONAL_DESCRIPTION'};
  return {relevant:false,groups:descriptionGroups,signal:'WEAK_OR_STYLE_ONLY'};
}
function tokensContainAction(text){const tokens=new Set(tokenize(text));return [...ACTION_TERMS].some((term)=>tokens.has(term));}
function safeCandidate(candidate){const closure=candidate?.closure_summary??{};return SAFE_STATUSES.has(candidate?.status)&&candidate?.learning_impact_status==='LRN_IMPACT_GREEN_PREPROD'&&closure.full_safe_preprod===true&&closure.per_binding_old_vs_new_pass===true&&closure.tribunal_pass===true&&Number(candidate?.additional_cost_eur??0)===0&&candidate?.prod_write_authorized!==true&&candidate?.prod_mutation_authorized!==true&&candidate?.external_skill_code_execution!==true&&candidate?.trading_access!==true;}
function observedAt(candidate){const raw=candidate?.promoted_at??candidate?.observed_at??'';const value=Date.parse(raw);return Number.isFinite(value)?value:0;}
function dedupeMediaCandidates(candidates){const best=new Map();for(const candidate of candidates){const domains=(candidate?.capability_contracts??[]).flatMap((cap)=>cap?.domains??[]).map((d)=>d?.domain_id).filter(Boolean).sort().join(',');const key=`${String(candidate?.technical_name??'').toLowerCase()}|${domains}`;const current=best.get(key);if(!current||observedAt(candidate)>observedAt(current)||(observedAt(candidate)===observedAt(current)&&String(candidate?.candidate_id)>String(current?.candidate_id)))best.set(key,candidate);}return [...best.values()].sort((a,b)=>String(a.technical_name).localeCompare(String(b.technical_name))||String(a.candidate_id).localeCompare(String(b.candidate_id)));}
function routeDepartments(candidate){const groups=strongMediaSignal(candidate).groups;const map={VOICE:['DPT-VOICE'],AUDIO:['DPT-AUDIO'],VIDEO:['DPT-VIDEO'],IMAGE:['DPT-IMAGE'],VFX3D:['DPT-3D-VFX'],XR:['DPT-XR'],PIPELINE:['DPT-PIPELINE']};const routed=groups.flatMap((g)=>map[g]??[]);return routed.length?[...new Set(routed)].sort():['DPT-MEDIA-GENERAL'];}

export function buildUmsContinuousLearningProposal({dynamic_registry,source_snapshot=loadVerifiedSourceSnapshot(),now=new Date()}={}){
  if(!dynamic_registry||dynamic_registry.state_type!=='CEREBRO_DYNAMIC_SKILL_ADOPTION_REGISTRY_V1')throw new Error('DYNAMIC_SKILL_ADOPTION_REGISTRY_REQUIRED');
  const capabilities=Array.isArray(dynamic_registry.capabilities)?dynamic_registry.capabilities:[];
  const safe=capabilities.filter(safeCandidate);
  const mediaRaw=safe.filter((candidate)=>strongMediaSignal(candidate).relevant);
  const media=dedupeMediaCandidates(mediaRaw);
  const rejectedUnsafe=capabilities.length-safe.length;
  const weakSignalSafe=safe.length-mediaRaw.length;
  const duplicatesRemoved=mediaRaw.length-media.length;
  const learning_candidates=media.map((candidate)=>Object.freeze({
    source_candidate_id:candidate.candidate_id,
    technical_name:candidate.technical_name,
    source_locator:candidate.source_locator,
    pinned_sha:candidate.pinned_sha??null,
    capability_hash:candidate.capability_hash??null,
    relevance_signal:strongMediaSignal(candidate).signal,
    departments:routeDepartments(candidate),
    status:'BENCHMARK_REQUIRED',
    promotion_authorized:false,
    required_pipeline:['capability_mapping','duplicate_gap_analysis','LAB_benchmark','quality_cost_latency_privacy_score','OLD_vs_NEW','tribunal','knowledge_store_review'],
    evidence_refs:[candidate.current_evidence,candidate.outcome_hash,candidate.snapshot_sha256,candidate.manifest_sha256].filter(Boolean),
    reason:'GOVERNED_CEREBRO_SKILL_CAN_INFORM_UMS_BUT_CANNOT_AUTO_PROMOTE_TO_KNOWLEDGE'
  }));
  const freshness=evaluateSourceFreshness(source_snapshot,{now,maxAgeDays:7});
  const refresh_jobs=freshness.stale?buildSourceRefreshJobs(source_snapshot):[];
  return Object.freeze({schema_version:'1.1.0',state_type:'CEREBRO_UMS_CONTINUOUS_LEARNING_PROPOSAL_V1',status:'PREPROD_REVIEW_REQUIRED',company_id:'GLOBAL',engine_id:'UMS-001',environment:PREPROD,version:'1.1.0',generated_at:now.toISOString(),input_capabilities:capabilities.length,safe_capabilities:safe.length,media_relevant_raw:mediaRaw.length,media_relevant_capabilities:media.length,media_duplicates_removed:duplicatesRemoved,rejected_weak_media_signal:weakSignalSafe,rejected_unsafe_or_unproven:rejectedUnsafe,learning_candidates:Object.freeze(learning_candidates),professional_source_freshness:freshness,source_refresh_jobs:Object.freeze(refresh_jobs),knowledge_auto_promotion:false,readiness_mutation:false,...authority()});
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
