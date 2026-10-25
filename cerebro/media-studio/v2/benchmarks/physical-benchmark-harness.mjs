import crypto from 'node:crypto';
import {evaluateIdentityRights} from '../runtime/rights-gate.mjs';

const SUPPORTED=new Set(['BM-01','BM-03']);
function id(prefix){return `${prefix}-${crypto.randomUUID()}`;}
function authority(){return {prod_authorized:false,prod_write_authorized:false,prod_mutation_authorized:false,spend_authorized:false,trading_access:false,additional_cost_eur:0};}
function requireString(value,label){if(typeof value!=='string'||!value.trim())throw new Error(`${label}_REQUIRED`);return value.trim();}
function voiceScopeAllowsClone(scope){const values=Array.isArray(scope)?scope:[scope];return values.filter(Boolean).map(String).some((v)=>['VOICE_CLONE','VOICE_CONVERSION','TTS','MULTILINGUAL_VOICE'].some((x)=>v.toUpperCase().includes(x)));}

export function createPhysicalBenchmarkPlan({benchmark_id,input={}}={}){
  if(!SUPPORTED.has(benchmark_id))throw new Error('BENCHMARK_NOT_SUPPORTED_BY_THIS_HARNESS');
  if(benchmark_id==='BM-01'){
    if(input.identity_type!=='SYNTHETIC_ORIGINAL')throw new Error('BM01_REQUIRES_SYNTHETIC_ORIGINAL_IDENTITY');
    const character_bible_ref=requireString(input.character_bible_ref,'CHARACTER_BIBLE_REF');
    const reference_assets=Array.isArray(input.reference_assets)?input.reference_assets.filter(Boolean):[];
    if(reference_assets.length<3)throw new Error('BM01_REQUIRES_AT_LEAST_THREE_REFERENCE_ASSETS');
    return Object.freeze({plan_id:id('BM01-PLAN'),benchmark_id,status:'READY_FOR_PHYSICAL_RUN',environment:'PREPROD',identity_type:'SYNTHETIC_ORIGINAL',character_bible_ref,reference_assets:Object.freeze(reference_assets),required_outputs:Object.freeze(['IMAGE_IDENTITY_PROOF','VIDEO_IDENTITY_PROOF','THREE_D_REFERENCE_PROOF','CROSS_MODAL_CONSISTENCY_METRICS']),pass_not_claimed:true,...authority()});
  }
  if(input.identity_type!=='REAL_AUTHORIZED')throw new Error('BM03_REQUIRES_REAL_AUTHORIZED_IDENTITY');
  const rights_record=input.rights_record??{};
  const rights=evaluateIdentityRights({identity_type:'REAL_AUTHORIZED',clone_type:'VOICE_CLONE',rights_record});
  if(rights.decision!=='PASS')return Object.freeze({plan_id:id('BM03-HOLD'),benchmark_id,status:'HUMAN_REQUIRED',human_required: rights.code??'LEGAL_REQUIRED',reason:rights.reason,pass_not_claimed:true,...authority()});
  requireString(rights_record.consent_record_id,'CONSENT_RECORD_ID');
  if(!voiceScopeAllowsClone(rights_record.scope))throw new Error('BM03_CONSENT_SCOPE_DOES_NOT_AUTHORIZE_VOICE_CLONING');
  const source_audio_refs=Array.isArray(input.source_audio_refs)?input.source_audio_refs.filter(Boolean):[];
  if(source_audio_refs.length<1)throw new Error('BM03_SOURCE_AUDIO_REQUIRED');
  return Object.freeze({plan_id:id('BM03-PLAN'),benchmark_id,status:'READY_FOR_PHYSICAL_RUN',environment:'PREPROD',identity_type:'REAL_AUTHORIZED',consent_record_id:rights_record.consent_record_id,source_audio_refs:Object.freeze(source_audio_refs),required_outputs:Object.freeze(['VOICE_CLONE_SAMPLE','VOICE_CONVERSION_SAMPLE','TTS_SAMPLE','PROSODY_SAMPLE','MULTILINGUAL_SAMPLE','SIMILARITY_AND_SAFETY_METRICS','PROVENANCE_RECORD']),pass_not_claimed:true,...authority()});
}

export function evaluatePhysicalBenchmarkEvidence(plan,{artifacts=[],evidence_refs=[],metrics={},physical_execution=false}={}){
  if(!plan||!SUPPORTED.has(plan.benchmark_id))throw new Error('SUPPORTED_BENCHMARK_PLAN_REQUIRED');
  if(plan.status!=='READY_FOR_PHYSICAL_RUN')return Object.freeze({benchmark_id:plan.benchmark_id,state:'NOT_RUN',reason:'PLAN_NOT_READY',immutable_evidence:false});
  if(physical_execution!==true)return Object.freeze({benchmark_id:plan.benchmark_id,state:'NOT_RUN',reason:'PHYSICAL_EXECUTION_NOT_PROVEN',immutable_evidence:false});
  const refs=Array.isArray(evidence_refs)?evidence_refs.filter((x)=>typeof x==='string'&&x.trim()):[];
  const outs=Array.isArray(artifacts)?artifacts.filter((x)=>x&&typeof x==='object'&&x.sha256&&x.uri):[];
  const requiredCount=plan.benchmark_id==='BM-01'?4:7;
  const metricGreen=metrics?.quality_gate==='PASS'&&metrics?.rights_gate!=='FAIL'&&metrics?.provenance_gate==='PASS';
  if(outs.length<requiredCount||refs.length<2||!metricGreen)return Object.freeze({benchmark_id:plan.benchmark_id,state:'FAIL',reason:'EVIDENCE_OR_METRICS_INCOMPLETE',artifact_count:outs.length,evidence_ref_count:refs.length,immutable_evidence:false});
  return Object.freeze({benchmark_id:plan.benchmark_id,state:'PASS_WITH_EVIDENCE',artifact_count:outs.length,evidence_refs:Object.freeze(refs),artifact_hashes:Object.freeze(outs.map((x)=>x.sha256)),metrics,immutable_evidence:true,observed_at:new Date().toISOString()});
}
