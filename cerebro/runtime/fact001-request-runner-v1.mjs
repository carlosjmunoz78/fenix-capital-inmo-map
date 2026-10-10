#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { validateFactoryRequest } from './fact001-request-runner.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,'..');
const FACTORY=path.join(ROOT,'factory-v1.mjs');
const DEFAULT_REGISTRY=path.join(ROOT,'registry','engine-registry.v1.json');
function sha256(v){return crypto.createHash('sha256').update(v).digest('hex')}
function canonicalize(v){if(Array.isArray(v))return v.map(canonicalize);if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonicalize(v[k])]));return v}
function listFiles(root){const files=[];const walk=d=>{for(const n of fs.readdirSync(d).sort()){const f=path.join(d,n),s=fs.statSync(f);if(s.isDirectory())walk(f);else if(s.isFile())files.push(path.relative(root,f).replaceAll(path.sep,'/'));}};walk(root);return files}
function bundleDigest(root,files){const h=crypto.createHash('sha256');for(const rel of files){h.update(rel);h.update('\0');h.update(fs.readFileSync(path.join(root,rel)));h.update('\0')}return h.digest('hex')}
export function runFactoryRequestV1({requestFile,outDir,registryFile=DEFAULT_REGISTRY}){
  const rawRequest=JSON.parse(fs.readFileSync(requestFile,'utf8'));const registry=JSON.parse(fs.readFileSync(registryFile,'utf8'));const request=validateFactoryRequest(rawRequest,registry);
  const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'fact001-v1-'));
  try{
    execFileSync(process.execPath,[FACTORY,'validate','--registry',registryFile],{stdio:'pipe'});
    execFileSync(process.execPath,[FACTORY,'generate','--registry',registryFile,'--out',scratch],{stdio:'pipe'});
    const source=path.join(scratch,'engines',request.engine_id);if(!fs.existsSync(source)){const e=new Error('generated engine scaffold missing');e.code='LOW_CONFIDENCE';e.human_required='LOW_CONFIDENCE';throw e}
    const target=path.resolve(outDir);fs.rmSync(target,{recursive:true,force:true});fs.mkdirSync(target,{recursive:true});fs.cpSync(source,target,{recursive:true});
    const files=listFiles(target);if(files.length!==18){const e=new Error(`expected 18 scaffold files, got ${files.length}`);e.code='LOW_CONFIDENCE';e.human_required='LOW_CONFIDENCE';throw e}
    const registryBytes=fs.readFileSync(registryFile);const canonical=JSON.stringify(canonicalize(request));
    const result={schema_version:'1.1.0',state_type:'CEREBRO_FACT001_V1_AUTOMATIC_SCAFFOLD_RESULT',status:'FACTORY_SCAFFOLD_GREEN',request_id:request.request_id,idempotency_key:`fact001-v1:${sha256(canonical+':'+sha256(registryBytes))}`,company_id:request.company_id,engine_id:request.engine_id,environment:request.environment,version:request.version,intent:request.intent,generated_files:files,generated_file_count:files.length,bundle_sha256:bundleDigest(target,files),source_registry_sha256:sha256(registryBytes),base_registry_preserved:true,next_gate:'PREPROD_CONTRACT_TESTS_AND_EVALUATION_REQUIRED',human_required:[],additional_cost_eur:0,prod_authorized:false,prod_write_authorized:false,trading_access:false,external_code_execution:false};
    fs.writeFileSync(path.join(target,'fact001-result.json'),JSON.stringify(result,null,2)+'\n');return result;
  }finally{fs.rmSync(scratch,{recursive:true,force:true})}
}
function args(argv){const o={};for(let i=2;i<argv.length;i++){if(argv[i]==='--request')o.requestFile=argv[++i];else if(argv[i]==='--out')o.outDir=argv[++i];else if(argv[i]==='--registry')o.registryFile=argv[++i];else throw new Error(`unknown argument: ${argv[i]}`)}if(!o.requestFile||!o.outDir)throw new Error('Usage: node fact001-request-runner-v1.mjs --request <file> --out <dir> [--registry <file>]');return o}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{console.log(JSON.stringify(runFactoryRequestV1(args(process.argv))))}catch(error){console.error(JSON.stringify({status:'FACTORY_REQUEST_REJECTED',code:error?.code??'INVALID_REQUEST',human_required:error?.human_required??null,message:error?.message??'unknown',additional_cost_eur:0,prod_authorized:false,prod_write_authorized:false,trading_access:false}));process.exitCode=1}}
