const RIGHTS=new Set(['FULLTEXT_ALLOWED','REFERENCE_ONLY','CONDITIONAL','BLOCKED','UNKNOWN']);

function reqString(value,label,{max=1000}={}){
  if(typeof value!=='string'||!value.trim()) throw new Error(`${label} required`);
  const out=value.trim();
  if(out.length>max) throw new Error(`${label} too long`);
  return out;
}

export function evaluateSourceRights(source){
  if(!source||typeof source!=='object'||Array.isArray(source)) throw new Error('source object required');
  const source_id=reqString(source.source_id,'source_id',{max:240});
  const rights_status=reqString(source.rights_status,'rights_status',{max:40}).toUpperCase();
  if(!RIGHTS.has(rights_status)) throw new Error(`invalid rights_status:${rights_status}`);
  const provenance_ref=reqString(source.provenance_ref,'provenance_ref');
  const license=source.license==null?null:reqString(source.license,'license',{max:240});

  const result={
    schema_version:'1.0.0',
    source_id,
    rights_status,
    provenance_ref,
    license,
    metadata_reference_allowed:false,
    fulltext_ingestion_allowed:false,
    training_use_allowed:false,
    human_review_required:false,
    decision:'HOLD'
  };

  if(rights_status==='FULLTEXT_ALLOWED'){
    result.metadata_reference_allowed=true;
    result.fulltext_ingestion_allowed=true;
    result.training_use_allowed=source.training_use_explicitly_allowed===true;
    result.decision=result.training_use_allowed?'ALLOW_WITH_SCOPE':'ALLOW_FULLTEXT_NOT_TRAINING';
  }else if(rights_status==='REFERENCE_ONLY'){
    result.metadata_reference_allowed=true;
    result.decision='REFERENCE_ONLY';
  }else if(rights_status==='CONDITIONAL'){
    result.metadata_reference_allowed=true;
    result.human_review_required=true;
    result.decision='HOLD_CONDITIONS_UNRESOLVED';
  }else if(rights_status==='BLOCKED'){
    result.decision='BLOCK';
  }else{
    result.human_review_required=true;
    result.decision='HOLD_UNKNOWN_RIGHTS';
  }

  return Object.freeze(result);
}

export function canEnterKnowledgeFoundry(rights){
  const result=evaluateSourceRights(rights);
  return Object.freeze({
    source_id:result.source_id,
    discovery_reference:result.metadata_reference_allowed,
    extract_fulltext:result.fulltext_ingestion_allowed,
    training_use:result.training_use_allowed,
    hold:result.decision.startsWith('HOLD')||result.decision==='BLOCK',
    decision:result.decision,
    prod_authorized:false,
    additional_cost_eur:0
  });
}
