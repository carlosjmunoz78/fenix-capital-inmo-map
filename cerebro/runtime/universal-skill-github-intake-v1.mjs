#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runRepositoryActivation} from './universal-skill-repository-intake-v1.mjs';

const VERSION='1.1.1';
const MAX_REMOTE_BYTES=512*1024;
const UA='CEREBRO-USAF-PREPROD/1.1';
const FILES=['cerebro.skill.json','skill.json','SKILL.md','package.json','README.md'];
const LICENSE_FILES=['LICENSE','LICENSE.md','LICENSE.txt'];
function req(v,label,max=4096){if(typeof v!=='string'||!v.trim())throw new Error(`${label} required`);const out=v.trim();if(out.length>max)throw new Error(`${label} too long`);return out;}
function authority(){return {prod_authorized:false,prod_write_authorized:false,prod_mutation_authorized:false,external_skill_code_execution:false,dependency_install_authorized:false,customer_data_used:false,paid_fallback:false,trading_access:false,additional_cost_eur:0};}
function safeSegment(v,label){const out=req(v,label,240);if(!/^[A-Za-z0-9_.-]+$/.test(out)||out==='.'||out==='..')throw new Error(`${label} unsafe`);return out;}
function safeSubpath(v=''){const out=String(v??'').replace(/^\/+|\/+$/g,'');if(!out)return '';for(const part of out.split('/'))safeSegment(part,'path segment');return out;}
function yamlScalar(text,key){const m=text.match(new RegExp(`^${key}:\\s*(.+)$`,'mi'));if(!m)return null;let v=m[1].trim();if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'")))v=v.slice(1,-1);return v.trim();}
function yamlList(text,key){const raw=yamlScalar(text,key);if(!raw)return [];if(raw.startsWith('[')&&raw.endsWith(']'))return raw.slice(1,-1).split(',').map((x)=>x.trim().replace(/^['"]|['"]$/g,'')).filter(Boolean);return [raw];}
function detectLicense(meta,licenseText){const spdx=meta?.license?.spdx_id;if(typeof spdx==='string'&&spdx&&spdx!=='NOASSERTION')return spdx;if(/^MIT License\b/im.test(licenseText??''))return 'MIT';if(/Apache License[\s\S]{0,80}Version 2\.0/i.test(licenseText??''))return 'Apache-2.0';return null;}
function isCommitSha(value){return /^[a-f0-9]{40}$/i.test(String(value??''));}
function requestHeaders(url,{json=false,token=null}={}){const out={'accept':json?'application/vnd.github+json':'text/plain','user-agent':UA};const host=new URL(url).hostname;if(token&&host==='api.github.com')out.authorization=`Bearer ${token}`;return out;}
function technicalSlug(value,fallback='remote-skill'){const raw=String(value??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9_.-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,120);return raw||fallback;}
function headingName(text){const m=String(text??'').match(/^#\s+(.+)$/m);return m?m[1].replace(/[`*_]/g,'').trim():null;}
function stripFrontmatter(text){const src=String(text??'');return src.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/,'');}
function semanticText(text){return stripFrontmatter(text).replace(/```[\s\S]*?```/g,' ').replace(/!\[[^\]]*\]\([^)]*\)/g,' ').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/^#{1,6}\s+/gm,'').replace(/^[-*>]\s+/gm,'').replace(/\s+/g,' ').trim();}
function firstUsefulDescription(text){const body=stripFrontmatter(text);const blocks=body.split(/\n\s*\n+/).map((x)=>x.replace(/^#{1,6}\s+/gm,'').replace(/^[-*>]\s+/gm,'').replace(/\s+/g,' ').trim()).filter(Boolean);for(const block of blocks){if(block.length<24)continue;if(/^(name|description|tags?)\s*:/i.test(block))continue;if(/^https?:\/\//i.test(block))continue;return block.slice(0,600);}const flat=semanticText(text);return flat.length>=24?flat.slice(0,600):null;}
function semanticTerms(text,tags=[]){const flat=semanticText(text).slice(0,3500);const words=flat.toLowerCase().match(/[a-z0-9][a-z0-9+_.-]{2,31}/g)??[];const unique=[];for(const value of [...tags,...words]){const v=String(value).trim();if(v&&!unique.includes(v)){unique.push(v);if(unique.length>=80)break;}}if(flat.length>=24)unique.push(flat);return unique;}

export function parseGitHubSkillUrl(raw){
  const url=new URL(req(raw,'github_url',2048));if(url.protocol!=='https:'||url.hostname!=='github.com'||url.username||url.password||url.search||url.hash)throw new Error('GITHUB_PUBLIC_HTTPS_URL_REQUIRED');
  const parts=url.pathname.split('/').filter(Boolean);if(parts.length<2)throw new Error('GITHUB_OWNER_REPO_REQUIRED');const owner=safeSegment(parts[0],'owner');const repo=safeSegment(parts[1].replace(/\.git$/,''),'repo');
  let ref=null,subpath='';if(parts[2]==='tree'){if(parts.length<4)throw new Error('GITHUB_TREE_REF_REQUIRED');ref=safeSegment(parts[3],'ref');subpath=safeSubpath(parts.slice(4).join('/'));}else if(parts.length>2)throw new Error('GITHUB_URL_SHAPE_UNSUPPORTED');
  return Object.freeze({owner,repo,ref,subpath,canonical_repo_url:`https://github.com/${owner}/${repo}`});
}

async function fetchBounded(url,{fetch_impl=fetch,json=false,allow404=false,token=null}={}){
  const response=await fetch_impl(url,{method:'GET',redirect:'error',headers:requestHeaders(url,{json,token})});
  if(response.status===404&&allow404)return null;if(response.status<200||response.status>=300)throw new Error(`GITHUB_REMOTE_HTTP_${response.status}`);
  const len=Number(response.headers?.get?.('content-length')??0);if(Number.isFinite(len)&&len>MAX_REMOTE_BYTES)throw new Error('GITHUB_REMOTE_FILE_TOO_LARGE');const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length>MAX_REMOTE_BYTES)throw new Error('GITHUB_REMOTE_FILE_TOO_LARGE');const text=bytes.toString('utf8');return json?JSON.parse(text):text;
}

async function resolvePinnedSource(parsed,fetch_impl,token){
  const meta=await fetchBounded(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`,{fetch_impl,json:true,token});if(meta?.private===true)throw new Error('PUBLIC_REPOSITORY_REQUIRED');if(meta?.archived===true)throw new Error('ARCHIVED_REPOSITORY_HOLD');
  const ref=parsed.ref??safeSegment(meta?.default_branch??'main','default_branch');
  if(isCommitSha(ref))return Object.freeze({meta,ref:ref.toLowerCase(),sha:ref.toLowerCase(),resolution:'URL_PINNED_SHA'});
  const commit=await fetchBounded(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/commits/${encodeURIComponent(ref)}`,{fetch_impl,json:true,token});const sha=req(commit?.sha,'commit sha',80);if(!isCommitSha(sha))throw new Error('GITHUB_COMMIT_SHA_INVALID');return Object.freeze({meta,ref,sha:sha.toLowerCase(),resolution:'API_RESOLVED_REF'});
}
function rawUrl(parsed,sha,file){const rel=safeSubpath([parsed.subpath,file].filter(Boolean).join('/'));return `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${sha}/${rel}`;}

function inferManifest(sourceText,{license,repoFullName,sha,sourceName='SKILL.md',fallbackName='remote-skill'}){
  const explicitName=yamlScalar(sourceText,'name');const explicitDescription=yamlScalar(sourceText,'description');const declared=Boolean(explicitName&&explicitDescription);const heading=headingName(sourceText);const tags=yamlList(sourceText,'tags');const description=explicitDescription??firstUsefulDescription(sourceText);const semantic=semanticText(sourceText);
  if(!description)return null;if(!declared&&(description.length<24||semantic.length<80))return null;
  const technical_name=technicalSlug(explicitName??heading??fallbackName,technicalSlug(fallbackName));const terms=semanticTerms(sourceText,tags);
  if(!technical_name||(!declared&&terms.length<3))return null;
  return {schema_version:'1.1.0',technical_name,version:`github-${sha.slice(0,12)}`,license,description,origin:{repository:repoFullName,commit_sha:sha,source:sourceName,inference:declared?'DECLARED_FRONTMATTER':'DETERMINISTIC_DOCUMENT_FALLBACK',read_only:true},capabilities:[{technical_name,description,terms,declared_domains:[]}],policy:{external_code_execution:false,dependency_install_authorized:false,prod_authorized:false,prod_write_authorized:false,prod_mutation_authorized:false,trading_access:false,additional_cost_eur:0}};
}

export async function acquirePublicGitHubSkill({github_url,fetch_impl=fetch,token=process.env.GITHUB_TOKEN??null}={}){
  const parsed=parseGitHubSkillUrl(github_url);const pinned=await resolvePinnedSource(parsed,fetch_impl,token);const acquired=new Map();
  for(const name of FILES){const text=await fetchBounded(rawUrl(parsed,pinned.sha,name),{fetch_impl,allow404:true});if(text!=null)acquired.set(name,text);}
  let licenseText=null;for(const name of LICENSE_FILES){const text=await fetchBounded(`https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${pinned.sha}/${name}`,{fetch_impl,allow404:true});if(text!=null){licenseText=text;acquired.set('LICENSE',text);break;}}
  const license=detectLicense(pinned.meta,licenseText);if(!license)throw new Error('LICENSE_INCOMPATIBLE_OR_UNVERIFIED');
  if(!acquired.has('cerebro.skill.json')&&!acquired.has('skill.json')){
    const sourceName=acquired.has('SKILL.md')?'SKILL.md':acquired.has('README.md')?'README.md':null;
    if(sourceName){const source=acquired.get(sourceName);const fallbackName=(parsed.subpath.split('/').filter(Boolean).pop()??parsed.repo);const inferred=inferManifest(source,{license,repoFullName:`${parsed.owner}/${parsed.repo}`,sha:pinned.sha,sourceName,fallbackName});if(inferred)acquired.set('cerebro.skill.json',`${JSON.stringify(inferred,null,2)}\n`);}
  }
  if(!acquired.has('cerebro.skill.json')&&!acquired.has('skill.json'))return Object.freeze({status:'HUMAN_REQUIRED',human_required:'LOW_CONFIDENCE',reason:'NO_MACHINE_READABLE_OR_INFERABLE_SKILL_MANIFEST',parsed,pinned_sha:pinned.sha,...authority()});
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cerebro-github-skill-'));for(const [name,text] of acquired)fs.writeFileSync(path.join(dir,name),text,{mode:0o600});
  return Object.freeze({status:'ACQUIRED_READONLY',repo_dir:dir,source_locator:`github://${parsed.owner}/${parsed.repo}@${pinned.sha}/${parsed.subpath}`,github_url,owner:parsed.owner,repo:parsed.repo,ref:pinned.ref,pinned_sha:pinned.sha,pin_resolution:pinned.resolution,subpath:parsed.subpath,file_count:acquired.size,license_spdx:license,read_only:true,...authority()});
}

export async function runGitHubRepositoryActivation({github_url,company_id='fenix',fetch_impl=fetch,token=process.env.GITHUB_TOKEN??null,root_dir=null,source_run_id=1,source_head_sha='0000000000000000000000000000000000000001'}={}){
  let acquisition;try{acquisition=await acquirePublicGitHubSkill({github_url,fetch_impl,token});}catch(error){return Object.freeze({schema_version:'1.1.0',state_type:'CEREBRO_GITHUB_REPOSITORY_ACTIVATION_REPORT_V1',status:'REJECTED',terminal_state:'REJECTED',reason:String(error.message??error),github_url,full_safe_preprod:false,...authority()});}
  if(acquisition.status!=='ACQUIRED_READONLY')return Object.freeze({schema_version:'1.1.0',state_type:'CEREBRO_GITHUB_REPOSITORY_ACTIVATION_REPORT_V1',status:acquisition.status,terminal_state:null,reason:acquisition.reason,human_required:acquisition.human_required??null,github_url,pinned_sha:acquisition.pinned_sha??null,full_safe_preprod:false,...authority()});
  const activation=runRepositoryActivation({repo_dir:acquisition.repo_dir,source_locator:acquisition.source_locator,company_id,root_dir,source_run_id,source_head_sha});
  return Object.freeze({schema_version:'1.1.0',state_type:'CEREBRO_GITHUB_REPOSITORY_ACTIVATION_REPORT_V1',status:activation.status,terminal_state:activation.terminal_state,full_safe_preprod:activation.full_safe_preprod===true,github_url,source_locator:acquisition.source_locator,pinned_sha:acquisition.pinned_sha,license_spdx:acquisition.license_spdx,acquisition:Object.freeze({status:acquisition.status,owner:acquisition.owner,repo:acquisition.repo,ref:acquisition.ref,pin_resolution:acquisition.pin_resolution,subpath:acquisition.subpath,file_count:acquisition.file_count,read_only:true}),activation,...authority()});
}

if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname)){
  const url=process.argv[2];if(!url){process.stderr.write('Usage: node universal-skill-github-intake-v1.mjs <github-url>\n');process.exitCode=2;}else{runGitHubRepositoryActivation({github_url:url,source_run_id:Number(process.env.GITHUB_RUN_ID??1),source_head_sha:process.env.GITHUB_SHA??'0000000000000000000000000000000000000001'}).then((report)=>{process.stdout.write(`${JSON.stringify({status:report.status,full_safe_preprod:report.full_safe_preprod,pinned_sha:report.pinned_sha??null,terminal_state:report.terminal_state??null,reason:report.reason??null,external_skill_code_execution:report.external_skill_code_execution,additional_cost_eur:report.additional_cost_eur},null,2)}\n`);if(report.full_safe_preprod!==true)process.exitCode=1;}).catch((error)=>{process.stderr.write(`${JSON.stringify({status:'RED_FAIL_CLOSED',error:String(error.message??error)})}\n`);process.exitCode=1;});}
}
