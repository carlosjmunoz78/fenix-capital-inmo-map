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
