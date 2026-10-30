import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const CANDIDATES=Object.freeze([
 {id:'IDENTITY_IAM',program:'P01/P04',terms:['identity','credential','iam'],preferred:['cerebro/governance/identity-credential-broker.mjs','cerebro/registry/identity-access-registry.v0.json']},
 {id:'GATEWAY_CONSOLE',program:'P01/P17',terms:['gateway','console'],preferred:['cerebro/console/gateway.mjs','cerebro/console/jarvis-project-hub-binding-v1.mjs']},
 {id:'PROJECT_HUB',program:'P15/P17',terms:['jarvis-project-hub','project-hub'],preferred:['cerebro/runtime/jarvis-project-hub-v1.mjs','cerebro/console/jarvis-project-hub-binding-v1.mjs']},
 {id:'MODEL_ROUTER',program:'P03',terms:['execution-model-router','model-router','route-001'],preferred:['cerebro/router/execution-model-router.mjs']},
 {id:'JOB_CONTROL_PLANE',program:'P05/P06/P08',terms:['job001','control-plane'],preferred:['cerebro/runtime/job001-ledger-control-plane-v1.mjs']},
 {id:'MISSION_ORCHESTRATOR',program:'P01/P06',terms:['mission-recursive-decomposer','mission-derived-useful-work'],preferred:['cerebro/runtime/mission-recursive-decomposer-v1.mjs','cerebro/runtime/mission-derived-useful-work-v1.mjs']},
 {id:'DEEPSEEK_PROVIDER',program:'P03/P12',terms:['deepseek-provider','deepseek-budget','deepseek-cost'],preferred:['cerebro/runtime/deepseek-provider-v0.mjs','cerebro/runtime/deepseek-budget-guard-v0.mjs','cerebro/runtime/deepseek-cost-v0.mjs']},
 {id:'CONSTITUTION',program:'P01/P04',terms:['jarvis_constitution','constitution'],preferred:['cerebro/jarvis/boost-001/JARVIS_CONSTITUTION_V1.md']},
 {id:'EVALUATION_TRIBUNAL',program:'P07',terms:['eval','tribunal','judge','evaluation'],preferred:[]},
 {id:'BACKUP_REBUILD',program:'P16',terms:['backup','restore','rebuild','rollback'],preferred:[]},
 {id:'OBSERVABILITY',program:'P07/P11',terms:['observability','metric','health','audit'],preferred:[]},
 {id:'FACTORY',program:'P03/P13',terms:['factory','skill-factory','capability-factory'],preferred:[]},
 {id:'VOICE',program:'P10',terms:['voice','stt','tts'],preferred:[]},
 {id:'BROWSER_DEVICE',program:'P05/P17',terms:['browser','device','worker'],preferred:[]}
]);

function files(){return execFileSync('git',['ls-files'],{encoding:'utf8'}).split(/\r?\n/).filter(Boolean)}
function score(file,item){const low=file.toLowerCase();let s=0;for(const p of item.preferred)if(file===p)s+=100;for(const t of item.terms)if(low.includes(t))s+=10;if(file.startsWith('cerebro/runtime/'))s+=3;if(file.startsWith('cerebro/tests/'))s+=2;if(file.startsWith('cerebro/registry/'))s+=2;return s}
export function buildReuseMap(){const all=files();const items=CANDIDATES.map(item=>{const hits=all.map(f=>({path:f,score:score(f,item)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.path.localeCompare(b.path)).slice(0,40);const preferredFound=item.preferred.filter(p=>all.includes(p));const state=preferredFound.length===item.preferred.length&&item.preferred.length?'EXISTING_REUSE_FIRST':hits.length?'PARTIAL_AUDIT_REQUIRED':'GAP_CANDIDATE';return{...item,state,preferred_found:preferredFound,evidence:hits};});return{schema_version:'1.0',mission_id:'MISSION-JARVIS-001',environment:'PREPROD',generated_at:new Date(0).toISOString(),principle:'CONSERVAR_ENTENDER_ENVOLVER_PROBAR_MEJORAR_MIGRAR',items,summary:{existing:items.filter(x=>x.state==='EXISTING_REUSE_FIRST').length,partial:items.filter(x=>x.state==='PARTIAL_AUDIT_REQUIRED').length,gaps:items.filter(x=>x.state==='GAP_CANDIDATE').length,total:items.length},prod_write:false,trading:false};}
if(import.meta.url===`file://${process.argv[1]}`){const out=process.env.JARVIS_REUSE_MAP_OUT||'artifacts/jarvis-reuse-map-v1.json';const map=buildReuseMap();fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(map,null,2)+'\n');console.log(JSON.stringify(map.summary));}
