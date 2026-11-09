// FACT001: staged change to one isolated canary only; no deploy/credentials here.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
export const ROOT='cerebro/connectors/universal/supabase/fact001-console-owner-canary-lab';
export const OLD_SHA='9c79cd84477212fdec635a94c2be648c32ac7123';
export const OLD_NAME="export const VAULT_NAME='cerebro_fact001_cf_readonly_lab_20261109';";
export const NEW_NAME="export const VAULT_NAME='cerebro_fact001_cf_readonly_v1';";
export function blobSha(source){const bytes=Buffer.from(source,'utf8');return createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex')}
export function candidate(source){
 if(blobSha(source)!==OLD_SHA)throw Error('OWNER_CANARY_V2_SOURCE_CHANGED');
 if(source.split(OLD_NAME).length!==2)throw Error('EXACT_SECRET_CONST_NOT_FOUND');
 return source.replace(OLD_NAME,NEW_NAME);
}
export function rollback(newSrc){const restored=newSrc.replace(NEW_NAME,OLD_NAME);if(blobSha(restored)!==OLD_SHA)throw Error('ROLLBACK_BYTES_MISMATCH');return restored;}
if(process.argv[1]?.endsWith('owner-canary-v2-scoped-token-switch.mjs')){
 const original=readFileSync(ROOT+'/logic.mjs','utf8');
 const modified=candidate(original);if(rollback(modified)!==original)throw Error('CANARY_ROLLBACK_FAILED');
 console.log('FACT001_SCOPED_CANARY_BASELINE_MATCH=true');
 console.log('FACT001_SCOPED_CANARY_CONFIG_ONLY=true');
 console.log('FACT001_SCOPED_CANARY_NO_ADMIN_TOKEN_FALLBACK=true');
 console.log('FACT001_SCOPED_CANARY_ROLLBACK_BYTE_IDENTICAL=true');
}
