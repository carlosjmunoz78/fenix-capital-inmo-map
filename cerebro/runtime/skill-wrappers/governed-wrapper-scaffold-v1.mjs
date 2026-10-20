import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {stableHash,cleanText,cleanStringList} from './governed-wrapper-factory-v1.mjs';

const POLICY_URL=new URL('../../governance/skill-wrapper-scaffold-policy.v1.json',import.meta.url);
const DEFAULT_VERSION='0.1.0-scaffold';

function readJson(file){
  return JSON.parse(fs.readFileSync(file,'utf8'));
}

export function loadSkillWrapperScaffoldPolicy(){
  return readJson(POLICY_URL);
}

function slugify(value){
  return cleanText(value,160).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,100);
}

function exportStem(value){
  const parts=slugify(value).split('-').filter(Boolean);
  return parts.map(part=>part.charAt(0).toUpperCase()+part.slice(1)).join('')||'Skill';
}

function isHexPin(value){
  return /^[a-f0-9]{7,64}$/i.test(String(value??''));
}

function uniqueStrings(value,{maxItems=64,maxLength=160}={}){
  return [...new Set(cleanStringList(value,{maxItems,maxLength}))];
}

function requestedTrue(candidate,...keys){
  return keys.some(key=>candidate?.[key]===true);
}

function normalizedMetadata(candidate,{company_id,version}={}){
  const technicalName=cleanText(candidate?.technical_name??candidate?.name,160);
  const sourceLocator=cleanText(candidate?.source_locator??candidate?.upstream,500);
  const sourceLicense=cleanText(candidate?.source_license??candidate?.license,120);
  const pinnedSha=cleanText(candidate?.pinned_sha,128);
  const targetBindings=uniqueStrings(candidate?.target_engine_bindings,{maxItems:64,maxLength:80});
  return {
    candidate_id:cleanText(candidate?.candidate_id,220),
    technical_name:technicalName,
    source_locator:sourceLocator,
    source_license:sourceLicense,
    pinned_sha:pinnedSha,
    target_engine_bindings:targetBindings,
    capability_contracts:Array.isArray(candidate?.capability_contracts)?candidate.capability_contracts.slice(0,64):[],
    company_id:cleanText(company_id??candidate?.company_id,80)||'GLOBAL',
    engine_id:'FACT-001',
    environment:'PREPROD',
    version:cleanText(version,80)||DEFAULT_VERSION
  };
}

function blocker(code,detail,{human_required=null}={}){
  return {code,detail,human_required};
}

