/**
 * FACT-001 / UMS-001 bridge for GitHub Actions (OIDC JWT only).
 * LAB only, no account API keys in GitHub, no public status / debug endpoints.
 */
const AUDIENCE='urn:cerebro:fact001:ums001:lab:github-oidc:v1';
const ISSUER='https://token.actions.githubusercontent.com';
const REPOSITORY='carlosjmunoz78/capital-mapa-pro';
const REF='refs/heads/cerebro-engine-factory-v0';
const WORKFLOW_REF=REPOSITORY+'/.github/workflows/cerebro-engine-factory-v0.yml@'+REF;
const enc=new TextEncoder();
const reply=(body,status)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
function reject(code){throw Error('FACT_OIDC_'+code)}
function decode64(s){
 if(typeof s!=='string'||!(/^[A-Za-z0-9_-]+$/.test(s))||s.length>18000)reject('BAD_BASE64');
 const n=s.replace(/-/g,'+').replace(/_/g,'/');return Uint8Array.from(atob(n+'='.repeat((4-n.length%4)%4)),c=>c.charCodeAt(0));
}
function utf8json(s){return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(decode64(s)))}
function requireEqual(value,expected,code){if(value!==expected)reject(code)}
async function validateOIDC(token){
 if(typeof token!=='string'||token.length<500||token.length>13000)reject('TOKEN_SIZE');
 const parts=token.split('.');if(parts.length!==3)reject('PARTS');
 const [head,claims]=[utf8json(parts[0]),utf8json(parts[1])];
 requireEqual(head.alg,'RS256','ALGORITHM');
 if(typeof head.kid!=='string'||head.kid.length<4||head.kid.length>160||head.jku!==undefined||head.x5u!==undefined||head.jwk!==undefined||head.crit!==undefined)reject('HEADER');
 requireEqual(claims.iss,ISSUER,'ISSUER');
 requireEqual(claims.aud,AUDIENCE,'AUDIENCE');
 requireEqual(claims.repository,REPOSITORY,'REPOSITORY');
 requireEqual(claims.repository_owner,'carlosjmunoz78','OWNER');
 requireEqual(claims.ref,REF,'BRANCH');
 requireEqual(claims.ref_type,'branch','REF_TYPE');
 requireEqual(claims.workflow_ref,WORKFLOW_REF,'WORKFLOW');
 requireEqual(claims.event_name,'push','EVENT');
 requireEqual(claims.runner_environment,'github-hosted','RUNNER');
 if(!/^[0-9]+$/.test(String(claims.run_id||''))||!(/^[a-f0-9]{40}$/.test(claims.sha||'')))reject('RUN_CONTEXT');
 const now=Math.floor(Date.now()/1000);
 if(!Number.isSafeInteger(claims.iat)||!Number.isSafeInteger(claims.exp)||claims.iat>now+60||claims.iat<now-600||claims.exp<=now||claims.exp>now+1200||(claims.nbf!==undefined&&claims.nbf>now+60))reject('EXPIRED');
 // GitHub OIDC JWKS comes only from a hard-coded issuer domain, never from JWT headers.
 const r=await fetch(ISSUER+'/.well-known/jwks',{headers:{accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(5000)});
 if(!r.ok)reject('KEYS_UNAVAILABLE');
 const jwks=await r.json();
 const jwk=(Array.isArray(jwks.keys)?jwks.keys:[]).find(k=>k.kid===head.kid&&k.kty==='RSA'&&k.use==='sig'&&k.alg==='RS256');
 if(!jwk||typeof jwk.n!=='string'||typeof jwk.e!=='string')reject('KEY_NOT_FOUND');
 const publicKey=await crypto.subtle.importKey('jwk',{kty:'RSA',n:jwk.n,e:jwk.e,alg:'RS256',ext:true,key_ops:['verify']},{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
 const valid=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',publicKey,decode64(parts[2]),enc.encode(parts[0]+'.'+parts[1]));
 if(!valid)reject('SIGNATURE');
 return {run_id:String(claims.run_id),sha:claims.sha,workflow_ref:claims.workflow_ref,repository:claims.repository,issued_at:claims.iat};
}
async function validateEvent(v){
 if(!v||typeof v!=='object'||Array.isArray(v))reject('BODY');
 const fields=['schema_version','event_type','event_id','company_id','engine_id','environment','version','allowed_channels','media_capabilities','issued_at_utc'];
 if(Object.keys(v).sort().join('|')!==fields.sort().join('|'))reject('EVENT_FIELDS');
 if(v.schema_version!==1||v.event_type!=='FACT001_ENGINE_CREATED'||v.company_id!=='fenix'||v.environment!=='LAB'||!(/^[A-Z][A-Z0-9-]{2,63}$/.test(v.engine_id||''))||!(/^\d+\.\d+\.\d+$/.test(v.version||'')))reject('EVENT_SCOPE');
 if(!Array.isArray(v.allowed_channels)||v.allowed_channels.length!==1||!['GENERIC','SEO'].includes(v.allowed_channels[0])||JSON.stringify(v.media_capabilities)!=='["IMAGE.SYNTHETIC"]')reject('CAPABILITY');
 const message='fenix/LAB/'+v.engine_id+'/'+v.version;
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(message)))).map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,32).toUpperCase();
 if(v.event_id!=='FACT-ENROLL-'+hash)reject('EVENT_ID');
 if(!Number.isFinite(Date.parse(v.issued_at_utc))||Math.abs(Date.now()-Date.parse(v.issued_at_utc))>300000)reject('EVENT_TIME');
 return {...v,issued_at_utc:new Date().toISOString()};
}
export default {
 async fetch(request,env){
  if(request.method!=='POST'||new URL(request.url).pathname!=='/v1/enroll')return reply({status:'NOT_FOUND'},404);
  if(env.BRIDGE_ENABLED!=='true'||!env.FACT_PROVISIONER||!env.FACT_GITHUB_BRIDGE_TOKEN)return reply({status:'DISABLED'},503);
  try {
   if(!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')||''))reject('CONTENT_TYPE');
   if(Number(request.headers.get('content-length')||0)>6000)reject('BODY_SIZE');
   const auth=request.headers.get('authorization')||'';
   if(!auth.startsWith('Bearer '))reject('TOKEN_MISSING');
   const identity=await validateOIDC(auth.slice(7));
   const body=await request.text();if(body.length>6000)reject('BODY_SIZE');
   const event=await validateEvent(JSON.parse(body).event);
   const result=await env.FACT_PROVISIONER.enrollFromGitHubOIDC(event,env.FACT_GITHUB_BRIDGE_TOKEN);
   if(result?.state!=='ACTIVE'||result.engine_id!==event.engine_id)reject('ENROLL_FAILED');
   return reply({state:'ACTIVE',engine_id:result.engine_id,environment:'LAB',registered:true,signed_probe_status:result.signing_test||null},200);
  }catch(e){
   const raw=String(e?.message||'ERROR');
   // Never echo token, JWT claims, key material, or provider response.
   const code=/^FACT_OIDC_[A-Z0-9_]+$/.test(raw)?raw:'FACT_OIDC_REJECTED';
   return reply({status:'DENIED',code},403);
  }
 }
};