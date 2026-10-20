#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const VERSION='1.2.0';
const PREPROD='PREPROD';
const API='https://api.github.com';
const SELF_REPO='carlosjmunoz78/fenix-capital-inmo-map';
const DEFAULT_QUERIES=Object.freeze([
  'filename:SKILL.md language communication conversation dialogue humanize tone voice persona customer support copywriter',
  'filename:SKILL.md synthetic user persona roleplay conversation evaluation communication coach',
  'filename:SKILL.md app development mobile desktop tablet ios android react native flutter pwa',
  'filename:SKILL.md web development frontend website landing react nextjs wordpress accessibility',
  'filename:SKILL.md social media scraping social listening instagram facebook linkedin twitter public data',
  'filename:SKILL.md statistics analytics data analysis forecast metrics kpi visualization',
  'filename:SKILL.md reporting report document generation pdf docx dashboard presentation',
  'filename:cerebro.skill.json language communication app web social analytics reporting',
  'filename:SKILL.md description',
  'filename:cerebro.skill.json technical_name'
]);

function authority(){return {prod_authorized:false,prod_write_authorized:false,prod_mutation_authorized:false,permission_expansion_authorized:false,external_skill_code_execution:false,dependency_install_authorized:false,customer_data_used:false,paid_fallback:false,spend_authorized:false,trading_access:false,additional_cost_eur:0};}
function req(value,label,max=4096){if(typeof value!=='string'||!value.trim())throw new Error(`${label} required`);const out=value.trim();if(out.length>max)throw new Error(`${label} too long`);return out;}
function positiveInt(value,label,min,max){const n=Number(value);if(!Number.isInteger(n)||n<min||n>max)throw new Error(`${label} must be ${min}..${max}`);return n;}
function dirnamePosix(file){const normalized=String(file??'').replace(/\\/g,'/').replace(/^\/+|\/+$/g,'');if(!normalized)return '';const parts=normalized.split('/');parts.pop();return parts.join('/');}
function safeFullName(value){const full=req(value,'repository.full_name',300);if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(full))throw new Error(`unsafe repository full_name:${full}`);return full;}
function headers(token){const out={'accept':'application/vnd.github+json','user-agent':'CEREBRO-USAF-SCOUT/1.2'};if(token)out.authorization=`Bearer ${token}`;return out;}
async function fetchJson(url,{fetch_impl=fetch,token=null,allow_error=false}={}){const response=await fetch_impl(url,{method:'GET',redirect:'error',headers:headers(token)});if(response.status<200||response.status>=300){if(allow_error)return {ok:false,status:response.status,data:null};throw new Error(`GITHUB_SCOUT_HTTP_${response.status}:${url}`);}return {ok:true,status:response.status,data:await response.json()};}
function familyForQuery(query,rank){const q=String(query??'').toLowerCase();if(/language|communication|conversation|dialogue|humanize|humaniser|humanizer|tone|voice|persona|copywriter|customer support/.test(q))return 'LANGUAGE_HUMAN_INTERACTION';if(/app development|mobile|desktop|tablet|ios|android|react native|flutter|\bpwa\b/.test(q))return 'APP_DEV_CROSS_DEVICE';if(/web development|frontend|website|landing|nextjs|wordpress|accessibility/.test(q))return 'WEB_BUILD';if(/social media|social listening|instagram|facebook|linkedin|twitter|public data|scrap/.test(q))return 'SOCIAL_PUBLIC_DATA_ACQUISITION';if(/statistics|analytics|data analysis|forecast|metrics|\bkpi\b|visualization/.test(q))return 'ANALYTICS_STATISTICS';if(/reporting|report document|document generation|\bpdf\b|docx|dashboard|presentation/.test(q))return 'REPORTING_DOCUMENTS';return `GENERAL_${rank+1}`;}
function diversifiedCandidateOrder(candidates){
  const earliest=new Map();
  for(const row of candidates){const key=`${row.full_name}|${row.subpath}`;const prior=earliest.get(key);if(!prior||row.query_rank<prior.query_rank)earliest.set(key,row);}
  const unique=[...earliest.values()].sort((a,b)=>a.query_rank-b.query_rank||a.full_name.localeCompare(b.full_name)||a.file_path.localeCompare(b.file_path));
  const buckets=new Map();const familyRank=new Map();
  for(const row of unique){if(!buckets.has(row.query_family))buckets.set(row.query_family,[]);buckets.get(row.query_family).push(row);familyRank.set(row.query_family,Math.min(familyRank.get(row.query_family)??999,row.query_rank));}
  const families=[...buckets.keys()].sort((a,b)=>(familyRank.get(a)??999)-(familyRank.get(b)??999)||a.localeCompare(b));
  const ordered=[];let progress=true;
  while(progress){progress=false;for(const family of families){const bucket=buckets.get(family);if(bucket?.length){ordered.push(bucket.shift());progress=true;}}}
  return Object.freeze({ordered:Object.freeze(ordered),families:Object.freeze(families)});
}
function deferredRateLimitReport({queryReports,limit}){return Object.freeze({schema_version:'1.2.0',state_type:'CEREBRO_AUTONOMOUS_SKILL_SCOUT_REPORT_V1',status:'DISCOVERY_DEFERRED_RATE_LIMIT',company_id:'MULTI',engine_id:'FACT-001',environment:PREPROD,version:VERSION,queries:Object.freeze(queryReports),raw_candidates:0,eligible_candidates:0,sources:Object.freeze([]),source_count:0,max_sources:limit,retry_required:true,retry_reason:'GITHUB_SEARCH_RATE_LIMIT',priority_first:true,diversity_mode:'ROUND_ROBIN_CAPABILITY_FAMILY',families_represented:Object.freeze([]),...authority()});}

