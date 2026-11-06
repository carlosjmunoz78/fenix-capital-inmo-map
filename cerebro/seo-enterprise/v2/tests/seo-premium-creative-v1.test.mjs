import test from 'node:test';
import assert from 'node:assert/strict';
import {PREMIUM_SEO_IMAGE_CONTRACT_V1,validateOrder,premiumMarkup,loadBrand} from '../runtime/seo-premium-creative-v1.mjs';

const valid=PREMIUM_SEO_IMAGE_CONTRACT_V1;
const mock={logo:Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),Buffer.alloc(2000)]),
  font:Buffer.concat([Buffer.from('wOF2'),Buffer.alloc(2000)])};
test('compositor exclusively accepts Fénix SEO-001, locked source, PREPROD, no paid/publish',()=>{
  assert.equal(validateOrder(valid),true);
  for(const [key,bad] of [['company_id','evil'],['engine_id','SOC-001'],['environment','PROD'],
    ['version','v2'],['source_post_id',52656],['output_type','REEL'],
    ['source_url','https://staging.fenixcapital.es/'],['audience','INMOBILIARIAS'],
    ['headline','Aprobación garantizada'],['subtitle','100% asegurada'],
    ['publish_authorized',true],['paid_provider_requested',true]]){
      assert.throws(()=>validateOrder({...valid,[key]:bad}),/SEO_PREMIUM_SCOPE_DENIED/);
    }
});
test('graphic embeds original logo data and actual Montserrat web font, orange-first palette',()=>{
  const h=premiumMarkup(valid,mock);
  assert.match(h,/font-family:FenixMontserrat,sans-serif/);
  assert.match(h,/data:font\/woff2;base64/);
  assert.match(h,/id="official-logo"/);
  assert.match(h,/data:image\/png;base64/);
  assert.match(h,/#FF5F00/);assert.match(h,/#FFB71B/);
  assert.match(h,/#870064/);
  assert.match(h,/Documentación y viabilidad en Córdoba/);
  assert.doesNotMatch(h,/aprobaci[oó]n garantizada|mejor TAE|100% asegurad/i);
  assert.doesNotMatch(h,/https?:\/\/evil/);
  assert.throws(()=>premiumMarkup(valid,{logo:Buffer.alloc(2000),font:mock.font}),/BRAND_SOURCE_SIGNATURE_DENIED/);
});
test('first-party fetch blocks invalid MIME/signature, rejects redirects and requires both assets',async()=>{
  const urls=[];
  const fetch_impl=async(url,init)=>{
    urls.push(url);assert.equal(init.redirect,'error');
    const font=url.endsWith('.woff2');
    return {ok:true,headers:{get:x=>x==='content-type'?(font?'font/woff2':'image/png'):null},
      arrayBuffer:async()=>font?mock.font:mock.logo};
  };
  const assets=await loadBrand({fetch_impl});
  assert.equal(urls.length,2);
  assert.ok(urls.every(u=>u.startsWith('https://fenixcapital.es/')));
  assert.equal(assets.font.length,2004);
  assert.equal(assets.logo.length,2008);
  assert.equal(assets.font_sha256.length,64);
});
