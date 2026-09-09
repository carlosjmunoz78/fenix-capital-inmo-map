import {useEffect,useMemo,useState} from 'react';
import {createPortal} from 'react-dom';
import {useLocation} from 'react-router-dom';
import {Pencil,Save,X} from 'lucide-react';
import {fetchEnvironmentApi,IS_PRODUCTION,supabase} from './supabase';
import {fetchNotionRuntime} from './notionRuntime';

type ExpRow={expediente_code?:string;cliente_alias?:string;expediente?:string;cliente?:string;nombre_cliente?:string;version?:number};
type Person={id?:string;comprador?:string|null;nombre?:string|null;apellidos?:string|null;orden_expediente?:number|null};
type PeopleResponse={items?:Person[]};
type UpdateResponse={ok?:boolean;status?:number;error?:string;current_version?:number;expediente?:ExpRow};
function isNotionId(v:string){return /^[0-9a-f]{32}$/i.test(v.replaceAll('-',''));}
function fullPersonName(p:Person){return [p.nombre,p.apellidos].filter(Boolean).join(' ').trim()||String(p.comprador||'').trim();}
function personName(p:Person){return String(p.nombre||'').trim()||fullPersonName(p);}
function joinNames(items:Person[]){const names=items.map(personName).filter(Boolean);if(!names.length)return'';if(names.length===1)return names[0];if(names.length===2)return `${names[0]} y ${names[1]}`;return `${names.slice(0,-1).join(', ')} y ${names[names.length-1]}`;}
function normalized(v:unknown){return String(v??'').trim().toLocaleLowerCase('es');}
function aliasIsSingleParticipant(alias:string,people:Person[]){const n=normalized(alias);return people.length>1&&people.some(p=>[personName(p),fullPersonName(p),p.comprador].some(v=>v&&normalized(v)===n));}
function friendlyFromPeople(people:Person[]){return joinNames(people);}
function applyVisibleTitle(h1:HTMLElement|null,visibleName:string,code:string){if(!h1||!visibleName)return;if(h1.textContent!==visibleName)h1.textContent=visibleName;if(h1.dataset.expedienteCode!==code)h1.dataset.expedienteCode=code;}

