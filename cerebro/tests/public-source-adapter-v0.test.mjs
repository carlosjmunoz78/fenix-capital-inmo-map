import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchPublicEvidenceV0, PUBLIC_SOURCE_ADAPTER_V0_CONTRACT } from '../runtime/public-source-adapter-v0.mjs';

const base={company_id:'fenix',engine_id:'RSH-001',environment:'PREPROD',version:'v0',authorized_public_research:true,robots_allowed:true};

test('public source adapter contract is read-only PREPROD and zero-cost',()=>{
  assert.equal(PUBLIC_SOURCE_ADAPTER_V0_CONTRACT.environment,'PREPROD');
  assert.equal(PUBLIC_SOURCE_ADAPTER_V0_CONTRACT.method,'GET_ONLY');
  assert.equal(PUBLIC_SOURCE_ADAPTER_V0_CONTRACT.https_only,true);
  assert.equal(PUBLIC_SOURCE_ADAPTER_V0_CONTRACT.dns_public_only,true);
  assert.equal(PUBLIC_SOURCE_ADAPTER_V0_CONTRACT.manual_redirect_validation,true);
  assert.equal(PUBLIC_SOURCE_ADAPTER_V0_CONTRACT.auth_allowed,false);
  assert.equal(PUBLIC_SOURCE_ADAPTER_V0_CONTRACT.cookies_allowed,false);
  assert.equal(PUBLIC_SOURCE_ADAPTER_V0_CONTRACT.provider_write,false);
  assert.equal(PUBLIC_SOURCE_ADAPTER_V0_CONTRACT.external_dependency_install,false);
  assert.equal(PUBLIC_SOURCE_ADAPTER_V0_CONTRACT.additional_cost_target_eur,0);
  assert.equal(PUBLIC_SOURCE_ADAPTER_V0_CONTRACT.prod_authorized,false);
  assert.equal(PUBLIC_SOURCE_ADAPTER_V0_CONTRACT.trading_access,false);
});

test('adapter rejects PROD before network access', async()=>{
  await assert.rejects(()=>fetchPublicEvidenceV0({...base,environment:'PROD',target_url:'https://example.invalid/'}),/PREPROD-only/);
});

test('adapter rejects missing research authorization and robots policy', async()=>{
  await assert.rejects(()=>fetchPublicEvidenceV0({...base,authorized_public_research:false,target_url:'https://example.invalid/'}),/authorized_public_research required/);
  await assert.rejects(()=>fetchPublicEvidenceV0({...base,robots_allowed:false,target_url:'https://example.invalid/'}),/robots_allowed/);
});

test('adapter rejects HTTP, URL credentials and secret-bearing query keys before fetch', async()=>{
  await assert.rejects(()=>fetchPublicEvidenceV0({...base,target_url:'http://example.invalid/'}),/requires HTTPS/);
  await assert.rejects(()=>fetchPublicEvidenceV0({...base,target_url:'https://user:pass@example.invalid/'}),/credentials forbidden/);
  await assert.rejects(()=>fetchPublicEvidenceV0({...base,target_url:'https://example.invalid/?access_token=secret'}),/secret-bearing query key forbidden/i);
});

test('adapter rejects literal private/loopback targets', async()=>{
  await assert.rejects(()=>fetchPublicEvidenceV0({...base,target_url:'https://127.0.0.1/'}),/route not authorized|NON_PUBLIC_TARGET_DENIED/i);
  await assert.rejects(()=>fetchPublicEvidenceV0({...base,target_url:'https://localhost/'}),/route not authorized|NON_PUBLIC_TARGET_DENIED/i);
});

test('bounds are fail-closed', async()=>{
  await assert.rejects(()=>fetchPublicEvidenceV0({...base,target_url:'https://example.invalid/',max_bytes:0}),/max_bytes invalid/);
  await assert.rejects(()=>fetchPublicEvidenceV0({...base,target_url:'https://example.invalid/',timeout_ms:999}),/timeout_ms invalid/);
});
