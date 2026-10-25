import fs from 'node:fs';
import crypto from 'node:crypto';

const BASE_URL=new URL('../knowledge/verified-source-snapshot-2026-10-25.json',import.meta.url);
const EXPANSION_URL=new URL('../knowledge/verified-source-expansion-prod-2026-10-25.json',import.meta.url);
const FRONTIER_URL=new URL('../knowledge/frontier-media-tech-watch-prod-2026-10-25.json',import.meta.url);
const freeze=(v)=>Object.freeze(v);
const load=(url)=>JSON.parse(fs.readFileSync(url,'utf8'));
const sha=(buf)=>crypto.createHash('sha256').update(buf).digest('hex');

export function buildWatchedSources(){
  const base=load(BASE_URL), expansion=load(EXPANSION_URL), frontier=load(FRONTIER_URL);const byUrl=new Map();
  for(const source of [...(base.sources??[]),...(expansion.sources??[])]){
    if(!source.uri)continue;const prior=byUrl.get(source.uri)??{url:source.uri,ids:[],departments:new Set(),kind:'PROFESSIONAL_SOURCE'};prior.ids.push(source.source_id);(source.departments??[]).forEach(x=>prior.departments.add(x));byUrl.set(source.uri,prior);
  }
  for(const item of frontier.candidates??[]){
    if(!item.source)continue;const prior=byUrl.get(item.source)??{url:item.source,ids:[],departments:new Set(),kind:'FRONTIER_CANDIDATE'};prior.ids.push(item.id);(item.departments??[]).forEach(x=>prior.departments.add(x));if(prior.kind!=='PROFESSIONAL_SOURCE')prior.kind='FRONTIER_CANDIDATE';byUrl.set(item.source,prior);
  }
  return [...byUrl.values()].map(x=>freeze({url:x.url,ids:freeze([...new Set(x.ids)].sort()),departments:freeze([...x.departments].sort()),kind:x.kind})).sort((a,b)=>a.url.localeCompare(b.url));
}

async function observe(source,{fetch_impl=fetch,max_bytes=1048576}={}){
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),20000);
  try{
    const response=await fetch_impl(source.url,{method:'GET',redirect:'follow',headers:{'user-agent':'CEREBRO-UMS-SOURCE-WATCH/1.0','accept':'text/html,application/json,text/plain,application/xml;q=0.8,*/*;q=0.2'},signal:controller.signal});
    const type=String(response.headers.get('content-type')??'').slice(0,160);const etag=response.headers.get('etag');const modified=response.headers.get('last-modified');const length=response.headers.get('content-length');
    let sample=Buffer.alloc(0);if(response.body){const reader=response.body.getReader();const chunks=[];let total=0;while(total<max_bytes){const {done,value}=await reader.read();if(done)break;if(value){const remain=max_bytes-total;const part=Buffer.from(value).subarray(0,remain);chunks.push(part);total+=part.length;if(total>=max_bytes){try{await reader.cancel();}catch{}break;}}}sample=Buffer.concat(chunks);}
    return freeze({url:source.url,ids:source.ids,departments:source.departments,kind:source.kind,reachable:response.ok,http_status:response.status,content_type:type,etag:etag??null,last_modified:modified??null,content_length:length?Number(length):null,sample_bytes:sample.length,content_sample_sha256:sample.length?sha(sample):null,error:null});
  }catch(error){return freeze({url:source.url,ids:source.ids,departments:source.departments,kind:source.kind,reachable:false,http_status:null,content_type:null,etag:null,last_modified:null,content_length:null,sample_bytes:0,content_sample_sha256:null,error:String(error?.name==='AbortError'?'TIMEOUT':error?.message??error).slice(0,300)});}finally{clearTimeout(timer);}
}
function signalKey(x){return JSON.stringify([x.http_status,x.etag,x.last_modified,x.content_length,x.content_sample_sha256]);}

export async function runProfessionalSourceWatch({previous_report=null,fetch_impl=fetch,concurrency=6,observed_at=new Date().toISOString()}={}){
  const sources=buildWatchedSources();const previous=new Map((previous_report?.observations??[]).map(x=>[x.url,x]));const observations=new Array(sources.length);let cursor=0;
  async function worker(){while(true){const i=cursor++;if(i>=sources.length)return;observations[i]=await observe(sources[i],{fetch_impl});}}
  await Promise.all(Array.from({length:Math.min(concurrency,sources.length)},()=>worker()));
  const rows=observations.map(obs=>{const prior=previous.get(obs.url);let change_status;if(!obs.reachable)change_status='UNREACHABLE_REVIEW';else if(!prior)change_status='BASELINE_CREATED';else if(signalKey(obs)!==signalKey(prior))change_status='SOURCE_SIGNAL_CHANGED_REVALIDATE';else change_status='NO_SIGNAL_CHANGE';return freeze({...obs,change_status});});
  const changed=rows.filter(x=>x.change_status==='SOURCE_SIGNAL_CHANGED_REVALIDATE');const unreachable=rows.filter(x=>x.change_status==='UNREACHABLE_REVIEW');
  return freeze({schema_version:'1.0.0',state_type:'CEREBRO_UMS_PROFESSIONAL_SOURCE_WATCH_REPORT_V1',company_id:'GLOBAL',engine_id:'UMS-001',environment:'PROD_KNOWLEDGE_MONITOR',version:'1.0.0',observed_at,source_count:rows.length,reachable:rows.filter(x=>x.reachable).length,unreachable:unreachable.length,changed_signal_count:changed.length,baseline_created:rows.filter(x=>x.change_status==='BASELINE_CREATED').length,observations:freeze(rows),revalidation_candidates:freeze(changed.map(x=>freeze({url:x.url,ids:x.ids,departments:x.departments,status:'REVALIDATION_REQUIRED',auto_promote:false}))),knowledge_auto_promotion:false,prod_write_authorized:false,tool_execution_authorized:false,spend_authorized:false,additional_cost_eur:0});
}

async function cli(){const args=process.argv.slice(2);const get=(name)=>{const i=args.indexOf(name);return i>=0?args[i+1]:null;};const previousFile=get('--previous');const output=get('--out');const previous_report=previousFile&&fs.existsSync(previousFile)?JSON.parse(fs.readFileSync(previousFile,'utf8')):null;const report=await runProfessionalSourceWatch({previous_report});const body=`${JSON.stringify(report,null,2)}\n`;if(output)fs.writeFileSync(output,body);else process.stdout.write(body);}
if(process.argv[1]&&process.argv[1].endsWith('professional-source-watch-v1.mjs'))cli().catch(e=>{process.stderr.write(`${JSON.stringify({status:'RED_FAIL_CLOSED',error:String(e?.message??e)})}\n`);process.exitCode=1;});
