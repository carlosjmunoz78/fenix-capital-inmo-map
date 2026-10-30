import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';

const hash=v=>crypto.createHash('sha256').update(typeof v==='string'?v:JSON.stringify(v)).digest('hex');
const REGISTRY_DEFAULT='cerebro/registry/engine-registry.seed.json';
const SKIP_PREFIXES=['cerebro/jarvis/mission-001/generated-blueprints/'];
const SKIP_FILES=new Set([REGISTRY_DEFAULT]);

function trackedFiles(){return execFileSync('git',['ls-files'],{encoding:'utf8'}).split(/\r?\n/).filter(Boolean);}
function readableText(file){try{const s=fs.statSync(file);if(!s.isFile()||s.size>1_500_000)return null;const b=fs.readFileSync(file);if(b.includes(0))return null;return b.toString('utf8');}catch{return null;}}
function evidenceKind(file){if(/(^|\/)tests?\//.test(file)||/\.test\.[cm]?[jt]s$/.test(file))return'TEST';if(file.startsWith('.github/workflows/'))return'WORKFLOW';if(/^cerebro\/(runtime|governance|router|console|skills|registry|security|observability|events|jobs)\//.test(file)&&/\.[cm]?[jt]s$|\.ts$|\.json$/.test(file))return'RUNTIME';if(/\.(md|txt|json)$/.test(file))return'DOC';return'OTHER';}
function stateFor(kinds){const s=new Set(kinds);if(s.has('RUNTIME')&&s.has('TEST'))return'RUNTIME_AND_TEST_EVIDENCE';if(s.has('RUNTIME')&&s.has('WORKFLOW'))return'RUNTIME_AND_WORKFLOW_EVIDENCE';if(s.has('RUNTIME'))return'RUNTIME_EVIDENCE';if(s.has('TEST'))return'TEST_EVIDENCE';if(s.has('WORKFLOW'))return'WORKFLOW_EVIDENCE';if(s.has('DOC'))return'DOCUMENTED_EVIDENCE';return'REGISTERED_ONLY';}

export function buildEngineEvidenceAudit({registry_path=REGISTRY_DEFAULT}={}){
 const registry=JSON.parse(fs.readFileSync(registry_path,'utf8'));
 if(!Array.isArray(registry.engine_ids)||registry.engine_ids.length!==registry.count)throw new Error('ENGINE_REGISTRY_INVALID');
 const engines=new Map(registry.engine_ids.map(id=>[id,[]]));
 const files=trackedFiles().filter(f=>!SKIP_FILES.has(f)&&!SKIP_PREFIXES.some(p=>f.startsWith(p)));
 for(const file of files){const text=readableText(file);if(text===null)continue;for(const id of registry.engine_ids){if(text.includes(id)||file.toLowerCase().includes(id.toLowerCase()))engines.get(id).push(file);}}
 const items=registry.engine_ids.map(engine_id=>{const refs=[...new Set(engines.get(engine_id))].sort();const kinds=[...new Set(refs.map(evidenceKind))].sort();return{engine_id,evidence_state:stateFor(kinds),evidence_kinds:kinds,evidence_count:refs.length,evidence_refs:refs.slice(0,40),operational_claim:false,requires_live_audit:true};});
 const counts={};for(const x of items)counts[x.evidence_state]=(counts[x.evidence_state]||0)+1;
 const result={schema_version:'1.0',mission_id:'MISSION-JARVIS-001',environment:'PREPROD',registry_source:registry_path,registry_count:registry.count,audited_engine_count:items.length,evidence_state_counts:counts,operational_claim_count:0,rule:'EVIDENCE_CLASSIFICATION_IS_NOT_OPERATIONAL_CONFIRMATION',items};
 return Object.freeze({...result,audit_fingerprint:hash(result),prod_authorized:false,trading_access:false});
}

if(import.meta.url===`file://${process.argv[1]}`){const out=process.env.JARVIS_ENGINE_EVIDENCE_OUT||'artifacts/jarvis-engine-evidence-audit-v1.json';const audit=buildEngineEvidenceAudit();fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(audit,null,2)+'\n');console.log(JSON.stringify({registry_count:audit.registry_count,audited_engine_count:audit.audited_engine_count,evidence_state_counts:audit.evidence_state_counts,audit_fingerprint:audit.audit_fingerprint}));}
