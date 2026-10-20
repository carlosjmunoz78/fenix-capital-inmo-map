#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const VERSION='1.0.0';
const PREPROD='PREPROD';
const API='https://api.github.com';
const DEFAULT_REGISTRY='cerebro/registry/skill-known-repository-pool-v1.json';

function authority(){return {prod_authorized:false,prod_write_authorized:false,prod_mutation_authorized:false,permission_expansion_authorized:false,external_skill_code_execution:false,dependency_install_authorized:false,customer_data_used:false,paid_fallback:false,spend_authorized:false,trading_access:false,additional_cost_eur:0};}
function req(value,label,max=4096){if(typeof value!=='string'||!value.trim())throw new Error(`${label} required`);const out=value.trim();if(out.length>max)throw new Error(`${label} too long`);return out;}
function positiveInt(value,label,min,max){const n=Number(value);if(!Number.isInteger(n)||n<min||n>max)throw new Error(`${label} must be ${min}..${max}`);return n;}
function safeFullName(value){const full=req(value,'repository',300);if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(full))throw new Error(`unsafe repository:${full}`);return full;}
function headers(token){const out={'accept':'application/vnd.github+json','user-agent':'CEREBRO-SKILL-POOL/1.0'};if(token)out.authorization=`Bearer ${token}`;return out;}
async function fetchJson(url,{fetch_impl=fetch,token=null}={}){const response=await fetch_impl(url,{method:'GET',redirect:'error',headers:headers(token)});if(response.status<200||response.status>=300)return {ok:false,status:response.status,data:null};return {ok:true,status:response.status,data:await response.json()};}
function dirnamePosix(file){const normalized=String(file??'').replace(/\\/g,'/').replace(/^\/+|\/+$/g,'');if(!normalized)return '';const parts=normalized.split('/');parts.pop();return parts.join('/');}
function normalizeRoot(value){return String(value??'').replace(/\\/g,'/').replace(/^\/+|\/+$/g,'');}
function underRoots(file,roots){if(!roots.length)return true;return roots.some((root)=>!root||file===root||file.startsWith(`${root}/`));}
function familyForPath(value){const q=String(value??'').toLowerCase();if(/language|communication|conversation|dialogue|human|tone|voice|persona|customer|support|copy|brand/.test(q))return 'LANGUAGE_HUMAN_INTERACTION';if(/mobile|desktop|tablet|ios|android|react-native|flutter|pwa|app[-_/ ]/.test(q))return 'APP_DEV_CROSS_DEVICE';if(/frontend|website|web[-_/ ]|landing|nextjs|wordpress|accessibility|design/.test(q))return 'WEB_BUILD';if(/social|instagram|facebook|linkedin|twitter|scrap|browser|crawl/.test(q))return 'SOCIAL_PUBLIC_DATA_ACQUISITION';if(/statistics|analytics|analysis|forecast|metrics|kpi|data[-_/ ]/.test(q))return 'ANALYTICS_STATISTICS';if(/report|document|pdf|docx|spreadsheet|slides|presentation|dashboard/.test(q))return 'REPORTING_DOCUMENTS';return 'GENERAL_SKILL';}
function roundRobinByRepository(rows){const buckets=new Map();for(const row of rows){if(!buckets.has(row.repository))buckets.set(row.repository,[]);buckets.get(row.repository).push(row);}const repos=[...buckets.keys()];const out=[];let progress=true;while(progress){progress=false;for(const repo of repos){const bucket=buckets.get(repo);if(bucket?.length){out.push(bucket.shift());progress=true;}}}return out;}
function rotateWindow(rows,{limit,page}){if(rows.length<=limit)return rows;const start=((page-1)*limit)%rows.length;const out=[];for(let i=0;i<Math.min(limit,rows.length);i+=1)out.push(rows[(start+i)%rows.length]);return out;}

