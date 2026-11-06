/**
 * Local-only owner JWT freshness preflight. Does not verify signatures or grant
 * authorization. The server remains the sole authority.
 * NEVER writes, logs or persists JWT/payload/subject/email.
 */
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
export function inspectJwtFreshness(jwt,nowMs=Date.now()){
 if(typeof jwt!=='string'||jwt.length<32)return'MISSING';
 const parts=jwt.split('.');
 if(parts.length!==3||parts.some(x=>!x))return'MALFORMED';
 try{
  const claims=JSON.parse(Buffer.from(parts[1],'base64url').toString('utf8'));
  if(!Number.isFinite(claims.exp)||claims.exp<1e9)return'MISSING_EXP';
  if(claims.exp*1000<=nowMs+60000)return'EXPIRED_OR_NEAR_EXPIRY';
  if(Number.isFinite(claims.nbf)&&claims.nbf*1000>nowMs+60000)return'NOT_YET_VALID';
  return'POSSIBLY_FRESH_NOT_AUTHENTICATED';
 }catch{return'MALFORMED'}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const state=inspectJwtFreshness(process.env.CEREBRO_E2E_USER_JWT);
 console.log('JARVIS_OWNER_JWT_FRESHNESS='+state);
 if(process.env.GITHUB_OUTPUT){
  const {appendFileSync}=await import('node:fs');
  appendFileSync(process.env.GITHUB_OUTPUT,'run_live='+String(state==='POSSIBLY_FRESH_NOT_AUTHENTICATED')+'\n',{mode:0o600});
 }
}
