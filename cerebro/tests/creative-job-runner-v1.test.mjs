import test from 'node:test';
import assert from 'node:assert/strict';
import { getGitHubOidcToken, CREATIVE_JOB_RUNNER_V1_CONTRACT } from '../runtime/creative-job-runner-v1.mjs';

test('creative worker contract is zero-cost, external-render and non-publishing',()=>{
  assert.equal(CREATIVE_JOB_RUNNER_V1_CONTRACT.owner_engine,'FACT-001');
  assert.equal(CREATIVE_JOB_RUNNER_V1_CONTRACT.authentication,'GITHUB_ACTIONS_OIDC');
  assert.equal(CREATIVE_JOB_RUNNER_V1_CONTRACT.heavy_render_outside_supabase,true);
  assert.equal(CREATIVE_JOB_RUNNER_V1_CONTRACT.local_open_source_render,true);
  assert.equal(CREATIVE_JOB_RUNNER_V1_CONTRACT.publish_authorized,false);
  assert.equal(CREATIVE_JOB_RUNNER_V1_CONTRACT.additional_cost_eur,0);
});

test('AV extension remains zero-cost and bounded',()=>{
  assert.equal(CREATIVE_JOB_RUNNER_V1_CONTRACT.neural_voice_provider,'PIPER');
  assert.equal(CREATIVE_JOB_RUNNER_V1_CONTRACT.procedural_music,true);
  assert.equal(CREATIVE_JOB_RUNNER_V1_CONTRACT.long_video_max_seconds,180);
  assert.deepEqual(CREATIVE_JOB_RUNNER_V1_CONTRACT.owned_photo_host_allowlist,['fenixcapital.es','www.fenixcapital.es','staging.fenixcapital.es']);
  assert.equal(CREATIVE_JOB_RUNNER_V1_CONTRACT.publish_authorized,false);
  assert.equal(CREATIVE_JOB_RUNNER_V1_CONTRACT.additional_cost_eur,0);
});

test('OIDC token request binds the exact creative audience and bearer request token',async()=>{
  let seen=null;
  const token=await getGitHubOidcToken({
    request_url:'https://token.actions.githubusercontent.com/mock?id=1',
    request_token:'request-token',
    fetch_impl:async(url,init)=>{
      seen={url:String(url),init};
      return {ok:true,json:async()=>({value:'oidc-token'})};
    }
  });
  assert.equal(token,'oidc-token');
  assert.match(seen.url,/audience=cerebro-creative-worker-v1/);
  assert.equal(seen.init.headers.authorization,'Bearer request-token');
  assert.equal(seen.init.redirect,'error');
});

test('missing OIDC runtime material fails closed',async()=>{
  await assert.rejects(()=>getGitHubOidcToken({request_url:null,request_token:null}),/MISSING_ACTIONS_ID_TOKEN_REQUEST_URL/);
});
