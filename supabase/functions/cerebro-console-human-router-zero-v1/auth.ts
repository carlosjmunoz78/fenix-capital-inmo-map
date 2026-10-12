const OIDC_ISSUER='https://token.actions.githubusercontent.com';
const OIDC_AUDIENCE='cerebro-console-human-router-zero-v1';
const REPOSITORY='carlosjmunoz78/fenix-capital-inmo-map';
const WORKFLOW_PATH='.github/workflows/cerebro-human-intelligence-prod-router-zero-v1.yml';

type Claims={iss?:string;aud?:string|string[];exp?:number;nbf?:number;repository?:string;event_name?:string;workflow_ref?:string;[key:string]:unknown};

function b64urlBytes(value:string){
  const normalized=value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4);
  const raw=atob(normalized);
  return Uint8Array.from(raw,c=>c.charCodeAt(0));
}
function b64urlJson<T>(value:string):T{return JSON.parse(new TextDecoder().decode(b64urlBytes(value)));}
let jwksCache:{at:number;keys:any[]}|null=null;
async function githubJwks(){
  if(jwksCache&&Date.now()-jwksCache.at<15*60*1000)return jwksCache.keys;
  const configRes=await fetch(`${OIDC_ISSUER}/.well-known/openid-configuration`);
  if(!configRes.ok)throw new Error('OIDC_CONFIG_UNAVAILABLE');
  const config=await configRes.json();
  const jwksRes=await fetch(String(config.jwks_uri));
  if(!jwksRes.ok)throw new Error('OIDC_JWKS_UNAVAILABLE');
  const jwks=await jwksRes.json();
  if(!Array.isArray(jwks?.keys))throw new Error('OIDC_JWKS_INVALID');
  jwksCache={at:Date.now(),keys:jwks.keys};
  return jwks.keys;
}

export async function authorizeOidc(req:Request){
  const bearer=req.headers.get('authorization')??'';
  if(!bearer.startsWith('Bearer '))return {ok:false as const,reason:'OIDC_MISSING'};
  const parts=bearer.slice(7).split('.');
  if(parts.length!==3)return {ok:false as const,reason:'OIDC_MALFORMED'};
  try{
    const header=b64urlJson<any>(parts[0]);
    const claims=b64urlJson<Claims>(parts[1]);
    if(header?.alg!=='RS256'||!header?.kid)return {ok:false as const,reason:'OIDC_ALG_OR_KID_INVALID'};
    const keys=await githubJwks();
    const jwk=keys.find((key:any)=>key?.kid===header.kid);
    if(!jwk)return {ok:false as const,reason:'OIDC_KID_UNKNOWN'};
    const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
    const verified=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,b64urlBytes(parts[2]),new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
    if(!verified)return {ok:false as const,reason:'OIDC_SIGNATURE_INVALID'};
    const now=Math.floor(Date.now()/1000);
    const audiences=Array.isArray(claims.aud)?claims.aud:[claims.aud].filter(Boolean);
    if(claims.iss!==OIDC_ISSUER||!audiences.includes(OIDC_AUDIENCE))return {ok:false as const,reason:'OIDC_ISSUER_OR_AUDIENCE_INVALID'};
    if(!claims.exp||claims.exp<now||Number(claims.nbf??0)>now+30)return {ok:false as const,reason:'OIDC_TIME_INVALID'};
    if(claims.repository!==REPOSITORY)return {ok:false as const,reason:'OIDC_REPOSITORY_INVALID'};
    if(!['pull_request','workflow_dispatch','schedule'].includes(String(claims.event_name??'')))return {ok:false as const,reason:'OIDC_EVENT_INVALID'};
    if(!String(claims.workflow_ref??'').includes(WORKFLOW_PATH))return {ok:false as const,reason:'OIDC_WORKFLOW_INVALID'};
    return {ok:true as const,claims};
  }catch(error){
    return {ok:false as const,reason:'OIDC_VERIFY_ERROR',detail:String(error instanceof Error?error.message:error)};
  }
}

export function jwtSubjectForRouting(req:Request){
  const auth=req.headers.get('authorization')??'';
  if(!auth.startsWith('Bearer '))return '';
  try{
    const parts=auth.slice(7).split('.');
    if(parts.length!==3)return '';
    const payload=b64urlJson<any>(parts[1]);
    return typeof payload?.sub==='string'&&payload.sub?`sub:${payload.sub}`:'';
  }catch{return '';}
}
