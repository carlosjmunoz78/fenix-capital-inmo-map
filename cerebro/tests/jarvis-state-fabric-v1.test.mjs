import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {JarvisMemoryV1} from '../jarvis/core-v1/memory-v1.mjs';
import {JarvisWorldModelAccessV1} from '../jarvis/core-v1/world-model-access-v1.mjs';

test('memory is append-only, verifiable and company scoped',()=>{
 const file=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'jarvis-memory-')),'memory.jsonl');
 const memory=new JarvisMemoryV1({file});
 memory.append({company_id:'fenix',project_id:'p1',content:{fact:'A'},provenance:{source:'test'}});
 memory.append({company_id:'aion',project_id:'p1',content:{fact:'B'},provenance:{source:'test'}});
 assert.equal(memory.verify(),true);
 assert.equal(memory.list({company_id:'fenix'}).length,1);
 const world=new JarvisWorldModelAccessV1({memory});
 const snap=world.snapshot({company_id:'fenix',project_id:'p1'});
 assert.equal(snap.memory_count,1);
 assert.equal(snap.memories[0].company_id,'fenix');
});
