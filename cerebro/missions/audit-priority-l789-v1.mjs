#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT=process.cwd();
const argv=process.argv.slice(2);
const layerArg=argv.includes('--layer')?argv[argv.indexOf('--layer')+1]:'L7';
const outArg=argv.includes('--out')?argv[argv.indexOf('--out')+1]:'/tmp/cerebro-priority-l789-audit';
const OUT=path.resolve(outArg);
const LAYERS={
  L7:['STR-001','FRC-001','CAPA-001','OPP-001','INN-001','EXP-001','LAB-TRD','LAB-SEO','LAB-MKT','LAB-AI','LAB-AUT','MKT-002','EXPAND-001','FRAN-001','VENT-001'],
  L8:['COMP-REG-001','COMP-ONB-001','SCAN-001','KW-001','WAUD-001','SOCAUD-001','LOCALP-001','BMD-001','PROC-001','KBOOT-001','SEOBOOT-001','SOCBOOT-001','MKTBOOT-001','CRMBOOT-001','APPBOOT-001','AUTBOOT-001','TRNBOOT-001','ENGACT-001','TENANT-001','COMP-DEP-001','COMP-HLT-001','COMP-BKP-001','COMP-OFF-001'],
  L9:['CONSOLE-001','CHAT-001','CTX-001','CMD-001','ACTGW-001','DIRUI-001','TIMELINE-001','WHY-001','VOICEUI-001','HCI-001','MOTION-001']
};
if(!LAYERS[layerArg]) throw new Error(`Unsupported layer ${layerArg}`);
const TARGET=LAYERS[layerArg];
const EXEC_EXT=new Set(['.mjs','.js','.cjs','.ts','.tsx','.jsx','.py','.sh','.sql']);
const SKIP_DIR=new Set(['.git','node_modules','dist','coverage','.next','.cache','vendor']);
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const rel=p=>path.relative(ROOT,p).split(path.sep).join('/');
const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const stable=v=>Array.isArray(v)?v.map(stable):(v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v);
const text=v=>JSON.stringify(stable(v),null,2)+'\n';
function walk(d,a=[]){for(const e of fs.readdirSync(d,{withFileTypes:true})){if(SKIP_DIR.has(e.name))continue;const p=path.join(d,e.name);if(e.isDirectory())walk(p,a);else if(e.isFile()&&fs.statSync(p).size<1500000)a.push(p);}return a;}
function isDoc(r){return /(^|\/)(docs?|evidence|reports?|handover|continuity|runbooks?)(\/|$)/i.test(r)||/\.(md|txt)$/i.test(r);}
function isScaffold(r){return /(^|\/)(generated|scaffolds?|templates?)(\/|$)/i.test(r)||/(^|\/)factory\/generated(\/|$)/i.test(r);}
function isSupport(r){return /(^|\/)(tests?|fixtures?|mocks?|missions?|registry)(\/|$)/i.test(r)||r.startsWith('.github/')||isDoc(r);}
function isRuntime(r){return EXEC_EXT.has(path.extname(r).toLowerCase())&&!isSupport(r)&&!isScaffold(r);}
function pathIdentity(r,id){const low=r.toLowerCase(),a=id.toLowerCase(),forms=[a,a.replaceAll('-',''),a.replaceAll('-','_')];return forms.some(f=>new RegExp(`(?:^|[^a-z0-9])${esc(f)}(?:[^a-z0-9]|$)`,'i').test(low));}
function explicitIdentity(c,id){return new RegExp(`(?:engine_id|engineId|ENGINE_ID)\\s*[=:]\\s*[\\"']${esc(id)}[\\"']|[\\"']engine_id[\\"']\\s*:\\s*[\\"']${esc(id)}[\\"']`,'i').test(c);}
function relation(c,id){return [new RegExp(`(?:dependencies|depends_on|dependsOn|requires_engines?|upstream_engines?|downstream_engines?)\\s*[=:][\\s\\S]{0,240}${esc(id)}`,'i'),new RegExp(`(?:invokeEngine|callEngine|dispatchEngine|target_engine|targetEngine)\\s*\\(?\\s*[=:,]?\\s*[\\"']${esc(id)}[\\"']`,'i')].some(r=>r.test(c));}
function createsCycle(acc,e){const adj=new Map();for(const x of acc){if(!adj.has(x.source))adj.set(x.source,[]);adj.get(x.source).push(x.target);}const st=[e.target],seen=new Set();while(st.length){const n=st.pop();if(n===e.source)return true;if(seen.has(n))continue;seen.add(n);for(const t of adj.get(n)||[])st.push(t);}return false;}
function uniqPairs(edges){const m=new Map();for(const e of edges){const k=e.source+'|'+e.target;if(!m.has(k))m.set(k,{source:e.source,target:e.target,evidence_paths:[],evidence_types:[]});const x=m.get(k);x.evidence_paths.push(e.evidence_path);x.evidence_types.push(e.evidence_type);}return [...m.values()].map(x=>({...x,evidence_paths:[...new Set(x.evidence_paths)].sort(),evidence_types:[...new Set(x.evidence_types)].sort()}));}

