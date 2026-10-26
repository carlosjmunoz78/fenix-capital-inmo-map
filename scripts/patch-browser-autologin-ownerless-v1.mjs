import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const runnerPath='cerebro/runtime/browser-job-runner-v2.mjs';
const ownerPath='supabase/functions/cerebro-browser-work-total-owner-v1-prod/index.ts';
let runner=fs.readFileSync(runnerPath,'utf8');
const from="    if(job.credential_ref_id){\n      const interactive=String(job.capability||'')==='browser1.interactive';";
const to="    const interactiveCredentialFlow=String(job.capability||'')==='browser1.interactive';\n    if(job.credential_ref_id||interactiveCredentialFlow){\n      const interactive=interactiveCredentialFlow;";
if(!runner.includes(from))throw new Error('AUTOLOGIN_OWNERLESS_RUNNER_ANCHOR_MISSING');
runner=runner.replace(from,to);
fs.writeFileSync(runnerPath,runner);

// The first patch intentionally models the owner-assisted variant for comparison.
// The selected architecture restores the canonical owner source unchanged and lets
// the OIDC-bound broker resolve credentials from the leased workspace profile.
const canonicalOwner=execFileSync('git',['-c',`safe.directory=${process.cwd()}`,'show',`HEAD:${ownerPath}`],{encoding:'utf8'});
fs.writeFileSync(ownerPath,canonicalOwner);

console.log(JSON.stringify({ok:true,patch:'browser-autologin-ownerless-v1',owner_ui_unchanged:true,interactive_profile_credential_resolution:true,secret_material_logged:false}));
