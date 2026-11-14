// Physical negative check of PREPROD Edge endpoints, NOT of WordPress staging.
// Must never contact staging.fenixcapital.es or send bearer/API credentials.
// Owner suspended staging until explicit reactivation. No remote writes.
import assert from 'node:assert/strict';

const project = 'hnqlnvakzaywtafeiybt';
const slugs = Object.freeze([
  'fenix-seo-conversion-e2e-preprod',
  'fenix-cerebro-city-signer-preprod',
  'fenix-seo-coreguard-bootstrap-probe-preprod',
]);

for (const slug of slugs) {
  const url = new URL(`https://${project}.supabase.co/functions/v1/${slug}`);
  assert.equal(url.hostname, `${project}.supabase.co`);
  const response = await fetch(url, {
    method: 'GET',
    redirect: 'manual',
    cache: 'no-store',
    signal: AbortSignal.timeout(12000),
    headers: { Accept: 'application/json', 'User-Agent': 'CEREBRO-LAB-SUSPENSION-NEGATIVE-SMOKE/1' }
  });
  assert.equal(response.status, 423, `${slug}: expected HTTP 423`);
  assert.equal(response.headers.get('x-cerebro-suspension'), 'STAGING_SUSPENDED_BY_OWNER');
  const body = await response.json();
  assert.equal(body?.ok, false);
  assert.equal(body?.state, 'BLOCKED_DEPENDENCY');
  assert.equal(body?.reason, 'STAGING_SUSPENDED_BY_OWNER');
  assert.equal(body?.executed, false);
  assert.equal(body?.side_effects, false);
  console.log(`${slug}: HTTP 423 / BLOCKED_DEPENDENCY / no execution`);
}
