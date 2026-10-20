import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const exists=(file:string)=>fs.existsSync(path.join(root,file));

test('P0 candidate contains voice lead-in, conversation history and process diagnostics contracts',async()=>{
 expect(exists('tests/cerebro-voice-audio-leadin.spec.ts')).toBeTruthy();
 expect(exists('src/cerebroConversationHistory.ts')).toBeTruthy();
 expect(exists('tests/cerebro-conversation-history-contract.spec.ts')).toBeTruthy();
 expect(exists('tests/cerebro-process-inspector-diagnostics.spec.ts')).toBeTruthy();
});
