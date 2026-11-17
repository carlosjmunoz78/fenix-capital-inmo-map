/**
 * Read-only owner E2E against a PINNED no-alias Vercel deployment.
 * Uses existing Vercel CLI auth to traverse Deployment Protection, which
 * is NEVER disabled or modified. Reuses existing GitHub secret references.
 * Never prints, saves to artifacts or returns any JWT/token/header.
 */
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const base='https://fenix-capital-preprod-o51yrnx8m.vercel.app';
const host=new URL(base);
assert.equal(host.origin,base);
assert.match(host.hostname,/^fenix-capital-preprod-[a-z0-9]+\.vercel\.app$/);
const token=process.env.CEREBRO_E2E_USER_JWT||'';
const apikey=process.env.PROD_SUPABASE_PUBLISHABLE_KEY||'';
if(!process.env.VERCEL_TOKEN)throw Error('BLOCKED: EXISTING_VERCEL_TOKEN_ABSENT');
const dir=mkdtempSync(join(tmpdir(),'cerebro-op-e2e-'));
function request(method,path,authenticated=false){
 const destination=new URL(path,base);
 assert.equal(destination.origin,base);
 const filename=join(dir,'headers');
 const lines=['accept: application/json'];
 if(authenticated)lines.push('authorization: Bearer '+token,'apikey: '+apikey);
 writeFileSync(filename,lines.join('\n')+'\n',{mode:0o600});
 const args=['curl','--url',destination.toString(),'--scope=carlosjmunozcabeza-2582s-projects',
  '-X',method,'-H','@'+filename,'-s','-S','--max-time','16',
  '-w','\nCEREBRO_HTTP_STATUS:%{http_code}'];
 const output=spawnSync('vercel',args,{
  encoding:'utf8',env:process.env,timeout:28000,maxBuffer:1024*1024
 });
 if(output.error||output.status!==0)
  throw Error('BLOCKED: VERCEL_CURL_TRANSPORT_'+String(output.status??'NO_EXIT'));
 const match=output.stdout.match(/\nCEREBRO_HTTP_STATUS:(\d{3})\s*$/);
 if(!match)throw Error('BLOCKED: VERCEL_CURL_STATUS_UNAVAILABLE');
 const status=Number(match[1]);
 const body=output.stdout.slice(0,match.index);
 let data=null;
 try{data=JSON.parse(body)}catch{}
 return {status,data};
}
function expect(label,expected,response,reason){
 if(response.status!==expected||reason&&response.data?.reason!==reason)
  throw Error(label+'_DENIED_OR_UNEXPECTED_STATUS_'+response.status);
 console.log(label+'_PASS');
}
try{
 // Public pre-authorization security negatives, plus SSO bypass only via CLI.
 expect('UNAUTH_CONTEXT_401',401,request('GET','/api/cerebro-owner-bootstrap?resource=context'),'OWNER_SESSION_REQUIRED');
 expect('UNAUTH_DIRECTORY_401',401,request('GET','/api/cerebro-agent-directory?company_id=fenix'));
 expect('MUTATION_405',405,request('POST','/api/cerebro-agent-directory?company_id=fenix'),'READ_ONLY');
 expect('WRONG_TENANT_400',400,request('GET','/api/cerebro-agent-directory?company_id=other'),'INVALID_QUERY_OR_SCOPE');

 // The negative SSO/authorization gates must run even if the owner test JWT expired.\n if(!token||!apikey)throw Error('BLOCKED: OWNER_E2E_EXISTING_SECRET_ABSENT');
 const chunks=token.split('.');
 if(chunks.length!==3)throw Error('BLOCKED: OWNER_E2E_JWT_MALFORMED');
 let payload;
 try{payload=JSON.parse(Buffer.from(chunks[1],'base64url').toString('utf8'))}
 catch{throw Error('BLOCKED: OWNER_E2E_JWT_INVALID_CLAIMS')}
 if(!Number.isFinite(payload.exp)||payload.exp*1000<Date.now()+60_000)
  throw Error('BLOCKED: OWNER_E2E_JWT_EXPIRED');
 if(!/^sb_publishable_[A-Za-z0-9_-]{12,128}$/.test(apikey))
  throw Error('BLOCKED: PUBLISHABLE_KEY_FORMAT');
 const ctx=request('GET','/api/cerebro-owner-bootstrap?resource=context',true);
 if(ctx.status!==200||ctx.data?.ok===false||(ctx.data?.context||ctx.data)?.actor_code!=='CARLOS-ADMIN')
  throw Error('BLOCKED: OWNER_CONTEXT_NOT_CERTIFIED_STATUS_'+ctx.status);
 console.log('OWNER_CONTEXT_200_VERIFIED');

 const nav=request('GET','/api/cerebro-owner-bootstrap?resource=navigation',true);
 if(nav.status!==200||!Array.isArray(nav.data?.items))
  throw Error('BLOCKED: OWNER_NAVIGATION_NOT_CERTIFIED_STATUS_'+nav.status);
 console.log('OWNER_NAVIGATION_200_VERIFIED');

 const listing=request('GET','/api/cerebro-agent-directory?company_id=fenix&kind=ALL&limit=25',true);
 if(listing.status!==200||listing.data?.transport!=='OWNER_PROD_READONLY'||
    listing.data?.executed!==false||listing.data?.read_only!==true||
    listing.data?.page?.total!==2506||listing.data?.records?.length!==25)
  throw Error('BLOCKED: OWNER_DIRECTORY_NOT_CERTIFIED_STATUS_'+listing.status);
 console.log('OWNER_DIRECTORY_2506_SOURCED_ROLES_VERIFIED');
 console.log('CEREBRO_STAGE_E2E_READONLY_PASS_NO_PROD_PROMOTION');
}finally{rmSync(dir,{recursive:true,force:true})}
