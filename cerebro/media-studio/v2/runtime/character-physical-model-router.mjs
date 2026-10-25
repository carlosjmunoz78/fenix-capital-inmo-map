import fs from 'node:fs';

const registryPath=new URL('../registry/character-physical-model-candidates-v0.json',import.meta.url);
const registry=JSON.parse(fs.readFileSync(registryPath,'utf8'));

const CAPABILITY_ALIASES={
  VOICE:'VOICE_CLONE',
  SPEECH:'TTS',
  LIPSYNC:'LIP_SYNC',
  TALKING_HEAD:'TALKING_HEAD',
  IMAGE_IDENTITY:'CHARACTER_VISUAL_CONSISTENCY',
  IMAGE_REFERENCE:'REFERENCE_IMAGE_CONDITIONING',
  BODY_3D:'BODY_3D_RECONSTRUCTION',
  THREE_D:'3D_ASSET_PROCESSING',
  MOTION:'MOTION_TRANSFER',
  RESTORE_FACE:'FACE_RESTORATION'
};

function normalizeCapability(value){
  const c=String(value||'').trim().toUpperCase();
  if(!c) throw new Error('CAPABILITY_REQUIRED');
  return CAPABILITY_ALIASES[c]||c;
}
function normalizeTerritory(value){return String(value||registry.policy.default_territory||'EU').trim().toUpperCase();}
function isRejectStatus(status){return String(status||'').startsWith('REJECT_');}
function isHoldStatus(status){return String(status||'').startsWith('HOLD_');}

export function listCharacterPhysicalCandidates(){return structuredClone(registry);}

export function routeCharacterPhysicalModels({capability,territory='EU',commercial=true,zero_cost_required=true,include_hold=false}={}){
  const wanted=normalizeCapability(capability);const t=normalizeTerritory(territory);
  const decisions=registry.candidates.filter(c=>c.capabilities.includes(wanted)).map(candidate=>{
    const reasons=[];
    if(candidate.territory_exclusions?.includes(t)) reasons.push(`TERRITORY_EXCLUDED:${t}`);
    if(commercial&&candidate.commercial_zero_cost_candidate===false) reasons.push('NOT_ZERO_COST_COMMERCIAL_COMPATIBLE');
    if(zero_cost_required&&candidate.commercial_zero_cost_candidate===false) reasons.push('ZERO_COST_POLICY_BLOCK');
    if(isRejectStatus(candidate.status)) reasons.push(`STATUS:${candidate.status}`);
    if(isHoldStatus(candidate.status)) reasons.push(`STATUS:${candidate.status}`);
    const hard_block=reasons.some(x=>x.startsWith('TERRITORY_EXCLUDED:')||x.startsWith('STATUS:REJECT_')||x==='ZERO_COST_POLICY_BLOCK'||x==='NOT_ZERO_COST_COMMERCIAL_COMPATIBLE');
    const hold=isHoldStatus(candidate.status);
    const eligible=!hard_block&&!hold;
    const visible=eligible||(include_hold&&hold&&!candidate.territory_exclusions?.includes(t));
    return {
      candidate_id:candidate.id,
      name:candidate.name,
      capability:wanted,
      priority:candidate.priority,
      registry_status:candidate.status,
      eligible,
      visible,
      decision:eligible?'BENCHMARK_REQUIRED':hold?'HOLD':'DENY',
      reasons,
      install_authorized:false,
      network_download_authorized:false,
      prod_binding_authorized:false,
      rights_gate_required:registry.policy.real_identity_requires_rights_gate,
      source_urls:candidate.source_urls
    };
  });
  const visible=decisions.filter(x=>x.visible).sort((a,b)=>a.priority-b.priority||a.candidate_id.localeCompare(b.candidate_id));
  return {
    state_type:'CEREBRO_UMS_CHARACTER_PHYSICAL_ROUTE_V0',
    company_id:'GLOBAL',engine_id:'UMS-001',environment:'PREPROD',version:'0.1.0',
    capability:wanted,territory:t,commercial,zero_cost_required,
    candidates:visible,
    eligible_candidates:visible.filter(x=>x.eligible),
    install_authorized:false,network_download_authorized:false,prod_binding_authorized:false,
    selection_rule:'license_and_territory_before_quality; then physical OLD_vs_NEW benchmark; no silent installation or spend'
  };
}

export function assertCharacterModelPromotionEvidence({candidate_id,evidence}={}){
  const candidate=registry.candidates.find(x=>x.id===candidate_id);
  if(!candidate) throw new Error('UNKNOWN_CHARACTER_MODEL_CANDIDATE');
  if(isRejectStatus(candidate.status)||isHoldStatus(candidate.status)) return {allowed:false,reason:`REGISTRY_BLOCK:${candidate.status}`};
  const required={
    source_pinned: evidence?.source_pinned===true,
    artifact_hashes: Array.isArray(evidence?.artifact_hashes)&&evidence.artifact_hashes.length>0,
    license_status: evidence?.license_status==='PASS',
    dependency_license_status: evidence?.dependency_license_status==='PASS',
    security_status: evidence?.security_status==='PASS',
    physical_smoke: evidence?.physical_smoke==='PASS',
    benchmark_status: evidence?.benchmark_status==='PASS',
    rights_provenance_status: evidence?.rights_provenance_status==='PASS',
    rollback_proven: evidence?.rollback_proven===true,
    rebuild_proven: evidence?.rebuild_proven===true,
    measured_cost_known: Number.isFinite(evidence?.measured_cost_eur),
    zero_cost_policy: Number(evidence?.measured_cost_eur)===0,
    tribunal_status: evidence?.tribunal_status==='PASS'
  };
  const missing=Object.entries(required).filter(([,ok])=>!ok).map(([k])=>k);
  return missing.length?{allowed:false,reason:'PROMOTION_EVIDENCE_INCOMPLETE',missing}:{allowed:true,reason:'PREPROD_PHYSICAL_PROMOTION_GATE_PASS',missing:[]};
}
