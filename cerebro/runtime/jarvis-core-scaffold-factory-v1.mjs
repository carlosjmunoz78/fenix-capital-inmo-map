import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT=path.resolve('cerebro/jarvis/core');
const ENV='PREPROD';
const VERSION='v1';
const CORES=[
 ['identity','JAR-CORE-IDENTITY','Persistent JARVIS identity independent of model, process, device and provider.'],
 ['constitution','JAR-CORE-CONSTITUTION','Immutable constitutional rules, OWNER_ROOT authority and hard/soft block semantics.'],
 ['authority','JAR-CORE-AUTHORITY','Scoped delegated authority, expiry, revocation, money/risk limits and transitive delegation.'],
 ['context-compiler','JAR-CORE-CONTEXT','Minimum-sufficient context compilation from memory, world state, policy and mission.'],
 ['world-memory-access','JAR-CORE-WORLD-MEMORY','Sovereign access contract for persistent memory and world-model state.'],
 ['orchestrator','JAR-CORE-ORCHESTRATOR','Mission-to-DAG orchestration with dependencies, checkpoints, cancellation and HUMAN_REQUIRED.'],
 ['capability-fabric','JAR-CORE-CAPABILITY-FABRIC','Shared ZEUS capability discovery/routing contract across engines, tools, models and devices.'],
 ['ifc-security','JAR-CORE-IFC-SECURITY','Deterministic information-flow labels, tool firewall, sandboxing and zero-trust enforcement.'],
 ['verifier-evaluation','JAR-CORE-VERIFIER','Independent verifier/evaluation plane; actor cannot self-approve critical changes.'],
 ['event-execution-journal','JAR-CORE-JOURNAL','Durable command/event/side-effect journal for resume, replay, idempotency and evidence.']
];
function sha(v){return crypto.createHash('sha256').update(String(v)).digest('hex');}
function writeIfAbsent(file,content){if(fs.existsSync(file))return false;fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,content,'utf8');return true;}
function manifest(slug,id,objective){return {schema_version:'1.0',capability_id:id,slug,company_id:'zeus',engine_id:'JARVIS',environment:ENV,version:VERSION,status:'DEFINED_SCAFFOLD',objective,owner_root:'Carlos',model_dependency:'NONE_REQUIRED',deepseek_role:'TEMPORARY_ACCELERATOR_ONLY',prod_authorized:false,prod_write_authorized:false,trading_access:false,required_gates:['CONTRACT','TEST','SECURITY','EVALUATION','VERIFIER','TRIBUNAL','PREPROD','CANARY'],human_required_classes:['LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST']};}
function contract(m){return `# ${m.capability_id} · ${m.slug}\n\n**Status:** DEFINED_SCAFFOLD\n**Environment:** PREPROD\n**Version:** ${m.version}\n\n## Objective\n${m.objective}\n\n## Invariants\n- OWNER_ROOT authority cannot be reduced by this capability.\n- No silent PROD write.\n- No Trading access.\n- No secret plaintext.\n- No cross-company data leakage.\n- No critical side effect without authority + verifier evidence.\n- Model/provider remains replaceable.\n\n## Required interfaces\n- input contract: TODO_BY_CAPABILITY_IMPLEMENTATION\n- output contract: TODO_BY_CAPABILITY_IMPLEMENTATION\n- policy hooks: required\n- observability hooks: required\n- rollback/rebuild hooks: required\n\n## Promotion\nDEFINED_SCAFFOLD is not OPERATIVE. Promotion requires the gates listed in manifest.v1.json.\n`}
function acceptance(m){return {schema_version:'1.0',capability_id:m.capability_id,status:'NOT_RUN',checks:[{id:'contract_present',required:true},{id:'implementation_present',required:true},{id:'tests_pass',required:true},{id:'security_pass',required:true},{id:'verifier_pass',required:true},{id:'rollback_proved',required:true},{id:'rebuild_impact_known',required:true}],no_evidence_no_done:true};}
export function buildCoreScaffolds(){let created=0;const items=[];for(const [slug,id,objective] of CORES){const dir=path.join(ROOT,slug);const m=manifest(slug,id,objective);const files=[[path.join(dir,'manifest.v1.json'),JSON.stringify(m,null,2)+'\n'],[path.join(dir,'contract.v1.md'),contract(m)],[path.join(dir,'acceptance.v1.json'),JSON.stringify(acceptance(m),null,2)+'\n']];let local=0;for(const [f,c] of files){if(writeIfAbsent(f,c)){created++;local++;}}items.push({slug,capability_id:id,created_files:local,manifest_sha256:sha(JSON.stringify(m))});}return{schema_version:'1.0',environment:ENV,version:VERSION,created_files:created,total_capabilities:items.length,items,prod_write:false,trading:false};}
if(import.meta.url===`file://${process.argv[1]}`){const r=buildCoreScaffolds();console.log(JSON.stringify(r));}
