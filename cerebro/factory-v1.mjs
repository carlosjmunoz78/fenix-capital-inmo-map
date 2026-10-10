#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE_FACTORY = path.join(HERE, 'factory.mjs');
const BASE_REGISTRY = path.join(HERE, 'registry', 'engine-registry.seed.json');
const DEFAULT_REGISTRY = path.join(HERE, 'registry', 'engine-registry.v1.json');
const BASE_COUNT = 177;
const CANONICAL_COUNT = 179;
const ADDED = ['HCI-001', 'MOTION-001'];
const TEMPLATE_ENGINE = 'VOICEUI-001';
const EXPECTED_FILES = 18;

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function json(v) { return `${JSON.stringify(v, null, 2)}\n`; }
function parseArgs(argv) {
  const command = argv[2]; const args = { command, registry: DEFAULT_REGISTRY, out: null };
  for (let i=3;i<argv.length;i+=1) {
    if (argv[i] === '--registry') args.registry = argv[++i];
    else if (argv[i] === '--out') args.out = argv[++i];
    else throw new Error(`unknown argument: ${argv[i]}`);
  }
  return args;
}
function assertSafe(registry) {
  if (registry.defaults?.environment !== 'SCAFFOLD') throw new Error('registry defaults must be SCAFFOLD');
  if (registry.extension?.additional_cost_eur !== 0) throw new Error('extension additional cost must remain zero');
  for (const flag of ['prod_authorized','prod_write_authorized','trading_access']) if (registry.extension?.[flag] !== false) throw new Error(`${flag} must be false`);
  for (const [id, ov] of Object.entries(registry.overrides ?? {})) {
    if (!registry.engine_ids.includes(id)) throw new Error(`override references noncanonical engine_id ${id}`);
    if (ov?.environment && ov.environment !== 'SCAFFOLD') throw new Error(`${id} override environment must be SCAFFOLD`);
    if (ov?.autonomous_prod === true) throw new Error(`${id} unsafe override autonomous_prod=true`);
  }
}
export function validateRegistryV1(registry, base = readJson(BASE_REGISTRY)) {
  if (!registry || typeof registry !== 'object' || Array.isArray(registry)) throw new Error('registry must be object');
  if (!Array.isArray(registry.engine_ids)) throw new Error('registry.engine_ids must be array');
  if (registry.count !== CANONICAL_COUNT || registry.engine_ids.length !== CANONICAL_COUNT) throw new Error(`V1 registry must contain exactly ${CANONICAL_COUNT} ids`);
  if (new Set(registry.engine_ids).size !== CANONICAL_COUNT) throw new Error('V1 engine ids must be unique');
  if (base.count !== BASE_COUNT || base.engine_ids.length !== BASE_COUNT) throw new Error('base registry drift');
  const prefix = registry.engine_ids.slice(0, BASE_COUNT);
  if (JSON.stringify(prefix) !== JSON.stringify(base.engine_ids)) throw new Error('V1 must preserve all 177 base engine ids in exact order');
  const tail = registry.engine_ids.slice(BASE_COUNT);
  if (JSON.stringify(tail) !== JSON.stringify(ADDED)) throw new Error('V1 extension must add only HCI-001 and MOTION-001');
  if (JSON.stringify(registry.extension?.added_engine_ids) !== JSON.stringify(ADDED)) throw new Error('extension metadata mismatch');
  if (registry.extension?.preserve_base_ids !== true || registry.extension?.replace_existing_engines !== false) throw new Error('non-breaking extension contract missing');
  assertSafe(registry);
  return { engines: CANONICAL_COUNT, unique_ids: CANONICAL_COUNT, canonical_count: CANONICAL_COUNT, base_count: BASE_COUNT, base_preserved: true, added_engine_ids: ADDED, safe_scaffold: true };
}
function listFiles(root) {
  const out=[]; const walk=(dir)=>{for(const name of fs.readdirSync(dir).sort()){const full=path.join(dir,name);const st=fs.statSync(full);if(st.isDirectory())walk(full);else if(st.isFile())out.push(path.relative(root,full).replaceAll(path.sep,'/'));}}; walk(root); return out;
}
function digest(root, files) {
  const content = files.slice().sort().map(rel => `${rel}\n${fs.readFileSync(path.join(root,rel),'utf8')}`).join('\n');
  return crypto.createHash('sha256').update(content).digest('hex');
}
function cloneScaffold(source, target, fromId, toId, override) {
  fs.mkdirSync(target, {recursive:true});
  for (const rel of listFiles(source)) {
    const src=path.join(source,rel), dst=path.join(target,rel); fs.mkdirSync(path.dirname(dst),{recursive:true});
    const text=fs.readFileSync(src,'utf8').split(fromId).join(toId); fs.writeFileSync(dst,text,'utf8');
  }
  const manifestFile=path.join(target,'manifest.json');
  const manifest=readJson(manifestFile); manifest.name=override?.name ?? toId; manifest.layer=override?.layer ?? manifest.layer; fs.writeFileSync(manifestFile,json(manifest),'utf8');
  const files=listFiles(target); if(files.length!==EXPECTED_FILES) throw new Error(`${toId}: expected ${EXPECTED_FILES} scaffold files, got ${files.length}`);
  return { engine_id:toId, version:manifest.version ?? '0.1.0', files:files.length, sha256:digest(target,files) };
}
export function generateRegistryV1(registryFile, outDir) {
  const registry=readJson(registryFile); validateRegistryV1(registry);
  const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-factory-v1-'));
  try {
    execFileSync(process.execPath,[BASE_FACTORY,'generate','--registry',BASE_REGISTRY,'--out',scratch],{stdio:'pipe'});
    fs.rmSync(outDir,{recursive:true,force:true}); fs.cpSync(scratch,outDir,{recursive:true});
    const index=readJson(path.join(outDir,'skeleton-index.json'));
    if(index.engine_count!==BASE_COUNT) throw new Error('base factory output drift');
    const template=path.join(outDir,'engines',TEMPLATE_ENGINE);
    for(const id of ADDED){const target=path.join(outDir,'engines',id);const row=cloneScaffold(template,target,TEMPLATE_ENGINE,id,registry.overrides?.[id]);index.engines.push(row);}
    index.generated_by='FACT-001-V1_NON_BREAKING_EXTENSION'; index.engine_count=CANONICAL_COUNT; index.template_file_count=EXPECTED_FILES; index.base_engine_count=BASE_COUNT; index.added_engine_ids=ADDED;
    fs.writeFileSync(path.join(outDir,'skeleton-index.json'),json(index),'utf8');
    return index;
  } finally { fs.rmSync(scratch,{recursive:true,force:true}); }
}

const args=parseArgs(process.argv);
if(args.command==='validate') console.log(JSON.stringify(validateRegistryV1(readJson(args.registry))));
else if(args.command==='generate'){if(!args.out)throw new Error('--out is required');const index=generateRegistryV1(args.registry,path.resolve(args.out));console.log(JSON.stringify({generated:index.engine_count,out:path.resolve(args.out),base_preserved:true}));}
else throw new Error('Usage: node factory-v1.mjs <validate|generate> [--registry file] [--out dir]');