export async function discoverPublicSkillSources({fetch_impl=fetch,token=null,queries=DEFAULT_QUERIES,max_sources=16,exclude_repositories=[SELF_REPO]}={}){
  const limit=positiveInt(max_sources,'max_sources',1,50);if(!Array.isArray(queries)||queries.length===0)throw new Error('queries required');
  const excluded=new Set((exclude_repositories??[]).map((x)=>String(x).toLowerCase()));const raw=[];const queryReports=[];
  for(let queryRank=0;queryRank<queries.length;queryRank+=1){const query=req(queries[queryRank],'query',500);const queryFamily=familyForQuery(query,queryRank);const url=`${API}/search/code?q=${encodeURIComponent(query)}&per_page=${Math.min(50,Math.max(limit*2,10))}`;const result=await fetchJson(url,{fetch_impl,token,allow_error:true});queryReports.push(Object.freeze({query,capability_family:queryFamily,priority_rank:queryRank+1,status:result.status,ok:result.ok,total_count:Number(result.data?.total_count??0)}));if(!result.ok)continue;for(const item of result.data?.items??[])raw.push({...item,__query_rank:queryRank,__query:query,__query_family:queryFamily});}
  if(queryReports.every((x)=>x.ok!==true)){
    if(queryReports.every((x)=>x.status===429))return deferredRateLimitReport({queryReports,limit});
    throw new Error(`GITHUB_SCOUT_ALL_QUERIES_FAILED:${queryReports.map((x)=>x.status).join(',')}`);
  }
  const candidates=[];for(const item of raw){let full;try{full=safeFullName(item?.repository?.full_name);}catch{continue;}if(excluded.has(full.toLowerCase()))continue;const filePath=String(item?.path??'').replace(/\\/g,'/');if(!/(^|\/)(SKILL\.md|cerebro\.skill\.json)$/i.test(filePath))continue;candidates.push({full_name:full,file_path:filePath,subpath:dirnamePosix(filePath),query_rank:Number(item?.__query_rank??999),query_family:String(item?.__query_family??`GENERAL_${Number(item?.__query_rank??999)+1}`),search_query:String(item?.__query??'')});}
  const diversified=diversifiedCandidateOrder(candidates);const orderedCandidates=diversified.ordered;
  const repoCache=new Map();const commitCache=new Map();const sources=[];const seen=new Set();
  for(const candidate of orderedCandidates){if(sources.length>=limit)break;let meta=repoCache.get(candidate.full_name);if(!meta){const result=await fetchJson(`${API}/repos/${candidate.full_name}`,{fetch_impl,token,allow_error:true});if(!result.ok)continue;meta=result.data;repoCache.set(candidate.full_name,meta);}if(meta?.private===true||meta?.archived===true||meta?.disabled===true)continue;const defaultBranch=String(meta?.default_branch??'main').trim();if(!defaultBranch)continue;const commitKey=`${candidate.full_name}@${defaultBranch}`;let sha=commitCache.get(commitKey);if(!sha){const result=await fetchJson(`${API}/repos/${candidate.full_name}/commits/${encodeURIComponent(defaultBranch)}`,{fetch_impl,token,allow_error:true});if(!result.ok)continue;sha=String(result.data?.sha??'').toLowerCase();if(!/^[a-f0-9]{40}$/.test(sha))continue;commitCache.set(commitKey,sha);}const suffix=candidate.subpath?`/${candidate.subpath}`:'';const github_url=`https://github.com/${candidate.full_name}/tree/${sha}${suffix}`;if(seen.has(github_url))continue;seen.add(github_url);sources.push(Object.freeze({github_url,repository:candidate.full_name,pinned_sha:sha,subpath:candidate.subpath,source_file:candidate.file_path,capability_family:candidate.query_family,priority_query_rank:candidate.query_rank+1,priority_query:candidate.search_query}));}
  const represented=[...new Set(sources.map((x)=>x.capability_family))];
  return Object.freeze({schema_version:'1.2.0',state_type:'CEREBRO_AUTONOMOUS_SKILL_SCOUT_REPORT_V1',status:sources.length?'SOURCES_DISCOVERED':'NO_SOURCES',company_id:'MULTI',engine_id:'FACT-001',environment:PREPROD,version:VERSION,queries:Object.freeze(queryReports),raw_candidates:raw.length,eligible_candidates:candidates.length,sources:Object.freeze(sources),source_count:sources.length,max_sources:limit,retry_required:false,priority_first:true,diversity_mode:'ROUND_ROBIN_CAPABILITY_FAMILY',families_represented:Object.freeze(represented),...authority()});
}

