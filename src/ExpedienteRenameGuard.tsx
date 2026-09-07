import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {useLocation} from 'react-router-dom';
import {Pencil,Save,X} from 'lucide-react';
import {fetchEnvironmentApi,IS_PRODUCTION,supabase} from './supabase';
import {fetchNotionRuntime} from './notionRuntime';

type ExpRow={expediente_code?:string;cliente_alias?:string;expediente?:string;cliente?:string;nombre_cliente?:string;version?:number};
type UpdateResponse={ok?:boolean;status?:number;error?:string;current_version?:number;expediente?:ExpRow};
function isNotionId(v:string){return /^[0-9a-f]{32}$/i.test(v.replaceAll('-',''));}
function currentName(item:ExpRow|null){return String(item?.cliente_alias||item?.expediente||item?.cliente||item?.nombre_cliente||'').trim();}

export default function ExpedienteRenameGuard(){
 const {pathname}=useLocation();
 const match=pathname.match(/^\/expedientes\/([^/]+)$/);
 const code=match?.[1]?decodeURIComponent(match[1]):'';
 const[host,setHost]=useState<HTMLElement|null>(null),[item,setItem]=useState<ExpRow|null>(null),[editing,setEditing]=useState(false),[name,setName]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function load(){if(!code)return;const r=await fetchNotionRuntime<any>(`/expedientes/${encodeURIComponent(code)}`);if(r.status!==200){setItem(null);return;}const row=(r.data?.expediente??r.data?.item??null) as ExpRow|null;setItem(row);setName(currentName(row));}
 useEffect(()=>{void load();},[code]);
 useEffect(()=>{if(!code||pathname==='/expedientes/nuevo'){setHost(null);return;}const mount=()=>{const title=document.querySelector<HTMLElement>('.detail-exp-root .detail-master-title');if(!title)return;let node=title.querySelector<HTMLElement>(':scope > .exp-rename-host');if(!node){node=document.createElement('div');node.className='exp-rename-host';title.appendChild(node);}setHost(node);};mount();const observer=new MutationObserver(mount);observer.observe(document.body,{childList:true,subtree:true});return()=>{observer.disconnect();document.querySelectorAll('.exp-rename-host').forEach(x=>x.remove());setHost(null);};},[code,pathname]);
 if(!code||pathname==='/expedientes/nuevo'||!host||!item)return null;
 const version=Number(item.version??0);
 async function save(){const next=name.trim();if(next.length<2){setMessage('El nombre debe tener al menos 2 caracteres.');return;}if(next===currentName(item)){setEditing(false);setMessage('');return;}setBusy(true);setMessage('');let status=500;let data:UpdateResponse|null=null;if(IS_PRODUCTION){const r=await supabase.rpc('fenix_prod_exp_update',{p_code:code,p_expected_version:version,p_cliente_alias:next,p_stage:null,p_inmobiliaria_code:null,p_notas:null,p_proxima_accion:null});if(r.error){data={ok:false,status:500,error:r.error.message};}else{data=(r.data??{}) as UpdateResponse;status=Number(data.status||500);}}else if(isNotionId(code)){const r=await fetchEnvironmentApi<UpdateResponse>('fenix-notion-actions-test',`/expedientes/${encodeURIComponent(code)}/action`,{method:'POST',body:JSON.stringify({action:'update',changes:{cliente_alias:next}})},{productionAvailable:false});status=r.status;data=r.data;}else{status=422;data={ok:false,status:422,error:'preprod_record_not_editable'};}setBusy(false);if(status===200&&data?.ok!==false){setEditing(false);setMessage('Nombre del expediente actualizado.');await load();window.dispatchEvent(new CustomEvent('fenix-expediente-renamed',{detail:{code,name:next}}));}else if(status===409){setMessage('El expediente cambió mientras lo editabas. He recargado la versión actual.');await load();}else if(status===403)setMessage('Tu perfil no puede cambiar el nombre de este expediente.');else setMessage(`No se pudo cambiar el nombre (${data?.error||status}).`);}
 const block=<div data-testid="expediente-rename-control" style={{marginTop:10,display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>{!editing?<button type="button" onClick={()=>{setName(currentName(item));setEditing(true);setMessage('')}} style={{display:'inline-flex',gap:6,alignItems:'center'}}><Pencil size={15}/> Cambiar nombre</button>:<><input aria-label="Nombre del expediente" value={name} onChange={e=>setName(e.target.value)} maxLength={180} style={{minWidth:260,padding:'9px 10px'}}/><button type="button" disabled={busy} onClick={save} style={{display:'inline-flex',gap:6,alignItems:'center'}}><Save size={15}/>{busy?'Guardando…':'Guardar'}</button><button type="button" disabled={busy} onClick={()=>{setEditing(false);setName(currentName(item));setMessage('')}} aria-label="Cancelar cambio de nombre"><X size={15}/></button></>}{message&&<small style={{width:'100%'}}>{message}</small>}</div>;
 return createPortal(block,host);
}
