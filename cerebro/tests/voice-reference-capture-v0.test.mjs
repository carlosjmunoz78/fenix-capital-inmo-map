import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const capture = fs.readFileSync('cerebro/voice/capture/voice-capture.html','utf8');
const launcher = fs.readFileSync('cerebro/voice/runtime/windows/Open-VoiceCapture.ps1','utf8');
const register = fs.readFileSync('cerebro/voice/runtime/windows/Register-And-Benchmark-Voice.ps1','utf8');
const validator = fs.readFileSync('cerebro/voice/runtime/validate_reference_audio.py','utf8');

test('capture UI is loopback-only and does not upload audio', () => {
  assert.match(capture, /127\.0\.0\.1/);
  assert.match(capture, /localhost/);
  assert.match(capture, /LOCAL_BROWSER_ONLY/);
  assert.match(capture, /explicit_consent:true/);
  assert.doesNotMatch(capture, /fetch\s*\(/);
  assert.doesNotMatch(capture, /XMLHttpRequest/);
  assert.doesNotMatch(capture, /https:\/\//);
});

test('launcher binds the capture server to loopback only', () => {
  assert.match(launcher, /--bind','127\.0\.0\.1'/);
  assert.doesNotMatch(launcher, /0\.0\.0\.0/);
});

test('technical validator remains non-promotional', () => {
  assert.match(validator, /TECHNICALLY_ACCEPTABLE_FOR_LAB_REFERENCE/);
  assert.match(validator, /automatic_promotion": False/);
  assert.match(validator, /prod_enabled": False/);
  assert.match(validator, /consent_verified": False/);
});

test('registration requires validator and consent metadata checks before benchmark', () => {
  const validatePos = register.indexOf('& $VenvPython $ValidateScript');
  const registerPos = register.indexOf('& $VenvPython @registerArgs');
  assert.ok(validatePos >= 0 && registerPos > validatePos);
  assert.match(register, /explicit_consent/);
  assert.match(register, /capture_origin/);
  assert.match(register, /ConsentRef conflicts/);
  assert.match(register, /MEASURED_NOT_ACCEPTED/);
});
