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
/** Exactly the known PR #71 + #72 candidate file set, no additional surface. */
export const APPROVED_CANDIDATE_FILES=[
 ".github/workflows/jarvis-deepseek-markdown-lab.yml",
 "docs/JARVIS_DEEPSEEK_CHAT_DEMO_UI_LAB_2026-11-16.md",
 "docs/capabilities/jarvis-deepseek-ui-capability-lab.v0.3.json",
 "src/CerebroConsoleShell.tsx",
 "src/JarvisEmbeddedConsole.tsx",
 "src/jarvis-deepseek-lab/JarvisMarkdownLabSidecar.tsx",
 "src/jarvis-deepseek-lab/JarvisMarkdownRenderBoundary.tsx",
 "src/jarvis-deepseek-lab/JarvisResponseContract.ts",
 "src/jarvis-deepseek-lab/JarvisResponseView.tsx",
 "src/jarvis-deepseek-lab/JarvisSafeMarkdownLab.tsx",
 "src/jarvis-deepseek-lab/LICENSE-DEEPSEEK-CHAT-DEMO",
 "src/jarvis-deepseek-lab/deepseekUiUtils.ts",
 "src/jarvis-deepseek-lab/jarvis-markdown-lab.css",
 "src/jarvis-deepseek-lab/markdownSafe.ts",
 "src/jarvis-deepseek-lab/useThrottledJarvisMarkdown.ts",
 "tests/jarvis-deepseek-chat-demo-lab.test.mjs",
 "tests/jarvis-deepseek-chat-renderer-lab.test.mjs",
 "tests/jarvis-deepseek-core-immutable-diff.test.mjs",
 "tests/jarvis-deepseek-default-off.spec.ts",
 "tests/jarvis-deepseek-direct-react-contract.test.mjs",
 "tests/jarvis-deepseek-lab-ui.spec.ts",
 "tests/jarvis-deepseek-react-core-contract.spec.ts"
];
/** Executable UI and its LAB workflow pinned to reviewed Git blob content IDs. */
export const APPROVED_RUNTIME_BLOBS={
 "src/JarvisEmbeddedConsole.tsx": "058763db22e468da5b07aaf5d3a94bac1086584b",
 "src/jarvis-deepseek-lab/JarvisMarkdownLabSidecar.tsx": "7d07241705689145648208ac95f1d1cad9e35ebb",
 "src/jarvis-deepseek-lab/JarvisMarkdownRenderBoundary.tsx": "c6a7238e1b28d27d036a7cf0ec36939f131eef08",
 "src/jarvis-deepseek-lab/JarvisResponseContract.ts": "17974f6398c16a478b1988f6c4e71d5db9ec0575",
 "src/jarvis-deepseek-lab/JarvisResponseView.tsx": "91499921a189c5c6a750298564a7c8ec4f195478",
 "src/jarvis-deepseek-lab/JarvisSafeMarkdownLab.tsx": "effdfa109c16911fe67f04b03cf391214e063911",
 "src/jarvis-deepseek-lab/deepseekUiUtils.ts": "46f6a4e5901726c9d7ef97428d1e876c9db86680",
 "src/jarvis-deepseek-lab/jarvis-markdown-lab.css": "d7369a6bbb057e5693dd13485a613ffbe6956b9a",
 "src/jarvis-deepseek-lab/markdownSafe.ts": "413c1a96d8da55a3b883df6a76d45e3950285b4c",
 "src/jarvis-deepseek-lab/useThrottledJarvisMarkdown.ts": "d335a5282b46a78b7cbe1765ee0d63398111c83c",
 ".github/workflows/jarvis-deepseek-markdown-lab.yml": "81d8a321d16cbde9ab2f1185f4cc7a848b120119"
};
export function assertCandidateScope(paths){
 assert.equal(new Set(paths).size,paths.length,'VOICE001_DENY: duplicate candidate paths');
 assert.deepEqual([...paths].sort(),[...APPROVED_CANDIDATE_FILES].sort(),
  'VOICE001_DENY: unexpected, missing or duplicate candidate paths');
 return 'EXACT_CANDIDATE_SCOPE_ONLY';
}
export function assertCandidateRuntimeBlobs(actualBlobs){
 for(const [path,expected] of Object.entries(APPROVED_RUNTIME_BLOBS)){
  assert.equal(actualBlobs[path],expected,'VOICE001_DENY: reviewed UI blob changed: '+path);
 }
 return 'EXACT_REVIEWED_UI_ONLY';
}
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
 assertCandidateScope(changed);
 const currentBlobs=Object.fromEntries(Object.keys(APPROVED_RUNTIME_BLOBS).map(
  path=>[path,git('rev-parse','HEAD:'+path).trim()]
 ));
 assertCandidateRuntimeBlobs(currentBlobs);
 const canonical=git('show',base+':'+CORE);
 const current=readFileSync(CORE,'utf8');
 assert.equal(assertConsoleSourceDelta(canonical,current),'EXACT_PRESENTATION_PORT_ONLY');
 assertLabPresentationOnly(readFileSync('src/JarvisEmbeddedConsole.tsx','utf8'));
 process.stdout.write('VOICE001_POLICY=EXACT_PRESENTATION_PORT_ONLY; NO VOICE AUTH OR GATEWAY CHANGES\n');
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1])main();
