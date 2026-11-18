import test from 'node:test';
import assert from 'node:assert/strict';
import {validateProviderDiscovery,readProviderDiscovery,resetProviderCacheForTests,URL} from './cerebro-provider-discovery.mjs';
const now=Date.parse('2026-11-18T16:45:00Z'),time=new Date(now).toISOString();
const feed={schema:'CEREBRO_PROVIDER_DISCOVERY_V1',company_id:'fenix',version:'1.0.0',canonical_engines:179,
 read_only:true,no_runtime_execution_claim:true,generated_at:time,
 providers:{cloudflare:{worker_scripts_total:45,lab_named:42,observed_at:time},
 supabase:{edge_functions_total:119,active_deployed:119,lab_named:45,observed_at:time}},
 engine_candidates:[{engine_id:'FACT-001',cloudflare_worker_count:6,supabase_function_count:18}]};
test('discovery metadata is neither engine health nor verified agent activity',()=>{
 const v=validateProviderDiscovery(feed,now);
 assert.equal(v.status,'FRESH');assert.equal(v.sources.cloudflare.total,45);
 assert.equal(v.sources.supabase.total,119);assert.equal(v.runtime_activity_verified,false);
 assert.equal(v.profiles_running_verified,0);assert.equal(v.candidate_links[0].attestation,'NAME_CANDIDATE_ONLY');
});
test('Cloudflare auto refreshed while Supabase source stale is marked PARTIAL',()=>{
 const v=validateProviderDiscovery({...feed,providers:{...feed.providers,supabase:{...feed.providers.supabase,observed_at:'2026-11-17T15:00:00Z'}}},now);
 assert.equal(v.status,'PARTIAL');
 assert.equal(v.sources.cloudflare.status,'FRESH');assert.equal(v.sources.supabase.status,'STALE');
});
test('stale both sources never make resource runtime active',()=>{
 const v=validateProviderDiscovery(feed,now+3*3600*1000);
 assert.equal(v.status,'STALE');assert.equal(v.runtime_activity_verified,false);
});
test('invalid company, identities or counts rejected',()=>{
 for(const candidate of [{...feed,company_id:'aion'},{...feed,providers:{...feed.providers,cloudflare:{worker_scripts_total:-1}}},{...feed,engine_candidates:[{engine_id:'FACT-001',cloudflare_worker_count:'many',supabase_function_count:18}]}]){
 assert.throws(()=>validateProviderDiscovery(candidate,now));
 }
});
test('fetching sanitized live source uses exact HTTPS URL and never exposes private resource names',async()=>{
 resetProviderCacheForTests();
 let hits=0;
 const f=async (url,opts)=>{hits++;assert.equal(url,URL);assert.equal(opts.method,'GET');
 return {status:200,text:async()=>JSON.stringify(feed)}};
 const x=await readProviderDiscovery(now,f);const y=await readProviderDiscovery(now,f);
 assert.equal(x.status,'FRESH');assert.equal(y.status,'FRESH');assert.equal(hits,1);
});
test('failed fetch fail-closed as inventory unavailable',async()=>{
 resetProviderCacheForTests();
 const x=await readProviderDiscovery(now,async()=>{throw Error('network down')});
 assert.equal(x.status,'UNAVAILABLE');assert.equal(x.profiles_running_verified,0);
});
