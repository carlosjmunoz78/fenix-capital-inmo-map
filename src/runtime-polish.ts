import {supabase} from './supabase';

type SocialKey='facebook'|'x_twitter'|'tiktok'|'youtube'|'threads'|'telegram';
const socialFields:[SocialKey,string][]=[['facebook','Facebook'],['x_twitter','X / Twitter'],['tiktok','TikTok'],['youtube','YouTube'],['threads','Threads'],['telegram','Telegram']];

function addStyles(){
 if(document.getElementById('fenix-runtime-polish-style'))return;
 const s=document.createElement('style');s.id='fenix-runtime-polish-style';s.textContent=`
 #fenix-action-rail{position:fixed;right:18px;bottom:18px;z-index:12000;display:flex;flex-direction:column;gap:4px;align-items:stretch;width:46px}
 #fenix-action-rail button{width:46px;height:46px;min-width:46px;min-height:46px;margin:0;padding:0;border-radius:14px;border:1px solid var(--orange,#c97845);background:var(--orange,#c97845);color:#fff;display:grid;place-items:center;box-shadow:0 8px 24px rgba(0,0,0,.18);cursor:pointer}
 #fenix-action-rail button:disabled{opacity:.35;cursor:not-allowed}
 #fenix-action-rail svg{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
 .calc-launcher,.calc-launcher.dir-calc-launcher,.fenix-chat-launcher,.fenix-voice-main{opacity:0!important;pointer-events:none!important}
 .runtime-social-field{display:grid;gap:5px;font-size:12px;font-weight:800}
 .runtime-social-field input{width:100%;box-sizing:border-box;border:1px solid var(--border,#ddd);border-radius:10px;background:var(--surface,#fff);color:var(--text,#222);padding:10px;font:inherit}
 html[data-theme='dark'] .runtime-social-field input{background:#101216;color:#fff;border-color:#4a505a}
 .runtime-create-group{height:34px!important;padding:0 11px!important;border-radius:9px!important;border:1px solid var(--border,#ddd)!important;background:var(--orange,#c97845)!important;color:#fff!important;font-weight:800!important;cursor:pointer!important;white-space:nowrap}
 .runtime-group-modal{position:fixed;inset:0;z-index:16000;background:rgba(0,0,0,.45);display:grid;place-items:center;padding:20px}
 .runtime-group-card{width:min(460px,calc(100vw - 32px));max-height:min(650px,calc(100vh - 40px));overflow:auto;background:var(--panel,#fff);color:var(--text,#222);border:1px solid var(--border,#ddd);border-radius:16px;padding:18px;box-shadow:0 20px 60px rgba(0,0,0,.3);display:grid;gap:12px}
 html[data-theme='dark'] .runtime-group-card{background:#17191d;color:#f5f7fa;border-color:#3b4048}
 .runtime-group-card header{display:flex;justify-content:space-between;align-items:center;gap:12px}.runtime-group-card header button{border:0;background:transparent;color:inherit;font-size:22px;cursor:pointer}
 .runtime-group-card input[type='text']{width:100%;box-sizing:border-box;padding:10px;border:1px solid var(--border,#ddd);border-radius:9px;background:var(--surface,#fff);color:inherit}
 .runtime-group-members{display:grid;gap:7px}.runtime-group-members label{display:flex;align-items:center;gap:9px;padding:8px;border:1px solid var(--border,#ddd);border-radius:9px}.runtime-group-card .primary{border:0;border-radius:9px;background:var(--orange,#c97845);color:#fff;padding:10px 14px;font-weight:800;cursor:pointer}.runtime-group-card .msg{font-size:12px;min-height:18px}
 @media(max-width:650px){#fenix-action-rail{right:12px;bottom:12px}}
 `;document.head.appendChild(s);
}

const icon=(kind:'calc'|'mic'|'chat')=>kind==='calc'?'<svg viewBox="0 0 24 24"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/></svg>':kind==='mic'?'<svg viewBox="0 0 24 24"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8"/></svg>':'<svg viewBox="0 0 24 24"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/></svg>';

function ensureRail(){
 let rail=document.getElementById('fenix-action-rail');
 if(!rail){rail=document.createElement('div');rail.id='fenix-action-rail';rail.setAttribute('aria-label','Acciones flotantes');document.body.appendChild(rail);}
 const specs:[string,'calc'|'mic'|'chat',string,string][]=[['calc','calc','Calculadora','button.calc-launcher'],['mic','mic','Micrófono','button.fenix-voice-main'],['chat','chat','Chat','button.fenix-chat-launcher']];
 for(const [id,kind,label,selector] of specs){let b=rail.querySelector<HTMLButtonElement>(`button[data-action="${id}"]`);if(!b){b=document.createElement('button');b.type='button';b.dataset.action=id;b.setAttribute('aria-label',label);b.title=label;b.innerHTML=icon(kind);b.addEventListener('click',()=>document.querySelector<HTMLButtonElement>(selector)?.click());rail.appendChild(b);}b.disabled=!document.querySelector(selector);}
}

