import test from 'node:test';
import assert from 'node:assert/strict';
import {inventoryMediaRuntimeReferences} from '../runtime/repository-media-runtime-inventory.mjs';

test('finds tracked media runtime references outside UMS without claiming operation',()=>{
  const report=inventoryMediaRuntimeReferences([
    {path:'workers/media/Dockerfile',content:'RUN apt-get update && apt-get install -y ffmpeg'},
    {path:'packages/video/package.json',content:'{"dependencies":{"@remotion/renderer":"1.0.0"}}'},
    {path:'docs/3d.md',content:'Render with Blender in the future'}
  ]);
  const ffmpeg=report.families.find((x)=>x.family==='FFMPEG');
  const remotion=report.families.find((x)=>x.family==='REMOTION');
  const blender=report.families.find((x)=>x.family==='BLENDER');
  assert.equal(ffmpeg.status,'REFERENCES_FOUND_REVIEW_REQUIRED');
  assert.equal(remotion.status,'REFERENCES_FOUND_REVIEW_REQUIRED');
  assert.equal(blender.status,'REFERENCES_FOUND_REVIEW_REQUIRED');
  assert.equal(ffmpeg.operational_claim,false);
  assert.equal(report.prod_binding_authorized,false);
  assert.equal(report.installation_authorized,false);
  assert.equal(report.additional_cost_eur,0);
});

test('excludes UMS namespace and UMS workflows so self-references cannot fabricate prior runtime evidence',()=>{
  const report=inventoryMediaRuntimeReferences([
    {path:'cerebro/media-studio/v2/registry/physical-adapter-candidates.json',content:'ffmpeg blender remotion hyperframes sox imagemagick'},
    {path:'cerebro/media-studio/v2/README.md',content:'FFmpeg Blender'},
    {path:'.github/workflows/cerebro-ums-physical-runtime-audit-v1.yml',content:'probe blender --version\nprobe ffmpeg -version'}
  ]);
  assert.equal(report.scanned_entries,0);
  assert.equal(report.excluded_ums_namespace,true);
  assert.equal(report.excluded_ums_workflows,true);
  assert.ok(report.families.every((x)=>x.status==='NO_TRACKED_REFERENCE_FOUND'));
});

test('absence of tracked references stays an absence claim, never a runtime absence proof',()=>{
  const report=inventoryMediaRuntimeReferences([{path:'src/app.js',content:'console.log("hello")'}]);
  assert.ok(report.families.every((x)=>x.status==='NO_TRACKED_REFERENCE_FOUND'));
  assert.match(report.interpretation,/does not prove an installed/);
});
