import test from 'node:test';
import assert from 'node:assert/strict';
import {buildMultimediaReadonlyInventory,MULTIMEDIA_TARGETS} from '../runtime/multimedia-readonly-inventory-v1.mjs';

test('inventory is read-only zero-cost PREPROD and covers exact target set',()=>{
  const seen=[];
  const runner=(bin,args)=>{seen.push({bin,args});return {status:0,error:null,stdout:`${bin} version synthetic\nsecond line`,stderr:''};};
  const out=buildMultimediaReadonlyInventory({runner,platform:'win32',now:'2026-10-19T12:00:00.000Z'});
  assert.equal(out.status,'READ_ONLY_INVENTORY_COMPLETE');
  assert.equal(out.environment,'PREPROD');
  assert.equal(out.mutations_performed,0);assert.equal(out.downloads_performed,0);assert.equal(out.installs_performed,0);
  assert.equal(out.network_required,false);assert.equal(out.prod_authorized,false);assert.equal(out.prod_write_authorized,false);assert.equal(out.trading_access,false);assert.equal(out.additional_cost_eur,0);
  assert.deepEqual(out.tools.map(x=>x.id),['ffmpeg','ffprobe','imagemagick','sox','espeak-ng']);
  assert.equal(seen.length,5);
});

test('missing binaries remain evidence, never trigger install or alternate network behavior',()=>{
  const runner=(bin)=>({status:null,error:Object.assign(new Error('missing'),{code:'ENOENT'}),stdout:'',stderr:''});
  const out=buildMultimediaReadonlyInventory({runner});
  assert.equal(out.present_count,0);assert.equal(out.missing_count,MULTIMEDIA_TARGETS.length);
  assert.ok(out.tools.every(x=>x.probe_status==='ABSENT'));
});

test('imagemagick falls back from magick to convert locally',()=>{
  const runner=(bin)=>{
    if(bin==='magick') return {status:null,error:Object.assign(new Error('missing'),{code:'ENOENT'}),stdout:'',stderr:''};
    return {status:0,error:null,stdout:`${bin} local version`,stderr:''};
  };
  const out=buildMultimediaReadonlyInventory({runner});
  const im=out.tools.find(x=>x.id==='imagemagick');
  assert.equal(im.present,true);assert.equal(im.command,'convert');
});

test('non-ENOENT probe errors fail closed as probe error without claiming presence',()=>{
  const runner=(bin)=>bin==='ffmpeg'?{status:null,error:Object.assign(new Error('denied'),{code:'EACCES'}),stdout:'',stderr:''}:{status:0,error:null,stdout:'ok',stderr:''};
  const out=buildMultimediaReadonlyInventory({runner});
  const ff=out.tools.find(x=>x.id==='ffmpeg');
  assert.equal(ff.present,false);assert.equal(ff.probe_status,'PROBE_ERROR');assert.equal(ff.error_code,'EACCES');
});
