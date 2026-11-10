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
const upstream={async search(input){assert.equal(input.auth_token,secret);assert.equal(input.permission,'media.search');assert.equal(input.actor_id,'ums001-producer-lab');return {company_id:'fenix',engine_id:'UMS-001',environment:'LAB',provider:'ambientcg',mode:'METADATA_ONLY',downloaded:false,results:[asset]}}};
function gateway(overrides={}){return new ProducerLibraryLab({}, {GATEWAY_ENABLED:'true',SOURCE_SCOUT_ENABLED:'true',SOURCE_SCOUT_TOKEN:secret,SOURCE_SCOUT:upstream,...overrides});}
test('private producer returns CC0 metadata, no download',async()=>{const r=await gateway().scout(request);assert.equal(r.results[0].id,'Wood096');assert.equal(r.downloaded,false);assert.equal(r.production_approved,false);});
test('scout stays disabled when flag false',async()=>assert.rejects(gateway({SOURCE_SCOUT_ENABLED:'false'}).scout(request),/SCOUT_GATEWAY_DISABLED/));
test('scout stays disabled when gateway false',async()=>assert.rejects(gateway({GATEWAY_ENABLED:'false'}).scout(request),/SCOUT_GATEWAY_DISABLED/));
test('other provider not enabled',async()=>assert.rejects(gateway().scout({...request,provider:'openverse'}),/SCOUT_REQUEST_INVALID/));
test('untrusted company rejected before RPC',async()=>assert.rejects(gateway().scout({...request,company_id:'other'}),/SCOUT_REQUEST_INVALID/));
test('no secret fails shut',async()=>assert.rejects(gateway({SOURCE_SCOUT_TOKEN:undefined}).scout(request),/SCOUT_PRIVATE_BINDING_REQUIRED/));
test('bad upstream rights are blocked',async()=>assert.rejects(gateway({SOURCE_SCOUT:{search:async()=>({...await upstream.search({...request,auth_token:secret,permission:'media.search',actor_id:'ums001-producer-lab'}),results:[{...asset,license:'CC-BY-NC'}]})}}).scout(request),/SCOUT_INVALID_RESPONSE/));
