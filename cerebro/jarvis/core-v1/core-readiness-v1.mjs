import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,'../../..');
const exists=p=>fs.existsSync(path.resolve(ROOT,p));

const COMPONENTS=Object.freeze([
 {id:'IDENTITY',state:'CANDIDATE_GREEN',evidence:['cerebro/jarvis/core-v1/core-v1.mjs','cerebro/jarvis/boost-001/JARVIS_CONSTITUTION_V1.md']},
 {id:'CONSTITUTION',state:'EXISTING_DEFINED',evidence:['cerebro/jarvis/boost-001/JARVIS_CONSTITUTION_V1.md']},
 {id:'AUTHORITY',state:'CANDIDATE_GREEN',evidence:['cerebro/jarvis/core-v1/core-v1.mjs','cerebro/governance/identity-credential-broker.mjs']},
 {id:'CONTEXT_COMPILER',state:'CANDIDATE_GREEN',evidence:['cerebro/jarvis/core-v1/core-v1.mjs']},
 {id:'WORLD_MEMORY_ACCESS',state:'PARCIAL',evidence:['cerebro/runtime/jarvis-project-hub-v1.mjs','cerebro/console/gateway.mjs'],gap:'SOVEREIGN_LONG_TERM_MEMORY_AND_WORLD_MODEL_NOT_YET_BOUND'},
 {id:'ORCHESTRATOR',state:'EXISTING_PARTIAL',evidence:['cerebro/runtime/mission-recursive-decomposer-v1.mjs','cerebro/runtime/jarvis-mission-dag-v2.mjs','cerebro/runtime/job001-ledger-control-plane-v1.mjs'],gap:'JARVIS_RUNTIME_ORCHESTRATOR_BINDING_NOT_YET_ACCEPTED'},
 {id:'CAPABILITY_FABRIC',state:'CANDIDATE_GREEN_REGISTRY_AUDIT_REQUIRED',evidence:['cerebro/registry/engine-registry.seed.json','cerebro/jarvis/integration-v1/engine-registry-adapter-v1.mjs'],gap:'REGISTERED_ENGINES_MUST_NOT_BE_TREATED_AS_OPERATIONAL_WITHOUT_EVIDENCE'},
 {id:'IFC_SECURITY',state:'CANDIDATE_GREEN',evidence:['cerebro/jarvis/core-v1/core-v1.mjs','cerebro/governance/identity-credential-broker.mjs']},
 {id:'VERIFIER_EVALUATION',state:'PARCIAL',evidence:['cerebro/jarvis/core-v1/core-v1.mjs','cerebro/registry/engine-registry.seed.json'],gap:'EVAL_CONTROL_PLANE_AND_INDEPENDENT_VERIFIER_BINDING_NOT_YET_ACCEPTED'},
 {id:'EVENT_EXECUTION_JOURNAL',state:'CANDIDATE_GREEN_EXISTING_JOB_PARTIAL',evidence:['cerebro/jarvis/core-v1/core-v1.mjs','cerebro/runtime/job001-ledger-control-plane-v1.mjs'],gap:'JOURNAL_TO_DURABLE_JOB_EVENT_RUNTIME_BINDING_NOT_YET_ACCEPTED'}
]);

export function coreReadiness(){
 const components=COMPONENTS.map(c=>({...c,evidence_present:c.evidence.every(exists)}));
 const missingEvidence=components.filter(c=>!c.evidence_present);
 const partial=components.filter(c=>/PARCIAL|PARTIAL|AUDIT_REQUIRED/.test(c.state));
 const status=missingEvidence.length?'BLOCKED_MISSING_EVIDENCE':partial.length?'PARCIAL':'GREEN';
 return Object.freeze({schema_version:'1.0',mission_id:'MISSION-JARVIS-001',environment:'PREPROD',minimal_core_status:status,component_count:components.length,green_or_defined_count:components.length-partial.length,partial_count:partial.length,missing_evidence_count:missingEvidence.length,components,prod_authorized:false,prod_write_authorized:false,trading_access:false,rule:'NO_COMPONENT_GREEN_WITHOUT_EVIDENCE'});
}

if(import.meta.url===`file://${process.argv[1]}`)console.log(JSON.stringify(coreReadiness(),null,2));
