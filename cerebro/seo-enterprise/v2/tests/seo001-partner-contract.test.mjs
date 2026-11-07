import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const php = readFileSync(new URL('../wordpress/cerebro-seo001-partner-form-v0.php', import.meta.url), 'utf8');
const ids = 'array(52661,52663,52714,52716)';

test('partner form is isolated to the four existing B2B works', () => {
  assert.match(php, /Version: 0\.2\.0/);
  assert.ok(php.split(ids).length >= 3, 'both render and server guard use exact IDs');
  assert.match(php, /is_singular\(array\('post','page'\)\)/);
});
test('one-shot CTA cannot trigger the global native submit listener', () => {
  assert.match(php, /<button type="button" class="seo001-partner-send">/);
  assert.doesNotMatch(php, /<form\s/i);
  assert.match(php, /document\.addEventListener\('click'/);
  assert.match(php, /root\.dataset\.busy='1'/);
});
test('server validates partner privacy and professional identity before CRM', () => {
  assert.match(php, /add_filter\('rest_pre_dispatch'/);
  assert.match(php, /\/fenix-cerebro\/v1\/lead/); // Scoped backward-compatible guard.
  assert.match(php, /cerebro-seo001\/v0/);
  assert.match(php, /fenix_cerebro_forward_lead\(\$payload,\$idem\)/);
  assert.match(php, /\$payload\['agency'\]=\$agency/);
  assert.match(php, /\$payload\['partner_need'\]=\$need/);
  assert.match(php, /\$req->get_method\(\) !== 'POST'/);
  assert.match(php, /seo001_partner_privacy_required/);
  assert.match(php, /seo001_partner_identity_required/);
  assert.match(php, /\$body\['website'\]/);
});
test('existing WordPress lead contract receives structured partner details', () => {
  assert.match(php, /funnel:'PARTNER'/);
  assert.match(php, /source:'web_agency_partner'/); // Dedicated WP route preserves B2B source.
  assert.match(php, /agency:agency,partner_need:value\(root,'partner_need'\)/);
  assert.match(php, /consent_privacy:true/);
  assert.match(php, /consent_marketing:check\(root,'consent_marketing'\)/);
  assert.match(php, /x-fenix-idempotency-key/);
});
test('privacy and marketing consents remain separate, mobile layout exists', () => {
  assert.match(php, /name="consent_privacy" required/);
  assert.match(php, /name="consent_marketing"/);
  assert.match(php, /declaracion-de-privacidad/);
  assert.match(php, /@media\(max-width:640px\)/);
  assert.match(php, /grid-template-columns:minmax\(0,1fr\)/);
});
