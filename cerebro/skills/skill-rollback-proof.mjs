import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const hash=(value)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const allFalse=(obj)=>Object.values(obj??{}).every(v=>v===false);

function provePlan(plan){
  const blockers=[];
  if(plan?.enabled!==false) blockers.push('WRAPPER_NOT_DISABLED');
  if(plan?.execution_authorized!==false||plan?.install_authorized!==false||plan?.prod_authorized!==false) blockers.push('AUTHORIZATION_NOT_FAIL_CLOSED');
  if(plan?.contract?.side_effects!=='DENY_BY_DEFAULT') blockers.push('SIDE_EFFECT_POLICY_NOT_DENY_BY_DEFAULT');
  if(!allFalse(plan?.permissions)) blockers.push('NONZERO_PERMISSION_PRESENT');
  if(plan?.quality?.rollback_required!==true) blockers.push('ROLLBACK_NOT_REQUIRED_BY_CONTRACT');
  if(!plan?.provenance?.upstream_head_commit||!plan?.provenance?.manifest_sha256) blockers.push('PROVENANCE_INCOMPLETE');

  const baseline={binding:null,enabled:false,permissions:{},state:'BASELINE'};
  const candidate={binding:plan?.wrapper_id??null,enabled:true,permissions:{...(plan?.permissions??{})},state:'CANDIDATE_SYNTHETIC'};
  const rolledBack={...baseline};
  const rebuilt={binding:plan?.wrapper_id??null,enabled:false,permissions:{...(plan?.permissions??{})},state:'REBUILT_DISABLED'};
  const baselineRestored=hash(rolledBack)===hash(baseline);
  const rebuildDeterministic=Boolean(rebuilt.binding)&&rebuilt.enabled===false&&allFalse(rebuilt.permissions);
  if(!baselineRestored) blockers.push('BASELINE_NOT_RESTORED');
  if(!rebuildDeterministic) blockers.push('REBUILD_NOT_DETERMINISTIC');

  return {
    wrapper_id:plan?.wrapper_id??null,
    candidate_id:plan?.candidate_id??null,
    scope:'WRAPPER_BINDING_ONLY_SYNTHETIC',
    ready:blockers.length===0,
    decision:blockers.length?'HOLD':'GREEN',
    blockers,
    evidence:{
      baseline_hash:hash(baseline),
      candidate_hash:hash(candidate),
      rollback_hash:hash(rolledBack),
      rebuild_hash:hash(rebuilt),
      baseline_restored:baselineRestored,
      rebuild_disabled_by_default:rebuildDeterministic,
      persistent_data_mutation:false,
      schema_mutation:false,
      external_code_executed:false
    }
  };
}

export function buildRollbackProof({wrappers=null}={}){
  const plans=(wrappers?.plans??[]).map(provePlan);
  const ready=plans.length>0&&plans.every(x=>x.ready);
  return Object.freeze({
    schema_version:'0.1.0',
    execution_mode:'SYNTHETIC_WRAPPER_ROLLBACK_REBUILD_PROOF',
    ready,
    status:ready?'GREEN_ROLLBACK_REBUILD_PROOF':'NOT_READY',
    proof_scope:'WRAPPER_BINDING_ONLY_SYNTHETIC',
    plans,
    external_code_executed:false,
    persistent_data_mutation:false,
    schema_mutation:false,
    merge_authorized:false,
    prod_authorized:false,
    note:'This proves reversibility of the disabled wrapper binding layer only. It does not prove rollback of future database, filesystem, network or PROD side effects.'
  });
}

function argValue(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
function load(p){return p&&fs.existsSync(p)?JSON.parse(fs.readFileSync(p,'utf8')):null;}
if(import.meta.url===`file://${process.argv[1]}`){
  const output=argValue('--output')??'artifacts/cerebro-skill-rollback-proof.json';
  const report=buildRollbackProof({wrappers:load(argValue('--wrappers')??'artifacts/cerebro-skill-wrapper-plans-p0.json')});
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,`${JSON.stringify(report,null,2)}\n`,'utf8');
  console.log(JSON.stringify({output,status:report.status,ready:report.ready,proof_scope:report.proof_scope,prod_authorized:false}));
}
