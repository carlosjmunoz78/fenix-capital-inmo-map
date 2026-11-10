import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const original=readFileSync(new URL('../cloudflare/ums001-private-gateway-lab/worker.mjs',import.meta.url),'utf8');
const code=original.replace("import {WorkerEntrypoint} from 'cloudflare:workers';","class WorkerEntrypoint { constructor(ctx,env) {this.ctx=ctx;this.env=env;} }");
if(code===original)throw Error('GATEWAY_SOURCE_IMPORT_CHANGED');
const {ProducerLibraryLab}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const secret='a'.repeat(64);
const request={company_id:'fenix',engine_id:'UMS-001',environment:'LAB',provider:'ambientcg',kind:'textures',query:'wood'};
const asset={id:'Wood096',title:'Wood 096',license:'CC0-1.0',downloaded:false,production_approved:false,source:'https://ambientcg.com/a/Wood096'};
const upstream={async search(input){assert.equal(input.auth_token,secret);assert.equal(input.permission,'media.search');assert.equal(input.actor_id,'ums001-producer-lab');return {company_id:'fenix',engine_id:'UMS-001',environment:'LAB',provider:input.provider,kind:input.kind,mode:'METADATA_ONLY',downloaded:false,results:[asset]}}};
function gateway(overrides={}){return new ProducerLibraryLab({}, {GATEWAY_ENABLED:'true',SOURCE_SCOUT_ENABLED:'true',SOURCE_SCOUT_TOKEN:secret,SOURCE_SCOUT:upstream,...overrides});}
test('private producer returns CC0 metadata, no download',async()=>{const r=await gateway().scout(request);assert.equal(r.results[0].id,'Wood096');assert.equal(r.downloaded,false);assert.equal(r.production_approved,false);});
test('scout stays disabled when flag false',async()=>assert.rejects(gateway({SOURCE_SCOUT_ENABLED:'false'}).scout(request),/SCOUT_GATEWAY_DISABLED/));
test('scout stays disabled when gateway false',async()=>assert.rejects(gateway({GATEWAY_ENABLED:'false'}).scout(request),/SCOUT_GATEWAY_DISABLED/));
test('other provider not enabled',async()=>assert.rejects(gateway().scout({...request,provider:'openverse'}),/SCOUT_REQUEST_INVALID/));
test('untrusted company rejected before RPC',async()=>assert.rejects(gateway().scout({...request,company_id:'other'}),/SCOUT_REQUEST_INVALID/));
test('no secret fails shut',async()=>assert.rejects(gateway({SOURCE_SCOUT_TOKEN:undefined}).scout(request),/SCOUT_PRIVATE_BINDING_REQUIRED/));
test('bad upstream rights are blocked',async()=>assert.rejects(gateway({SOURCE_SCOUT:{search:async()=>({...await upstream.search({...request,auth_token:secret,permission:'media.search',actor_id:'ums001-producer-lab'}),results:[{...asset,license:'CC-BY-NC'}]})}}).scout(request),/SCOUT_INVALID_RESPONSE/));

const commonsRequest={...request,provider:'wikimedia_commons',kind:'images',query:'CC0'};
const commonsAsset={id:'commons:23',title:'File:Demo.jpg',source:'https://commons.wikimedia.org/wiki/File:Demo.jpg',license:'CC0-1.0',
 downloaded:false,production_approved:false,requires_license_review:true};
const commonsService={async search(input){assert.equal(input.provider,'wikimedia_commons');assert.equal(input.permission,'media.search');assert.equal(input.auth_token,secret);
 return {company_id:'fenix',engine_id:'UMS-001',environment:'LAB',provider:input.provider,kind:input.kind,mode:'METADATA_ONLY',
 downloaded:false,results:[commonsAsset]}}};