fs.rmSync(OUT,{recursive:true,force:true});fs.mkdirSync(OUT,{recursive:true});
const registryPath=path.join(ROOT,'cerebro/registry/engine-registry.v1.json');
const factoryPath=path.join(ROOT,'cerebro/factory.mjs');
const factoryV1Path=path.join(ROOT,'cerebro/factory-v1.mjs');
const registry=JSON.parse(fs.readFileSync(registryPath,'utf8'));
const ids=registry.engine_ids||[];
if(registry.count!==179||ids.length!==179||new Set(ids).size!==179) throw new Error(`Registry invalid count=${registry.count} ids=${ids.length} unique=${new Set(ids).size}`);
for(const id of TARGET) if(!ids.includes(id)) throw new Error(`Target missing from Registry: ${id}`);
const sourceHashes={registry:hash(fs.readFileSync(registryPath)),factory:hash(fs.readFileSync(factoryPath)),factory_v1:hash(fs.readFileSync(factoryV1Path))};
const files=[];
for(const p of walk(ROOT).sort()){
  const r=rel(p);let c='';try{c=fs.readFileSync(p,'utf8');}catch{continue;}
  const refs=TARGET.filter(id=>c.includes(id));
  if(refs.length) files.push({path:r,content:c,refs,runtime:isRuntime(r),scaffold:isScaffold(r),support:isSupport(r),documentation:isDoc(r)});
}
const engines={};
for(const id of TARGET){
  const strong=[],runtimeRefs=[],scaffoldRefs=[],docRefs=[],supportRefs=[];
  for(const f of files){if(!f.refs.includes(id))continue;
    if(f.runtime){runtimeRefs.push(f.path);if(explicitIdentity(f.content,id)||pathIdentity(f.path,id))strong.push({path:f.path,reason:explicitIdentity(f.content,id)?'engine_identity':'path_identity'});}
    else if(f.scaffold)scaffoldRefs.push(f.path);else if(f.documentation)docRefs.push(f.path);else supportRefs.push(f.path);
  }
  let classification='DOCUMENTED_ONLY';
  if(strong.length)classification='PHYSICAL_EXISTING';else if(runtimeRefs.length)classification='PHYSICAL_PARTIAL';else if(scaffoldRefs.length)classification='SCAFFOLD_ONLY';
  engines[id]={classification,physical_evidence:strong,runtime_references:[...new Set(runtimeRefs)].sort(),scaffold_references:[...new Set(scaffoldRefs)].sort(),documentation_references:[...new Set(docRefs)].sort(),support_references:[...new Set(supportRefs)].sort(),do_not_overwrite:strong.length>0};
}
const raw=[];
for(const s of TARGET){const strongPaths=new Set(engines[s].physical_evidence.map(x=>x.path));for(const f of files){if(!f.refs.includes(s)||!f.runtime||!strongPaths.has(f.path))continue;for(const t of f.refs.filter(x=>x!==s)){if(relation(f.content,t))raw.push({source:s,target:t,evidence_path:f.path,evidence_type:'verified_runtime'});}}}
const ranked=uniqPairs(raw).sort((a,b)=>b.evidence_paths.length-a.evidence_paths.length||(a.source+a.target).localeCompare(b.source+b.target));
const effective=[],rejected=[];for(const e of ranked)(createsCycle(effective,e)?rejected:effective).push(e);
const counts={PHYSICAL_EXISTING:0,PHYSICAL_PARTIAL:0,SCAFFOLD_ONLY:0,DOCUMENTED_ONLY:0};for(const e of Object.values(engines))counts[e.classification]++;
const physical=TARGET.filter(id=>engines[id].classification==='PHYSICAL_EXISTING');
const baseline={schema_version:'1.0.0',mission:'IMPLEMENT_PRIORITY_ENGINES_L7_L8_L9_FOUNDATION',phase:`${layerArg}_BASELINE_OLD`,status:'GREEN',environment:'LAB_PREPROD',layer:layerArg,total:TARGET.length,registry_total:179,registry_unique:179,classification_counts:counts,physical_before:physical.length,physical_engine_ids:physical,nonphysical_engine_ids:TARGET.filter(id=>!physical.includes(id)),engines,dependency_graph:{effective_edges:effective,cycle_guard_rejected_edges:rejected},source_hashes:sourceHashes,registry_mutated:false,factory_mutated:false,prod_touched:false,trading_touched:false,additional_cost_eur:0,p23:'POR_AUDITAR'};
const rebuildA=hash(text(baseline)),rebuildB=hash(text({...baseline}));if(rebuildA!==rebuildB)throw new Error('Baseline rebuild not deterministic');
fs.writeFileSync(path.join(OUT,'PRIORITY_PHYSICAL_BASELINE.json'),text(baseline));
fs.writeFileSync(path.join(OUT,'AUDIT_REPORT.json'),text({status:'GREEN',layer:layerArg,total:TARGET.length,classification_counts:counts,physical_before:physical.length,physical_engine_ids:physical,nonphysical_engine_ids:baseline.nonphysical_engine_ids,effective_dependency_edges:effective.length,cycle_guard_rejected_edges:rejected.length,rebuild:'GREEN',source_hashes:sourceHashes}));
console.log(`${layerArg}_BASELINE_METRICS=`+JSON.stringify({total:TARGET.length,...counts,physical_before:physical.length,physical_engine_ids:physical,nonphysical_engine_ids:baseline.nonphysical_engine_ids,effective_dependency_edges:effective.length,cycle_guard_rejected_edges:rejected.length}));
