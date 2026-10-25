import { evaluateIdentityRights } from './rights-gate.mjs';

const COMPONENTS=new Set(['FACE','BODY','VOICE','MOTION','PERFORMANCE','EXPRESSIONS','WARDROBE','BEHAVIOR']);

const COMPONENT_ROLES={
  FACE:['D09','D10'],
  BODY:['D09','D10'],
  VOICE:['D09','D11'],
  MOTION:['D09','D12','D30'],
  PERFORMANCE:['D09','D12','D30'],
  EXPRESSIONS:['D09','D10','D12'],
  WARDROBE:['D09','D26'],
  BEHAVIOR:['D09','D12']
};

const COMPONENT_GUARDIANS={
  FACE:['GRD-02','GRD-04'],
  BODY:['GRD-02','GRD-04'],
  VOICE:['GRD-02','GRD-03','GRD-04'],
  MOTION:['GRD-02','GRD-04'],
  PERFORMANCE:['GRD-02','GRD-04'],
  EXPRESSIONS:['GRD-02','GRD-04'],
  WARDROBE:['GRD-04'],
  BEHAVIOR:['GRD-02','GRD-04']
};

const DEFAULT_CONTINUITY={
  identity_similarity_floor:0.90,
  temporal_identity_drift_max:0.08,
  body_proportion_drift_max:0.05,
  voice_similarity_floor:0.88,
  lip_sync_offset_ms_max:80,
  wardrobe_continuity_required:true,
  mannerism_continuity_required:true
};

function uniq(values){ return [...new Set(values)]; }
function requireString(value,name){ if(typeof value!=='string'||!value.trim()) throw new Error(`INVALID_${name.toUpperCase()}`); return value.trim(); }

export function normalizeCharacterCloneRequest(input={}){
  const company_id=requireString(input.company_id,'company_id');
  const engine_id=requireString(input.engine_id||'UMS-001','engine_id');
  const environment=requireString(input.environment||'PREPROD','environment');
  const version=requireString(input.version||'0.1.0','version');
  const character_id=requireString(input.character_id,'character_id');
  const identity_type=requireString(input.identity_type,'identity_type');
  const components=uniq((input.components||['FACE','BODY','VOICE','MOTION','PERFORMANCE','EXPRESSIONS','WARDROBE','BEHAVIOR']).map(x=>String(x).toUpperCase()));
  if(!['LAB','PREPROD','PROD'].includes(environment)) throw new Error('INVALID_ENVIRONMENT');
  if(!['SYNTHETIC_ORIGINAL','FICTIONAL_LICENSED','REAL_AUTHORIZED'].includes(identity_type)) throw new Error('INVALID_IDENTITY_TYPE');
  if(!components.length||components.some(c=>!COMPONENTS.has(c))) throw new Error('INVALID_COMPONENTS');
  if(!Array.isArray(input.provenance?.evidence_refs)||input.provenance.evidence_refs.length===0) throw new Error('PROVENANCE_REQUIRED');
  return {
    ...input,
    company_id,engine_id,environment,version,character_id,identity_type,components,
    studio_id:input.studio_id??null,
    production_id:input.production_id??null,
    continuity:{...DEFAULT_CONTINUITY,...(input.continuity||{})}
  };
}

export function planCharacterClone(input={}){
  const request=normalizeCharacterCloneRequest(input);
  const rights=evaluateIdentityRights({
    identity_type:request.identity_type,
    clone_type:'DIGITAL_DOUBLE',
    rights_record:request.rights
  });
  const roles=uniq(request.components.flatMap(c=>COMPONENT_ROLES[c]||[]));
  const guardians=uniq(request.components.flatMap(c=>COMPONENT_GUARDIANS[c]||[]).concat(['GRD-11','GRD-12','GRD-13']));
  const human_required=rights.decision==='HUMAN_REQUIRED';
  const denied=rights.decision==='DENY';
  const state=denied?'DENIED':human_required?'HUMAN_REQUIRED':'READY_FOR_PREPROD_BENCHMARK';
  return {
    plan_type:'CEREBRO_UMS_CHARACTER_CLONE_PLAN_V0',
    character_id:request.character_id,
    company_id:request.company_id,
    engine_id:request.engine_id,
    studio_id:request.studio_id,
    production_id:request.production_id,
    environment:request.environment,
    version:request.version,
    identity_type:request.identity_type,
    requested_components:request.components,
    required_roles:roles,
    required_guardians:guardians,
    rights_decision:rights,
    continuity_targets:request.continuity,
    canonical_outputs:[
      'identity_manifest','face_canon','body_canon','voice_profile','motion_profile',
      'performance_profile','expression_profile','wardrobe_profile','behavior_profile',
      'provenance_manifest','rights_snapshot','continuity_baseline'
    ],
    benchmark_requirements:[
      'IDENTITY_SIMILARITY','TEMPORAL_IDENTITY_DRIFT','BODY_PROPORTION_DRIFT','VOICE_SIMILARITY',
      'LIP_SYNC_OFFSET','EXPRESSION_CONTINUITY','WARDROBE_CONTINUITY','MANNERISM_CONTINUITY',
      'PROVENANCE_COMPLETENESS','RIGHTS_RECHECK','COST_MEASURED','ROLLBACK_PROVEN'
    ],
    physical_execution:{
      allowed:false,
      reason: rights.decision==='PASS' ? 'adapter_evidence_and_benchmark_required_before_binding' : rights.reason,
      required_gate:'CHARACTER_CLONE_PHYSICAL_GATE_V0'
    },
    state
  };
}

export function assertCharacterCloneGoverned(input={}){
  const plan=planCharacterClone(input);
  if(plan.state==='DENIED') throw new Error(`DENY:RIGHTS:${plan.rights_decision.reason}`);
  if(plan.state==='HUMAN_REQUIRED') throw new Error(`HUMAN_REQUIRED:${plan.rights_decision.code||'LEGAL_REQUIRED'}:${plan.rights_decision.reason}`);
  return plan;
}

export function mayBindPhysicalCharacterAdapter({plan,adapterEvidence,benchmarkEvidence}={}){
  if(!plan||plan.state!=='READY_FOR_PREPROD_BENCHMARK') return {allowed:false,reason:'plan_not_ready'};
  if(plan.rights_decision?.decision!=='PASS') return {allowed:false,reason:'rights_not_pass'};
  const adapterPass=adapterEvidence?.license_status==='PASS'&&adapterEvidence?.security_status==='PASS'&&Number.isFinite(adapterEvidence?.measured_cost_eur);
  if(!adapterPass) return {allowed:false,reason:'adapter_evidence_incomplete'};
  const benchmarkPass=benchmarkEvidence?.status==='PASS'&&benchmarkEvidence?.rollback_proven===true&&benchmarkEvidence?.provenance_complete===true;
  if(!benchmarkPass) return {allowed:false,reason:'benchmark_or_rollback_incomplete'};
  return {allowed:true,reason:'preprod_binding_gate_pass'};
}