export function loadKnownRepositoryPool(file=DEFAULT_REGISTRY){const data=JSON.parse(fs.readFileSync(file,'utf8'));if(data?.state_type!=='CEREBRO_SKILL_KNOWN_REPOSITORY_POOL_V1')throw new Error('known repository pool registry invalid');if(data?.environment!=='PREPROD')throw new Error('known repository pool must be PREPROD');if(!Array.isArray(data?.repositories)||data.repositories.length===0)throw new Error('known repository pool repositories required');return data;}

export async function discoverKnownRepositorySkillSources({fetch_impl=fetch,token=null,registry,max_sources=24,pool_page=1}={}){
  if(!registry||registry.state_type!=='CEREBRO_SKILL_KNOWN_REPOSITORY_POOL_V1')throw new Error('registry required');
  const limit=positiveInt(max_sources,'max_sources',1,50);const page=positiveInt(pool_page,'pool_page',1,1000);
  const configs=[...registry.repositories].sort((a,b)=>Number(a.priority??999)-Number(b.priority??999)||String(a.repository).localeCompare(String(b.repository)));
  const all=[];const repoReports=[];
  for(const config of configs){
    let repository;try{repository=safeFullName(config.repository);}catch(error){repoReports.push({repository:String(config.repository??''),status:'INVALID_CONFIG',error:String(error.message)});continue;}
    const metaResult=await fetchJson(`${API}/repos/${repository}`,{fetch_impl,token});
    if(!metaResult.ok){repoReports.push({repository,status:'REPOSITORY_UNAVAILABLE',http_status:metaResult.status});continue;}
    const meta=metaResult.data;if(meta?.private===true||meta?.archived===true||meta?.disabled===true){repoReports.push({repository,status:'REPOSITORY_INELIGIBLE'});continue;}
    const branch=String(meta?.default_branch??'main').trim();if(!branch){repoReports.push({repository,status:'DEFAULT_BRANCH_MISSING'});continue;}
    const commitResult=await fetchJson(`${API}/repos/${repository}/commits/${encodeURIComponent(branch)}`,{fetch_impl,token});
    if(!commitResult.ok){repoReports.push({repository,status:'COMMIT_UNAVAILABLE',http_status:commitResult.status});continue;}
    const sha=String(commitResult.data?.sha??'').toLowerCase();if(!/^[a-f0-9]{40}$/.test(sha)){repoReports.push({repository,status:'PIN_INVALID'});continue;}
    const treeResult=await fetchJson(`${API}/repos/${repository}/git/trees/${sha}?recursive=1`,{fetch_impl,token});
    if(!treeResult.ok){repoReports.push({repository,status:'TREE_UNAVAILABLE',http_status:treeResult.status});continue;}
    const roots=(Array.isArray(config.roots)?config.roots:['']).map(normalizeRoot);const seenDirs=new Set();let descriptors=0;
    for(const item of treeResult.data?.tree??[]){if(item?.type!=='blob')continue;const file=String(item.path??'').replace(/\\/g,'/').replace(/^\/+|\/+$/g,'');if(!/(^|\/)(SKILL\.md|cerebro\.skill\.json)$/i.test(file))continue;if(!underRoots(file,roots))continue;const subpath=dirnamePosix(file);if(seenDirs.has(subpath))continue;seenDirs.add(subpath);descriptors+=1;all.push(Object.freeze({repository,pinned_sha:sha,subpath,source_file:file,capability_family:familyForPath(subpath||file),priority:Number(config.priority??999),source_class:String(config.source_class??'PUBLIC_SKILL_REPOSITORY'),tree_truncated:treeResult.data?.truncated===true}));}
    repoReports.push(Object.freeze({repository,status:descriptors>0?'READY':'NO_SKILL_DESCRIPTORS',pinned_sha:sha,descriptor_count:descriptors,tree_truncated:treeResult.data?.truncated===true}));
  }
  const ordered=roundRobinByRepository(all.sort((a,b)=>a.priority-b.priority||a.subpath.localeCompare(b.subpath)||a.repository.localeCompare(b.repository)));
  const selected=rotateWindow(ordered,{limit,page});
  const sources=selected.map((row)=>Object.freeze({...row,github_url:`https://github.com/${row.repository}/tree/${row.pinned_sha}${row.subpath?`/${row.subpath}`:''}`,pool_page:page,discovery_channel:'KNOWN_REPOSITORY_TREE_POOL'}));
  const status=sources.length?'POOL_SOURCES_DISCOVERED':'POOL_NO_SOURCES';
  return Object.freeze({schema_version:'1.0.0',state_type:'CEREBRO_SKILL_KNOWN_REPOSITORY_POOL_REPORT_V1',status,company_id:'MULTI',engine_id:'FACT-001',environment:PREPROD,version:VERSION,source_count:sources.length,max_sources:limit,pool_page:page,total_descriptors:ordered.length,repositories_scanned:repoReports.length,repository_reports:Object.freeze(repoReports),families_represented:Object.freeze([...new Set(sources.map((x)=>x.capability_family))]),sources:Object.freeze(sources),search_dependency:false,...authority()});
}

