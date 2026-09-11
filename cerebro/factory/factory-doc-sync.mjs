#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {buildEngineStatusRegistry,buildDocumentationUpdatePlan} from './engine-state-registry.mjs';

function parse(argv){const a={seed:new URL('../registry/engine-registry.seed.json',import.meta.url).pathname,evidence:null,out:'./.cerebro-doc-sync'};for(let i=2;i<argv.length;i++){if(argv[i]==='--seed')a.seed=argv[++i];else if(argv[i]==='--evidence')a.evidence=argv[++i];else if(argv[i]==='--out')a.out=argv[++i];else throw new Error(`unknown arg ${argv[i]}`)}return a}
function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'))}
export function buildDocSync({seed,evidence={records:[],updated_docs:{}}}){
  if(!seed||!Array.isArray(seed.engine_ids))throw new Error('seed.engine_ids required');
  const registry=buildEngineStatusRegistry({canonical_engine_ids:seed.engine_ids,records:evidence.records??[]});
  const docs=buildDocumentationUpdatePlan({updated:evidence.updated_docs??{}});
  return {schema_version:'1.0.0',generated_by:'FACT-001',engine_status_registry:registry,documentation:docs,source:{engine_count:seed.engine_ids.length},safety:{prod_write:false,auto_merge:false,trading_access:false,additional_cost_eur:0}};
}
export function writeDocSync({seed,evidence,out}){const result=buildDocSync({seed,evidence});fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'engine-status-registry.json'),JSON.stringify(result.engine_status_registry,null,2)+'\n');fs.writeFileSync(path.join(out,'docs-sync-report.json'),JSON.stringify({schema_version:result.schema_version,generated_by:result.generated_by,documentation:result.documentation,source:result.source,safety:result.safety},null,2)+'\n');return result}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname)){const a=parse(process.argv);const seed=readJson(a.seed);const evidence=a.evidence?readJson(a.evidence):{records:[],updated_docs:{}};const r=writeDocSync({seed,evidence,out:path.resolve(a.out)});console.log(JSON.stringify({status:r.documentation.status,engine_count:r.engine_status_registry.engine_count,out:path.resolve(a.out)}));}
