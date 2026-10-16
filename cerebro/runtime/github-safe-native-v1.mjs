import crypto from 'node:crypto';

export const GH_SAFE_NATIVE_VERSION='1.0.0';
export const GH_SAFE_NATIVE_ROUTE='capability://GH-SAFE-NATIVE/v1/execute';
export const GH_SAFE_OPERATIONS=Object.freeze(['INVENTORY','BRANCH_CREATE','COMMIT_FILE','PR_CREATE','CI_READ','COMPARE','MERGE','ROLLBACK_REVERT']);
const WRITE_OPS=new Set(['BRANCH_CREATE','COMMIT_FILE','PR_CREATE','MERGE','ROLLBACK_REVERT']);

function text(v,label){if(typeof v!=='string'||!v.trim()) throw new Error(`${label} required`);return v.trim();}
function hash(v){return crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');}
function secretLike(v){return typeof v==='string'&&/(gh[pousr]_[A-Za-z0-9_]{20,}|-----BEGIN .*PRIVATE KEY-----|api[_-]?key\s*[=:])/i.test(v);}
function scanSecrets(value){if(secretLike(value)) return true;if(Array.isArray(value)) return value.some(scanSecrets);if(value&&typeof value==='object') return Object.values(value).some(scanSecrets);return false;}

export function authorizeGitHubSafeAction(raw={}){
  const company_id=text(raw.company_id,'company_id');
  const engine_id=raw.engine_id??'FACT-001';
  const environment=raw.environment??'PREPROD';
  const version=raw.version??GH_SAFE_NATIVE_VERSION;
  const operation=text(raw.operation,'operation');
  if(!GH_SAFE_OPERATIONS.includes(operation)) throw new Error('UNSUPPORTED_GITHUB_OPERATION');
  if(environment!=='PREPROD') throw new Error('PREPROD_ONLY');
  if(scanSecrets(raw)) throw new Error('SECRET_MATERIAL_FORBIDDEN');
  if(raw.force===true||raw.bypass_checks===true||raw.bypass_review===true) throw new Error('BYPASS_FORBIDDEN');

  const repo=text(raw.repo,'repo');
  const target_branch=raw.target_branch??null;
  const isWrite=WRITE_OPS.has(operation);
  const reasons=[];
  let authorized=true;

  if(isWrite&&raw.rollback_ready!==true){authorized=false;reasons.push('ROLLBACK_REQUIRED');}
  if(operation==='COMMIT_FILE'&&target_branch==='main'){authorized=false;reasons.push('DIRECT_MAIN_COMMIT_DENIED');}
  if(operation==='MERGE'){
    if(raw.pr_number==null){authorized=false;reasons.push('PR_REQUIRED');}
    if(raw.checks_green!==true){authorized=false;reasons.push('CHECKS_GREEN_REQUIRED');}
    if(!raw.expected_head_sha){authorized=false;reasons.push('EXPECTED_HEAD_SHA_REQUIRED');}
    if(target_branch!=='main'){authorized=false;reasons.push('MERGE_TARGET_MUST_BE_MAIN');}
  }
  if(operation==='ROLLBACK_REVERT'&&!raw.revert_of_sha){authorized=false;reasons.push('REVERT_SHA_REQUIRED');}
  if(raw.prod_deploy===true||raw.prod_mutation===true){authorized=false;reasons.push('PROD_MUTATION_OUT_OF_SCOPE');}

  const action_id=`ghsafe:${hash({company_id,repo,operation,target_branch,expected_head_sha:raw.expected_head_sha??null,payload:raw.payload??null}).slice(0,28)}`;
  return Object.freeze({schema_version:'1.0.0',state_type:'CEREBRO_GH_SAFE_NATIVE_AUTHORIZATION',capability_id:'GH-SAFE-NATIVE',company_id,engine_id,environment,version,repo,operation,target_branch,action_id,idempotency_key:hash({action_id,version}),authorized,reasons:Object.freeze(reasons),requires_write:isWrite,checks_green:raw.checks_green===true,expected_head_sha:raw.expected_head_sha??null,rollback_ready:raw.rollback_ready===true,evidence_required:true,prod_deploy_authorized:false,prod_mutation_authorized:false,force_authorized:false,bypass_authorized:false,additional_cost_eur:0});
}

export async function executeGitHubSafeAction(raw={},adapter={}){
  const auth=authorizeGitHubSafeAction(raw);
  if(!auth.authorized) return Object.freeze({...auth,status:'DENIED',executed:false});
  const fn=adapter[auth.operation];
  if(typeof fn!=='function') return Object.freeze({...auth,status:'ROUTE_READY',executed:false,next_gate:'AUTHORIZED_GITHUB_CONNECTOR_ADAPTER'});
  const result=await fn(Object.freeze({...raw,authorization:auth}));
  return Object.freeze({...auth,status:'EXECUTED_PREPROD_CONTROL_PLANE',executed:true,result,receipt_hash:hash({auth,result})});
}
