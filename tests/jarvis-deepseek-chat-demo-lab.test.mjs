import test from 'node:test';
import assert from 'node:assert/strict';
import {streamRenderBackoffMs, safeExternalChatHref, MAX_STREAM_RENDER_BACKOFF_MS} from '../src/jarvis-deepseek-lab/deepseekUiUtils.ts';

test('LAB: debounce 0 ms render -> 0 ms', () => assert.equal(streamRenderBackoffMs(0), 0));
test('LAB: cost-based debounce doubles render time', () => assert.equal(streamRenderBackoffMs(80), 160));
test('LAB: max debounce caps at 2000 ms', () => {
  assert.equal(streamRenderBackoffMs(5000), MAX_STREAM_RENDER_BACKOFF_MS);
  assert.equal(streamRenderBackoffMs(Infinity), MAX_STREAM_RENDER_BACKOFF_MS);
});
test('LAB: unexpected negative duration cannot become negative', () => assert.equal(streamRenderBackoffMs(-9), 0));
test('LAB: safe HTTPS external citation URL', () => assert.equal(safeExternalChatHref('https://example.org/a'), 'https://example.org/a'));
test('LAB: HTTP URLs remain valid', () => assert.equal(safeExternalChatHref('http://example.org/'), 'http://example.org/'));
test('LAB: never turn relative strings into outgoing links', () => assert.equal(safeExternalChatHref('/cerebro'), null));
test('LAB: javascript/data/file protocols rejected', () => {
  for (const input of ['javascript:alert(1)', 'data:text/html,abc', 'file:///etc/passwd', 'mailto:test@example.org']) assert.equal(safeExternalChatHref(input), null);
});
test('LAB: reject credentials embedded in URLs', () => assert.equal(safeExternalChatHref('https://user:secret@example.org'), null));
