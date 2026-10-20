import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

test('conversation history is persistent, resumable and renameable without changing Gateway contracts',async()=>{
 const store=read('src/cerebroConversationHistory.ts');
 const shell=read('src/CerebroConsoleShell.tsx');
 const operative=read('src/CerebroOperativeConsole.tsx');
 expect(store).toContain("const STORAGE_KEY='cerebro_conversations_v1'");
 expect(store).toContain('export function createCerebroConversation()');
 expect(store).toContain('export function selectCerebroConversation(id:string)');
 expect(store).toContain('export function renameCerebroConversation(id:string,title:string)');
 expect(store).toContain('export function persistCerebroConversation(id:string,lines:CerebroStoredLine[])');
 expect(shell).toContain('persistCerebroConversation(activeConversationId,lines)');
 expect(shell).toContain('getCerebroConversation(id)');
 expect(shell).toContain('setLines(target.lines)');
 expect(operative).toContain('cerebro-history-drawer');
 expect(operative).toContain('Nueva conversación');
 expect(operative).toContain('Cambiar nombre');
 expect(operative).toContain('selectCerebroConversation(id)');
});
