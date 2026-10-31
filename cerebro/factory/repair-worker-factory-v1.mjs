#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT=path.resolve(HERE,'../..');
const DEFAULT_PROFILES=path.join(REPO_ROOT,'cerebro/registry/certified-repair-worker-profiles.v1.json');
const DEFAULT_ENGINES=path.join(REPO_ROOT,'cerebro/registry/engine-registry.v1.json');
const REQUIRED_CONTEXT=['company_id','engine_id','environment','version'];
const REQUIRED_GATES=[
  'VERIFIED_SOURCE_MAPPING',
  'SNAPSHOT_BOUND_BASE_SHA',
  'APPLY_CERTIFIED_TRANSFORM',
  'BUILD_GREEN',
  'TARGETED_TESTS_GREEN',
  'DIFF_LIMIT_GREEN',
  'OLD_VS_NEW_GREEN',
  'REGRESSION_GREEN',
  'REBUILD_GREEN',
  'ROLLBACK_GREEN',
  'INDEPENDENT_TRIBUNAL_APPROVED'
];
const HUMAN_REQUIRED=[
  'LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK',
  'POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'
];
const SAFE_PROFILE_ID=/^[A-Z0-9][A-Z0-9_-]{0,127}$/;

function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function json(value){return `${JSON.stringify(value,null,2)}\n`;}
function stable(value){return crypto.createHash('sha256').update(value).digest('hex');}
function plainObject(value,label){if(!value||typeof value!=='object'||Array.isArray(value))throw new Error(`${label} must be object`);return value;}
function nonEmpty(value,label){if(typeof value!=='string'||!value.trim())throw new Error(`${label} required`);return value.trim();}
function safeRepoPath(value,label){const p=nonEmpty(value,label);if(path.isAbsolute(p)||p.includes('..')||p.startsWith('.git/'))throw new Error(`${label} unsafe path`);return p;}
function exactUniqueSet(actual,expected){if(!Array.isArray(actual)||actual.length!==expected.length||new Set(actual).size!==actual.length)return false;const set=new Set(actual);return expected.every(x=>set.has(x));}

