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

test('builds SOC-001 governed browser job', () => {
  const request = buildFacebookHumanBrowserRequest(base());
  assert.equal(request.company_id, 'fenix');
  assert.equal(request.engine_id, 'SOC-001');
  assert.equal(request.department_id, 'social-facebook');
  assert.equal(request.capability, 'browser1.act');
  assert.equal(request.expected_cost_eur, 0);
  assert.equal(request.authority.engine_authority.browser_use_authorized, true);
  assert.equal(request.credential_ref_id, null);
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

test('denies additional spend and high risk', () => {
  assert.throws(() => buildFacebookHumanBrowserRequest(base({expected_cost_eur:1})), /FACEBOOK_BROWSER_MONEY_LIMIT/);
  assert.throws(() => buildFacebookHumanBrowserRequest(base({risk:'HIGH'})), /FACEBOOK_BROWSER_RISK_DENIED/);
});

test('capabilities expose human-paced guarded browser contract', () => {
  const caps = facebookHumanBrowserCapabilities();
  assert.equal(caps.engine_id, 'SOC-001');
  assert.equal(caps.human_pacing_provided_by_worker, true);
  assert.equal(caps.raw_credentials_in_queue, false);
  assert.equal(caps.no_captcha_bypass, true);
  assert.equal(caps.no_mfa_bypass, true);
});
