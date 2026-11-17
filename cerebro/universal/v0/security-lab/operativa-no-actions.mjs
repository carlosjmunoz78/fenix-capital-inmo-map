/** CEREBRO OPERATIVA P0-A · portable one-shot LAB test operator.
 * No GitHub Actions, Vercel, browser, scheduled job or network in status/self-test.
 * Actual Auth work is delegated exclusively to the existing guarded LAB script.
 * No secret values, bearer tokens, user IDs or SDK errors are printed.
 */
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';

const ref='hnqlnvakzaywtafeiybt';
const arm='CEREBRO-LAB-SESSION-E2E-ONE-SHOT-'+ref;
const directory=dirname(fileURLToPath(import.meta.url));
const cycle=resolve(directory,'owner-session-auth-e2e-private.mjs');
const root=resolve(directory,'../../../..');
const mode=process.argv[2]||'--status';
const permitted=new Set(['--status','--self-test','--live']);
const report=(name,value)=>console.log('CEREBRO_NO_ACTIONS_'+name+'='+value);
// Explicit environment allowlist: never forward PROD/CRM/Vercel/GitHub secrets.
const baseEnv=()=>Object.fromEntries(
 ['PATH','Path','HOME','USERPROFILE','SystemRoot','SYSTEMROOT','TMP','TEMP','TMPDIR']
  .filter(name=>typeof process.env[name]==='string')
  .map(name=>[name,process.env[name]])
);
const scrubbedEnv=()=>({...baseEnv(),
 CEREBRO_LAB_SESSION_E2E_ARM:'',CEREBRO_LAB_PROJECT_REF:'',
 CEREBRO_LAB_SERVICE_ROLE_KEY:'',CEREBRO_LAB_PUBLISHABLE_KEY:''});
const labOnlyEnv=()=>({...baseEnv(),
 CEREBRO_LAB_SESSION_E2E_ARM:process.env.CEREBRO_LAB_SESSION_E2E_ARM,
 CEREBRO_LAB_PROJECT_REF:process.env.CEREBRO_LAB_PROJECT_REF,
 CEREBRO_LAB_SERVICE_ROLE_KEY:process.env.CEREBRO_LAB_SERVICE_ROLE_KEY,
 CEREBRO_LAB_PUBLISHABLE_KEY:process.env.CEREBRO_LAB_PUBLISHABLE_KEY
});
const invalid=()=>{report('RESULT','FAIL_CLOSED_INVALID_ARGUMENTS');process.exitCode=2;};
if(process.argv.length>3||!permitted.has(mode)){invalid();}
else if(mode==='--status'){
 report('ACTIONS_REQUIRED','false');
 report('MODE','STATUS_ONLY_NO_NETWORK');
 report('PROJECT','LAB_ONLY');
 report('ARMED',process.env.CEREBRO_LAB_SESSION_E2E_ARM===arm?'true':'false');
 report('LAB_KEYS_PRESENT',Boolean(process.env.CEREBRO_LAB_SERVICE_ROLE_KEY&&process.env.CEREBRO_LAB_PUBLISHABLE_KEY)?'true':'false');
 report('LIVE_AUTH_E2E','NOT_RUN');
 report('OPERATIVA_PROD','HOLD');
}
else if(mode==='--self-test'){
 // The test suite is pure node:test. No npm install, secrets or network needed.
 const files=[
  'cerebro/universal/v0/owner-session-auth-cycle-core.test.mjs',
  'cerebro/universal/v0/owner-session-auth-e2e-private.test.mjs',
  'cerebro/universal/v0/owner-session-reader-sql-contract.test.mjs',
  'cerebro/universal/v0/operativa-issuer-session-reader-prod-contract.test.mjs',
  'cerebro/universal/v0/p0b-fact001-provider-evidence-gate.test.mjs'
 ];
 const run=spawnSync(process.execPath,['--test',...files],{
  cwd:root,encoding:'utf8',env:scrubbedEnv(),timeout:120000,
  windowsHide:true,maxBuffer:512*1024
 });
 const text=String(run.stdout||'');
 const tests=Number(text.match(/# tests (\d+)/)?.[1]||0);
 const passed=Number(text.match(/# pass (\d+)/)?.[1]||0);
 const failed=Number(text.match(/# fail (\d+)/)?.[1]||0);
 if(run.status===0&&tests>=10&&passed===tests&&failed===0){
  report('SELF_TEST','PASS');
  report('TESTS',String(tests));
  report('FAILED','0');
 }else{
  report('SELF_TEST','FAIL_CLOSED');
  report('FAILED_COUNT',Number.isFinite(failed)?String(failed):'UNKNOWN');
  process.exitCode=1;
 }
 report('LIVE_AUTH_E2E','NOT_RUN');
}
else if(mode==='--live'){
 // Two independent explicit gates. No fallback to GitHub secrets or issuer PROD.
 if(process.env.CEREBRO_LAB_SESSION_E2E_ARM!==arm||
    process.env.CEREBRO_LAB_PROJECT_REF!==ref||
    !process.env.CEREBRO_LAB_SERVICE_ROLE_KEY||
    !process.env.CEREBRO_LAB_PUBLISHABLE_KEY){
  report('LIVE_AUTH_E2E','BLOCKED_UNARMED_OR_LAB_KEYS_MISSING');
  process.exitCode=2;
 }else{
  // Only the existing LAB Auth script can create and clean an ephemeral test user.
  const run=spawnSync(process.execPath,[cycle],{
   cwd:root,encoding:'utf8',env:labOnlyEnv(),timeout:120000,
   windowsHide:true,maxBuffer:8192
  });
  const safe=String(run.stdout||'');
  const accepted=run.status===0&&
   safe.includes('CEREBRO_LAB_SESSION_E2E=PASS_LAB_ISSUER_ONLY')&&
   safe.includes('TEST_USER_CLEANUP=SUCCESS');
  if(accepted){
   report('LIVE_AUTH_E2E','PASS_LAB_ISSUER_ONLY');
   report('TEMP_USER_CLEANUP','SUCCESS');
  }else{
   report('LIVE_AUTH_E2E','FAIL_CLOSED');
   report('TEMP_USER_CLEANUP','NOT_CERTIFIED');
   // Do not retry until administrator has verified temporary-user cleanup.
   process.exitCode=1;
  }
  report('PROD_ISSUER_AND_GATEWAY','NOT_CERTIFIED');
 }
}
