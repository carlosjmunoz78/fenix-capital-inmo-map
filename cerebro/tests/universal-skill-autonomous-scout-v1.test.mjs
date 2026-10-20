import test from 'node:test';
import assert from 'node:assert/strict';
import {discoverPublicSkillSources,buildScoutEvent} from '../runtime/universal-skill-autonomous-scout-v1.mjs';

function response(status,data){return {status,async json(){return data;}};}

function mockFetchFactory(){
  const sha='a'.repeat(40);
  const calls=[];
  const fetch_impl=async(url)=>{
    calls.push(url);
    if(url.includes('/search/code?'))return response(200,{total_count:3,items:[
      {path:'skills/finance/SKILL.md',repository:{full_name:'example/skill-pack'}},
      {path:'skills/finance/cerebro.skill.json',repository:{full_name:'example/skill-pack'}},
      {path:'cerebro/runtime/SKILL.md',repository:{full_name:'carlosjmunoz78/fenix-capital-inmo-map'}}
    ]});
    if(url.endsWith('/repos/example/skill-pack'))return response(200,{private:false,archived:false,disabled:false,default_branch:'main'});
    if(url.endsWith('/repos/example/skill-pack/commits/main'))return response(200,{sha});
    throw new Error(`unexpected url:${url}`);
  };
  return {fetch_impl,calls,sha};
}

test('discovers, pins and deduplicates public skill directories while excluding self repo',async()=>{
  const {fetch_impl,calls,sha}=mockFetchFactory();
  const report=await discoverPublicSkillSources({fetch_impl,queries:['filename:SKILL.md description','filename:cerebro.skill.json technical_name'],max_sources:8});
  assert.equal(report.status,'SOURCES_DISCOVERED');
  assert.equal(report.source_count,1);
  assert.equal(report.retry_required,false);
  assert.equal(report.sources[0].github_url,`https://github.com/example/skill-pack/tree/${sha}/skills/finance`);
  assert.equal(report.external_skill_code_execution,false);
  assert.equal(report.additional_cost_eur,0);
  assert.equal(calls.filter((url)=>url.endsWith('/repos/example/skill-pack')).length,1);
  assert.equal(calls.filter((url)=>url.endsWith('/repos/example/skill-pack/commits/main')).length,1);
});

test('balances the first overnight slots across capability families instead of letting query zero consume the batch',async()=>{
  const sha='b'.repeat(40);
  const queries=['language communication humanizer','app development mobile desktop','reporting report document pdf'];
  const fetch_impl=async(url)=>{
    const u=String(url);
    if(u.includes('/search/code?')){
      const decoded=decodeURIComponent(u);
      if(decoded.includes(queries[0]))return response(200,{total_count:4,items:[0,1,2,3].map((i)=>({path:`skills/lang-${i}/SKILL.md`,repository:{full_name:`example/lang-${i}`}}))});
      if(decoded.includes(queries[1]))return response(200,{total_count:1,items:[{path:'skills/app/SKILL.md',repository:{full_name:'example/app'}}]});
      if(decoded.includes(queries[2]))return response(200,{total_count:1,items:[{path:'skills/report/SKILL.md',repository:{full_name:'example/report'}}]});
    }
    const repo=/\/repos\/([^/]+\/[^/]+)$/.exec(u)?.[1];if(repo)return response(200,{private:false,archived:false,disabled:false,default_branch:'main'});
    if(/\/commits\/main$/.test(u))return response(200,{sha});
    throw new Error(`unexpected url:${u}`);
  };
  const report=await discoverPublicSkillSources({fetch_impl,queries,max_sources:3});
  assert.equal(report.source_count,3);
  assert.equal(report.diversity_mode,'ROUND_ROBIN_CAPABILITY_FAMILY');
  assert.deepEqual(new Set(report.sources.map((x)=>x.capability_family)),new Set(['LANGUAGE_HUMAN_INTERACTION','APP_DEV_CROSS_DEVICE','REPORTING_DOCUMENTS']));
  assert.equal(report.sources.filter((x)=>x.capability_family==='LANGUAGE_HUMAN_INTERACTION').length,1);
});

