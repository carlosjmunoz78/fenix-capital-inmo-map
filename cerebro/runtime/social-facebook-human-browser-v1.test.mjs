import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFacebookHumanBrowserRequest, facebookHumanBrowserCapabilities } from './social-facebook-human-browser-v1.mjs';

function base(overrides = {}) {
  return {
    idempotency_key: 'fb-human-browser-test-1',
    identity_id: 'carlos',
    account_id: 'facebook-main',
    target_url: 'https://www.facebook.com/',
    commands: [
      { command: 'goto', url: 'https://www.facebook.com/' },
      { command: 'wait', ms: 500 },
      { command: 'screenshot', label: 'fb-home' }
    ],
    audit_id: 'fb-human-browser-audit-1',
    ...overrides
  };
}

test('builds SOC-001 governed mutation job with certified PROD authority', () => {
  const request = buildFacebookHumanBrowserRequest(base());
  assert.equal(request.company_id, 'fenix');
  assert.equal(request.engine_id, 'SOC-001');
  assert.equal(request.department_id, 'social-facebook');
  assert.equal(request.capability, 'browser1.act');
  assert.equal(request.expected_cost_eur, 0);
  assert.equal(request.authority.engine_authority.browser_use_authorized, true);
  assert.equal(request.authority.engine_authority.operation_authorized, true);
  assert.equal(request.authority.engine_authority.prod_mutation_authorized, true);
  assert.equal(request.authority.engine_authority.promotion_gate_green, true);
  assert.equal(request.authority.engine_authority.rollback_ready, true);
  assert.equal(request.authority.engine_authority.observability_ready, true);
  assert.equal(request.authority.engine_authority.audit_ready, true);
  assert.equal(request.authority.engine_authority.idempotency_proven, true);
  assert.equal(request.credential_ref_id, null);
});

test('builds observe jobs with browser1.observe capability', () => {
  const request = buildFacebookHumanBrowserRequest(base({mode:'OBSERVE'}));
  assert.equal(request.mode, 'OBSERVE');
  assert.equal(request.capability, 'browser1.observe');
});

test('allows Facebook, Canva and Google auth surfaces', () => {
  for (const target_url of [
    'https://www.facebook.com/',
    'https://business.facebook.com/',
    'https://www.canva.com/',
    'https://accounts.google.com/'
  ]) {
    assert.doesNotThrow(() => buildFacebookHumanBrowserRequest(base({target_url, commands:[{command:'goto',url:target_url}]})));
  }
});

test('denies arbitrary origins', () => {
  assert.throws(
    () => buildFacebookHumanBrowserRequest(base({target_url:'https://example.com/', commands:[{command:'goto',url:'https://example.com/'}]})),
    /FACEBOOK_BROWSER_ORIGIN_DENIED/
  );
});

test('denies inline secrets', () => {
  assert.throws(
    () => buildFacebookHumanBrowserRequest(base({commands:[{command:'fill',target:{selector:'#x'},password:'plaintext'}]})),
    /INLINE_SECRET_DENIED/
  );
});

test('allows only Vault credential references', () => {
  const request = buildFacebookHumanBrowserRequest(base({credential_ref_id:'credref:facebook-main-v1'}));
  assert.equal(request.credential_ref_id, 'credref:facebook-main-v1');
});

test('denies additional spend, high risk and invalid mode', () => {
  assert.throws(() => buildFacebookHumanBrowserRequest(base({expected_cost_eur:1})), /FACEBOOK_BROWSER_MONEY_LIMIT/);
  assert.throws(() => buildFacebookHumanBrowserRequest(base({risk:'HIGH'})), /FACEBOOK_BROWSER_RISK_DENIED/);
  assert.throws(() => buildFacebookHumanBrowserRequest(base({mode:'DELETE_THE_INTERNET'})), /FACEBOOK_BROWSER_MODE_DENIED/);
});

test('capabilities expose human-paced guarded browser contract and canary evidence', () => {
  const caps = facebookHumanBrowserCapabilities();
  assert.equal(caps.engine_id, 'SOC-001');
  assert.equal(caps.human_pacing_provided_by_worker, true);
  assert.equal(caps.synthetic_mutation_canary_green, true);
  assert.equal(caps.synthetic_mutation_canary_job_id, '8b24ee63-4bc0-42e6-9e2d-bebfe159fcf1');
  assert.equal(caps.raw_credentials_in_queue, false);
  assert.equal(caps.no_captcha_bypass, true);
  assert.equal(caps.no_mfa_bypass, true);
});
