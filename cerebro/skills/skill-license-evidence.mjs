import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const LICENSE_RE = /^(?:license|licence|copying|notice)(?:\.[a-z0-9._-]+)?$/i;
const MAX_LICENSE_BYTES = 256 * 1024;

function dirname(file) {
  const parts = String(file ?? '').split('/');
  parts.pop();
  return parts.join('/');
}

function basename(file) {
  return String(file ?? '').split('/').at(-1) ?? '';
}

function ancestorRoots(root) {
  const out = [];
  let current = root;
  while (true) {
    if (!out.includes(current)) out.push(current);
    if (!current) break;
    const idx = current.lastIndexOf('/');
    current = idx >= 0 ? current.slice(0, idx) : '';
  }
  return out;
}

export function rankLicensePaths(treeEntries, manifestPath) {
  const root = dirname(manifestPath);
  const ancestors = ancestorRoots(root);
  const candidates = (treeEntries ?? [])
    .filter((item) => item?.type === 'blob' && LICENSE_RE.test(basename(item.path)))
    .map((item) => {
      const dir = dirname(item.path);
      const ancestorIndex = ancestors.indexOf(dir);
      let rank = 999;
      if (ancestorIndex >= 0) rank = ancestorIndex;
      else if (!dir) rank = 50;
      else if (item.path.toLowerCase().startsWith(`${root.toLowerCase()}/`)) rank = 20;
      return {path: item.path, sha: item.sha ?? null, size: item.size ?? null, rank};
    })
    .sort((a,b) => a.rank-b.rank || a.path.localeCompare(b.path));
  return candidates.slice(0, 4);
}

export function detectLicenseFamily(content) {
  const text = String(content ?? '').toLowerCase();
  if (/apache license\s+version\s+2\.0/.test(text)) return 'Apache-2.0';
  if (/permission is hereby granted, free of charge, to any person obtaining a copy/.test(text)) return 'MIT';
  if (/gnu affero general public license/.test(text)) return 'AGPL';
  if (/gnu general public license/.test(text)) return 'GPL';
  if (/mozilla public license/.test(text)) return 'MPL';
  if (/redistribution and use in source and binary forms/.test(text)) return 'BSD-LIKE';
  if (/creative commons/.test(text)) return 'CC-FAMILY';
  return 'UNKNOWN';
}

async function githubJson(url, {token=process.env.GITHUB_TOKEN, timeoutMs=8000, fetchImpl=fetch}={}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const headers = {accept:'application/vnd.github+json','x-github-api-version':'2022-11-28','user-agent':'CEREBRO-OS-LicenseEvidence/0.1 (+read-only)'};
  if (token) headers.authorization=`Bearer ${token}`;
  try {
    const response=await fetchImpl(url,{headers,signal:controller.signal,redirect:'follow'});
    if(!response.ok){const error=new Error(`GitHub HTTP ${response.status}`);error.status=response.status;throw error;}
    return await response.json();
  } finally {clearTimeout(timer);}
}

function repoForCandidate(candidateId, upstreamReport){
  return (upstreamReport?.results??[]).find((repo)=>repo.status==='RESOLVED'&&(repo.discovery_candidate_ids??[]).includes(candidateId))??null;
}

function parts(repo){
  const [owner,name]=String(repo?.full_name??'').split('/');
  return owner&&name?{owner,name}:null;
}

async function fetchLicense(partsObj,filePath,ref,options){
  const encoded=filePath.split('/').map(encodeURIComponent).join('/');
  const file=await githubJson(`https://api.github.com/repos/${encodeURIComponent(partsObj.owner)}/${encodeURIComponent(partsObj.name)}/contents/${encoded}?ref=${encodeURIComponent(ref)}`,options);
  if(file.encoding!=='base64'||typeof file.content!=='string') throw new Error('unsupported license content encoding');
  const bytes=Buffer.from(file.content.replace(/\n/g,''),'base64');
  if(bytes.length>MAX_LICENSE_BYTES) throw new Error('license file exceeds cap');
  const content=bytes.toString('utf8');
  return {path:filePath,sha256:createHash('sha256').update(content).digest('hex'),bytes:bytes.length,detected_family:detectLicenseFamily(content),fetched:true};
}

