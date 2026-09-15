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

test('legacy chat RPCs remain preserved outside the advanced V2 screen during parallel migration',async()=>{
 const ana=read('src/AnaChatBlock.tsx');
 expect(ana).toContain('fenix_prod_chat_list_user');
 expect(ana).toContain('fenix_prod_chat_send_user');
 const full=read('src/ChatShell.tsx');
 expect(full).not.toContain("gatewayRpc<Payload<ChatMessage>>('fenix_prod_chat_list_user'");
 expect(full).not.toContain("gatewayRpc<Payload<ChatMessage>>('fenix_prod_chat_send_user'");
});