export function validateRepairWorkerRegistry(registry,{engineRegistry=readJson(DEFAULT_ENGINES),repoRoot=REPO_ROOT}={}){
  plainObject(registry,'registry');
  if(registry.state_type!=='CEREBRO_CERTIFIED_REPAIR_WORKER_PROFILES_V1')throw new Error('invalid state_type');
  if(registry.engine_id!=='FACT-001')throw new Error('registry engine_id must be FACT-001');
  if(registry.environment!=='PREPROD_CONTROL_PLANE')throw new Error('registry environment must be PREPROD_CONTROL_PLANE');
  for(const key of REQUIRED_CONTEXT)nonEmpty(String(registry[key]??''),`registry.${key}`);
  const policy=plainObject(registry.policy,'registry.policy');
  if(policy.new_engine_identity!==false||policy.shared_runtime!==true||policy.repo_write_max_concurrency!==1||policy.deterministic_first!==true)throw new Error('factory policy drift');
  if(policy.additional_cost_eur!==0||policy.paid_ai_required!==false||policy.prod_authorized!==false||policy.prod_write_authorized!==false||policy.trading_access!==false)throw new Error('unsafe factory authority');
  if(!exactUniqueSet(policy.human_required_reasons,HUMAN_REQUIRED))throw new Error('HUMAN_REQUIRED contract drift');

  const canonical=new Set(engineRegistry.engine_ids??[]);
  if(!canonical.has('FACT-001')||!canonical.has('AUTO-001')||!canonical.has('QA-001'))throw new Error('canonical engine registry missing repair factory dependencies');
  if(!Array.isArray(registry.profiles)||registry.profiles.length<1)throw new Error('at least one certified repair profile required');
  const seen=new Set();
  const normalized=[];
  for(const [index,profile] of registry.profiles.entries()){
    plainObject(profile,`profiles[${index}]`);
    const profileId=nonEmpty(profile.profile_id,`profiles[${index}].profile_id`);
    if(!SAFE_PROFILE_ID.test(profileId))throw new Error(`${profileId}: unsafe profile_id`);
    if(seen.has(profileId))throw new Error(`duplicate profile_id ${profileId}`);seen.add(profileId);
    for(const key of ['company_id','engine_id','owner_engine_id','target_engine_id','environment','version','status','transform_id'])nonEmpty(profile[key],`${profileId}.${key}`);
    if(profile.environment!=='PREPROD'||profile.status!=='CERTIFIED_EXISTING_REPAIR_PATH')throw new Error(`${profileId}: only certified PREPROD repair paths accepted`);
    for(const idKey of ['engine_id','owner_engine_id','target_engine_id'])if(!canonical.has(profile[idKey]))throw new Error(`${profileId}: noncanonical ${idKey} ${profile[idKey]}`);
    if(profile.engine_id!=='AUTO-001')throw new Error(`${profileId}: repair execution must remain owned by AUTO-001`);
    const fileBindings={
      planner_path:safeRepoPath(profile.planner_path,`${profileId}.planner_path`),
      transform_path:safeRepoPath(profile.transform_path,`${profileId}.transform_path`),
      validator_path:safeRepoPath(profile.validator_path,`${profileId}.validator_path`),
      tribunal_path:safeRepoPath(profile.tribunal_path,`${profileId}.tribunal_path`),
      workflow_path:safeRepoPath(profile.workflow_path,`${profileId}.workflow_path`)
    };
    for(const [key,rel] of Object.entries(fileBindings))if(!fs.existsSync(path.join(repoRoot,rel)))throw new Error(`${profileId}: missing ${key} ${rel}`);
    if(!fileBindings.transform_path.startsWith('cerebro/platform/patch-transforms/'))throw new Error(`${profileId}: transform must be certified patch transform`);
    if(!fileBindings.workflow_path.startsWith('.github/workflows/'))throw new Error(`${profileId}: workflow binding invalid`);
    if(!Array.isArray(profile.allowed_files)||profile.allowed_files.length<1)throw new Error(`${profileId}: allowed_files required`);
    const allowedFiles=profile.allowed_files.map((p,i)=>safeRepoPath(p,`${profileId}.allowed_files[${i}]`));
    if(new Set(allowedFiles).size!==allowedFiles.length)throw new Error(`${profileId}: duplicate allowed_files`);
    if(!Number.isSafeInteger(profile.max_files_changed)||profile.max_files_changed<1||profile.max_files_changed>allowedFiles.length)throw new Error(`${profileId}: max_files_changed invalid`);
    if(!Number.isSafeInteger(profile.max_line_delta)||profile.max_line_delta<1||profile.max_line_delta>500)throw new Error(`${profileId}: max_line_delta invalid`);
    if(profile.worker_parallelism!==1||profile.repo_write_concurrency!==1)throw new Error(`${profileId}: repository mutations must remain serial`);
    const requiredIdempotency=['company_id','profile_id','base_sha','transform_id','target'];
    if(!exactUniqueSet(profile.idempotency_scope,requiredIdempotency))throw new Error(`${profileId}: idempotency contract incomplete`);
    if(!exactUniqueSet(profile.required_gates,REQUIRED_GATES))throw new Error(`${profileId}: required gates incomplete`);
    if(profile.repair_execution_capability!=='EXISTING_GOVERNED_PREPROD_WORKFLOW'||profile.factory_may_dispatch!==false)throw new Error(`${profileId}: FACT-001 may describe but not dispatch repair execution`);
    for(const flag of ['auto_merge','promotion_authorized','prod_authorized','prod_write_authorized','customer_data','trading_access'])if(profile[flag]!==false)throw new Error(`${profileId}: unsafe ${flag}`);
    if(profile.additional_cost_eur!==0)throw new Error(`${profileId}: additional cost must be zero`);
    normalized.push({profile_id:profileId,company_id:profile.company_id,engine_id:profile.engine_id,owner_engine_id:profile.owner_engine_id,target_engine_id:profile.target_engine_id,environment:profile.environment,version:profile.version,transform_id:profile.transform_id,...fileBindings,allowed_files:allowedFiles,max_files_changed:profile.max_files_changed,max_line_delta:profile.max_line_delta,required_gates:[...profile.required_gates]});
  }
  return {valid:true,profile_count:normalized.length,profiles:normalized,new_engine_identity:false,repo_write_max_concurrency:1,additional_cost_eur:0,prod_authorized:false,trading_access:false};
}

