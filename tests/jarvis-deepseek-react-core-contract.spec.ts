import {expect,test} from '@playwright/test';
import fs from 'node:fs';

const read=(file:string)=>fs.readFileSync(file,'utf8');

test('CORE protegido: la extensión React es opcional, y no altera voz, auth, envío ni confirmación',()=>{
 const shell=read('src/CerebroConsoleShell.tsx');
 const embedded=read('src/JarvisEmbeddedConsole.tsx');
 const source=read('src/jarvis-deepseek-lab/JarvisResponseContract.ts');
 expect(shell).toContain('renderAssistantMessage?:(text:string)=>ReactNode');
 expect(shell).toContain("line.role==='cerebro'&&renderAssistantMessage?");
 expect(shell).toContain("data?.actor_code==='CARLOS-ADMIN'");
 expect(shell).toContain("postCerebroConsoleChat(clean,pendingActionRef.current");
 expect(shell).toContain('voiceNeedsManualConfirmation(clean');
 expect(shell).toContain('function toggleVoiceSession()');
 expect(shell).toContain('if(voiceSessionRef.current)speakAndResume(response');
 expect(embedded).toContain("import.meta.env.MODE==='lab'&&import.meta.env.VITE_JARVIS_DEEPSEEK_MARKDOWN_LAB==='1'");
 expect(embedded).toContain("<CerebroConsoleShell key={workspaceKey||'jarvis-default'}/>");
 expect(embedded).not.toContain('JarvisMarkdownLabSidecar');
 expect(source).toContain('canonical-console-react');
});

test('Puerto de renderizado no introduce un cliente nuevo ni tokens en navegador',()=>{
 const shell=read('src/CerebroConsoleShell.tsx');
 const embedded=read('src/JarvisEmbeddedConsole.tsx');
 expect(embedded).not.toMatch(/DeepSeek.{0,30}(api|key|token)/i);
 expect(embedded).not.toContain('fetch(');
 expect(shell).toContain("postCerebroConsoleChat(clean,");
});
