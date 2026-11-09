import test from 'node:test';
import assert from 'node:assert/strict';
import { auditCloudflareAccountScopes, ACCOUNT_ID, sanitizeResponseStatus } from '../preflight/cloudflare-account-scope-readonly.mjs';
const zone='f'.repeat(32);
function res(result, status=200){return {status,ok:status>=200&&status<300,json:async()=>({success:true,result})};}
const endpoint=(url)=>new URL(url).pathname.replace(/^\/client\/v4/, '');
const valid=(url, options)=>{
  const p=endpoint(url);
  assert.equal(options.method,'GET'); assert.equal(options.redirect,'error');
  if(p==='/user/tokens/verify')return res({status:'active'});
  if(p==='/zones')return res([{id:zone,account:{id:ACCOUNT_ID}}]);
  return res(p.endsWith('/workers/scripts')?[]:p.endsWith('/d1/database')?[]:{});
};
test('valid token and account: all GET and per-zone checks, no mutation',async()=>{
  const calls=[];
  const report=await auditCloudflareAccountScopes({token:'mock-token',http:(url,options)=>{calls.push([url,options]);return valid(url,options);}});
  assert.equal(report.account_id_verified,true);assert.equal(report.mutations,0);
  assert.equal(report.scopes.DNS,'READ_OK');assert.equal(report.scopes.WORKERS,'READ_OK');
  assert.equal(report.scopes.R2,'READ_OK');assert.equal(report.scopes.ACCESS,'READ_OK');
  assert.ok(calls.every(([url,o])=>url.startsWith('https://api.cloudflare.com/client/v4/')&&o.method==='GET'));
  assert.equal(report.requests,calls.length);
});
test('does not conflate 403, 404 and 429 with permissions',()=>{
  assert.equal(sanitizeResponseStatus({status:403,ok:false},null),'PERMISSION_BLOCKED');
  assert.equal(sanitizeResponseStatus({status:404,ok:false},null),'NOT_AVAILABLE_OR_ENDPOINT');
  assert.equal(sanitizeResponseStatus({status:429,ok:false},null),'RATE_LIMITED');
  assert.equal(sanitizeResponseStatus({status:200,ok:true},{success:false}),'API_REJECTED');
});
test('fails closed on bad token',async()=>{
  await assert.rejects(auditCloudflareAccountScopes({token:'',http:valid}),/TOKEN_SECRET_MISSING/);
  await assert.rejects(auditCloudflareAccountScopes({token:'mock',http:async()=>res({status:'expired'})}),/TOKEN_NOT_ACTIVE/);
});
test('fails closed if foundational exact account capability cannot be proved',async()=>{
  const bad=async(url,options)=>endpoint(url).includes('/d1/database')?res({},403):valid(url,options);
  await assert.rejects(auditCloudflareAccountScopes({token:'mock',http:bad}),/EXACT_ACCOUNT_CORE_SCOPE_NOT_PROVEN/);
});
test('fails on cross account zone poisoning before zone API request',async()=>{
  const calls=[];
  const bad=async(url,options)=>{calls.push(endpoint(url));return endpoint(url)==='/zones'?res([{id:zone,account:{id:'wrong_account'}}]):valid(url,options);};
  await assert.rejects(auditCloudflareAccountScopes({token:'mock',http:bad}),/CROSS_ACCOUNT_ZONE_RESPONSE/);
  assert.equal(calls.filter(x=>x.includes('/dns_records')).length,0);
});
test('rate limit halts further probes and never retries',async()=>{
  let n=0;
  const fake=async(url,options)=>{n++;if(endpoint(url).endsWith('/workers/domains'))return res({},429);return valid(url,options);};
  const result=await auditCloudflareAccountScopes({token:'mock',http:fake});
  assert.equal(result.scopes.WORKERS_DOMAINS,'RATE_LIMITED');
  assert.equal(result.scopes.WORKERS_SETTINGS,'NOT_CHECKED');
  assert.equal(result.scopes.ZONES,'NOT_CHECKED');
  assert.equal(result.partial,true);assert.equal(result.requests,n);
});
test('does not send raw resource metadata to output',async()=>{
  const fake=async(url,options)=>endpoint(url).endsWith('/workers/domains')?res([{secret:'TOP_SECRET_PRIVATE'}]):valid(url,options);
  const result=await auditCloudflareAccountScopes({token:'mock',http:fake});
  assert.equal(JSON.stringify(result).includes('TOP_SECRET_PRIVATE'),false);
});
test('zone list with no authorized zone skips per-zone requests',async()=>{
  const fake=async(url,options)=>endpoint(url)==='/zones'?res([]):valid(url,options);
  const result=await auditCloudflareAccountScopes({token:'mock',http:fake});
  assert.equal(result.scopes.ZONE_SCOPE,'NO_ZONE_IN_FIRST_PAGE');
  assert.equal('DNS' in result.scopes,false);
});