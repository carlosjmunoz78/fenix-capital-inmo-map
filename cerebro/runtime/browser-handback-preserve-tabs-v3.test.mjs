import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('./browser-interactive-session-v3.mjs',import.meta.url),'utf8');

test('Google identity verification uses a disposable tab and restores the original active tab',()=>{
  assert.match(source,/type:'OPEN_TAB',url:'https:\/\/myaccount\.google\.com\/'/);
  assert.match(source,/type:'CLOSE_TAB'\},\{type:'SWITCH_TAB',index:originalIndex/);
  assert.doesNotMatch(source,/type:'NAVIGATE',url:'https:\/\/myaccount\.google\.com\/'/);
});

test('human handback snapshots the live human tab before identity verification',()=>{
  const block=source.match(/if\(poll\.handback===true\)\{([\s\S]*?)\n      \}else if/);
  assert.ok(block,'handback block must exist');
  const body=block[1];
  const captureBefore=body.indexOf('await publishFrame(key);');
  const verify=body.indexOf('verifyWorkspaceIdentity(worker,base,job,lastActiveTabIndex');
  const captureAfter=body.lastIndexOf('await publishFrame(key);');
  assert.ok(captureBefore>=0&&verify>captureBefore,'live state must be captured before Google verification');
  assert.ok(captureAfter>verify,'post-verification frame must prove restored tab state');
});

test('runtime contract advertises preserved handback tab and no secret relaxation',()=>{
  assert.match(source,/schema_version:'3\.5\.7'/);
  assert.match(source,/handback_preserves_active_tab:true/);
  assert.match(source,/transient_poll_retry:true/);
  assert.match(source,/human_input_encrypted_aes_gcm:true/);
  assert.match(source,/raw_cdp_exposed:false/);
  assert.match(source,/incremental_cost_eur:0/);
});
