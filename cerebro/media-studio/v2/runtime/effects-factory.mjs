import crypto from 'node:crypto';

const FAMILIES=new Set(['PARTICLES','FIRE_SMOKE','FLUIDS','DESTRUCTION','ELECTRICITY','ENERGY','ATMOSPHERE','WEATHER','OPTICAL','LENS','LIGHT','MAGIC_FANTASY','SCI_FI','IMPACT','TRANSITION','MOTION_GRAPHICS','FOLEY','SFX','AMBIENCE','MUSIC_STINGER','CREATURE','CROWD','PRACTICAL_FX','CUSTOM']);

export function createEffectSpec({family,description,origin='GENERATED',parameters={},compatible_surfaces=[],rights={status:'INTERNAL_ORIGINAL',license_ref:'INTERNAL'},provenance='UMS_EFFECT_FACTORY',seed=null}){
  if(!FAMILIES.has(family)) throw new Error('UNKNOWN_EFFECT_FAMILY');
  if(!description) throw new Error('description required');
  return {effect_id:`FX-${crypto.randomUUID()}`,family,description,origin,rights,parameters,compatible_surfaces,deterministic_seed:seed,preview_ref:null,master_refs:[],version:'1.0.0',provenance,status:'SPEC_READY'};
}

export function deriveEffectVariant(base,overrides={}){
  if(!base?.effect_id) throw new Error('base effect required');
  return {...base,effect_id:`FX-${crypto.randomUUID()}`,parameters:{...base.parameters,...(overrides.parameters||{})},description:overrides.description||base.description,version:overrides.version||base.version,parent_effect_id:base.effect_id,status:'VARIANT_SPEC_READY'};
}

export function assertEffectRights(effect){
  if(!['VALID','INTERNAL_ORIGINAL','PUBLIC_DOMAIN_VERIFIED'].includes(effect?.rights?.status)) throw new Error('EFFECT_RIGHTS_NOT_VALID');
  if(!effect.provenance) throw new Error('EFFECT_PROVENANCE_REQUIRED');
  return true;
}

export const EFFECT_FAMILIES=[...FAMILIES];
