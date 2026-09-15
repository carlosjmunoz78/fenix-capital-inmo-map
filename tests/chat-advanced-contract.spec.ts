import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

test('full internal chat uses one V2 conversation engine for direct chats and groups',async()=>{
 const chat=read('src/ChatShell.tsx');
 for(const token of [
  "fenix_prod_chat_conversations_user",
  "fenix_prod_chat_people_user",
  "fenix_prod_chat_list_v2_user",
  "fenix_prod_chat_send_v2_user",
  "fenix_prod_chat_conversation_create_user",
  "fenix_prod_chat_group_create_user"
 ])expect(chat).toContain(token);
 expect(chat).toContain("const ACTIVE_CHAT_KEY='fenix-active-chat-conversation'");
 expect(chat).toContain("selectedPeople.length>1");
 expect(chat).toContain("Nueva conversación");
 expect(chat).toContain("Crear grupo");
});

test('chat attachments stay in the dedicated private chat bucket and support requested media',async()=>{
 const chat=read('src/ChatShell.tsx');
 expect(chat).toContain("const CHAT_BUCKET='fenix-prod-chat'");
 expect(chat).toContain("fenix_prod_chat_attachment_add_v2_user");
 expect(chat).toContain("createSignedUrl(a.storage_path,300)");
 expect(chat).toContain("file.size>20*1024*1024");
 for(const mime of ['image/jpeg','image/png','image/webp','image/gif','application/pdf','audio/mpeg','audio/wav','audio/webm','audio/ogg'])expect(chat).toContain(mime);
 expect(chat).toContain("supabase.storage.from(CHAT_BUCKET).upload");
 expect(chat).toContain("supabase.storage.from(CHAT_BUCKET).remove([path])");
});

test('audio note recording uses browser MediaRecorder without a paid transcription dependency',async()=>{
 const chat=read('src/ChatShell.tsx');
 expect(chat).toContain("navigator.mediaDevices.getUserMedia({audio:true})");
 expect(chat).toContain("new MediaRecorder");
 expect(chat).toContain("audio/webm");
 expect(chat).toContain("Parar audio");
 expect(chat).toContain("Audio");
});

test('mini chat and full chat preserve the same active conversation',async()=>{
 const mini=read('src/CalculatorLabelGuard.tsx');
 const full=read('src/ChatShell.tsx');
 for(const source of [mini,full])expect(source).toContain('fenix-active-chat-conversation');
 expect(mini).toContain("fenix_prod_chat_conversations_user");
 expect(mini).toContain("fenix_prod_chat_list_v2_user");
 expect(mini).toContain("fenix_prod_chat_send_v2_user");
 expect(mini).toContain("navigate('/chat')");
 expect(full).toContain("localStorage.setItem(ACTIVE_CHAT_KEY,activeCode)");
});

test('mini chat can record and send an audio note on the active V2 conversation',async()=>{
 const mini=read('src/CalculatorLabelGuard.tsx');
 expect(mini).toContain("navigator.mediaDevices.getUserMedia({audio:true})");
 expect(mini).toContain("new MediaRecorder");
 expect(mini).toContain("fenix_prod_chat_attachment_add_v2_user");
 expect(mini).toContain("supabase.storage.from(CHAT_BUCKET).upload");
 expect(mini).toContain("p_body:'🎤 Nota de audio'");
 expect(mini).toContain("aria-label={recording?'Parar y enviar audio':'Grabar audio'}");
});

test('mini chat provides browser dictation into the text composer with no paid dependency',async()=>{
 const mini=read('src/CalculatorLabelGuard.tsx');
 expect(mini).toContain('SpeechRecognition||w.webkitSpeechRecognition');
 expect(mini).toContain("recognition.lang='es-ES'");
 expect(mini).toContain('recognition.interimResults=true');
 expect(mini).toContain('setDraft(');
 expect(mini).toContain("aria-label={dictating?'Parar dictado':'Dictar mensaje'}");
});

test('legacy team chat is migrated into a persistent V2 conversation without deleting history',async()=>{
 const migration=read('supabase/migrations/20260915154500_chat_history_persistence.sql');
 expect(migration).toContain("'CONV-EQUIPO-FENIX'");
 expect(migration).toContain("'Equipo Fénix'");
 expect(migration).toContain("UPDATE fenix_prod.chat_messages");
 expect(migration).toContain("SET conversation_code='CONV-EQUIPO-FENIX'");
 expect(migration).toContain("WHERE channel_code='EQUIPO'");
 expect(migration).toContain("AND conversation_code IS NULL");
 expect(migration).toContain("INSERT INTO fenix_prod.chat_conversation_members");
 expect(migration).toContain("ON CONFLICT DO NOTHING");
 expect(migration).toContain("conversation_code,body,idempotency_key,channel_code,conversation_code").not;
 expect(migration).not.toContain('DELETE FROM fenix_prod.chat_messages');
});

test('legacy chat RPCs remain preserved outside the advanced V2 screen during parallel migration',async()=>{
 const ana=read('src/AnaChatBlock.tsx');
 expect(ana).toContain('fenix_prod_chat_list_user');
 expect(ana).toContain('fenix_prod_chat_send_user');
 const full=read('src/ChatShell.tsx');
 expect(full).not.toContain("gatewayRpc<Payload<ChatMessage>>('fenix_prod_chat_list_user'");
 expect(full).not.toContain("gatewayRpc<Payload<ChatMessage>>('fenix_prod_chat_send_user'");
});