test('empty rotated page falls back once to page one and discovers real sources',async()=>{
  const sha='c'.repeat(40);const calls=[];
  const fetch_impl=async(url)=>{
    const u=String(url);calls.push(u);
    if(u.includes('/search/code?')){
      const page=new URL(u).searchParams.get('page');
      if(page==='4')return response(200,{total_count:1,items:[]});
      if(page==='1')return response(200,{total_count:1,items:[{path:'skills/new-capability/SKILL.md',repository:{full_name:'example/new-capability'}}]});
      throw new Error(`unexpected search page:${page}`);
    }
    if(u.endsWith('/repos/example/new-capability'))return response(200,{private:false,archived:false,disabled:false,default_branch:'main'});
    if(u.endsWith('/repos/example/new-capability/commits/main'))return response(200,{sha});
    throw new Error(`unexpected url:${u}`);
  };
  const report=await discoverPublicSkillSources({fetch_impl,queries:['filename:SKILL.md description'],max_sources:4,search_page:4});
  assert.equal(report.status,'SOURCES_DISCOVERED');
  assert.equal(report.source_count,1);
  assert.equal(report.preferred_search_page,4);
  assert.equal(report.effective_search_page,1);
  assert.deepEqual(report.attempted_pages,[4,1]);
  assert.equal(report.fallback_used,true);
  assert.equal(report.sources[0].search_page,1);
  assert.equal(calls.filter((u)=>u.includes('/search/code?')).length,2);
});

test('empty rotated page without known results does not fan out across pages',async()=>{
  const calls=[];
  const fetch_impl=async(url)=>{calls.push(String(url));return response(200,{total_count:0,items:[]});};
  const report=await discoverPublicSkillSources({fetch_impl,queries:['filename:SKILL.md description'],max_sources:4,search_page:5});
  assert.equal(report.status,'NO_SOURCES');
  assert.equal(report.fallback_used,false);
  assert.deepEqual(report.attempted_pages,[5]);
  assert.equal(calls.length,1);
});

test('fallback rate limit defers instead of fabricating sources',async()=>{
  const fetch_impl=async(url)=>{
    const page=new URL(String(url)).searchParams.get('page');
    if(page==='3')return response(200,{total_count:2,items:[]});
    if(page==='1')return response(429,{message:'rate limited'});
    throw new Error(`unexpected page:${page}`);
  };
  const report=await discoverPublicSkillSources({fetch_impl,queries:['filename:SKILL.md description'],max_sources:4,search_page:3});
  assert.equal(report.status,'DISCOVERY_DEFERRED_RATE_LIMIT');
  assert.equal(report.retry_required,true);
  assert.equal(report.fallback_used,true);
  assert.deepEqual(report.attempted_pages,[3,1]);
  assert.equal(report.source_count,0);
});

test('builds a source-queue compatible PREPROD event',async()=>{
  const {fetch_impl}=mockFetchFactory();
  const report=await discoverPublicSkillSources({fetch_impl,queries:['filename:SKILL.md description'],max_sources:4});
  const event=buildScoutEvent({report,company_id:'fenix'});
  assert.equal(event.environment,'PREPROD');
  assert.equal(event.client_payload.company_id,'fenix');
  assert.deepEqual(event.client_payload.github_urls,report.sources.map((x)=>x.github_url));
  assert.equal(event.discovery.retry_required,false);
  assert.equal(event.discovery.diversity_mode,'ROUND_ROBIN_CAPABILITY_FAMILY');
  assert.deepEqual(event.discovery.attempted_pages,[1]);
  assert.equal(event.prod_authorized,false);
  assert.equal(event.trading_access,false);
});

test('defers a pure GitHub Search 429 window without fabricating sources or green evidence',async()=>{
  const fetch_impl=async()=>response(429,{message:'rate limited'});
  const report=await discoverPublicSkillSources({fetch_impl,queries:['q1','q2'],max_sources:4});
  assert.equal(report.status,'DISCOVERY_DEFERRED_RATE_LIMIT');
  assert.equal(report.retry_required,true);
  assert.equal(report.retry_reason,'GITHUB_SEARCH_RATE_LIMIT');
  assert.equal(report.source_count,0);
  assert.deepEqual(report.sources,[]);
  assert.equal(report.prod_authorized,false);
  assert.equal(report.additional_cost_eur,0);
  const event=buildScoutEvent({report,company_id:'fenix'});
  assert.equal(event.discovery.retry_required,true);
  assert.deepEqual(event.client_payload.github_urls,[]);
});

test('fails closed when every discovery query fails for a non-rate-limit reason',async()=>{
  const fetch_impl=async()=>response(403,{message:'forbidden'});
  await assert.rejects(()=>discoverPublicSkillSources({fetch_impl,queries:['q1','q2'],max_sources:4}),/GITHUB_SCOUT_ALL_QUERIES_FAILED:403,403/);
});
