import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const DEFAULT_QUERIES=Object.freeze([
  'agent skills SKILL.md',
  'claude skills SKILL.md',
  'codex skills SKILL.md'
]);
const MAX_REPOS=8;
const MAX_MANIFESTS_PER_REPO=4;
const MAX_CANDIDATES=24;

function stableId(value){return createHash('sha256').update(String(value)).digest('hex').slice(0,20);}
function encodePath(p){return String(p).split('/').map(encodeURIComponent).join('/');}

async function githubJson(url,{token=process.env.GITHUB_TOKEN,fetchImpl=fetch,timeoutMs=8000}={}){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  const headers={accept:'application/vnd.github+json','x-github-api-version':'2022-11-28','user-agent':'CEREBRO-OS-GitHubWideSkillScout/0.1 (+read-only)'};
  if(token) headers.authorization=`Bearer ${token}`;
  try{
    const response=await fetchImpl(url,{headers,signal:controller.signal,redirect:'follow'});
    const raw=await response.text();
    if(!response.ok){const e=new Error(`GitHub HTTP ${response.status}`);e.status=response.status;e.body=raw;throw e;}
    return raw?JSON.parse(raw):{};
  } finally {clearTimeout(timer);}
}

export function isSkillManifestPath(p){
  const value=String(p??'');
  return /(^|\/)SKILL\.md$/i.test(value)&&/(^|\/)(?:skills?|agent-skills|\.claude\/skills)(\/|$)/i.test(value);
}

export function candidatesFromRepoTree(repo,tree,{maxPerRepo=MAX_MANIFESTS_PER_REPO}={}){
  if(!repo?.full_name||!repo?.html_url||!repo?.default_branch) return [];
  return (tree?.tree??[])
    .filter((entry)=>entry?.type==='blob'&&isSkillManifestPath(entry.path))
    .sort((a,b)=>String(a.path).localeCompare(String(b.path)))
    .slice(0,maxPerRepo)
    .map((entry)=>{
      const sourceRef=`${repo.html_url}/blob/${encodeURIComponent(repo.default_branch)}/${encodePath(entry.path)}`;
      return {
        candidate_id:`github-wide-skills:${stableId(`${repo.full_name}@${entry.path}`)}`,
        source_ref:sourceRef,
        primary_upstream_hint:repo.html_url,
        upstream_hints:[repo.html_url],
        manifest_path_hint:entry.path,
        status:'PRIMARY_UPSTREAM_HINT_FOUND',
        error:null,
        executed:false
      };
    });
}

export async function runGithubWideDiscovery({queries=DEFAULT_QUERIES,token=process.env.GITHUB_TOKEN,fetchImpl=fetch,observedAt=new Date().toISOString(),maxRepos=MAX_REPOS,maxCandidates=MAX_CANDIDATES}={}){
  const source={source_id:'github-wide-skills',source_url:'https://github.com/search?type=repositories&q=agent+skills',observed_at:observedAt,status:'OK',candidates:[],error:null};
  if(!token){source.status='SOURCE_FETCH_FAILED';source.error='GITHUB_TOKEN_REQUIRED_FOR_BOUNDED_PUBLIC_REPOSITORY_SEARCH';return Object.freeze({schema_version:'0.1.0',execution_mode:'GITHUB_WIDE_READ_ONLY_DISCOVERY',observed_at:observedAt,sources_total:1,sources_ok:0,candidates_discovered:0,upstream_hints_found:0,primary_upstreams_found:0,results:[source],code_executed:false,instructions_interpreted:false});}
  try{
    const byRepo=new Map();
    for(const q of queries){
      const url=`https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=updated&order=desc&per_page=10`;
      const data=await githubJson(url,{token,fetchImpl});
      for(const repo of data.items??[]){
        if(!repo?.full_name||repo.archived===true||repo.disabled===true||repo.fork===true) continue;
        if(repo.full_name==='carlosjmunoz78/fenix-capital-inmo-map') continue;
        if(!byRepo.has(repo.full_name.toLowerCase())) byRepo.set(repo.full_name.toLowerCase(),repo);
        if(byRepo.size>=maxRepos) break;
      }
      if(byRepo.size>=maxRepos) break;
    }
    for(const repo of byRepo.values()){
      if(source.candidates.length>=maxCandidates) break;
      if(!repo.default_branch) continue;
      try{
        const tree=await githubJson(`https://api.github.com/repos/${repo.full_name}/git/trees/${encodeURIComponent(repo.default_branch)}?recursive=1`,{token,fetchImpl});
        if(tree.truncated===true) continue;
        for(const candidate of candidatesFromRepoTree(repo,tree)){
          if(source.candidates.length>=maxCandidates) break;
          source.candidates.push(candidate);
        }
      } catch (err){
        if(err?.status===403||err?.status===429){source.status=source.candidates.length?'PARTIAL_RATE_LIMIT':'SOURCE_FETCH_FAILED';source.error='GITHUB_RATE_LIMIT_OR_INTEGRATION_LIMIT';break;}
      }
    }
  } catch(err){source.status='SOURCE_FETCH_FAILED';source.error=String(err?.message??err);}
  const ok=source.status==='OK'||source.status==='PARTIAL_RATE_LIMIT';
  return Object.freeze({
    schema_version:'0.1.0',execution_mode:'GITHUB_WIDE_READ_ONLY_DISCOVERY',observed_at:observedAt,
    sources_total:1,sources_ok:ok?1:0,candidates_discovered:source.candidates.length,
    upstream_hints_found:source.candidates.length,primary_upstreams_found:source.candidates.length,
    results:[source],code_executed:false,instructions_interpreted:false,external_skill_code_executed:false,
    prod_authorized:false,additional_cost_eur:0
  });
}

function argValue(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
if(import.meta.url===`file://${process.argv[1]}`){
  const output=argValue('--output')??'artifacts/cerebro-skill-github-wide-discovery.json';
  const report=await runGithubWideDiscovery();
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,`${JSON.stringify(report,null,2)}\n`,'utf8');
  console.log(JSON.stringify({output,status:report.results[0]?.status,candidates_discovered:report.candidates_discovered,code_executed:false,external_skill_code_executed:false,prod_authorized:false,additional_cost_eur:0}));
}

export {DEFAULT_QUERIES};