export function inspectSkillCandidateForScaffold(candidate,options={}){
  const policy=loadSkillWrapperScaffoldPolicy();
  const metadata=normalizedMetadata(candidate,options);
  const blockers=[];
  const allowedLicenses=new Set(policy.license_policy.permissive_external_allowlist);

  if(!metadata.candidate_id)blockers.push(blocker('CANDIDATE_ID_REQUIRED','A stable governed candidate_id is required.'));
  if(!metadata.technical_name)blockers.push(blocker('TECHNICAL_NAME_REQUIRED','technical_name is required.'));
  if(!metadata.source_locator)blockers.push(blocker('SOURCE_LOCATOR_REQUIRED','Pinned provenance needs a source_locator.'));
  if(!metadata.source_license){
    blockers.push(blocker('SOURCE_LICENSE_REQUIRED','External skill license is missing.',{human_required:'LEGAL_REQUIRED'}));
  }else if(!allowedLicenses.has(metadata.source_license)){
    blockers.push(blocker('SOURCE_LICENSE_NOT_ALLOWLISTED',`License ${metadata.source_license} is not in the automatic permissive-license allowlist.`,{human_required:'LEGAL_REQUIRED'}));
  }
  if(!metadata.pinned_sha){
    blockers.push(blocker('PINNED_SHA_REQUIRED','External source must be pinned before scaffold generation.'));
  }else if(!isHexPin(metadata.pinned_sha)){
    blockers.push(blocker('PINNED_SHA_INVALID','pinned_sha must be a hexadecimal immutable source pin.'));
  }
  if(metadata.target_engine_bindings.length===0)blockers.push(blocker('TARGET_ENGINE_BINDING_REQUIRED','At least one governed target engine binding is required.'));
  if(metadata.target_engine_bindings.some(id=>/TRAD|TRADING/i.test(id)))blockers.push(blocker('TRADING_BINDING_DENIED','Trading bindings are isolated and cannot inherit this scaffold path.'));

  const deniedAuthority=[
    ['EXTERNAL_SKILL_CODE_EXECUTION_DENIED',requestedTrue(candidate,'external_skill_code_execution','raw_external_skill_code_execution')],
    ['DEPENDENCY_INSTALL_DENIED',requestedTrue(candidate,'dependency_install_authorized','install_authorized')],
    ['PROD_WRITE_DENIED',requestedTrue(candidate,'prod_write_authorized','direct_prod_write_authorized','prod_write')],
    ['PROD_MUTATION_DENIED',requestedTrue(candidate,'prod_mutation_authorized','direct_prod_mutation_authorized','prod_mutation')],
    ['EXTERNAL_SIDE_EFFECT_DENIED',requestedTrue(candidate,'external_side_effects_authorized','external_side_effect_authorized')],
    ['PERMISSION_EXPANSION_DENIED',requestedTrue(candidate,'permission_expansion_authorized','permission_expansion')],
    ['CUSTOMER_DATA_AUTHORITY_DENIED',requestedTrue(candidate,'customer_data_authorized','customer_data')],
    ['TRADING_ACCESS_DENIED',requestedTrue(candidate,'trading_access','trading')],
    ['SPEND_AUTHORITY_DENIED',requestedTrue(candidate,'spend_authorized','paid_fallback')]
  ];
  for(const [code,isRequested] of deniedAuthority){
    if(isRequested)blockers.push(blocker(code,'Scaffold V1 is fail-closed and cannot expand this authority.'));
  }

  const requestedCost=Number(candidate?.additional_cost_eur??candidate?.cost_eur??0);
  if(!Number.isFinite(requestedCost)||requestedCost<0){
    blockers.push(blocker('COST_INVALID','Candidate cost metadata must be a finite non-negative number.'));
  }else if(requestedCost>Number(policy.authority.additional_cost_budget_eur??0)){
    blockers.push(blocker('ADDITIONAL_COST_BUDGET_EXCEEDED',`Requested additional cost ${requestedCost} EUR exceeds automatic budget 0 EUR.`,{human_required:'MONEY_LIMIT'}));
  }

  const humanReasons=[...new Set(blockers.map(item=>item.human_required).filter(Boolean))];
  return Object.freeze({
    schema_version:'1.0.0',
    state_type:'CEREBRO_SKILL_WRAPPER_SCAFFOLD_INSPECTION_V1',
    metadata,
    status:blockers.length===0?'GREEN_METADATA_SAFE_FOR_SCAFFOLD':'BLOCKED_FAIL_CLOSED',
    blockers,
    human_required:humanReasons.length===1?humanReasons[0]:humanReasons.length>1?'POLICY_CONFLICT':null,
    human_required_reasons:humanReasons,
    authority:{...policy.authority},
    inspection_hash:stableHash({metadata,blockers,authority:policy.authority})
  });
}

