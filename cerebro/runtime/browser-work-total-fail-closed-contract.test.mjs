import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const runtime = await fs.readFile(new URL('./browser-interactive-session-v3.mjs', import.meta.url), 'utf8');
const broker = await fs.readFile(new URL('../../supabase/functions/cerebro-browser-work-total-v1-preprod/index.ts', import.meta.url), 'utf8');
const owner = await fs.readFile(new URL('../../supabase/functions/cerebro-browser-work-total-owner-v1-preprod/index.ts', import.meta.url), 'utf8');

const verifiedOnly = state => String(state) === 'VERIFIED';
for (const state of ['UNVERIFIED','PENDING_CONFIRMATION','REAUTH_REQUIRED','MISMATCH','NOT_APPLICABLE','']) {
  assert.equal(verifiedOnly(state), false, `${state || '<empty>'} must fail closed`);
}
assert.equal(verifiedOnly('VERIFIED'), true, 'VERIFIED must be the only reusable identity state');

const takeoverAllowed = ({state, control_owner, worker_alive, emergency_stop}) => {
  const expectedOwner = state === 'HUMAN_REQUIRED' ? 'NONE' : state === 'CEREBRO_CONTROLLED' ? 'CEREBRO' : '';
  return Boolean(expectedOwner && control_owner === expectedOwner && worker_alive === true && emergency_stop !== true);
};
assert.equal(takeoverAllowed({state:'HUMAN_REQUIRED',control_owner:'NONE',worker_alive:true,emergency_stop:false}), true);
assert.equal(takeoverAllowed({state:'CEREBRO_CONTROLLED',control_owner:'CEREBRO',worker_alive:true,emergency_stop:false}), true);
assert.equal(takeoverAllowed({state:'HUMAN_REQUIRED',control_owner:'CEREBRO',worker_alive:true,emergency_stop:false}), false);
assert.equal(takeoverAllowed({state:'CEREBRO_CONTROLLED',control_owner:'NONE',worker_alive:true,emergency_stop:false}), false);
assert.equal(takeoverAllowed({state:'HUMAN_REQUIRED',control_owner:'NONE',worker_alive:false,emergency_stop:false}), false);
assert.equal(takeoverAllowed({state:'HUMAN_REQUIRED',control_owner:'NONE',worker_alive:true,emergency_stop:true}), false);
assert.equal(takeoverAllowed({state:'HUMAN_CONTROLLED',control_owner:'HUMAN',worker_alive:true,emergency_stop:false}), false);

assert.match(runtime, /verificationState!=='VERIFIED'/, 'runtime restore must reject every non-VERIFIED bundle');
assert.match(runtime, /requireVerifiedIdentity\(identityVerification\)/, 'runtime must gate final success on VERIFIED identity');
assert.match(runtime, /saveWorkspace\(job,tokenProvider,fetch_impl,lastPrivateTabs,lastActiveTabIndex,identityVerification\)/, 'runtime save must receive final identity state');
assert.match(runtime, /WORKSPACE_COMMIT_NOT_VERIFIED/, 'runtime must reject broker commits that are not VERIFIED');
assert.match(runtime, /GOOGLE_HMAC_VERIFIED_ONLY_FAIL_CLOSED/, 'runtime contract must advertise verified-only fail-closed identity');

assert.match(broker, /function requireVerifiedProfile\(p:any\)/, 'broker must expose a verified profile guard');
assert.match(broker, /requireVerifiedProfile\(p\);const bundleId=/, 'prepare-save must fail before bundle material is issued');
assert.match(broker, /const p=await profile\(job\);requireVerifiedProfile\(p\);/, 'commit-save must re-check identity to close TOCTOU');
assert.match(broker, /profileState!==VERIFIED\|\|bundleState!==VERIFIED/, 'restore must require both profile and bundle VERIFIED');
assert.match(broker, /\.eq\('verification_state',VERIFIED\)/, 'restore-complete must require VERIFIED bundle');
assert.match(broker, /status:'REVOKED'.*verificationState/s, 'identity invalidation must revoke active bundles');
assert.match(broker, /identity_gate:'VERIFIED_ONLY_FAIL_CLOSED'/, 'broker health contract must expose the gate');

assert.match(owner, /const expectedOwner=state==='HUMAN_REQUIRED'\?'NONE':state==='CEREBRO_CONTROLLED'\?'CEREBRO':'';/, 'owner takeover must use state-specific ownership');
assert.match(owner, /current\.worker_alive!==true\|\|current\.emergency_stop===true/, 'takeover must reject dead workers and emergency stop');
assert.match(owner, /\.eq\('state',state\)\.eq\('control_owner',expectedOwner\)\.eq\('worker_alive',true\)\.eq\('emergency_stop',false\)/, 'takeover write must repeat race-safe preconditions');
assert.match(owner, /String\(p\.verification_state\|\|'UNVERIFIED'\)==='VERIFIED'.*String\(bundle\.data\.verification_state\|\|'UNVERIFIED'\)==='VERIFIED'/s, 'owner must predict restore only for profile+bundle VERIFIED');
assert.match(owner, /status:'REVOKED'.*\.neq\('verification_state','VERIFIED'\)/s, 'account confirmation must revoke rather than bless pre-verification bundles');
assert.match(owner, /takeover_human_required:true,takeover_fail_closed:true,verified_bundle_reuse_only:true/, 'owner health contract must expose hardened takeover and reuse');

console.log('browser work-total fail-closed contract: PASS');