test('Commons blocked at producer by default',async()=>assert.rejects(gateway({SOURCE_SCOUT:commonsService}).scout(commonsRequest),/SCOUT_REQUEST_INVALID/));
test('Commons produces metadata-only private result with legal-review flag when enabled',async()=>{
 const res=await gateway({COMMONS_ENABLED:'true',SOURCE_SCOUT:commonsService}).scout(commonsRequest);
 assert.equal(res.provider,'wikimedia_commons');assert.equal(res.kind,'images');assert.equal(res.results.length,1);
 assert.equal(res.results[0].requires_license_review,true);assert.equal(res.downloaded,false);assert.equal(res.production_approved,false);
});
test('Commons rejects false license review and non-CC0',async()=>{
 const bad={search:async input=>({...await commonsService.search(input),results:[{...commonsAsset,requires_license_review:false}]})};
 await assert.rejects(gateway({COMMONS_ENABLED:'true',SOURCE_SCOUT:bad}).scout(commonsRequest),/SCOUT_INVALID_RESPONSE/);
 const nc={search:async input=>({...await commonsService.search(input),results:[{...commonsAsset,license:'CC-BY'}]})};
 await assert.rejects(gateway({COMMONS_ENABLED:'true',SOURCE_SCOUT:nc}).scout(commonsRequest),/SCOUT_INVALID_RESPONSE/);
});
test('Commons media result limit is five',async()=>assert.rejects(gateway({COMMONS_ENABLED:'true',SOURCE_SCOUT:{
 search:async input=>({...await commonsService.search(input),results:Array.from({length:6},(_,i)=>({...commonsAsset,id:'commons:'+i}))})
}}).scout(commonsRequest),/SCOUT_INVALID_RESPONSE/));

const metRequest={...request,provider:'met',kind:'images',query:'sunflowers'};
const metAsset={id:'met:436524',provider:'met',kind:'images',title:'Sunflowers',source:'https://www.metmuseum.org/art/collection/search/436524',
  preview:'https://images.metmuseum.org/CRDImages/ep/web-large/test.jpg',license:'CC0-1.0',requires_license_review:true,
  downloaded:false,production_approved:false};
const metService={async search(input){assert.equal(input.provider,'met');assert.equal(input.permission,'media.search');assert.equal(input.auth_token,secret);
 return {company_id:'fenix',engine_id:'UMS-001',environment:'LAB',provider:'met',kind:'images',mode:'METADATA_ONLY',
 downloaded:false,results:[metAsset]}}};
test('Met stays OFF at producer without explicit flag',async()=>assert.rejects(gateway({SOURCE_SCOUT:metService}).scout(metRequest),/SCOUT_REQUEST_INVALID/));
test('Met on scoped private gateway returns only CC0 image metadata',async()=>{
 const res=await gateway({MET_ENABLED:'true',SOURCE_SCOUT:metService}).scout(metRequest);
 assert.equal(res.provider,'met');assert.equal(res.results[0].id,metAsset.id);assert.equal(res.downloaded,false);assert.equal(res.production_approved,false);
});
test('Met producer rejects wrong types or defective license evidence',async()=>{
 await assert.rejects(gateway({MET_ENABLED:'true',SOURCE_SCOUT:metService}).scout({...metRequest,kind:'video'}),/SCOUT_REQUEST_INVALID/);
 const bad={search:async q=>({...await metService.search(q),results:[{...metAsset,requires_license_review:false}]})};
 await assert.rejects(gateway({MET_ENABLED:'true',SOURCE_SCOUT:bad}).scout(metRequest),/SCOUT_INVALID_RESPONSE/);
});
test('Met search caps at three candidates',async()=>{
 const large={search:async q=>({...await metService.search(q),results:Array.from({length:4},(_,i)=>({...metAsset,id:'met:'+i}))})};
 await assert.rejects(gateway({MET_ENABLED:'true',SOURCE_SCOUT:large}).scout(metRequest),/SCOUT_INVALID_RESPONSE/);
});
