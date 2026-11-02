import crypto from 'node:crypto';

export const GH_SAFE_NATIVE_VERSION='1.1.0';
export const GH_SAFE_NATIVE_ROUTE='capability://GH-SAFE-NATIVE/v1/execute';
export const GH_SAFE_OPERATIONS=Object.freeze(['INVENTORY','STATUS','DIFF','BRANCH_CREATE','STAGE','UNSTAGE','COMMIT_FILE','COMMIT','PUSH','PR_CREATE','CI_READ','REVIEW_READ','COMPARE','MERGE','ROLLBACK_REVERT','REVERT']);
const WRITE_OPS=new Set(['BRANCH_CREATE','STAGE','UNSTAGE','COMMIT_FILE','COMMIT','PUSH','PR_CREATE','MERGE','ROLLBACK_REVERT','REVERT']);
const PROTECTED_DIRECT_WRITE_BRANCHES=new Set(['main','master','emergency-pages','cerebro/jarvis-interface-v1-20261102']);
const WORK_BRANCH_RE=/^(?:cerebro|qa|feat|fix|test)\/[A-Za-z0-9._\/-]{1,180}$/;

function text(v,label){if(typeof v!=='string'||!v.trim()) throw new Error(`${label} required`);return v.trim();}
function hash(v){return crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');}
function secretLike(v){return typeof v==='string'&&/(gh[pousr]_[A-Za-z0-9_]{20,}|-----BEGIN .*PRIVATE KEY-----|api[_-]?key\s*[=:])/i.test(v);}
function scanSecrets(value){if(secretLike(value)) return true;if(Array.isArray(value)) return value.some(scanSecrets);if(value&&typeof value==='object') return Object.values(value).some(scanSecrets);return false;}
function safePath(v){const p=text(v,'path').replace(/\\/g,'/').replace(/^\.\//,'');if(p.startsWith('/')||p.split('/').includes('..')||p.includes('\0'))throw new Error('UNSAFE_REPOSITORY_PATH');return p;}
function normalizePaths(raw){if(raw==null)return Object.freeze([]);if(!Array.isArray(raw)||raw.length>200)throw new Error('PATHS_ARRAY_REQUIRED');return Object.freeze([...new Set(raw.map(safePath))]);}

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
  const target_branch=raw.target_branch?text(raw.target_branch,'target_branch'):null;
  const source_branch=raw.source_branch?text(raw.source_branch,'source_branch'):null;
  const paths=normalizePaths(raw.paths??(raw.path?[raw.path]:[]));
  const isWrite=WRITE_OPS.has(operation);
  const reasons=[];
  let authorized=true;

  if(isWrite&&raw.rollback_ready!==true){authorized=false;reasons.push('ROLLBACK_REQUIRED');}
  if(isWrite&&operation!=='MERGE'&&target_branch&&PROTECTED_DIRECT_WRITE_BRANCHES.has(target_branch)){authorized=false;reasons.push('PROTECTED_BRANCH_DIRECT_WRITE_DENIED');}
  if(isWrite&&operation!=='MERGE'&&target_branch&&!WORK_BRANCH_RE.test(target_branch)){authorized=false;reasons.push('WORK_BRANCH_PATTERN_REQUIRED');}
  if(['COMMIT_FILE','COMMIT','PUSH','REVERT','ROLLBACK_REVERT'].includes(operation)&&!raw.expected_head_sha){authorized=false;reasons.push('EXPECTED_HEAD_SHA_REQUIRED');}
  if(['STAGE','UNSTAGE','COMMIT_FILE','COMMIT'].includes(operation)&&paths.length===0){authorized=false;reasons.push('PATHS_REQUIRED');}
  if(paths.some(p=>p==='.git'||p.startsWith('.git/'))){authorized=false;reasons.push('GIT_INTERNAL_PATH_DENIED');}
  if(paths.some(p=>p.startsWith('.github/workflows/'))&&raw.workflow_write_authorized!==true){authorized=false;reasons.push('WORKFLOW_WRITE_REQUIRES_SEPARATE_POLICY');}
  if(operation==='PR_CREATE'&&(!source_branch||!target_branch)){authorized=false;reasons.push('PR_BRANCHES_REQUIRED');}
  if(operation==='MERGE'){
    if(raw.pr_number==null){authorized=false;reasons.push('PR_REQUIRED');}
    if(raw.checks_green!==true){authorized=false;reasons.push('CHECKS_GREEN_REQUIRED');}
    if(!raw.expected_head_sha){authorized=false;reasons.push('EXPECTED_HEAD_SHA_REQUIRED');}
    if(raw.review_gate_green!==true){authorized=false;reasons.push('REVIEW_GATE_REQUIRED');}
    if(raw.protected_merge_policy_grant!==true){authorized=false;reasons.push('PROTECTED_MERGE_POLICY_GRANT_REQUIRED');}
  }
  if(['ROLLBACK_REVERT','REVERT'].includes(operation)&&!raw.revert_of_sha){authorized=false;reasons.push('REVERT_SHA_REQUIRED');}
  if(raw.prod_deploy===true||raw.prod_mutation===true){authorized=false;reasons.push('PROD_MUTATION_OUT_OF_SCOPE');}

  const action_id=`ghsafe:${hash({company_id,repo,operation,target_branch,source_branch,expected_head_sha:raw.expected_head_sha??null,paths,payload:raw.payload??null}).slice(0,28)}`;
  return Object.freeze({schema_version:'1.1.0',state_type:'CEREBRO_GH_SAFE_NATIVE_AUTHORIZATION',capability_id:'GH-SAFE-NATIVE',company_id,engine_id,environment,version,repo,operation,target_branch,source_branch,paths,action_id,idempotency_key:hash({action_id,version}),authorized,reasons:Object.freeze(reasons),requires_write:isWrite,checks_green:raw.checks_green===true,review_gate_green:raw.review_gate_green===true,expected_head_sha:raw.expected_head_sha??null,rollback_ready:raw.rollback_ready===true,evidence_required:true,prod_deploy_authorized:false,prod_mutation_authorized:false,force_authorized:false,bypass_authorized:false,additional_cost_eur:0});
}

export async function executeGitHubSafeAction(raw={},adapter={}){
  const auth=authorizeGitHubSafeAction(raw);
  if(!auth.authorized) return Object.freeze({...auth,status:'DENIED',executed:false});
  const fn=adapter[auth.operation];
  if(typeof fn!=='function') return Object.freeze({...auth,status:'ROUTE_READY',executed:false,next_gate:'AUTHORIZED_GITHUB_CONNECTOR_ADAPTER'});
  const result=await fn(Object.freeze({...raw,authorization:auth}));
  return Object.freeze({...auth,status:'EXECUTED_PREPROD_CONTROL_PLANE',executed:true,result,receipt_hash:hash({auth,result})});
}

export const GH_SAFE_NATIVE_CONTRACT=Object.freeze({
  version:GH_SAFE_NATIVE_VERSION,environment:'PREPROD',operations:GH_SAFE_OPERATIONS,protected_direct_write_branches:[...PROTECTED_DIRECT_WRITE_BRANCHES],work_branch_pattern:String(WORK_BRANCH_RE),
  status_diff_stage_unstage:true,commit_push:true,pr_checks_review:true,revert:true,merge_policy:true,secrets_in_payload:false,force:false,bypass:false,prod_mutation:false,additional_cost_eur:0
});
