#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const VERSION='1.1.0';
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO_ROOT=path.resolve(__dirname,'../..');
const FILE_RE=/^cerebro-184-items-(\d+)-(\d+)-live-reconciliation\.v(\d+)\.json$/i;

function freeze(value){
  if(value&&typeof value==='object'){
    Object.freeze(value);
    for(const child of Object.values(value))freeze(child);
  }
  return value;
}

export function parseReconciliationFilename(filename){
  const match=FILE_RE.exec(path.basename(String(filename??'')));
  if(!match)return null;
  return freeze({start:Number(match[1]),end:Number(match[2]),version:Number(match[3]),filename:path.basename(filename)});
}

export function listRangeReconciliations({repo_root=DEFAULT_REPO_ROOT,start,end}){
  if(!Number.isInteger(start)||!Number.isInteger(end)||start<1||end<start)throw new Error('INVALID_RECONCILIATION_RANGE');
  const dir=path.join(path.resolve(repo_root),'cerebro','skills');
  if(!fs.existsSync(dir))return freeze([]);
  const rows=[];
  for(const filename of fs.readdirSync(dir)){
    const parsed=parseReconciliationFilename(filename);
    if(!parsed||parsed.start!==start||parsed.end!==end)continue;
    const ref=`cerebro/skills/${filename}`;
    const abs=path.join(dir,filename);
    const doc=JSON.parse(fs.readFileSync(abs,'utf8'));
    if(doc.catalog_range!==`${start}-${end}`||!Array.isArray(doc.items))throw new Error(`INVALID_RECONCILIATION_DOCUMENT:${ref}`);
    rows.push({ref,abs,start,end,version:parsed.version,doc});
  }
  rows.sort((a,b)=>a.version-b.version);
  return freeze(rows);
}

export function listLatestLegacyReconciliations({repo_root=DEFAULT_REPO_ROOT}={}){
  const dir=path.join(path.resolve(repo_root),'cerebro','skills');
  if(!fs.existsSync(dir))return freeze([]);
  const ranges=new Map();
  for(const filename of fs.readdirSync(dir)){
    const parsed=parseReconciliationFilename(filename);
    if(!parsed)continue;
    const key=`${parsed.start}-${parsed.end}`;
    const current=ranges.get(key);
    if(!current||parsed.version>current.version)ranges.set(key,{...parsed});
  }
  const rows=[];
  for(const parsed of ranges.values()){
    const ref=`cerebro/skills/${parsed.filename}`;
    const abs=path.join(dir,parsed.filename);
    const doc=JSON.parse(fs.readFileSync(abs,'utf8'));
    if(doc.catalog_range!==`${parsed.start}-${parsed.end}`||!Array.isArray(doc.items))throw new Error(`INVALID_RECONCILIATION_DOCUMENT:${ref}`);
    rows.push({ref,abs,start:parsed.start,end:parsed.end,version:parsed.version,doc});
  }
  rows.sort((a,b)=>a.start-b.start||a.end-b.end||a.version-b.version);
  return freeze(rows);
}

export function resolveLatestRangeReconciliation(args){
  const rows=listRangeReconciliations(args);
  if(rows.length===0)return null;
  const latest=rows.at(-1);
  return freeze({resolver_version:VERSION,ref:latest.ref,version:latest.version,doc:latest.doc,history_refs:rows.map(row=>row.ref)});
}

export function resolveCurrentLegacyItem({repo_root=DEFAULT_REPO_ROOT,item_id}){
  if(!Number.isInteger(item_id)||item_id<1)throw new Error('INVALID_LEGACY_ITEM_ID');
  const dir=path.join(path.resolve(repo_root),'cerebro','skills');
  if(!fs.existsSync(dir))return null;
  const candidates=[];
  for(const filename of fs.readdirSync(dir)){
    const parsed=parseReconciliationFilename(filename);
    if(!parsed||item_id<parsed.start||item_id>parsed.end)continue;
    candidates.push({parsed,filename});
  }
  candidates.sort((a,b)=>b.parsed.version-a.parsed.version);
  for(const candidate of candidates){
    const ref=`cerebro/skills/${candidate.filename}`;
    const doc=JSON.parse(fs.readFileSync(path.join(dir,candidate.filename),'utf8'));
    const item=Array.isArray(doc.items)?doc.items.find(row=>row?.id===item_id):null;
    if(!item)continue;
    return freeze({resolver_version:VERSION,item_id,ref,range:`${candidate.parsed.start}-${candidate.parsed.end}`,version:candidate.parsed.version,state_type:doc.state_type,item,authority:doc.authority??null});
  }
  return null;
}

export function assertNoProdAuthority(resolution){
  if(!resolution)return true;
  const authority=resolution.authority??{};
  if(authority.prod_authorized===true||authority.prod_write_authorized===true||authority.public_deploy_authorized===true)throw new Error('RECONCILIATION_PROD_AUTHORITY_FORBIDDEN');
  return true;
}

const invoked=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(invoked){
  const item_id=Number(process.argv[2]);
  const resolved=resolveCurrentLegacyItem({item_id});
  if(!resolved){process.stderr.write(`ITEM_NOT_FOUND:${process.argv[2]??''}\n`);process.exit(2);}
  assertNoProdAuthority(resolved);
  process.stdout.write(`${JSON.stringify(resolved,null,2)}\n`);
}