function buildWrapperTemplate(metadata){
  const stem=exportStem(metadata.technical_name);
  const safeMetadata={
    candidate_id:metadata.candidate_id,
    technical_name:metadata.technical_name,
    source_license:metadata.source_license,
    pinned_sha:metadata.pinned_sha,
    target_engine_bindings:metadata.target_engine_bindings,
    company_id:metadata.company_id,
    engine_id:'FACT-001',
    environment:'PREPROD',
    version:metadata.version,
    operational:false,
    status:'SCAFFOLD_ONLY_NOT_IMPLEMENTED'
  };
  return `// Generated by FACT-001 governed-wrapper-scaffold-v1.\n// SAFE DEFAULT: this scaffold is deliberately non-operational until implementation, tests, OLD vs NEW, evaluation and tribunal are complete.\n\nexport const SCAFFOLD_METADATA=Object.freeze(${JSON.stringify(safeMetadata,null,2)});\n\nexport function execute${stem}Scaffold(){\n  throw new Error('SKILL_WRAPPER_SCAFFOLD_NOT_IMPLEMENTED:${metadata.technical_name}');\n}\n`;
}

function buildTestTemplate(metadata,fileName){
  const stem=exportStem(metadata.technical_name);
  return `import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport {SCAFFOLD_METADATA,execute${stem}Scaffold} from './${fileName}';\n\ntest('${metadata.technical_name} scaffold stays fail-closed until implementation is governed',()=>{\n  assert.equal(SCAFFOLD_METADATA.environment,'PREPROD');\n  assert.equal(SCAFFOLD_METADATA.operational,false);\n  assert.throws(()=>execute${stem}Scaffold(),/SKILL_WRAPPER_SCAFFOLD_NOT_IMPLEMENTED/);\n});\n`;
}

function makeFile(relativePath,content){
  return Object.freeze({path:relativePath,content,sha256:stableHash({content})});
}

