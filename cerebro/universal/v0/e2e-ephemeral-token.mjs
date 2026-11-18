import {appendFileSync} from 'node:fs';
const EXPECTED_ISS='https://cluhljgonannaafpmblx.supabase.co/auth/v1';
const AUTH_ENDPOINT='https://cluhljgonannaafpmblx.supabase.co/auth/v1/token?grant_type=password';
export const SAFETY_MARGIN_SECONDS=300;
export function tokenClaims(jwt) {
 if(typeof jwt!=='string'||jwt.split('.').length!==3)throw Error('E2E_BAD_JWT_FORMAT');
 let c;
 try{c=JSON.parse(Buffer.from(jwt.split('.')[1],'base64url').toString('utf8'))}catch{throw Error('E2E_BAD_JWT_CLAIMS')}
 return c;
}
/** NOT a JWT signature validator. The authenticated HTTPS Auth server issued the JWT;
 * backend ALWAYS validates the bearer independently. Never use this client parser for authz.
 */
export function validateEphemeralSession(payload,env,now=Math.floor(Date.now()/1000)) {
 const email=String(env.CEREBRO_E2E_TEST_EMAIL||'').trim().toLowerCase();
 const id=String(env.CEREBRO_E2E_TEST_USER_ID||'');
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))throw Error('E2E_EXPECTED_ID_MISSING');
 if(!email||email!==String(payload?.user?.email||'').toLowerCase()||payload?.user?.id!==id)throw Error('E2E_IDENTITY_MISMATCH');
 if(payload?.user?.app_metadata?.cerebro_e2e_readonly!==true)throw Error('E2E_READONLY_CI_MARKER_MISSING');
 const claims=tokenClaims(payload?.access_token);
 if(claims.iss!==EXPECTED_ISS||claims.aud!=='authenticated'||claims.sub!==id||
    typeof claims.exp!=='number'||claims.exp-now<=SAFETY_MARGIN_SECONDS)throw Error('E2E_TOKEN_CLAIMS_OR_TTL_INVALID');
 if(typeof payload?.refresh_token!=='string')throw Error('E2E_EXPECTED_SUPABASE_SESSION');
 return {access_token:payload.access_token,expires_at:claims.exp};
}
export async function obtainEphemeralToken(env,fetcher=fetch) {
 const email=String(env.CEREBRO_E2E_TEST_EMAIL||''),password=String(env.CEREBRO_E2E_TEST_PASSWORD||'');
 const apikey=String(env.PROD_SUPABASE_PUBLISHABLE_KEY||'');
 if(!email||!password||!apikey||!env.CEREBRO_E2E_TEST_USER_ID)throw Error('E2E_TEST_CREDENTIALS_NOT_CONFIGURED');
 const response=await fetcher(AUTH_ENDPOINT,{method:'POST',redirect:'error',cache:'no-store',headers:{'content-type':'application/json',apikey,accept:'application/json'},
  body:JSON.stringify({email,password}),signal:AbortSignal.timeout(10000)});
 if(response.status!==200)throw Error('E2E_PASSWORD_LOGIN_REJECTED_HTTP_'+response.status);
 const data=await response.json();
 // Rotating refresh token belongs to this one ephemeral login; never save it.
 return validateEphemeralSession(data,env);
}
export function githubRuntimeToken(token,env) {
 if(!env.GITHUB_ENV)throw Error('E2E_MISSING_GITHUB_ENV');
 // Must mask BEFORE materializing job environment, never echo token or refresh token.
 process.stdout.write('::add-mask::'+token+'\n');
 appendFileSync(env.GITHUB_ENV,'CEREBRO_E2E_RUNTIME_JWT='+token+'\n',{mode:0o600});
}
if(process.argv[1]&&import.meta.url==='file://'+process.argv[1]){
 obtainEphemeralToken(process.env).then(({access_token,expires_at})=>{
  githubRuntimeToken(access_token,process.env);
  process.stdout.write('EPHEMERAL_CI_TOKEN_READY_EXPIRES_AT='+new Date(expires_at*1000).toISOString()+'\n');
 }).catch(err=>{process.stderr.write('HUMAN_REQUIRED_E2E_EPHEMERAL_LOGIN: '+String(err?.message||'UNKNOWN')+'\n');process.exitCode=2;});
}
