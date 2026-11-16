/**
 * VOICE-001 · proposed governed policy delta (not production approved).
 * Fail-closed allowlist: ONLY the exact optional React presentation port
 * may differ from canonical Console; voice, auth, permissions stay intact.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

export const CORE='src/CerebroConsoleShell.tsx';
export const POLICY='scripts/voice001-render-port-guard.mjs';
export const WORKFLOW='.github/workflows/cerebro-owned-voice-preprod.yml';
const EDITS=[
  ['useState,type FormEvent','useState,type FormEvent,type ReactNode'],
  ['export default function CerebroConsoleShell(){',
    '/** Extensión de SOLO renderizado (sin modificación del chat, permisos ni voz). */\n'+
    'type ConsolePresentationPort={renderAssistantMessage?:(text:string)=>ReactNode};\n'+
    'export default function CerebroConsoleShell({renderAssistantMessage}:ConsolePresentationPort={}){'],
  ['<span>{renderMessage(line.text)}</span>',
   "{line.role==='cerebro'&&renderAssistantMessage?renderAssistantMessage(line.text):<span>{renderMessage(line.text)}</span>}"],
];
export const DISALLOWED_COMPANIONS=[
  'src/cerebroVoice.ts','src/cerebroConsoleApi.ts',
  'src/CerebroConsoleHost.tsx','src/CerebroOperativeConsole.tsx',
  'src/AnaVoiceQueryBlock.tsx','src/OperationalShellGate.tsx',
  'src/JarvisOperativaComposerPortal.tsx','src/CerebroJarvisWorkConsole.tsx',
  'src/AnaChatBlock.tsx',POLICY,WORKFLOW,
];
export function permittedConsoleSource(canonical){
 let value=canonical;
 for(const [before,after] of EDITS){
  assert.equal(value.split(before).length,2,'VOICE001_ERROR_UNEXPECTED_CANONICAL_SOURCE: '+before);
  value=value.replace(before,after);
 }
 assert.notEqual(value,canonical);
 return value;
}
export function assertConsoleSourceDelta(canonical,current){
 if(current===canonical)return 'CANONICAL_UNCHANGED';
 assert.equal(current,permittedConsoleSource(canonical),'VOICE001_DENY: Console differs from the exact approved presentation port');
 return 'EXACT_PRESENTATION_PORT_ONLY';
}
export function assertPortCompanionScope(paths){
 if(!paths.includes(CORE))return 'NO_CORE_CHANGE';
 const forbidden=paths.filter(file=>DISALLOWED_COMPANIONS.includes(file)||file.startsWith('supabase/'));
 assert.deepEqual(forbidden,[],'VOICE001_DENY: protected companion changes bundled with Console');
 return 'CORE_CHANGE_LIMITED';
}
export function assertLabPresentationOnly(embedded){
 assert.ok(embedded.includes("import.meta.env.MODE==='lab'&&import.meta.env.VITE_JARVIS_DEEPSEEK_MARKDOWN_LAB==='1'"),'VOICE001_DENY: not LAB opt-in');
 assert.ok(embedded.includes('renderAssistantMessage={renderRichAssistantMessage}'),'VOICE001_DENY: render port missing');
 assert.ok(embedded.includes("<CerebroConsoleShell key={workspaceKey||'jarvis-default'}/>"),'VOICE001_DENY: canonical fallback missing');
 assert.ok(!embedded.includes('JarvisMarkdownLabSidecar'),'VOICE001_DENY: obsolete Markdown bridge');
}
function git(...args){return execFileSync('git',args,{encoding:'utf8',maxBuffer:2*1024*1024});}
function main(){
 const base=process.argv[2];
 assert.match(base??'',/^[a-f\d]{40}$/,'VOICE001_DENY: base sha required');
 const changed=git('diff','--name-only',base,'HEAD').trim().split('\n').filter(Boolean);
 if(!changed.includes(CORE)){
  process.stdout.write('VOICE001_POLICY=CANONICAL_UNCHANGED\n');
  return;
 }
 assertPortCompanionScope(changed);
 const canonical=git('show',base+':'+CORE);
 const current=readFileSync(CORE,'utf8');
 assert.equal(assertConsoleSourceDelta(canonical,current),'EXACT_PRESENTATION_PORT_ONLY');
 assertLabPresentationOnly(readFileSync('src/JarvisEmbeddedConsole.tsx','utf8'));
 process.stdout.write('VOICE001_POLICY=EXACT_PRESENTATION_PORT_ONLY; NO VOICE AUTH OR GATEWAY CHANGES\n');
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1])main();