export function buildGovernedWrapperScaffold(candidate,options={}){
  const policy=loadSkillWrapperScaffoldPolicy();
  const inspection=inspectSkillCandidateForScaffold(candidate,options);
  if(inspection.status!=='GREEN_METADATA_SAFE_FOR_SCAFFOLD'){
    const blocked={
      schema_version:'1.0.0',
      state_type:'CEREBRO_SKILL_WRAPPER_SCAFFOLD_RESULT_V1',
      company_id:inspection.metadata.company_id,
      engine_id:'FACT-001',
      environment:'PREPROD',
      version:inspection.metadata.version,
      status:'BLOCKED_FAIL_CLOSED',
      operational:false,
      inspection,
      generated_files:[],
      authority:{...policy.authority}
    };
    return Object.freeze({...blocked,scaffold_hash:stableHash(blocked)});
  }

  const metadata=inspection.metadata;
  const slug=slugify(metadata.technical_name);
  const wrapperFile=`${slug}-v1.scaffold.mjs`;
  const testFile=`${slug}-v1.scaffold.test.mjs`;
  const manifest={
    schema_version:'1.0.0',
    state_type:'CEREBRO_SKILL_WRAPPER_SCAFFOLD_MANIFEST_V1',
    company_id:metadata.company_id,
    engine_id:'FACT-001',
    environment:'PREPROD',
    version:metadata.version,
    candidate_id:metadata.candidate_id,
    technical_name:metadata.technical_name,
    source:{locator:metadata.source_locator,license:metadata.source_license,pinned_sha:metadata.pinned_sha},
    target_engine_bindings:metadata.target_engine_bindings,
    capability_contracts:metadata.capability_contracts,
    implementation_kind:policy.license_policy.implementation_kind,
    operational:false,
    status:'SCAFFOLD_ONLY_PREPROD',
    factory_ref:'cerebro/runtime/skill-wrappers/governed-wrapper-factory-v1.mjs',
    permissions:{...policy.authority},
    required_gates:{...policy.promotion_contract},
    continuous_improvement:{...policy.continuous_improvement},
    control_plane_reuse:{...policy.existing_control_plane_reuse}
  };
  const registryEntry={
    candidate_id:metadata.candidate_id,
    technical_name:metadata.technical_name,
    planned_wrapper_id:`skillwrap:${slug}-internal-v1`,
    planned_wrapper_ref:`cerebro/runtime/skill-wrappers/generated/${slug}-v1.mjs`,
    source_locator:metadata.source_locator,
    source_license:metadata.source_license,
    pinned_sha:metadata.pinned_sha,
    target_engine_bindings:metadata.target_engine_bindings,
    environment:'PREPROD',
    status:'SCAFFOLD_ONLY_PREPROD',
    operational:false,
    registry_promotion_authorized:false,
    external_skill_code_execution:false,
    dependency_install_authorized:false,
    external_side_effects_authorized:false,
    prod_write_authorized:false,
    prod_mutation_authorized:false,
    trading_access:false,
    spend_authorized:false,
    additional_cost_eur:0
  };
  const evaluation={
    schema_version:'1.0.0',
    state_type:'CEREBRO_SKILL_WRAPPER_EVALUATION_CONTRACT_V1',
    candidate_id:metadata.candidate_id,
    technical_name:metadata.technical_name,
    environment:'PREPROD',
    old_vs_new_required:true,
    axes:['functional_correctness','security','compatibility','quality','latency','reliability','observability','cost','rollback','backup_rebuild'],
    measurable_gain_required:true,
    no_regression_required:true,
    independent_evaluation_engine:'EVA-001',
    tribunal_engine:'JDG-001',
    learning_feedback_engine:'LRN-001',
    promotion_authorized:false
  };
  const recovery={
    schema_version:'1.0.0',
    state_type:'CEREBRO_SKILL_WRAPPER_RECOVERY_CONTRACT_V1',
    candidate_id:metadata.candidate_id,
    technical_name:metadata.technical_name,
    active_baseline_must_remain_unchanged:true,
    backup_required:true,
    rollback_required:true,
    rebuild_required:true,
    rollback_target:'CURRENT_ACTIVE_BASELINE',
    candidate_is_parallel_only:true
  };
  const documentation=`# ${metadata.technical_name} · CEREBRO wrapper scaffold\n\nStatus: **SCAFFOLD_ONLY_PREPROD**.\n\nThis artifact was generated by FACT-001 from governed metadata. It is intentionally non-operational. Before any promotion, CEREBRO must implement the internal behavior without executing raw external skill code, then pass tests, OLD vs NEW, EVA-001, JDG-001, observability, cost, backup, rollback and rebuild gates.\n\n## Provenance\n- Candidate: ${metadata.candidate_id}\n- Source: ${metadata.source_locator}\n- License: ${metadata.source_license}\n- Pin: ${metadata.pinned_sha}\n- Target engines: ${metadata.target_engine_bindings.join(', ')}\n\n## Continuous evolution\nIf promoted, the resulting version becomes a governed baseline and automatically inherits the Skill Evolution Loop. It must continue searching for upstream updates, internal hardening, complementary compositions, derived skills and better replacement candidates.\n`;

  const wrapperSource=buildWrapperTemplate(metadata);
  const testSource=buildTestTemplate(metadata,wrapperFile);
  const generatedFiles=[
    makeFile(`${slug}.manifest.json`,`${JSON.stringify(manifest,null,2)}\n`),
    makeFile(wrapperFile,wrapperSource),
    makeFile(testFile,testSource),
    makeFile(`${slug}.registry-entry.candidate.json`,`${JSON.stringify(registryEntry,null,2)}\n`),
    makeFile(`${slug}.evaluation.json`,`${JSON.stringify(evaluation,null,2)}\n`),
    makeFile(`${slug}.recovery.json`,`${JSON.stringify(recovery,null,2)}\n`),
    makeFile(`${slug}.README.md`,documentation)
  ];

  const scaffold={
    schema_version:'1.0.0',
    state_type:'CEREBRO_SKILL_WRAPPER_SCAFFOLD_RESULT_V1',
    company_id:metadata.company_id,
    engine_id:'FACT-001',
    environment:'PREPROD',
    version:metadata.version,
    status:'GREEN_SCAFFOLD_READY_PREPROD',
    operational:false,
    candidate_id:metadata.candidate_id,
    technical_name:metadata.technical_name,
    inspection,
    manifest,
    registry_entry_candidate:registryEntry,
    evaluation_contract:evaluation,
    recovery_contract:recovery,
    implementation_contract:{
      factory_ref:'cerebro/runtime/skill-wrappers/governed-wrapper-factory-v1.mjs',
      implementation_required:true,
      raw_external_code_execution:false,
      dependency_install:false,
      semantic_behavior_must_be_implemented_from_governed_evidence:true,
      promotion_after_scaffold:false
    },
    observability_contract:{events_required:['SCAFFOLD_CREATED','IMPLEMENTATION_TESTED','OLD_VS_NEW_EVALUATED','TRIBUNAL_DECIDED','PROMOTED_OR_REJECTED'],audit_required:true},
    cost_contract:{additional_cost_budget_eur:0,measurement_required:true},
    training_hooks:{required:true,consumer:'LRN-001'},
    continuous_improvement:{...policy.continuous_improvement},
    generated_files:generatedFiles,
    authority:{...policy.authority}
  };
  return Object.freeze({...scaffold,scaffold_hash:stableHash(scaffold)});
}