export function buildRepairWorkerBundle(registry,{engineRegistry=readJson(DEFAULT_ENGINES),repoRoot=REPO_ROOT}={}){
  const validation=validateRepairWorkerRegistry(registry,{engineRegistry,repoRoot});
  const workers=validation.profiles.map(profile=>({
    schema_version:'1.0.0',
    state_type:'CEREBRO_CERTIFIED_REPAIR_WORKER_PROFILE',
    company_id:profile.company_id,
    engine_id:profile.engine_id,
    environment:profile.environment,
    version:profile.version,
    profile_id:profile.profile_id,
    owner_engine_id:profile.owner_engine_id,
    target_engine_id:profile.target_engine_id,
    transform_id:profile.transform_id,
    execution_binding:{workflow_path:profile.workflow_path,planner_path:profile.planner_path,transform_path:profile.transform_path,validator_path:profile.validator_path,tribunal_path:profile.tribunal_path},
    mutation_envelope:{allowed_files:profile.allowed_files,max_files_changed:profile.max_files_changed,max_line_delta:profile.max_line_delta,repo_write_concurrency:1},
    required_gates:profile.required_gates,
    authority:{factory_may_dispatch:false,auto_merge:false,promotion_authorized:false,prod_authorized:false,prod_write_authorized:false,trading_access:false},
    safety:{customer_data:false,paid_ai:false,additional_cost_eur:0},
    shared_runtime:true,
    new_engine_identity:false
  }));
  const canonical=workers.map(w=>JSON.stringify(w)).join('\n');
  return {schema_version:'1.0.0',state_type:'CEREBRO_REPAIR_WORKER_FACTORY_BUNDLE_V1',company_id:'GLOBAL',engine_id:'FACT-001',environment:'PREPROD_CONTROL_PLANE',version:'1.0.0',worker_count:workers.length,workers,bundle_sha256:stable(canonical),factory_may_dispatch:false,new_engine_identity:false,repo_write_max_concurrency:1,additional_cost_eur:0,prod_authorized:false,prod_write_authorized:false,trading_access:false};
}

export function writeRepairWorkerBundle(registry,outDir,options={}){
  const bundle=buildRepairWorkerBundle(registry,options);fs.mkdirSync(outDir,{recursive:true});
  const profileDir=path.join(outDir,'profiles');fs.mkdirSync(profileDir,{recursive:true});
  for(const worker of bundle.workers)fs.writeFileSync(path.join(profileDir,`${worker.profile_id}.json`),json(worker),'utf8');
  fs.writeFileSync(path.join(outDir,'repair-worker-bundle.json'),json(bundle),'utf8');return bundle;
}

function parseArgs(argv){const args={command:argv[2],profiles:DEFAULT_PROFILES,engines:DEFAULT_ENGINES,out:'./.cerebro-repair-workers'};for(let i=3;i<argv.length;i+=1){if(argv[i]==='--profiles')args.profiles=argv[++i];else if(argv[i]==='--engines')args.engines=argv[++i];else if(argv[i]==='--out')args.out=argv[++i];else throw new Error(`unknown argument ${argv[i]}`);}return args;}

const self=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(self){const args=parseArgs(process.argv);const registry=readJson(args.profiles);const engineRegistry=readJson(args.engines);if(args.command==='validate')console.log(JSON.stringify(validateRepairWorkerRegistry(registry,{engineRegistry,repoRoot:REPO_ROOT})));else if(args.command==='generate'){const bundle=writeRepairWorkerBundle(registry,path.resolve(args.out),{engineRegistry,repoRoot:REPO_ROOT});console.log(JSON.stringify({generated:bundle.worker_count,bundle_sha256:bundle.bundle_sha256,out:path.resolve(args.out),additional_cost_eur:0,prod_authorized:false}));}else throw new Error('Usage: node repair-worker-factory-v1.mjs <validate|generate> [--profiles file] [--engines file] [--out dir]');}
