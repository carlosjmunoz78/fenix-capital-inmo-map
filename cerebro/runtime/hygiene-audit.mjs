import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const STATE_BRANCHES=new Set(['cerebro-rsi-learning-outbox-v0','cerebro-rsi-learning-state-v0']);
const SNAPSHOT_PATTERN=/(snapshot|backup|checkpoint|ready-for-pr|stop-snapshot|final-snapshot|prechange)/i;

function reqString(value,label){if(typeof value!=='string'||!value.trim())throw new Error(`${label} required`);return value.trim();}
function normalizeSha(value){const sha=reqString(value,'sha').toLowerCase();if(!/^[0-9a-f]{40}$/.test(sha))throw new Error(`invalid sha:${sha}`);return sha;}
function unique(values){return [...new Set(values)];}

export function analyzeRepositoryHygiene({branches,open_pr_heads=[],protected_branches=['main'],now=new Date().toISOString()}){
  if(!Array.isArray(branches))throw new Error('branches array required');
  const observedAt=new Date(now).toISOString();
  const openHeads=new Set(open_pr_heads.map(x=>reqString(x,'open_pr_head')));
  const protectedNames=new Set(protected_branches.map(x=>reqString(x,'protected_branch')));
  const normalized=branches.map(item=>{
    if(!item||typeof item!=='object')throw new Error('branch object required');
    return {name:reqString(item.name,'branch.name'),sha:normalizeSha(item.sha),api_protected:item.protected===true};
  });
  const bySha=new Map();
  for(const branch of normalized){const names=bySha.get(branch.sha)??[];names.push(branch.name);bySha.set(branch.sha,names);}
  const duplicateGroups=[...bySha.entries()].filter(([,names])=>names.length>1).map(([sha,names])=>({sha,branches:[...names].sort(),count:names.length})).sort((a,b)=>a.sha.localeCompare(b.sha));
  const rows=normalized.map(branch=>{
    const reasons=[];let classification='ACTIVE_OTHER';let recommended_action='KEEP_REVIEW_LATER';
    if(protectedNames.has(branch.name)||branch.api_protected){classification='PROTECTED';recommended_action='KEEP';reasons.push('PROTECTED_BRANCH');}
    else if(openHeads.has(branch.name)){classification='ACTIVE_PR_HEAD';recommended_action='KEEP_UNTIL_PR_CLOSED';reasons.push('OPEN_PR_HEAD');}
    else if(STATE_BRANCHES.has(branch.name)){classification='DURABLE_STATE';recommended_action='KEEP';reasons.push('CEREBRO_DURABLE_STATE');}
    else if(SNAPSHOT_PATTERN.test(branch.name)){classification='SNAPSHOT_CANDIDATE';recommended_action='REVIEW_FOR_ARCHIVE_OR_EVENTUAL_DELETE';reasons.push('SNAPSHOT_NAMING_PATTERN');}
    const sameHead=(bySha.get(branch.sha)??[]).filter(name=>name!==branch.name);
    if(sameHead.length){reasons.push('DUPLICATE_HEAD');if(classification==='ACTIVE_OTHER')recommended_action='REVIEW_DUPLICATE_HEAD';}
    return Object.freeze({branch:branch.name,sha:branch.sha,classification,recommended_action,reasons:Object.freeze(unique(reasons).sort()),same_head_as:Object.freeze(sameHead.sort()),delete_authorized:false,mutation_authorized:false});
  }).sort((a,b)=>a.branch.localeCompare(b.branch));
  const counts=rows.reduce((acc,row)=>{acc[row.classification]=(acc[row.classification]??0)+1;return acc;},{});
  return Object.freeze({
    schema_version:'1.0.0',state_type:'CEREBRO_HYG_001_AUDIT',engine_id:'HYG-001',environment:'AUDIT_ONLY',observed_at:observedAt,
    branches_total:rows.length,open_pr_heads:Object.freeze([...openHeads].sort()),classification_counts:Object.freeze(counts),duplicate_head_groups:Object.freeze(duplicateGroups),branches:Object.freeze(rows),
    destructive_changes_performed:0,delete_authorized:false,mutation_authorized:false,additional_cost_eur:0,prod_authorized:false,trading_access:false
  });
}

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
const isEntrypoint=Boolean(process.argv[1])&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isEntrypoint){
  try{
    const branches=JSON.parse(fs.readFileSync(reqString(arg('--branches'),'--branches'),'utf8'));
    const prs=JSON.parse(fs.readFileSync(reqString(arg('--open-prs'),'--open-prs'),'utf8'));
    const openHeads=prs.map(pr=>pr?.head?.ref).filter(Boolean);
    const report=analyzeRepositoryHygiene({branches:branches.map(b=>({name:b.name,sha:b.commit?.sha,protected:b.protected})),open_pr_heads:openHeads,protected_branches:['main']});
    const output=arg('--output');
    if(output)fs.writeFileSync(output,`${JSON.stringify(report,null,2)}\n`,'utf8');
    else console.log(JSON.stringify(report));
  }catch(error){console.error(error?.stack??String(error));process.exitCode=4;}
}
