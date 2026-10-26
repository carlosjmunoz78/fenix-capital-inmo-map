import fs from 'node:fs';

const runtimePath='cerebro/runtime/browser-interactive-session-v3.mjs';
let runtime=fs.readFileSync(runtimePath,'utf8');
const from='no_mfa_or_captcha_bypass:true';
const to='auth_challenge_requires_human:true';
if(!runtime.includes(from))throw new Error('AUTOLOGIN_CHALLENGE_POLICY_ANCHOR_MISSING');
runtime=runtime.replace(from,to);
fs.writeFileSync(runtimePath,runtime);
console.log(JSON.stringify({ok:true,patch:'browser-autologin-contract-v1',auth_challenge_requires_human:true,secret_material_logged:false}));
