const REAL_IDENTITY_CLONES=new Set(['FACE_IDENTITY_RECONSTRUCTION','BODY_IDENTITY_RECONSTRUCTION','VIDEO_TO_PERSISTENT_CHARACTER','DIGITAL_DOUBLE','MOTION_TRANSFER','PERFORMANCE_TRANSFER','VOICE_CLONE','VOICE_CONVERSION','SINGING_VOICE_CLONE']);

export function evaluateIdentityRights({identity_type,clone_type,rights_record}){
  if(identity_type==='SYNTHETIC_ORIGINAL') return {decision:'PASS',reason:'synthetic_original'};
  if(identity_type==='FICTIONAL_LICENSED'){
    if(rights_record?.consent_status==='VALID'||rights_record?.status==='VALID') return {decision:'PASS',reason:'licensed_rights_valid'};
    return {decision:'HUMAN_REQUIRED',code:'LEGAL_REQUIRED',reason:'licensed_character_rights_missing_or_unclear'};
  }
  if(identity_type!=='REAL_AUTHORIZED') return {decision:'DENY',reason:'unknown_identity_type'};
  if(!REAL_IDENTITY_CLONES.has(clone_type)) return {decision:'PASS',reason:'real_identity_non_clone_task'};
  const status=rights_record?.consent_status||rights_record?.status;
  const provenance=rights_record?.provenance_record;
  const revocation=rights_record?.revocation_process;
  if(status!=='VALID'||!provenance||!revocation) return {decision:'HUMAN_REQUIRED',code:'LEGAL_REQUIRED',reason:'real_identity_requires_valid_consent_provenance_revocation'};
  return {decision:'PASS',reason:'real_identity_authorized'};
}

export function assertRightsPass(input){
  const result=evaluateIdentityRights(input);
  if(result.decision!=='PASS') throw new Error(`${result.decision}:${result.code||'RIGHTS'}:${result.reason}`);
  return result;
}
