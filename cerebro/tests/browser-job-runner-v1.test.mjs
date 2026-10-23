import test from 'node:test';
import assert from 'node:assert/strict';
import { getGitHubOidcToken, runOneBrowserJob, hydrateCredentialPlaceholders, BROWSER_JOB_RUNNER_V1_CONTRACT } from '../runtime/browser-job-runner-v1.mjs';

test('requests GitHub OIDC token with dedicated audience', async () => {
  let seen;
  const token = await getGitHubOidcToken({
    request_url:'https://oidc.example/token?x=1',
    request_token:'request-token',
    fetch_impl:async (url, options) => {
      seen={url:String(url),options};
      return new Response(JSON.stringify({value:'signed-oidc'}),{status:200,headers:{'content-type':'application/json'}});
    }
  });
  assert.equal(token,'signed-oidc');
  assert.match(seen.url,/audience=cerebro-browser-worker-v1/);
  assert.equal(seen.options.headers.authorization,'Bearer request-token');
});

test('hydrates only explicit credential placeholders',()=>{
  const source=[{command:'fill',value:'$CREDENTIAL.email'},{command:'fill',value:'literal'}];
  const hydrated=hydrateCredentialPlaceholders(source,{email:'canary@example.invalid'});
  assert.equal(hydrated[0].value,'canary@example.invalid');
  assert.equal(hydrated[1].value,'literal');
});

test('leases, executes and completes a public OBSERVE job without secret material', async () => {
  const priorUrl=process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
  const priorToken=process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
  process.env.ACTIONS_ID_TOKEN_REQUEST_URL='https://oidc.example/token';
  process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN='request-token';
  const calls=[];
  const fetch_impl=async (url, options={})=>{
    const u=String(url); calls.push({u,body:options.body||null});
    if(u.startsWith('https://oidc.example/')) return new Response(JSON.stringify({value:'signed-oidc'}),{status:200,headers:{'content-type':'application/json'}});
    if(u.endsWith('/canary-seed')) return new Response(JSON.stringify({ok:true,job_id:'seed'}),{status:200,headers:{'content-type':'application/json'}});
    if(u.endsWith('/lease')) return new Response(JSON.stringify({ok:true,job:{
      job_id:'00000000-0000-0000-0000-000000000001',lease_id:'00000000-0000-0000-0000-000000000002',
      company_id:'fenix',department_id:'cerebro',engine_id:'CONSOLE-001',environment:'PREPROD',version:'v1',mode:'OBSERVE',
      identity_id:'public',account_id:'public',audit_id:'audit-1',credential_ref_id:null,
      commands:[{command:'goto',url:'https://fenixcapital.es/'}],
      authority:{canonical_engine_ids:['CONSOLE-001'],browser_binding:{healthy:true,kill_switch_enabled:true,fresh_attestation:true},engine_authority:{browser_use_authorized:true},kill_switch_enabled:true}
    }}),{status:200,headers:{'content-type':'application/json'}});
    if(u.endsWith('/complete')) return new Response(JSON.stringify({ok:true,status:'SUCCEEDED'}),{status:200,headers:{'content-type':'application/json'}});
    throw new Error(`unexpected fetch ${u}`);
  };
  const browser1={observe:async input=>({ok:true,authorization:{status:'AUTHORIZED'},results:['Hipotecas en Córdoba y Andalucía.'],final_url:'https://fenixcapital.es/',final_evidence:'/tmp/evidence.png',input})};
  try{
    const result=await runOneBrowserJob({endpoint:'https://dispatch.example',seed_canary:true,seed_credential_canary:false,browser1,fetch_impl});
    assert.equal(result.ok,true);
    assert.equal(result.status,'SUCCEEDED');
    const complete=JSON.parse(calls.find(x=>x.u.endsWith('/complete')).body);
    assert.equal(complete.result_summary.authorization_status,'AUTHORIZED');
    assert.equal(complete.result_summary.credential_materialized,false);
    assert.equal(complete.result_summary.secret_material_logged,false);
    assert.equal(JSON.stringify(calls).includes('password'),false);
  } finally {
    if(priorUrl===undefined)delete process.env.ACTIONS_ID_TOKEN_REQUEST_URL; else process.env.ACTIONS_ID_TOKEN_REQUEST_URL=priorUrl;
    if(priorToken===undefined)delete process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN; else process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN=priorToken;
  }
});