export default function ExpedienteRenameGuard(){
 const {pathname}=useLocation();
 const match=pathname.match(/^\/expedientes\/([^/]+)$/);
 const code=match?.[1]?decodeURIComponent(match[1]):'';
 const[host,setHost]=useState<HTMLElement|null>(null),[canonicalTitle,setCanonicalTitle]=useState(''),[people,setPeople]=useState<Person[]>([]),[customName,setCustomName]=useState(''),[editing,setEditing]=useState(false),[name,setName]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const visibleName=useMemo(()=>customName||friendlyFromPeople(people)||canonicalTitle||code,[customName,people,canonicalTitle,code]);

 async function loadPeople(){
  if(!code||!IS_PRODUCTION)return;
  const pr=await fetchNotionRuntime<PeopleResponse>(`/expedientes/${encodeURIComponent(code)}/compradores`);
  if(pr.status===200&&Array.isArray(pr.data?.items)){
   const rows=pr.data!.items!;
   setPeople(rows);
   setCustomName(current=>aliasIsSingleParticipant(current,rows)?'':current);
  }
 }
 useEffect(()=>{void loadPeople();},[code]);
 useEffect(()=>{const onPeople=(event:Event)=>{const d=(event as CustomEvent<{expedienteId?:string}>).detail;if(IS_PRODUCTION&&(!d?.expedienteId||String(d.expedienteId)===String(code)))void loadPeople();};window.addEventListener('fenix-expediente-people-changed',onPeople);return()=>window.removeEventListener('fenix-expediente-people-changed',onPeople);},[code]);

 useEffect(()=>{
  if(!code||pathname==='/expedientes/nuevo'){setHost(null);return;}
  const mount=()=>{
   const title=document.querySelector<HTMLElement>('.detail-exp-root .detail-master-title');
   if(!title)return;
   const h1=title.querySelector<HTMLElement>('h1');
   const current=String(h1?.textContent||'').trim();
   if(current&&current!==visibleName)setCanonicalTitle(prev=>prev||current);
   applyVisibleTitle(h1,visibleName,code);
   let node=title.querySelector<HTMLElement>(':scope > .exp-rename-host');
   if(!node){node=document.createElement('div');node.className='exp-rename-host';title.appendChild(node);}
   setHost(prev=>prev===node?prev:node);
  };
  mount();
  const observer=new MutationObserver(mount);
  observer.observe(document.body,{childList:true,subtree:true});
  return()=>{observer.disconnect();document.querySelectorAll('.exp-rename-host').forEach(x=>x.remove());setHost(null);};
 },[code,pathname,visibleName]);
 useEffect(()=>{applyVisibleTitle(document.querySelector<HTMLElement>('.detail-exp-root .detail-master-title h1'),visibleName,code);},[visibleName,code]);

 if(!code||pathname==='/expedientes/nuevo'||!host)return null;
 async function beginEdit(){setBusy(true);setMessage('');const detail=await fetchNotionRuntime<any>(`/expedientes/${encodeURIComponent(code)}`);setBusy(false);const row=(detail.data?.expediente??detail.data?.item??null) as ExpRow|null;if(detail.status===200&&row){const alias=String(row.cliente_alias||'').trim();const safeAlias=alias&&normalized(alias)!==normalized(code)&&!aliasIsSingleParticipant(alias,people)?alias:'';if(safeAlias)setCustomName(safeAlias);setName(safeAlias||visibleName);setEditing(true);}else setMessage('No se pudo preparar la edición del nombre.');}
 async function save(){
  const next=name.trim();if(next.length<2){setMessage('El nombre debe tener al menos 2 caracteres.');return;}
  setBusy(true);setMessage('');
  const detail=await fetchNotionRuntime<any>(`/expedientes/${encodeURIComponent(code)}`);
  const row=(detail.data?.expediente??detail.data?.item??null) as ExpRow|null;
  if(detail.status!==200||!row){setBusy(false);setMessage('No se pudo leer la versión actual del expediente.');return;}
  const version=Number(row.version??0);let status=500;let data:UpdateResponse|null=null;
  if(IS_PRODUCTION){const r=await supabase.rpc('fenix_prod_exp_update',{p_code:code,p_expected_version:version,p_cliente_alias:next,p_stage:null,p_inmobiliaria_code:null,p_notas:null,p_proxima_accion:null});if(r.error){data={ok:false,status:500,error:r.error.message};}else{data=(r.data??{}) as UpdateResponse;status=Number(data.status||500);}}
  else if(isNotionId(code)){const r=await fetchEnvironmentApi<UpdateResponse>('fenix-notion-actions',`/expedientes/${encodeURIComponent(code)}/action`,{method:'POST',body:JSON.stringify({action:'update',changes:{cliente_alias:next}})},{productionAvailable:false});status=r.status;data=r.data;}
  else{status=422;data={ok:false,status:422,error:'preprod_record_not_editable'};}
  setBusy(false);
  if(status===200&&data?.ok!==false){setCustomName(next);setEditing(false);setMessage('Nombre visible del expediente actualizado.');window.dispatchEvent(new CustomEvent('fenix-expediente-renamed',{detail:{code,name:next}}));}
  else if(status===409){setMessage('El expediente cambió mientras lo editabas. Vuelve a intentarlo.');}
  else if(status===403)setMessage('Tu perfil no puede cambiar el nombre de este expediente.');
  else setMessage(`No se pudo cambiar el nombre (${data?.error||status}).`);
 }
 const block=<div data-testid="expediente-rename-control" style={{marginTop:10,display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>{!editing?<button type="button" disabled={busy} onClick={beginEdit} style={{display:'inline-flex',gap:6,alignItems:'center'}}><Pencil size={15}/>{busy?'Preparando…':'Cambiar nombre visible'}</button>:<><input aria-label="Nombre visible del expediente" value={name} onChange={e=>setName(e.target.value)} maxLength={180} style={{minWidth:260,padding:'9px 10px'}}/><button type="button" disabled={busy} onClick={save} style={{display:'inline-flex',gap:6,alignItems:'center'}}><Save size={15}/>{busy?'Guardando…':'Guardar'}</button><button type="button" disabled={busy} onClick={()=>{setEditing(false);setName(visibleName);setMessage('')}} aria-label="Cancelar cambio de nombre"><X size={15}/></button></>}{message&&<small style={{width:'100%'}}>{message}</small>}<small style={{width:'100%',opacity:.7}}>El código técnico del expediente se conserva internamente y no se usa como título visible.</small></div>;
 return createPortal(block,host);
}
