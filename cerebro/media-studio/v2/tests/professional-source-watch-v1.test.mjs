import test from 'node:test';
import assert from 'node:assert/strict';
import {buildWatchedSources,runProfessionalSourceWatch} from '../learning/professional-source-watch-v1.mjs';

function fakeFetchFactory({mutateUrl=null,failUrl=null}={}){
  return async (url)=>{
    if(url===failUrl) throw new Error('SIMULATED_NETWORK_FAILURE');
    const changed=url===mutateUrl;
    const body=`source:${url}:${changed?'changed-v2':'baseline-v1'}`;
    return new Response(body,{status:200,headers:{'content-type':'text/plain','etag':changed?'"v2"':'"v1"','last-modified':changed?'Sun, 25 Oct 2026 12:00:00 GMT':'Sat, 24 Oct 2026 12:00:00 GMT','content-length':String(Buffer.byteLength(body))}});
  };
}

test('watch registry deduplicates official and frontier URLs into a non-empty source set',()=>{
  const sources=buildWatchedSources();
  assert.ok(sources.length>=30);
  assert.equal(new Set(sources.map(x=>x.url)).size,sources.length);
  assert.ok(sources.every(x=>x.ids.length>0&&x.departments.length>0));
});

test('first observation creates a baseline but never promotes knowledge',async()=>{
  const report=await runProfessionalSourceWatch({fetch_impl:fakeFetchFactory(),observed_at:'2026-10-25T16:00:00Z'});
  assert.equal(report.source_count,buildWatchedSources().length);
  assert.equal(report.baseline_created,report.source_count);
  assert.equal(report.changed_signal_count,0);
  assert.equal(report.knowledge_auto_promotion,false);
  assert.equal(report.prod_write_authorized,false);
  assert.equal(report.tool_execution_authorized,false);
  assert.equal(report.spend_authorized,false);
  assert.equal(report.additional_cost_eur,0);
});

test('same signals remain NO_SIGNAL_CHANGE on the next run',async()=>{
  const first=await runProfessionalSourceWatch({fetch_impl:fakeFetchFactory(),observed_at:'2026-10-25T16:00:00Z'});
  const second=await runProfessionalSourceWatch({previous_report:first,fetch_impl:fakeFetchFactory(),observed_at:'2026-10-26T16:00:00Z'});
  assert.equal(second.changed_signal_count,0);
  assert.equal(second.unreachable,0);
  assert.ok(second.observations.every(x=>x.change_status==='NO_SIGNAL_CHANGE'));
});

test('changed source signal becomes REVALIDATION_REQUIRED, not accepted knowledge',async()=>{
  const sources=buildWatchedSources();
  const target=sources[0].url;
  const first=await runProfessionalSourceWatch({fetch_impl:fakeFetchFactory(),observed_at:'2026-10-25T16:00:00Z'});
  const second=await runProfessionalSourceWatch({previous_report:first,fetch_impl:fakeFetchFactory({mutateUrl:target}),observed_at:'2026-10-26T16:00:00Z'});
  assert.equal(second.changed_signal_count,1);
  assert.equal(second.revalidation_candidates.length,1);
  assert.equal(second.revalidation_candidates[0].url,target);
  assert.equal(second.revalidation_candidates[0].status,'REVALIDATION_REQUIRED');
  assert.equal(second.revalidation_candidates[0].auto_promote,false);
});

test('unreachable source is flagged for review without fabricating a change',async()=>{
  const sources=buildWatchedSources();
  const target=sources.at(-1).url;
  const report=await runProfessionalSourceWatch({fetch_impl:fakeFetchFactory({failUrl:target}),observed_at:'2026-10-25T16:00:00Z'});
  assert.equal(report.unreachable,1);
  const row=report.observations.find(x=>x.url===target);
  assert.equal(row.change_status,'UNREACHABLE_REVIEW');
  assert.equal(row.reachable,false);
  assert.match(row.error,/SIMULATED_NETWORK_FAILURE/);
  assert.equal(report.knowledge_auto_promotion,false);
});