test('credential job materializes in memory, hydrates command, and never returns secret in completion payload', async () => {
  const priorUrl=process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
  const priorToken=process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
  process.env.ACTIONS_ID_TOKEN_REQUEST_URL='https://oidc.example/token';
  process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN='request-token';
  const calls=[];
  let executedInput=null;
  const fetch_impl=async (url, options={})=>{
    const u=String(url); calls.push({u,body:options.body||null});
    if(u.startsWith('https://oidc.example/')) return new Response(JSON.stringify({value:'signed-oidc'}),{status:200,headers:{'content-type':'application/json'}});
    if(u.endsWith('/canary-credential-seed')) return new Response(JSON.stringify({ok:true,job_id:'seed'}),{status:200,headers:{'content-type':'application/json'}});
    if(u.endsWith('/lease')) return new Response(JSON.stringify({ok:true,job:{
      job_id:'00000000-0000-0000-0000-000000000011',lease_id:'00000000-0000-0000-0000-000000000012',
      company_id:'fenix',department_id:'cerebro',engine_id:'CONSOLE-001',environment:'PREPROD',version:'v1',mode:'MUTATE',
      identity_id:'iam:test',account_id:'acct:test',audit_id:'audit-credential',credential_ref_id:'credref:test',
      commands:[{command:'fill',target:{selector:'#email'},value:'$CREDENTIAL.email'}],
      authority:{canonical_engine_ids:['CONSOLE-001'],browser_binding:{healthy:true,kill_switch_enabled:true,fresh_attestation:true},engine_authority:{browser_use_authorized:true,operation_authorized:true},kill_switch_enabled:true}
    }}),{status:200,headers:{'content-type':'application/json'}});
    if(u.endsWith('/credential-materialize')) return new Response(JSON.stringify({ok:true,secret_payload:{email:'canary@example.invalid',password:'synthetic-value'},secret_material_logged:false}),{status:200,headers:{'content-type':'application/json'}});
    if(u.endsWith('/complete')) return new Response(JSON.stringify({ok:true,status:'SUCCEEDED'}),{status:200,headers:{'content-type':'application/json'}});
    throw new Error(`unexpected fetch ${u}`);
  };
  const browser1={act:async input=>{executedInput=structuredClone(input);return {ok:true,authorization:{status:'AUTHORIZED'},results:[null],final_url:'https://example.invalid/',final_evidence:'/tmp/evidence.png'};}};
  try{
    const result=await runOneBrowserJob({endpoint:'https://dispatch.example',seed_canary:false,seed_credential_canary:true,browser1,fetch_impl});
    assert.equal(result.ok,true);
    assert.equal(executedInput.commands[0].value,'canary@example.invalid');
    const complete=JSON.parse(calls.find(x=>x.u.endsWith('/complete')).body);
    assert.equal(complete.result_summary.credential_materialized,true);
    assert.equal(complete.result_summary.observed_text_sample,null);
    assert.equal(complete.result_summary.secret_material_logged,false);
    assert.equal(JSON.stringify(calls.filter(x=>x.u.endsWith('/complete'))).includes('synthetic-value'),false);
    assert.equal(JSON.stringify(calls.filter(x=>x.u.endsWith('/complete'))).includes('canary@example.invalid'),false);
  } finally {
    if(priorUrl===undefined)delete process.env.ACTIONS_ID_TOKEN_REQUEST_URL; else process.env.ACTIONS_ID_TOKEN_REQUEST_URL=priorUrl;
    if(priorToken===undefined)delete process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN; else process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN=priorToken;
  }
});

test('contract is zero-cost OIDC, Vault-backed and forbids raw credentials in queue',()=>{
  assert.equal(BROWSER_JOB_RUNNER_V1_CONTRACT.authentication,'GITHUB_ACTIONS_OIDC');
  assert.equal(BROWSER_JOB_RUNNER_V1_CONTRACT.raw_credentials_in_queue,false);
  assert.equal(BROWSER_JOB_RUNNER_V1_CONTRACT.vault_credential_materialization,true);
  assert.equal(BROWSER_JOB_RUNNER_V1_CONTRACT.credential_values_logged,false);
  assert.equal(BROWSER_JOB_RUNNER_V1_CONTRACT.additional_cost_eur,0);
});