export function buildKnownPoolEvent({report,company_id='fenix'}={}){if(!report||report.state_type!=='CEREBRO_SKILL_KNOWN_REPOSITORY_POOL_REPORT_V1')throw new Error('known pool report required');const company=req(company_id,'company_id',120);return Object.freeze({schema_version:'1.0.0',state_type:'CEREBRO_SKILL_KNOWN_REPOSITORY_POOL_EVENT_V1',status:report.status,company_id:company,engine_id:'FACT-001',environment:PREPROD,version:VERSION,discovery:Object.freeze({discovery_channel:'KNOWN_REPOSITORY_TREE_POOL',search_dependency:false,source_count:report.source_count,pool_page:report.pool_page,total_descriptors:report.total_descriptors,repositories_scanned:report.repositories_scanned,repository_reports:report.repository_reports,families_represented:report.families_represented,sources:report.sources}),client_payload:Object.freeze({company_id:company,github_urls:Object.freeze(report.sources.map((x)=>x.github_url))}),...authority()});}

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
const isEntrypoint=Boolean(process.argv[1])&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isEntrypoint){try{const out=req(arg('--out')??process.env.CEREBRO_SKILL_POOL_EVENT,'--out');const registryFile=arg('--registry')??process.env.CEREBRO_SKILL_POOL_REGISTRY??DEFAULT_REGISTRY;const max=positiveInt(process.env.CEREBRO_SKILL_POOL_MAX??process.env.CEREBRO_SKILL_SCOUT_MAX??24,'CEREBRO_SKILL_POOL_MAX',1,50);const company=process.env.CEREBRO_COMPANY_ID??'fenix';const explicitPage=process.env.CEREBRO_SKILL_POOL_PAGE;const runNumber=Math.max(1,Number(process.env.GITHUB_RUN_NUMBER??1)||1);const page=explicitPage?positiveInt(explicitPage,'CEREBRO_SKILL_POOL_PAGE',1,1000):1+((runNumber-1)%20);const registry=loadKnownRepositoryPool(registryFile);const report=await discoverKnownRepositorySkillSources({token:process.env.GITHUB_TOKEN??null,registry,max_sources:max,pool_page:page});const event=buildKnownPoolEvent({report,company_id:company});fs.mkdirSync(path.dirname(path.resolve(out)),{recursive:true});fs.writeFileSync(out,`${JSON.stringify(event,null,2)}\n`,{mode:0o600});process.stdout.write(`${JSON.stringify({status:report.status,source_count:report.source_count,total_descriptors:report.total_descriptors,repositories_scanned:report.repositories_scanned,pool_page:report.pool_page,search_dependency:false,families_represented:report.families_represented,environment:PREPROD,additional_cost_eur:0})}\n`);}catch(error){process.stderr.write(`${JSON.stringify({status:'RED_FAIL_CLOSED',error:String(error?.message??error),...authority()})}\n`);process.exitCode=1;}}
