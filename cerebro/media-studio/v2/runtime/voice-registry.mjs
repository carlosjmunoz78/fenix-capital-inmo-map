import crypto from 'node:crypto';
import { evaluateIdentityRights } from './rights-gate.mjs';

export function createVoiceProfile({company_id,identity_type,rights_record,languages=['es-ES'],dialects=[],modalities=['speech'],canonical_refs=[],phoneme_map={},prosody_profile={},emotion_profile={},singing_profile={},quality_benchmarks={},version='1.0.0'}){
  if(!company_id||!identity_type) throw new Error('company_id and identity_type are required');
  return {voice_id:`VOI-${crypto.randomUUID()}`,company_id,identity_type,rights_record,languages,dialects,modalities,canonical_refs,phoneme_map,prosody_profile,emotion_profile,singing_profile,quality_benchmarks,version,status:'REGISTERED'};
}

export function canUseVoice(profile,{clone_type='VOICE_CLONE',company_id,use='speech'}={}){
  if(profile.company_id!==company_id) return {decision:'DENY',reason:'cross_company'};
  if(!profile.modalities.includes(use)) return {decision:'DENY',reason:'modality_not_allowed'};
  return evaluateIdentityRights({identity_type:profile.identity_type,clone_type,rights_record:profile.rights_record});
}

export function voiceContinuityKey(profile){
  return [profile.voice_id,profile.version,[...profile.languages].sort().join(','),[...profile.dialects].sort().join(',')].join('|');
}
