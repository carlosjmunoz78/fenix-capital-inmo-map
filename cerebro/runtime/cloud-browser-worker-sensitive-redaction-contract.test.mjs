import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync(new URL('./cloud-browser-worker-v0.mjs', import.meta.url), 'utf8');

test('browser screenshots mask credential and identity fields before evidence is created', () => {
  assert.match(source, /const SENSITIVE_FIELD_SELECTOR = \[/);
  assert.match(source, /input\[type=\\?"password\\?" i\]/);
  assert.match(source, /input\[type=\\?"email\\?" i\]/);
  assert.match(source, /autocomplete=\\?"username\\?" i/);
  assert.match(source, /autocomplete=\\?"current-password\\?" i/);
  assert.match(source, /data-cerebro-sensitive/);
  assert.match(source, /mask:\s*\[activePage\.locator\(SENSITIVE_FIELD_SELECTOR\)\]/);
  assert.match(source, /maskColor:\s*['"]#000000['"]/);
  assert.match(source, /screenshot_sensitive_field_redaction:\s*true/);
});

test('evidence redaction does not read or serialize sensitive field values', () => {
  const evidenceBlock = source.slice(source.indexOf('async function evidence('), source.indexOf('async function browserMetadata('));
  assert.ok(evidenceBlock.includes('activePage.screenshot'));
  assert.ok(evidenceBlock.includes('activePage.locator(SENSITIVE_FIELD_SELECTOR)'));
  assert.doesNotMatch(evidenceBlock, /inputValue\s*\(/);
  assert.doesNotMatch(evidenceBlock, /evaluate\s*\(/);
  assert.doesNotMatch(evidenceBlock, /textContent/);
  assert.doesNotMatch(evidenceBlock, /innerText/);
});