function candidateFromRegistry(registry,technicalName){
  const arrays=['capabilities','queue','wrappers'];
  for(const key of arrays){
    if(!Array.isArray(registry?.[key]))continue;
    const match=registry[key].find(item=>String(item?.technical_name??item?.name??'').toLowerCase()===String(technicalName??'').toLowerCase());
    if(match)return match;
  }
  throw new Error(`SKILL_SCAFFOLD_CANDIDATE_NOT_FOUND:${technicalName}`);
}

function parseArgs(argv){
  const out={};
  for(let i=0;i<argv.length;i+=1){
    const key=argv[i];
    if(key==='--candidate')out.candidate=argv[++i];
    else if(key==='--registry')out.registry=argv[++i];
    else if(key==='--technical-name')out.technical_name=argv[++i];
    else if(key==='--output')out.output=argv[++i];
    else if(key==='--output-dir')out.output_dir=argv[++i];
    else if(key==='--company-id')out.company_id=argv[++i];
    else if(key==='--version')out.version=argv[++i];
  }
  return out;
}

function writeBundle(scaffold,outputDir){
  fs.mkdirSync(outputDir,{recursive:true});
  fs.writeFileSync(path.join(outputDir,'scaffold-result.json'),`${JSON.stringify(scaffold,null,2)}\n`,'utf8');
  for(const file of scaffold.generated_files??[]){
    const destination=path.join(outputDir,file.path);
    fs.mkdirSync(path.dirname(destination),{recursive:true});
    fs.writeFileSync(destination,file.content,'utf8');
  }
}

function main(){
  const args=parseArgs(process.argv.slice(2));
  let candidate;
  if(args.candidate){
    candidate=readJson(path.resolve(args.candidate));
  }else if(args.registry&&args.technical_name){
    candidate=candidateFromRegistry(readJson(path.resolve(args.registry)),args.technical_name);
  }else{
    throw new Error('SKILL_SCAFFOLD_INPUT_REQUIRED: use --candidate <json> or --registry <json> --technical-name <name>');
  }
  const scaffold=buildGovernedWrapperScaffold(candidate,{company_id:args.company_id,version:args.version});
  if(args.output){
    const destination=path.resolve(args.output);
    fs.mkdirSync(path.dirname(destination),{recursive:true});
    fs.writeFileSync(destination,`${JSON.stringify(scaffold,null,2)}\n`,'utf8');
  }
  if(args.output_dir)writeBundle(scaffold,path.resolve(args.output_dir));
  if(!args.output&&!args.output_dir)process.stdout.write(`${JSON.stringify(scaffold,null,2)}\n`);
  if(scaffold.status!=='GREEN_SCAFFOLD_READY_PREPROD')process.exitCode=2;
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1]))main();
