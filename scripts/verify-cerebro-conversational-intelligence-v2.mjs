import fs from 'node:fs';

const api=fs.readFileSync('src/cerebroConsoleApi.ts','utf8');
const shell=fs.readFileSync('src/CerebroConsoleShell.tsx','utf8');
const gateway=fs.readFileSync('supabase/functions/cerebro-console-gateway-v0/index.ts','utf8');
const knowledge=fs.readFileSync('supabase/functions/cerebro-console-gateway-v0/knowledge.ts','utf8');
const migration=fs.readFileSync('supabase/migrations/20261001213000_cerebro_conversational_intelligence_v2.sql','utf8');

function must(haystack,needle,label){
 if(!haystack.includes(needle))throw new Error('Missing '+label+': '+needle);
}

must(api,'export type CerebroConversationTurn','conversation context API type');
must(api,'conversation_context:CerebroConversationTurn[]=[]','bounded conversation context API argument');
must(shell,"lines.slice(-10)",'last ten turns sent to Gateway');
must(gateway,'function validateConversationContext','server-side context validation');
must(gateway,'if(total+text.length>8000)break','server-side context byte budget');
must(gateway,'function contextualizeMessage','follow-up contextualizer');
must(gateway,'function numberedContextItem','numbered-point follow-up resolution');
must(gateway,'function spokenNumber','spoken-number follow-up parser');
must(gateway,'(?:punto|numero)','point/number vocabulary');
must(gateway,'recentSocialScheduleNetwork','short social follow-up recovery');
must(gateway,'fenix_prod_exp_list_server','live expediente list binding');
must(gateway,'expedientes_active_summary','live active expediente intent');
must(gateway,'fenix_prod_inmo_list_server','live inmobiliaria directory binding');
must(gateway,'inmobiliarias_by_locality','live inmobiliaria locality intent');
must(gateway,'function looksLikeQuestionOrRequest','question-vs-memory classifier');
must(gateway,'conversationMemoryKind(text)!=="USER_TURN"','raw turn memory rejection');
must(gateway,'En el contexto de','domain follow-up synthesis');
must(gateway,'context_applied:resolved.applied','context evidence returned');
must(gateway,'resolved_question:resolved.applied?resolved.question:undefined','resolved question evidence');
must(gateway,'0.9.0-conversational-intelligence-v2','Gateway CI V2 version');

for(const kind of ['PREFERENCE','OPERATIONAL_KNOWLEDGE','DECISION','CORRECTION','FACT']){
 must(gateway,'"'+kind+'"','structured memory kind '+kind);
 must(migration,"'"+kind+"'",'migration memory kind '+kind);
}
must(gateway,'fenix_prod_cerebro_memory_observe_v2_server','memory V2 observer');
must(gateway,'fenix_prod_cerebro_memory_supersede_server','explicit contradiction supersession');
must(gateway,'function explicitSupersession','explicit supersession guard');
must(migration,'superseded_by uuid','supersession relationship');
must(migration,'canonical_status','memory promotion state');
must(migration,"revoke all on function public.fenix_prod_cerebro_memory_observe_v2_server",'V2 observe direct-access denial');
must(migration,"grant execute on function public.fenix_prod_cerebro_memory_observe_v2_server",'V2 observe service-role grant');

must(knowledge,'function currentnessAssessment','time-sensitive knowledge currentness check');
must(knowledge,'function broadLegalMapQuestion','generic-vs-specific legal map guard');
must(knowledge,'function memoryContentLooksLikeQuestion','legacy question-memory filter');
must(knowledge,'wantsConversationMemory?await queryConversationMemory','memory only on explicit recall');
must(knowledge,'minLexicalScore=domain?3:8','minimum lexical relevance gate');
must(knowledge,'genericLegal&&!specific','specific legal topic focus guard');
must(knowledge,'REQUIRES_CURRENT_VERIFICATION','current verification status');
must(knowledge,'knowledge_freshness','freshness evidence field');

if(gateway.includes('MAX_TURNS')||gateway.includes('TURN_LIMIT'))throw new Error('Conversational Intelligence V2 must not add a turn cap');

console.log('GREEN CEREBRO Conversational Intelligence V2 contracts');