async function loadSocials(form:HTMLFormElement){
 const grid=form.querySelector('.profile-edit-grid');if(!grid||grid.querySelector('[data-runtime-socials="1"]'))return;
 const marker=document.createElement('div');marker.dataset.runtimeSocials='1';marker.style.display='contents';
 const inputs=new Map<SocialKey,HTMLInputElement>();
 socialFields.forEach(([key,label])=>{const l=document.createElement('label');l.className='runtime-social-field';l.textContent=label;const i=document.createElement('input');i.type='url';i.placeholder=`URL de ${label}`;i.setAttribute('aria-label',label);l.appendChild(i);marker.appendChild(l);inputs.set(key,i);});
 grid.appendChild(marker);
 const r=await supabase.rpc('fenix_prod_profile_socials_get_user');const d=r.data as {ok?:boolean;item?:Record<string,string>}|null;if(d?.ok&&d.item)for(const [k] of socialFields){const i=inputs.get(k);if(i)i.value=d.item[k]||'';}
 if(form.dataset.runtimeSocialSave!=='1'){form.dataset.runtimeSocialSave='1';form.addEventListener('submit',()=>{const payload:Record<string,string>={};for(const [k] of socialFields)payload[k]=inputs.get(k)?.value.trim()||'';void supabase.rpc('fenix_prod_profile_socials_update_user',{p_socials:payload});});}
}

async function openGroupCreator(){
 if(document.querySelector('.runtime-group-modal'))return;
 const modal=document.createElement('div');modal.className='runtime-group-modal';
 const card=document.createElement('section');card.className='runtime-group-card';modal.appendChild(card);
 const head=document.createElement('header');const title=document.createElement('strong');title.textContent='Crear grupo';const close=document.createElement('button');close.type='button';close.textContent='×';close.onclick=()=>modal.remove();head.append(title,close);card.appendChild(head);
 const intro=document.createElement('p');intro.textContent='Pon un nombre al grupo y elige a las personas. Puedes crear un grupo cuando quieras.';card.appendChild(intro);
 const name=document.createElement('input');name.type='text';name.placeholder='Nombre del grupo';name.maxLength=120;card.appendChild(name);
 const members=document.createElement('div');members.className='runtime-group-members';card.appendChild(members);
 const msg=document.createElement('div');msg.className='msg';
 const create=document.createElement('button');create.type='button';create.className='primary';create.textContent='Crear grupo';
 card.append(msg,create);document.body.appendChild(modal);
 const r=await supabase.rpc('fenix_prod_chat_people_user');const d=r.data as {ok?:boolean;items?:Array<{actor_code:string;display_name?:string;role?:string}>}|null;
 const selected=new Set<string>();
 if(d?.ok&&Array.isArray(d.items)){for(const p of d.items){const l=document.createElement('label');const c=document.createElement('input');c.type='checkbox';c.onchange=()=>c.checked?selected.add(p.actor_code):selected.delete(p.actor_code);const span=document.createElement('span');span.textContent=`${p.display_name||p.actor_code}${p.role?` · ${p.role}`:''}`;l.append(c,span);members.appendChild(l);}}else msg.textContent='No se pudo cargar el equipo.';
 create.onclick=async()=>{msg.textContent='';if(!selected.size){msg.textContent='Selecciona al menos una persona.';return;}create.disabled=true;const rr=await supabase.rpc('fenix_prod_chat_group_create_user',{p_member_actor_codes:[...selected],p_title:name.value.trim()||'Grupo'});const dd=rr.data as {ok?:boolean;error?:string}|null;if(rr.error||!dd?.ok){msg.textContent='No se pudo crear el grupo.';create.disabled=false;return;}msg.textContent='Grupo creado correctamente.';setTimeout(()=>window.location.reload(),250);};
}

function ensureCreateGroup(){document.querySelectorAll<HTMLElement>('.chat-conversation-selector').forEach(sel=>{if(sel.querySelector('.runtime-create-group'))return;const b=document.createElement('button');b.type='button';b.className='runtime-create-group';b.textContent='Crear grupo';b.setAttribute('aria-label','Crear grupo');b.onclick=()=>void openGroupCreator();sel.appendChild(b);});}

async function repairAnaFallback(){
 const bubbles=[...document.querySelectorAll<HTMLElement>('.fenix-mini-chat .ana')];
 for(const bubble of bubbles){if(bubble.dataset.knowledgeRepair==='1')continue;const t=bubble.textContent||'';if(!/No encuentro información suficiente en CEREBRO|No encuentro una coincidencia exacta/i.test(t))continue;const user=bubble.previousElementSibling as HTMLElement|null;const q=user?.textContent?.trim()||'';if(!q)continue;bubble.dataset.knowledgeRepair='1';const r=await supabase.rpc('fenix_prod_ana_knowledge_answer_user',{p_question:q});const d=r.data as {ok?:boolean;answer?:string}|null;if(d?.ok&&d.answer)bubble.textContent=d.answer;}
}

function enhance(){addStyles();ensureRail();document.querySelectorAll<HTMLFormElement>('form[data-testid="editable-profile-form"]').forEach(f=>void loadSocials(f));ensureCreateGroup();void repairAnaFallback();}

const observer=new MutationObserver(()=>enhance());observer.observe(document.documentElement,{subtree:true,childList:true});window.addEventListener('load',enhance);enhance();
