import test from 'node:test';
import assert from 'node:assert/strict';
import { isCanvaAntiBotInterstitial, chooseCanvaExecutionRoute, canvaMcpRuntimeConfig } from './social-facebook-canva-routing-v1.mjs';

test('detects the observed Canva anti-bot interstitial', () => {
  assert.equal(isCanvaAntiBotInterstitial('Muy pronto podrás volver a diseñar\nRayID: a4f4d97f8e24a21e'), true);
});

test('keeps human browser when provider allows it', () => {
  const result = chooseCanvaExecutionRoute({browser_result:{observed_text_sample:'Canva home'}});
  assert.equal(result.route, 'BROWSER_1_HUMAN_OPERATOR');
  assert.equal(result.browser_human_pacing_required, true);
});

test('never evades provider anti-bot and raises legal gate first', () => {
  const result = chooseCanvaExecutionRoute({browser_result:{observed_text_sample:'Muy pronto podrás volver a diseñar RayID: x'}});
  assert.equal(result.status, 'HUMAN_REQUIRED');
  assert.equal(result.human_required, 'LEGAL_REQUIRED');
  assert.equal(result.anti_bot_evasion, false);
});

test('requires explicit user OAuth consent after legal terms', () => {
  const result = chooseCanvaExecutionRoute({
    browser_result:{observed_text_sample:'Cloudflare RayID: x'},
    legal_terms_accepted:true
  });
  assert.equal(result.human_required, 'CUSTOMER_HUMAN_REQUEST');
});

test('authorizes MCP only after all one-time gates are satisfied', () => {
  const result = chooseCanvaExecutionRoute({
    browser_result:{observed_text_sample:'Cloudflare RayID: x'},
    legal_terms_accepted:true,
    customer_oauth_consent:true,
    canva_oauth_ready:true
  });
  assert.equal(result.status, 'AUTHORIZED');
  assert.equal(result.route, 'CANVA_REMOTE_MCP');
  assert.equal(result.endpoint, 'https://api.canva.com/connect/v1/mcp');
});

test('runtime config is pinned, vault-only and zero incremental cost', () => {
  const config = canvaMcpRuntimeConfig();
  assert.equal(config.bridge_package, 'mcp-remote@0.15.2');
  assert.equal(config.credential_source, 'CEREBRO_VAULT');
  assert.equal(config.external_publish_authorized, false);
  assert.equal(config.incremental_cost_eur, 0);
});
