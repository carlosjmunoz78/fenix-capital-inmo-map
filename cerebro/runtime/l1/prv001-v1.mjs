import crypto from 'node:crypto';
import { stableIdempotencyKey, validateCanonicalContext } from '../continuous-improvement-contract.mjs';

const ENGINE='PRV-001';
const PREPROD='PREPROD';
const SOURCE_TYPES=new Set(['DOCUMENT','WEB','SYSTEM','HUMAN','DATASET','API','EVENT','OTHER']);
const SECRETISH=/([?&](?:access_token|token|api[_-]?key|password|secret)=)|:\/\/[^/@:]+:[^/@]+@/i;
const stable=v=>Array.isArray(v)?v.map(stable):(v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v);
const digest=v=>crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
const req=(v,l,m=1000)=>{if(typeof v!=='string'||!v.trim())throw new Error(`${l} required`);const s=v.trim();if(s.length>m)throw new Error(`${l} too long`);return s;};
const conf=v=>{const n=Number(v);if(!Number.isFinite(n)||n<0||n>1)throw new Error('confidence must be 0..1');return Math.round(n*1000)/1000;};
function ctx(raw){const c={company_id:req(raw?.company_id,'company_id',120),engine_id:req(raw?.engine_id,'engine_id',80),environment:req(raw?.environment,'environment',40),version:req(raw?.version,'version',80)};const r=validateCanonicalContext(c,{allowProd:false});if(!r.ok)throw new Error(`invalid context:${r.errors.join(',')}`);if(c.environment!==PREPROD)throw new Error('PRV001_PREPROD_ONLY');if(c.engine_id!==ENGINE)throw new Error('PRV001_OWNER_MISMATCH');return Object.freeze(c);}
function cleanUri(v){const s=req(v,'source_uri',1200);if(SECRETISH.test(s))throw new Error('SECRET_IN_SOURCE_URI_DENIED');return s;}
function iso(v){const s=req(v,'observed_at',80);const t=Date.parse(s);if(!Number.isFinite(t))throw new Error('observed_at invalid');return new Date(t).toISOString();}
const safe=x=>Object.freeze({...x,engine_id:ENGINE,prod_authorized:false,prod_write_authorized:false,supabase_write_authorized:false,trading_access:false,additional_cost_eur:0});

export function buildProvenanceRecord(input={}){
  const context=ctx(input.context);
  const source_type=req(input.source_type,'source_type',40).toUpperCase();
  if(!SOURCE_TYPES.has(source_type))throw new Error('source_type denied');
  const source_uri=cleanUri(input.source_uri);
  const observed_at=iso(input.observed_at);
  const validated_by=req(input.validated_by,'validated_by',200);
  const confidence=conf(input.confidence);
  const evidence_digest=req(input.evidence_digest,'evidence_digest',160).toLowerCase();
  if(!/^[a-f0-9]{64}$/.test(evidence_digest))throw new Error('evidence_digest must be sha256 hex');
  const evidence_hash=digest({context,source_type,source_uri,observed_at,validated_by,confidence,evidence_digest});
  const provenance_id=`prov_${stableIdempotencyKey({context,source_type,source_uri,observed_at,validated_by,evidence_hash}).slice(0,28)}`;
  const human_required=confidence<0.5?'LOW_CONFIDENCE':null;
  return safe({schema_version:'1.0.0',state_type:'CEREBRO_PROVENANCE_RECORD',status:human_required?'HUMAN_REQUIRED':'RECORDED_PREPROD',human_required,context,provenance_id,source_type,source_uri,observed_at,validated_by,confidence,evidence_digest,evidence_hash});
}

export function validateProvenanceRecord(record={}){
  const context=ctx(record.context);
  const expected=digest({context,source_type:record.source_type,source_uri:record.source_uri,observed_at:record.observed_at,validated_by:record.validated_by,confidence:record.confidence,evidence_digest:record.evidence_digest});
  const ok=record.state_type==='CEREBRO_PROVENANCE_RECORD'&&record.engine_id===ENGINE&&record.evidence_hash===expected&&record.prod_write_authorized===false&&record.trading_access===false;
  return safe({schema_version:'1.0.0',state_type:'CEREBRO_PROVENANCE_VALIDATION',status:ok?'GREEN':'MISMATCH',context,valid:ok,expected_evidence_hash:expected,observed_evidence_hash:record.evidence_hash??null});
}

export function attachProvenanceToKnowledge(input={}){
  const context=ctx(input.context);
  const knowledge_item_id=req(input.knowledge_item_id,'knowledge_item_id',220);
  const knowledge_hash=req(input.knowledge_hash,'knowledge_hash',160).toLowerCase();
  if(!/^[a-f0-9]{64}$/.test(knowledge_hash))throw new Error('knowledge_hash must be sha256 hex');
  const p=input.provenance;
  if(!p||p.state_type!=='CEREBRO_PROVENANCE_RECORD')throw new Error('PROVENANCE_REQUIRED');
  if(p.context?.company_id!==context.company_id)throw new Error('CROSS_COMPANY_PROVENANCE_DENIED');
  const validation=validateProvenanceRecord(p);
  if(!validation.valid)throw new Error('INVALID_PROVENANCE');
  const envelope_id=`knwprov_${stableIdempotencyKey({context,knowledge_item_id,knowledge_hash,provenance_id:p.provenance_id}).slice(0,28)}`;
  return safe({schema_version:'1.0.0',state_type:'CEREBRO_KNOWLEDGE_PROVENANCE_ENVELOPE',status:p.human_required?'HUMAN_REQUIRED':'READY_PREPROD',human_required:p.human_required,context,envelope_id,knowledge_item_id,knowledge_hash,provenance_id:p.provenance_id,evidence_hash:p.evidence_hash,provenance_required:true,knowledge_write_authorized:false,external_side_effect_executed:false});
}

export const PRV_001_CONTRACT=Object.freeze({schema_version:'1.0.0',engine_id:ENGINE,layer:'L1',environment:PREPROD,version:'1.0.0',company_scope:'GLOBAL_OR_SCOPED',required_fields:Object.freeze(['provenance_id','source_type','source_uri','observed_at','validated_by','confidence','evidence_hash']),knowledge_ingress_requires_provenance:true,source_types:Object.freeze([...SOURCE_TYPES]),low_confidence_human_required:true,prod_authorized:false,prod_write_authorized:false,supabase_write_authorized:false,trading_access:false,additional_cost_target_eur:0});
