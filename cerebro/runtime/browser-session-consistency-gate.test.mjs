import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const read=(path)=>fs.readFile(new URL(`../../${path}`,import.meta.url),'utf8');

test('SESSION CONSISTENCY GATE reasserts the active Work Total session after every catalog refresh',async()=>{
 const dock=await read('src/cerebroBrowserWorkTotalDock.ts');
 assert.match(dock,/const VIEWER_SESSION_SELECTOR='\.cerebro-browser-console select\[aria-label="Seleccionar sesión"\]'/);
 assert.match(dock,/function active\(\)\{return profiles\.find\(profile=>profile\.active_session&&!TERMINAL\.has\(profile\.active_session\.state\)\)\|\|null;\}/);
 assert.match(dock,/if\(select\.value===sessionId\)return true;/);
 assert.match(dock,/const activeSessionId=active\(\)\?\.active_session\?\.session_id;if\(activeSessionId\)void syncMainViewerSession\(activeSessionId\);/);
 assert.match(dock,/const effectiveSessionId=start\.session\?\.session_id\|\|start\.active_session\?\.session_id;/);
 assert.match(dock,/await syncMainViewerSession\(effectiveSessionId\)/);
});

test('SESSION CONSISTENCY GATE never promotes terminal history sessions into the canonical viewer selection',async()=>{
 const consoleSource=await read('src/CerebroBrowserConsole.tsx');
 assert.ok(consoleSource.includes("const TERMINAL=new Set(['STOPPED','ERROR','CLOSED','HIBERNATED']);"));
 assert.ok(consoleSource.includes("function isCanonicalSessionCandidate(session:BrowserSessionSummary){return Boolean(session?.session_id)&&!TERMINAL.has(String(session?.state||'').trim().toUpperCase());}"));
 assert.ok(consoleSource.includes("list.some(item=>item.session_id===current&&isCanonicalSessionCandidate(item))"));
 assert.ok(consoleSource.includes("list.find(isCanonicalSessionCandidate)?.session_id||''"));
 assert.ok(consoleSource.includes("if(!candidate||!isCanonicalSessionCandidate(candidate))return;"));
 assert.ok(consoleSource.includes("disabled={!isCanonicalSessionCandidate(item)}"));
 assert.ok(consoleSource.includes("const hasActiveSession=sessionOptions.some(isCanonicalSessionCandidate);"));
});