export function buildScoutEvent({report,company_id='fenix'}={}){if(!report||report.state_type!=='CEREBRO_AUTONOMOUS_SKILL_SCOUT_REPORT_V1')throw new Error('scout report required');const company=req(company_id,'company_id',120);return Object.freeze({schema_version:'1.2.0',state_type:'CEREBRO_AUTONOMOUS_SKILL_SCOUT_EVENT_V1',status:report.status,company_id:company,engine_id:'FACT-001',environment:PREPROD,version:VERSION,discovery:Object.freeze({source_count:report.source_count,retry_required:report.retry_required===true,retry_reason:report.retry_reason??null,priority_first:report.priority_first===true,diversity_mode:report.diversity_mode??null,families_represented:report.families_represented??[],queries:report.queries,sources:report.sources}),client_payload:Object.freeze({company_id:company,github_urls:Object.freeze(report.sources.map((x)=>x.github_url))}),...authority()});}

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;}
const isEntrypoint=Boolean(process.argv[1])&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isEntrypoint){try{const out=req(arg('--out')??process.env.CEREBRO_SKILL_SCOUT_EVENT,'--out');const max=positiveInt(process.env.CEREBRO_SKILL_SCOUT_MAX??16,'CEREBRO_SKILL_SCOUT_MAX',1,50);const company=process.env.CEREBRO_COMPANY_ID??'fenix';const report=await discoverPublicSkillSources({token:process.env.GITHUB_TOKEN??null,max_sources:max});const event=buildScoutEvent({report,company_id:company});fs.mkdirSync(path.dirname(path.resolve(out)),{recursive:true});fs.writeFileSync(out,`${JSON.stringify(event,null,2)}\n`,{mode:0o600});process.stdout.write(`${JSON.stringify({status:report.status,source_count:report.source_count,retry_required:report.retry_required===true,retry_reason:report.retry_reason??null,max_sources:max,priority_first:true,diversity_mode:report.diversity_mode,families_represented:report.families_represented,environment:PREPROD,additional_cost_eur:0})}\n`);}catch(error){process.stderr.write(`${JSON.stringify({status:'RED_FAIL_CLOSED',error:String(error?.message??error),...authority()})}\n`);process.exitCode=1;}}
