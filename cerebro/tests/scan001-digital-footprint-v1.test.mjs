import test from 'node:test';
import assert from 'node:assert/strict';
import {scanDigitalFootprint,scan001PersistenceEnvelope,normalizePublicDomain,Scan001Error} from '../multicompany/digital-footprint-scanner-v1.mjs';

function fakeFetcher(){
  const calls=[];
  const fetcher=async url=>{
    calls.push(url);
    if(url.endsWith('/robots.txt')) return {url,status:200,headers:{'content-type':'text/plain'},body:'User-agent: *\nSitemap: https://acme.example/sitemap.xml'};
    if(url.endsWith('/sitemap.xml')) return {url,status:200,headers:{'content-type':'application/xml'},body:'<urlset><url><loc>https://acme.example/a</loc></url></urlset>'};
    return {url,status:200,headers:{server:'cloudflare','cf-ray':'abc'},body:'<html><head><title>Acme</title><meta name="generator" content="WordPress"><meta property="og:url" content="https://acme.example/"></head><body><a href="/about">About</a><a href="https://instagram.com/acme">IG</a><script src="/wp-content/x.js"></script></body></html>'};
  };
  return {calls,fetcher};
}

test('SCAN-001 preserves historical read-only public signal extraction in PREPROD',async()=>{
  const {calls,fetcher}=fakeFetcher();
  const out=await scanDigitalFootprint({company_id:'acme',domain:'acme.example',evidence_at:'2026-10-13T06:10:00Z',fetcher});
  assert.equal(out.company_id,'acme');
  assert.equal(out.engine_id,'SCAN-001');
  assert.equal(out.environment,'PREPROD');
  assert.equal(out.root.status,200);
  assert.equal(out.root.title,'Acme');
  assert.ok(out.technologies.includes('wordpress'));
  assert.ok(out.technologies.includes('cloudflare'));
  assert.deepEqual(out.social_profiles.instagram,['https://instagram.com/acme']);
  assert.equal(out.indexation.robots.available,true);
  assert.equal(out.indexation.sitemap.available,true);
  assert.equal(out.read_only,true);
  assert.equal(out.external_cost_eur,0);
  assert.equal(out.prod_authorized,false);
  assert.equal(out.prod_write_authorized,false);
  assert.equal(out.trading_access,false);
  assert.match(out.evidence_sha256,/^[0-9a-f]{64}$/);
  assert.match(out.result_sha256,/^[0-9a-f]{64}$/);
  assert.equal(calls.length,3);
});

test('optional robots and sitemap fail closed without breaking root scan',async()=>{
  const fetcher=async url=>{
    if(url.endsWith('/robots.txt')||url.endsWith('/sitemap.xml')) throw new Error('offline');
    return {url,status:200,headers:{},body:'<title>X</title>'};
  };
  const out=await scanDigitalFootprint({company_id:'acme',domain:'acme.example',evidence_at:'now',fetcher});
  assert.equal(out.root.status,200);
  assert.equal(out.indexation.robots.available,false);
  assert.equal(out.indexation.sitemap.available,false);
});

test('SCAN-001 rejects PROD local/IP and malformed targets before any network fetch',async()=>{
  const {fetcher}=fakeFetcher();
  await assert.rejects(()=>scanDigitalFootprint({company_id:'acme',domain:'acme.example',evidence_at:'x',fetcher,environment:'PROD'}),e=>e instanceof Scan001Error&&e.code==='SCAN_POLICY_DENY');
  for(const domain of ['localhost','127.0.0.1','bad domain','http://localhost:8000']){
    await assert.rejects(()=>scanDigitalFootprint({company_id:'acme',domain,evidence_at:'x',fetcher}),e=>e instanceof Scan001Error);
  }
  assert.equal(normalizePublicDomain('https://WWW.Example.COM/path'),'www.example.com');
});

test('persistence envelope keeps only bounded metadata and hashes',async()=>{
  const {fetcher}=fakeFetcher();
  const result=await scanDigitalFootprint({company_id:'acme',domain:'acme.example',evidence_at:'2026-10-13T06:10:00Z',fetcher});
  const envelope=scan001PersistenceEnvelope(result,{idempotency_key:'scan:acme:1',recorded_by:'cerebro-ci'});
  assert.deepEqual(Object.keys(envelope).sort(),[
    'additional_cost_eur','company_id','domain','evidence_at','evidence_sha256','external_link_count','idempotency_key','internal_link_count','prod_authorized','prod_write_authorized','recorded_by','result_sha256','robots_available','root_status','sitemap_available','social_network_count','technology_count','trading_access','version'
  ]);
  assert.equal(JSON.stringify(envelope).includes('instagram.com/acme'),false);
  assert.equal(JSON.stringify(envelope).includes('wp-content'),false);
  assert.equal(envelope.prod_write_authorized,false);
  assert.equal(envelope.trading_access,false);
  assert.equal(envelope.additional_cost_eur,0);
});
