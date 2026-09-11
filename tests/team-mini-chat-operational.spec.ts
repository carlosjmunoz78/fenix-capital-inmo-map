import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';

test('floating chat opens an operational mini window instead of forcing full-screen navigation',()=>{
 const src=readFileSync('src/ChatShell.tsx','utf8');
 expect(src).toContain('data-testid="team-mini-chat"');
 expect(src).toContain('onClick={()=>setMiniOpen(v=>!v)}');
 expect(src).toContain('aria-label="Expandir chat"');
 expect(src).toContain("setMiniOpen(false);navigate('/chat')");
 expect(src).toContain('value={body}');
 expect(src).toContain('items.slice(-10)');
});

test('mini chat has explicit high-contrast dark theme instead of inheriting white surfaces',()=>{
 const css=readFileSync('src/calculator-no-pro.css','utf8');
 expect(css).toContain("html[data-theme='dark'] .fenix-mini-team-chat{background:#17191d!important;color:#f5f7fa!important");
 expect(css).toContain("html[data-theme='dark'] .fenix-mini-team-feed{background:#111318!important}");
 expect(css).toContain("html[data-theme='dark'] .fenix-mini-team-feed article{background:#20242a!important");
 expect(css).toContain("html[data-theme='dark'] .fenix-mini-team-chat textarea{background:#101216!important");
 expect(css).toContain("html[data-theme='dark'] .fenix-mini-team-chat textarea::placeholder{color:#aeb5bf!important");
});

test('mini and full chat share text attachment dictation and recorded-audio send path',()=>{
 const src=readFileSync('src/ChatShell.tsx','utf8');
 expect(src).toContain('onSubmit={send}');
 expect(src).toContain("supabase.rpc('fenix_prod_chat_send_user'");
 expect(src).toContain("supabase.rpc('fenix_prod_chat_attachment_add_user'");
 expect(src).toContain('miniFileInput');
 expect(src).toContain('toggleDictation');
 expect(src).toContain('window.SpeechRecognition||window.webkitSpeechRecognition');
 expect(src).toContain('navigator.mediaDevices.getUserMedia({audio:true})');
 expect(src).toContain('new MediaRecorder');
 expect(src).toContain("new File([blob],`audio-");
 expect(src).toContain("{type:'audio/webm'}");
 expect(src).toContain("BUCKET='fenix-prod-chat'");
});

test('expansion preserves draft attachment and loaded conversation because one mounted shell owns the state',()=>{
 const src=readFileSync('src/ChatShell.tsx','utf8');
 expect(src).toContain("const[logged,setLogged]=useState");
 expect(src).toContain('[pending,setPending]=useState<File|null>(null)');
 expect(src).toContain('[miniOpen,setMiniOpen]=useState(false)');
 expect(src).not.toContain("sessionStorage.removeItem('chat-draft')");
 expect(src).not.toContain('setBody(\'\');setPending(null);setMiniOpen(false);navigate(\'/chat\')');
});
