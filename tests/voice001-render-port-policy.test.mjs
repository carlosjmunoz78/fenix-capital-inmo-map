import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {permittedConsoleSource,assertConsoleSourceDelta,assertPortCompanionScope,assertLabPresentationOnly,assertCandidateScope,assertCandidateRuntimeBlobs,APPROVED_CANDIDATE_FILES,APPROVED_RUNTIME_BLOBS,CORE,POLICY,WORKFLOW} from '../scripts/voice001-render-port-guard.mjs';
// Never derive the canonical fixture from the candidate worktree: this suite
// must also run on the actual React-port candidate after VOICE-001 is revised.
const base=process.env.VOICE001_CANONICAL_BASE_SHA;
assert.match(base??'',/^[a-f0-9]{40}$/,'VOICE001_DENY: immutable canonical base SHA required');
const mainCore=execFileSync('git',['show',base+':'+CORE],{encoding:'utf8',maxBuffer:1024*1024});
const candidateCore=readFileSync(CORE,'utf8');
const port=permittedConsoleSource(mainCore);
test('Current exact HEAD is either canonical or the byte-exact presentation port',()=>{
 assert.ok(candidateCore===mainCore||candidateCore===port,
  'VOICE001_DENY: candidate fixture differs from approved canonical/React port');
});
test('VOICE001 canonical unchanged still passes',()=>{
 assert.equal(assertConsoleSourceDelta(mainCore,mainCore),'CANONICAL_UNCHANGED');
 assert.equal(assertPortCompanionScope([WORKFLOW,'tests/voice001-render-port-policy.test.mjs']),'NO_CORE_CHANGE');
});
test('Only exact opt-in React port is accepted',()=>{
 assert.equal(assertConsoleSourceDelta(mainCore,port),'EXACT_PRESENTATION_PORT_ONLY');
 assert.equal(assertPortCompanionScope([CORE,'src/JarvisEmbeddedConsole.tsx','src/jarvis-deepseek-lab/JarvisResponseView.tsx']),'CORE_CHANGE_LIMITED');
});
test('Voice logic and transport tampering are rejected',()=>{
 for(const altered of [
  port.replace('voiceNeedsManualConfirmation','voiceNeedsManualConfirmationBypassed'),
  port.replace('postCerebroConsoleChat(clean','postDirectDeepSeek(clean'),
  port.replace('function toggleVoiceSession()','function toggleVoiceSessionDisabled()'),
  port.replace("line.role==='cerebro'&&renderAssistantMessage?",'renderAssistantMessage?'),
  port+'\n// unrelated extra modification',
  mainCore.replace('voiceNeedsManualConfirmation','invalid'),
 ])assert.throws(()=>assertConsoleSourceDelta(mainCore,altered));
});
test('No bundle that edits policy, voice, Gateway, auth, human consent or Supabase',()=>{
 for(const file of [
  POLICY,WORKFLOW,'src/cerebroVoice.ts','src/cerebroConsoleApi.ts','src/CerebroConsoleHost.tsx',
  'src/AnaVoiceQueryBlock.tsx','src/OperationalShellGate.tsx',
  'src/JarvisOperativaComposerPortal.tsx','supabase/functions/cerebro-console-gateway-v0/index.ts'
 ])assert.throws(()=>assertPortCompanionScope([CORE,file]),undefined,file);
});
test('LAB flag, fallback and no old bridge are mandatory',()=>{
 const embedded=[
  "const JARVIS_DEEPSEEK_MARKDOWN_LAB=import.meta.env.MODE==='lab'&&import.meta.env.VITE_JARVIS_DEEPSEEK_MARKDOWN_LAB==='1';",
  "return JARVIS_DEEPSEEK_MARKDOWN_LAB?<CerebroConsoleShell key={workspaceKey||'jarvis-default'} renderAssistantMessage={renderRichAssistantMessage}/>:<CerebroConsoleShell key={workspaceKey||'jarvis-default'}/>;"
 ].join('\n');
 assert.doesNotThrow(()=>assertLabPresentationOnly(embedded));
 assert.throws(()=>assertLabPresentationOnly(embedded.replace("import.meta.env.MODE==='lab'","import.meta.env.MODE==='production'")));
 assert.throws(()=>assertLabPresentationOnly(embedded.replace("<CerebroConsoleShell key={workspaceKey||'jarvis-default'}/>","")));
 assert.throws(()=>assertLabPresentationOnly(embedded+' JarvisMarkdownLabSidecar'));
});

test('Candidate scope is the exact reviewed path set (no hidden App, test, script or extra workflow)',()=>{
 assert.equal(assertCandidateScope(APPROVED_CANDIDATE_FILES),'EXACT_CANDIDATE_SCOPE_ONLY');
 assert.throws(()=>assertCandidateScope([...APPROVED_CANDIDATE_FILES,'src/App.tsx']));
 assert.throws(()=>assertCandidateScope(APPROVED_CANDIDATE_FILES.filter(x=>x!==CORE)));
 assert.throws(()=>assertCandidateScope([...APPROVED_CANDIDATE_FILES,'src/cerebroConsoleApi.ts']));
 assert.throws(()=>assertCandidateScope([...APPROVED_CANDIDATE_FILES,'scripts/exfiltrate.mjs']));
 assert.throws(()=>assertCandidateScope([...APPROVED_CANDIDATE_FILES,'supabase/functions/cerebro-console-gateway-v0/index.ts']));
 assert.throws(()=>assertCandidateScope([...APPROVED_CANDIDATE_FILES,'src/JarvisEmbeddedConsole.tsx']));
});
test('Any mutation to UI renderer, parser or LAB workflow requires a new policy review',()=>{
 assert.equal(assertCandidateRuntimeBlobs(APPROVED_RUNTIME_BLOBS),'EXACT_REVIEWED_UI_ONLY');
 for(const path of Object.keys(APPROVED_RUNTIME_BLOBS)){
  const mutated={...APPROVED_RUNTIME_BLOBS,[path]:'0000000000000000000000000000000000000000'};
  assert.throws(()=>assertCandidateRuntimeBlobs(mutated),undefined,path);
 }
});