export async function resolveLicenseEvidence(discovery,upstreams,manifests,{token=process.env.GITHUB_TOKEN,fetchImpl=fetch,timeoutMs=8000,observedAt=new Date().toISOString()}={}){
  const treeCache=new Map();
  const results=[];
  for(const source of discovery?.results??[]){
    for(const candidate of source.candidates??[]){
      const manifest=(manifests?.results??[]).find((m)=>m.candidate_id===candidate.candidate_id&&m.status==='MANIFEST_RESOLVED_STATIC_ONLY');
      const repo=repoForCandidate(candidate.candidate_id,upstreams);
      if(!repo||!manifest){
        results.push({candidate_id:candidate.candidate_id,status:'LICENSE_EVIDENCE_NOT_RESOLVABLE',repo_license_spdx:repo?.license_spdx??null,legal_compatibility:'UNASSESSED',executed:false});
        continue;
      }
      if(!repo.head_tree_sha||!repo.head_commit){
        results.push({candidate_id:candidate.candidate_id,status:'LICENSE_TREE_NOT_RESOLVED',upstream_full_name:repo.full_name,repo_license_spdx:repo.license_spdx??null,legal_compatibility:'UNASSESSED',executed:false});
        continue;
      }
      const p=parts(repo);
      const key=`${repo.full_name}@${repo.head_tree_sha}`;
      try{
        let tree=treeCache.get(key);
        if(!tree){
          tree=await githubJson(`https://api.github.com/repos/${encodeURIComponent(p.owner)}/${encodeURIComponent(p.name)}/git/trees/${encodeURIComponent(repo.head_tree_sha)}?recursive=1`,{token,fetchImpl,timeoutMs});
          treeCache.set(key,tree);
        }
        if(tree.truncated){
          results.push({candidate_id:candidate.candidate_id,status:'LICENSE_TREE_TRUNCATED',upstream_full_name:repo.full_name,repo_license_spdx:repo.license_spdx??null,legal_compatibility:'UNASSESSED',executed:false});
          continue;
        }
        const ranked=rankLicensePaths(tree.tree??[],manifest.manifest_path);
        const evidence=[];
        for(const item of ranked.slice(0,2)){
          try{evidence.push(await fetchLicense(p,item.path,repo.head_commit,{token,fetchImpl,timeoutMs}));}
          catch(err){evidence.push({path:item.path,fetched:false,error:String(err?.message??err),detected_family:null});}
        }
        const fetched=evidence.filter((e)=>e.fetched);
        results.push({
          candidate_id:candidate.candidate_id,
          source_ref:candidate.source_ref,
          upstream_full_name:repo.full_name,
          upstream_head_commit:repo.head_commit,
          manifest_path:manifest.manifest_path,
          repo_license_spdx:repo.license_spdx??null,
          repo_license_name:repo.license_name??null,
          status:fetched.length?'EXACT_LICENSE_FILE_EVIDENCE':'LICENSE_METADATA_ONLY',
          evidence_paths:ranked.map((r)=>r.path),
          exact_evidence:fetched,
          detected_families:[...new Set(fetched.map((e)=>e.detected_family).filter(Boolean))],
          metadata_matches_detected:fetched.length===0?null:fetched.some((e)=>e.detected_family===repo.license_spdx),
          legal_compatibility:'UNASSESSED',
          executed:false
        });
      }catch(err){
        results.push({candidate_id:candidate.candidate_id,status:'LICENSE_EVIDENCE_FETCH_FAILED',upstream_full_name:repo.full_name,repo_license_spdx:repo.license_spdx??null,error:String(err?.message??err),legal_compatibility:'UNASSESSED',executed:false});
      }
    }
  }
  const status_counts={};
  for(const item of results) status_counts[item.status]=(status_counts[item.status]??0)+1;
  return Object.freeze({schema_version:'0.1.0',execution_mode:'READ_ONLY_LICENSE_EVIDENCE',observed_at:observedAt,candidates_total:results.length,status_counts,legal_compatibility:'UNASSESSED',code_executed:false,results});
}

function argValue(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){
  const discovery=JSON.parse(fs.readFileSync(argValue('--discovery')??'artifacts/cerebro-skill-discovery.json','utf8'));
  const upstreams=JSON.parse(fs.readFileSync(argValue('--upstreams')??'artifacts/cerebro-skill-upstreams.json','utf8'));
  const manifests=JSON.parse(fs.readFileSync(argValue('--manifests')??'artifacts/cerebro-skill-manifests.json','utf8'));
  const output=argValue('--output')??'artifacts/cerebro-skill-license-evidence.json';
  const report=await resolveLicenseEvidence(discovery,upstreams,manifests);
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,`${JSON.stringify(report,null,2)}\n`,'utf8');
  console.log(JSON.stringify({output,candidates_total:report.candidates_total,status_counts:report.status_counts,legal_compatibility:'UNASSESSED',code_executed:false}));
}
