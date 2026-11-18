import {appendFileSync} from 'node:fs';
export const E2E_EMAIL='cerebro-e2e@fenixcapital.es';
const EXPECTED_ISS='https://cluhljgonannaafpmblx.supabase.co/auth/v1';
const AUTH_ENDPOINT='https://cluhljgonannaafpmblx.supabase.co/auth/v1/token?grant_type=password';
export const SAFETY_MARGIN_SECONDS=300;
export function tokenClaims(jwt){
 if(typeof jwt!=='string'||jwt.split('.').length!==3)throw Error('E2E_BAD_JWT_FORMAT');
 try {return JSON.parse(Buffer.from(jwt.split('.')[1],'base64url').toString('utf8'))}
 catch {throw Error('E2E_BAD_JWT_CLAIMS')}
}
/** Claims parser is NOT a signature validator. Supabase Auth HTTPS issues the
 * ephemeral token; protected backends independently verify its signature/identity. */
export function validateEphemeralSession(payload,now=Math.floor(Date.now()/1000)){
 const user=payload?.user,metadata=user?.app_metadata;
 const id=String(user?.id||''),email=String(user?.email||'').toLowerCase();
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)||
    email!==E2E_EMAIL)throw Error('E2E_IDENTITY_MISMATCH');
 if(!user?.email_confirmed_at)throw Error('E2E_EMAIL_NOT_CONFIRMED');
 if(metadata?.cerebro_e2e_readonly!==true||metadata?.actor_code==='CARLOS-ADMIN')throw Error('E2E_READONLY_CI_MARKER_MISSING_OR_PRIVILEGED');
 const claims=tokenClaims(payload?.access_token);
 if(claims.iss!==EXPECTED_ISS||claims.aud!=='authenticated'||claims.sub!==id||
   claims.app_metadata?.cerebro_e2e_readonly!==true||claims.app_metadata?.actor_code==='CARLOS-ADMIN'||
   (claims.email&&String(claims.email).toLowerCase()!==E2E_EMAIL)||
   typeof claims.exp!=='number'||claims.exp-now<=SAFETY_MARGIN_SECONDS||
   claims.is_anonymous===true)throw Error('E2E_TOKEN_CLAIMS_OR_TTL_INVALID');
 if(typeof payload?.refresh_token!=='string')throw Error('E2E_EXPECTED_SUPABASE_SESSION');
 return {access_token:payload.access_token,expires_at:claims.exp};
}
export async function obtainEphemeralToken(env,fetcher=fetch){
 const password=String(env.CEREBRO_E2E_TEST_PASSWORD||''),apikey=String(env.PROD_SUPABASE_PUBLISHABLE_KEY||'');
 if(!password||!apikey)throw Error('E2E_TEST_CREDENTIALS_NOT_CONFIGURED');
 const response=await fetcher(AUTH_ENDPOINT,{method:'POST',redirect:'error',cache:'no-store',
  headers:{'content-type':'application/json',apikey,accept:'application/json'},
  body:JSON.stringify({email:E2E_EMAIL,password}),signal:AbortSignal.timeout(10000)});
 if(response.status!==200)throw Error('E2E_PASSWORD_LOGIN_REJECTED_HTTP_'+response.status);
 return validateEphemeralSession(await response.json());
}
export function githubRuntimeToken(token,env){
 if(!env.GITHUB_ENV)throw Error('E2E_MISSING_GITHUB_ENV');
 // GitHub Actions masks the value before using it in later steps.
 process.stdout.write('::add-mask::'+token+'\n');
 appendFileSync(env.GITHUB_ENV,'CEREBRO_E2E_RUNTIME_JWT='+token+'\n',{mode:0o600});
}
if(process.argv[1]&&import.meta.url==='file://'+process.argv[1]){
 obtainEphemeralToken(process.env).then(({access_token,expires_at})=>{
  githubRuntimeToken(access_token,process.env);
  process.stdout.write('PASS_FRESH_CI_TOKEN_READY_EXPIRES_AT='+new Date(expires_at*1000).toISOString()+'\n');
 }).catch(err=>{
  process.stderr.write('HUMAN_REQUIRED_CI_IDENTITY: '+String(err?.message||'UNKNOWN')+'\n');
  process.exitCode=2;
 });
}
