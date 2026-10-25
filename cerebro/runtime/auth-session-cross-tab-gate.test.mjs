import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../../src/App.tsx', import.meta.url), 'utf8');

test('AUTH SESSION GATE uses a browser-session marker shared across tabs', () => {
  assert.match(app, /BROWSER_SESSION_COOKIE/);
  assert.match(app, /document\.cookie/);
  assert.match(app, /hasBrowserSessionMarker\(\)/);
  assert.match(app, /setBrowserSessionMarker\(!rememberDevice\)/);
});

test('AUTH SESSION GATE never uses global signOut for routine browser lifecycle', () => {
  assert.doesNotMatch(app, /supabase\.auth\.signOut\(\)/);
  assert.match(app, /supabase\.auth\.signOut\(\{scope:'local'\}\)/);
});

test('AUTH SESSION GATE validates one legacy session before migration and never lets a new tab revoke all devices', () => {
  assert.match(app, /BROWSER_SESSION_MIGRATION_KEY/);
  assert.match(app, /supabase\.auth\.getUser\(\)/);
  assert.match(app, /setBrowserSessionMarker\(true\)/);
});

test('AUTH SESSION GATE validates every persisted session before accepting it into UI state', () => {
  assert.match(app, /if\(data\.session\)\{\s*const \{data:\{user\},error\}=await supabase\.auth\.getUser\(\)/s);
  assert.match(app, /if\(!user \|\| error\)\{\s*setBrowserSessionMarker\(false\);\s*await supabase\.auth\.signOut\(\{scope:'local'\}\)/s);
  assert.match(app, /attachAuthListener/);
  assert.match(app, /unsubscribeAuth/);
});

test('AUTH SESSION GATE converts a revoked gateway session into a local login recovery instead of zombie Usuario state', () => {
  assert.match(app, /c\.status===401 \|\| n\.status===401/);
  assert.match(app, /if\(!user \|\| error\)/);
  assert.match(app, /setBrowserSessionMarker\(false\)/);
  assert.match(app, /setCtx\(null\);setNav\(null\);setSession\(null\)/);
});
