import fs from 'node:fs';

const migration=fs.readFileSync('supabase/migrations/20261001183000_cerebro_conversational_learning_v1.sql','utf8');
const gateway=fs.readFileSync('supabase/functions/cerebro-console-gateway-v0/index.ts','utf8');
const knowledge=fs.readFileSync('supabase/functions/cerebro-console-gateway-v0/knowledge.ts','utf8');
const voice=fs.readFileSync('src/cerebroVoice.ts','utf8');
const shell=fs.readFileSync('src/CerebroConsoleShell.tsx','utf8');

function must(haystack,needle,label){
 if(!haystack.includes(needle))throw new Error('Missing '+label+': '+needle);
}

must(migration,'create table if not exists fenix_prod.cerebro_conversation_memory','conversation memory table');
must(migration,"memory_kind in ('USER_TURN','FACT','DECISION','CORRECTION')",'memory kinds');
must(migration,'char_length(content_text) between 1 and 2000','bounded content');
must(migration,'search_vector tsvector generated always as','generated full-text search');
must(migration,'revoke all on fenix_prod.cerebro_conversation_memory from public, anon, authenticated','direct access denial');
must(migration,'grant execute on function public.fenix_prod_cerebro_memory_observe_server','service-role observe RPC');
must(migration,'grant execute on function public.fenix_prod_cerebro_memory_search_server','service-role search RPC');
must(migration,'grant execute on function public.fenix_prod_cerebro_memory_forget_server','service-role forget RPC');

must(gateway,'conversation_memory: "AUTO_BOUNDED_NON_SENSITIVE_USER_TURNS"','auto conversational-learning contract');
must(gateway,'function memorySensitive','sensitivity filter');
must(gateway,'function shouldObserveConversationMemory','bounded observation policy');
must(gateway,'await observeConversationMemory(req,message)','continuous observation');
must(gateway,'fenix_prod_cerebro_memory_forget_server','forget binding');
must(gateway,'MEMORY_SKIP_EXACT','noise filter');

must(knowledge,'function conversationMemoryIntent','explicit recall intent');
must(knowledge,'fenix_prod_cerebro_memory_search_server','memory search binding');
must(knowledge,'OWNER_CONVERSATION_MEMORY_V1','memory evidence mode');
must(knowledge,'MIXED_CONVERSATION_AND_CANONICAL_V1','mixed evidence mode');

must(voice,'export function speechSegments','dynamic prosody segmentation');
must(voice,'rate+=0.035','faster acknowledgement prosody');
must(voice,'rate-=0.035','slower safety/proposal prosody');
must(voice,'pitch+=0.045','question intonation');
must(shell,'speechSegments(text,maxChars,voicePreferencesRef.current)','segmented TTS integration');

if(/grant\s+execute[\s\S]{0,220}\s+to\s+(authenticated|anon)/i.test(migration)){
 throw new Error('Conversation-memory server RPC must not be granted to authenticated/anon');
}
if(!/access[_ -]?token|service[_ -]?role|api[_ -]?key/.test(gateway)){
 throw new Error('Sensitive credential filtering regression');
}

console.log('GREEN cerebro conversational learning + dynamic prosody contract');
