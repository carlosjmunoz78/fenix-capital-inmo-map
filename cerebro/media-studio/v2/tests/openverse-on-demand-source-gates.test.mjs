import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../cloudflare/ums001-private-gateway-lab/worker.mjs',import.meta.url),'utf8');
const catalog=readFileSync(new URL('../cloudflare/ums001-private-gateway-lab/producer-source-catalog.mjs',import.meta.url),'utf8');
test('Private images gate present',()=>{assert.match(source,/OPENVERSE_IMAGES_ENABLED==='true'/);assert.match(source,/task.kind==='images'/)});
test('Independent audio gate preserved',()=>assert.match(source,/OPENVERSE_AUDIO_ENABLED==='true'/));
test('Catalog images and audio gated',()=>{assert.match(catalog,/openverse:\['images','audio'\]/);assert.match(catalog,/CATALOG_OPENVERSE_IMAGES_OFF/);assert.match(catalog,/CATALOG_OPENVERSE_AUDIO_OFF/)});
test('Other rights and publication gates unchanged',()=>{assert.match(source,/SCOUT_INVALID_RESPONSE/);assert.match(source,/production_approved:false/);assert.doesNotMatch(source,/async publish\(/)});
