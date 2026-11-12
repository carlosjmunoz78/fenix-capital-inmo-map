import {DurableObject} from 'cloudflare:workers';
const REPO='carlosjmunoz78/capital-mapa-pro';
const REPO_ID='1139292249';
const REF='refs/heads/cerebro-engine-factory-v0';
const WORKFLOW_REF=REPO+'/.github/workflows/cerebro-fact-ums001-oidc-lab.yml@'+REF;
const ISS='https://token.actions.githubusercontent.com';
const AUD='cerebro-fact001-ums001-lab';
const JWKS=ISS+'/.well-known/jwks';
const rxEngine=/^[A-Z][A-Z0-9-]{2,63}$/;
const rxSha=/^[a-f0-9]{40}$/;
const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
const bad=(code,status=403)=>response({ok:false,code},status);
const bytes=t=>new TextEncoder().encode(t);
const b64u=x=>{const s=x.replace(/-/g,'+').replace(/_/g,'/');return Uint8Array.from(atob(s+'='.repeat((4-s.length%4)%4)),x=>x.charCodeAt(0))};
function jsonSegment(s){const raw=b64u(s);if(raw.byteLength>8000)throw Error('OIDC_TOO_LONG');return JSON.parse(new TextDecoder().decode(raw))}
function claimChecks(cl){
 const now=Math.floor(Date.now()/1000);
 if(!cl||cl.iss!==ISS||cl.aud!==AUD||cl.repository!==REPO||String(cl.repository_id)!==REPO_ID||
 cl.ref!==REF||cl.workflow_ref!==WORKFLOW_REF||cl.event_name!=='push'||!rxSha.test(cl.sha||'')||
 typeof cl.jti!=='string'||cl.jti.length<10||cl.jti.length>200||
 !Number.isInteger(cl.iat)||!Number.isInteger(cl.exp)||cl.exp<now||cl.iat>now+60||now-cl.iat>900||cl.exp-cl.iat>900||
 (cl.nbf!==undefined&&cl.nbf>now+60)||!/^[0-9]+$/.test(String(cl.run_id||'')))throw Error('GITHUB_CLAIMS_DENIED');
 return cl;
}
async function validateJwt(token){
 if(typeof token!=='string'||token.length>7000||token.length<200)throw Error('OIDC_TOKEN_INVALID');
 const parts=token.split('.');if(parts.length!==3||parts.some(x=>!x))throw Error('OIDC_TOKEN_SYNTAX');
 const head=jsonSegment(parts[0]);if(!head||head.alg!=='RS256'||typeof head.kid!=='string'||head.kid.length>160||
 head.jwk!==undefined||head.jku!==undefined||head.x5u!==undefined)throw Error('OIDC_HEADER_DENIED');
 const cl=claimChecks(jsonSegment(parts[1]));
 const res=await fetch(JWKS,{headers:{'accept':'application/json'},cf:{cacheTtl:300,cacheEverything:true}});
 if(!res.ok)throw Error('OIDC_JWKS_UNAVAILABLE');
 const jwks=await res.json();
 const jwk=jwks?.keys?.find(k=>k.kid===head.kid&&k.kty==='RSA'&&k.use==='sig'&&(k.alg==='RS256'||!k.alg));
 if(!jwk)throw Error('OIDC_KEY_NOT_FOUND');
 const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
 const ok=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,b64u(parts[2]),bytes(parts[0]+'.'+parts[1]));
 if(!ok)throw Error('OIDC_SIGNATURE_DENIED');
 return cl;
}
export class GithubOidcReplay extends DurableObject {
 constructor(ctx,env){
  super(ctx,env);
  this.ctx=ctx;
  ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS claims (claim_id TEXT PRIMARY KEY, engine_id TEXT NOT NULL, expires_at INTEGER NOT NULL, claimed_at TEXT NOT NULL)');
 }
 async claim(jti,engine,expiry){
  if(typeof jti!=='string'||!rxEngine.test(engine)||!Number.isInteger(expiry))throw Error('REPLAY_SCOPE');
  const now=Math.floor(Date.now()/1000);
  this.ctx.storage.sql.exec('DELETE FROM claims WHERE expires_at<?',now-3600);
  const id=jti+':'+engine;
  const exists=[...this.ctx.storage.sql.exec('SELECT claim_id FROM claims WHERE claim_id=?',id)][0];
  if(exists)return false;
  this.ctx.storage.sql.exec('INSERT INTO claims(claim_id,engine_id,expires_at,claimed_at) VALUES(?,?,?,?)',id,engine,expiry,new Date().toISOString());
  return true;
 }
}
function scopeManifest(m,engine){
 if(!m||m.engine_id!==engine||m.environment!=='LAB'||m.version!=='0.1.0'||m.media_gateway?.provider_engine_id!=='UMS-001'||
 m.media_gateway?.uses_per_engine_worker!==false||m.media_gateway?.publish_authorized!==false||
 m.media_gateway?.paid_execution_enabled!==false||!m.media_gateway?.capabilities?.includes('IMAGE.SYNTHETIC'))throw Error('FACTORY_MANIFEST_DENIED');
 return m;
}
async function fetchManifest(sha,engine){
 const path='https://raw.githubusercontent.com/'+REPO+'/'+sha+'/cerebro-os/engines/'+engine+'/manifest.json';
 const r=await fetch(path,{headers:{'accept':'application/json'},redirect:'error',cf:{cacheTtl:60}});
 if(!r.ok||Number(r.headers.get('content-length')||0)>12000)throw Error('MANIFEST_NOT_VERIFIED');
 const text=await r.text();if(text.length>12000)throw Error('MANIFEST_TOO_LARGE');
 return scopeManifest(JSON.parse(text),engine);
}
async function enroll(body,cl,env){
 if(env.OIDC_BRIDGE_ENABLED!=='true'||typeof env.FACT_BRIDGE_TOKEN!=='string'||env.FACT_BRIDGE_TOKEN.length<48||
 !env.PROVISIONER||!env.OIDC_REPLAY)throw Error('BRIDGE_OFF');
 if(!body||Object.keys(body).sort().join('|')!=='engine_id|sha'||!rxEngine.test(body.engine_id||'')||body.sha!==cl.sha)throw Error('REQUEST_NOT_COMMIT_SCOPED');
 const manifest=await fetchManifest(cl.sha,body.engine_id);
 const nonce=env.OIDC_REPLAY.get(env.OIDC_REPLAY.idFromName('fenix-factory-oidc-lab'));
 const first=await nonce.claim(cl.jti,body.engine_id,cl.exp);
 if(!first)throw Error('OIDC_REPLAY_REJECTED');
 const en=body.engine_id,ver=manifest.version;
 const h=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes('fenix/LAB/'+en+'/'+ver)))).map(x=>x.toString(16).padStart(2,'0')).join('').slice(0,32).toUpperCase();
 const event={schema_version:1,event_type:'FACT001_ENGINE_CREATED',event_id:'FACT-ENROLL-'+h,
 company_id:'fenix',engine_id:en,environment:'LAB',version:ver,allowed_channels:['GENERIC'],
 media_capabilities:['IMAGE.SYNTHETIC'],issued_at_utc:new Date().toISOString()};
 const receipt=await env.PROVISIONER.enrollTrustedGithubEvent(event,env.FACT_BRIDGE_TOKEN);
 if(receipt?.state!=='ACTIVE')throw Error('FACTORY_ENROLLMENT_NOT_ACTIVE');
 return {ok:true,state:'ACTIVE',engine_id:en,company_id:'fenix',environment:'LAB',gateway:'UMS-001',
 signed_probe_status:receipt.signing_test,publication:false,paid_enabled:false};
}
export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(request.method!=='POST'||url.pathname!=='/v1/factory/engine-created')return bad('NOT_FOUND',404);
  if(env.OIDC_BRIDGE_ENABLED!=='true')return bad('BRIDGE_OFF',503);
  try{
   const auth=request.headers.get('authorization')||'';
   if(!auth.startsWith('Bearer '))throw Error('GITHUB_BEARER_REQUIRED');
   if(!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')||''))throw Error('JSON_REQUIRED');
   const content=await request.text();if(content.length>1000)throw Error('BODY_TOO_LONG');
   // JWT verification precedes all resource modifications.
   const cl=await validateJwt(auth.slice(7));
   const result=await enroll(JSON.parse(content),cl,env);
   return response(result,200);
  }catch(e){
   // The response deliberately omits submitted values and signed token fragments.
   return bad(String(e?.message||'DENIED').replace(/[^A-Z0-9_]/gi,'_').slice(0,75),403);
  }
 }
};