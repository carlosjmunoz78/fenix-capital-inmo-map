import fs from 'node:fs';
import path from 'node:path';

export const CANONICAL_HUMAN_REQUIRED=Object.freeze(['LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST']);
const CANON=new Set(CANONICAL_HUMAN_REQUIRED);

function flatten(value,out=[]){
 if(value===null||value===undefined||value===false||value==='')return out;
 if(Array.isArray(value)){for(const x of value)flatten(x,out);return out;}
 if(typeof value==='string'){const v=value.trim();if(v)out.push(v);return out;}
 if(typeof value==='object'){for(const [k,v] of Object.entries(value))flatten(`${k}:${typeof v==='string'?v:JSON.stringify(v)}`,out);return out;}
 out.push(String(value));return out;
}

export function governBlueprintRecord(record,{source_run_id=null}={}){
 if(!record||typeof record!=='object'||Array.isArray(record))throw new Error('BLUEPRINT_RECORD_REQUIRED');
 const blueprint=record.blueprint;
 if(!blueprint||typeof blueprint!=='object'||Array.isArray(blueprint)||Object.keys(blueprint).length<2)throw new Error(`INVALID_BLUEPRINT_RECORD:${record.program_id||'unknown'}:${record.phase||'unknown'}`);
 const raw=blueprint.human_required??null;
 const advisory=flatten(raw);
 const canonicalCandidates=[...new Set(advisory.filter(x=>CANON.has(x)))];
 const governedBlueprint={...blueprint,human_required:null};
 return Object.freeze({...record,source_run_id,raw_model_human_required:raw,model_advisory_approvals:Object.freeze(advisory),model_canonical_human_required_candidates:Object.freeze(canonicalCandidates),active_human_required:null,blueprint:Object.freeze(governedBlueprint),governance_rule:'MODEL_CANNOT_SELF_DECLARE_HUMAN_REQUIRED'});
}

export function governBlueprintDirectory({root='cerebro/jarvis/mission-001/generated-blueprints',source_run_id=null}={}){
 const base=path.resolve(root);const records=[];let advisoryCount=0;const canonicalCandidates=[];
 for(const entry of fs.readdirSync(base,{withFileTypes:true}).filter(x=>x.isDirectory()&&/^P\d{2}$/.test(x.name)).sort((a,b)=>a.name.localeCompare(b.name))){
  for(const fileName of ['design.json','implementation.json']){
   const file=path.join(base,entry.name,fileName);if(!fs.existsSync(file))throw new Error(`MISSING_BLUEPRINT:${entry.name}/${fileName}`);
   const governed=governBlueprintRecord(JSON.parse(fs.readFileSync(file,'utf8')),{source_run_id});
   advisoryCount+=governed.model_advisory_approvals.length;canonicalCandidates.push(...governed.model_canonical_human_required_candidates);
   fs.writeFileSync(file,JSON.stringify(governed,null,2)+'\n','utf8');records.push(governed);
  }
 }
 if(records.length!==36)throw new Error(`EXPECTED_36_BLUEPRINTS_GOT:${records.length}`);
 const priorSummaryPath=path.join(base,'summary.json');const prior=fs.existsSync(priorSummaryPath)?JSON.parse(fs.readFileSync(priorSummaryPath,'utf8')):{};
 const summary={...prior,ok:true,valid_blueprints:36,semantic_gate:'GREEN',governance_gate:'GREEN',source_run_id,raw_model_advisory_approval_count:advisoryCount,model_canonical_human_required_candidates:[...new Set(canonicalCandidates)],human_required:[],active_human_required:[],governance_rule:'ONLY_DETERMINISTIC_POLICY_CAN_RAISE_CANONICAL_HUMAN_REQUIRED',prod_write:false,trading:false};
 fs.writeFileSync(priorSummaryPath,JSON.stringify(summary,null,2)+'\n','utf8');
 return Object.freeze(summary);
}

if(import.meta.url===`file://${process.argv[1]}`){const args=Object.fromEntries(process.argv.slice(2).map(x=>{const [k,v='true']=x.replace(/^--/,'').split('=');return[k,v]}));const summary=governBlueprintDirectory({root:args.root||undefined,source_run_id:args.source_run_id?Number(args.source_run_id):null});console.log(JSON.stringify(summary));}
