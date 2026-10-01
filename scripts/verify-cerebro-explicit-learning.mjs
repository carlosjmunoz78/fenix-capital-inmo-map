import fs from 'node:fs';

const migration=fs.readFileSync('supabase/migrations/20261001174500_cerebro_explicit_user_preferences_v1.sql','utf8');
const gateway=fs.readFileSync('supabase/functions/cerebro-console-gateway-v0/index.ts','utf8');
const api=fs.readFileSync('src/cerebroConsoleApi.ts','utf8');
const shell=fs.readFileSync('src/CerebroConsoleShell.tsx','utf8');
const voice=fs.readFileSync('src/cerebroVoice.ts','utf8');

function must(haystack,needle,label){
 if(!haystack.includes(needle))throw new Error('Missing '+label+': '+needle);
}

must(migration,'create table if not exists fenix_prod.cerebro_user_preferences','preference table');
must(migration,'where active;','single-active partial index');
must(migration,'enable row level security','RLS');
must(migration,'revoke all on fenix_prod.cerebro_user_preferences from public, anon, authenticated','direct table denial');
must(migration,'grant execute on function public.fenix_prod_cerebro_preference_upsert_server','service-role upsert');
must(migration,"source = 'explicit_user_instruction'",'explicit-only provenance');
must(migration,'supersedes uuid','audit lineage');
must(gateway,'durable_learning_mode: "EXPLICIT_PREFERENCES_PLUS_CONVERSATIONAL_MEMORY_V1"','explicit preference plus conversational memory contract');
must(gateway,'function parseLearningCandidate','deterministic correction parser');
must(gateway,'const persistOnly=','explicit save command');
must(gateway,'const directPersist=','direct persistent instruction');
must(gateway,'fenix_prod_cerebro_preference_upsert_server','server-only preference write');
must(gateway,'fenix_prod_cerebro_preference_deactivate_server','forget semantics');
must(gateway,'if(suffix==="preferences")','preference read route');
must(api,'learning_candidate:CerebroLearningCandidate|null','client carries ephemeral candidate');
must(api,"fetchCerebroConsolePreferences",'preference bootstrap');
must(shell,'learningCandidateRef.current','session candidate');
must(shell,'voicePreferencesRef.current','live voice preferences');
must(shell,'speechSegments(text,maxChars,voicePreferencesRef.current)','prosody segmentation');
must(voice,'speech_rate??0.96','warm default speed');
must(voice,'speech_pitch??1.04','warm default pitch');

if(/grant\s+execute[\s\S]{0,180}\s+to\s+(authenticated|anon)/i.test(migration)){
 throw new Error('Preference server RPC must not be granted to authenticated/anon');
}

console.log('GREEN cerebro explicit learning contract');
