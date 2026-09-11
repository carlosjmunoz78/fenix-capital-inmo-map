import {useCallback,useEffect,useMemo,useState} from 'react';
import {KeyRound,UserPlus,UsersRound} from 'lucide-react';
import {fetchEnvironmentApi} from './supabase';
import './staff-admin-panel.css';

type Ctx={actor_code?:string;role?:string};
type Staff={actor_code:string;role?:string;display_name?:string;email?:string;active?:boolean};
type StaffList={items?:Staff[];error?:string};
type ApiResult={ok?:boolean;error?:string;actor_code?:string;role?:string};
const strongPassword=(v:string)=>v.length>=12&&/[A-Z]/.test(v)&&/[a-z]/.test(v)&&/[0-9]/.test(v)&&/[^A-Za-z0-9]/.test(v);
const callUserAdmin=<T,>(init?:RequestInit)=>fetchEnvironmentApi<T>('fenix-user-admin','',init);

export default function StaffAdminPanel({ctx}:{ctx:Ctx|null}){
 const actor=ctx?.actor_code||'';
 const canAdmin=actor==='CARLOS-ADMIN'||actor==='BELEN-DIR';
 const allowedRoles=useMemo(()=>actor==='CARLOS-ADMIN'?['Director','Financiero','Visitador']:actor==='BELEN-DIR'?['Financiero','Visitador']:[],[actor]);
 const[staff,setStaff]=useState<Staff[]>([]),[loading,setLoading]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 const[name,setName]=useState(''),[email,setEmail]=useState(''),[role,setRole]=useState(''),[password,setPassword]=useState('');
 const[targetPasswords,setTargetPasswords]=useState<Record<string,string>>({});
 const load=useCallback(async()=>{if(!canAdmin)return;const r=await callUserAdmin<StaffList>();if(r.status===200)setStaff(r.data?.items??[]);},[canAdmin]);
 useEffect(()=>{if(allowedRoles.length&&!allowedRoles.includes(role))setRole(allowedRoles[0]);},[allowedRoles,role]);
 useEffect(()=>{void load();},[load]);
 async function createStaff(e:React.FormEvent){e.preventDefault();setError('');setMessage('');if(!strongPassword(password)){setError('Usa al menos 12 caracteres, con mayúscula, minúscula, número y símbolo.');return;}setLoading(true);const canonicalRole=role==='Director'?'Direccion':role;const r=await callUserAdmin<ApiResult>({method:'POST',body:JSON.stringify({action:'create_user',display_name:name,email,role:canonicalRole,password})});setLoading(false);if(r.status!==201){setError(r.data?.error==='director_creation_forbidden'?'Solo Carlos puede crear Directores.':'No se pudo crear la cuenta.');return;}setName('');setEmail('');setPassword('');setMessage('Cuenta creada y vinculada correctamente.');await load();}
 async function changeCreatedPassword(actorCode:string){const next=targetPasswords[actorCode]||'';setError('');setMessage('');if(!strongPassword(next)){setError('Usa al menos 12 caracteres, con mayúscula, minúscula, número y símbolo.');return;}setLoading(true);const r=await callUserAdmin<ApiResult>({method:'POST',body:JSON.stringify({action:'reset_password',actor_code:actorCode,password:next})});setLoading(false);if(r.status!==200){setError(r.data?.error==='target_forbidden'||r.data?.error==='not_creator'?'Solo puedes cambiar la contraseña de una persona creada por ti.':'No se pudo cambiar la contraseña.');return;}setTargetPasswords(p=>({...p,[actorCode]:''}));setMessage('Contraseña de la cuenta creada actualizada.');}
 if(!canAdmin)return null;
 return <section className="staff-admin-card" aria-labelledby="staff-admin-title"><div className="staff-admin-title"><UsersRound size={20}/><div><strong id="staff-admin-title">Gestión de equipo</strong><p>{actor==='CARLOS-ADMIN'?'Puedes dar de alta Directores, Financieros y Visitadores.':'Puedes dar de alta Financieros y Visitadores.'} Solo puedes cambiar contraseñas de cuentas creadas por ti.</p></div></div><form className="staff-create-form" onSubmit={createStaff}><label>Nombre<input value={name} onChange={e=>setName(e.target.value)} required minLength={2}/></label><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label><label>Rol<select value={role} onChange={e=>setRole(e.target.value)}>{allowedRoles.map(x=><option key={x}>{x}</option>)}</select></label><label>Contraseña inicial<input type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} minLength={12} required/></label><button type="submit" disabled={loading}><UserPlus size={16}/>{loading?'Guardando…':'Dar de alta'}</button></form>{error&&<p className="staff-admin-error" role="alert">{error}</p>}{message&&<p className="staff-admin-success" role="status">{message}</p>}<div className="staff-created-list"><h3>Personas creadas por ti</h3>{staff.length===0?<p>No hay cuentas creadas por este usuario.</p>:staff.map(person=><article key={person.actor_code}><div><strong>{person.display_name||person.actor_code}</strong><span>{person.role==='Direccion'?'Director':person.role||'Usuario'}{person.email?` · ${person.email}`:''}</span></div><label>Nueva contraseña<input aria-label={`Nueva contraseña para ${person.display_name||person.actor_code}`} type="password" autoComplete="new-password" minLength={12} value={targetPasswords[person.actor_code]||''} onChange={e=>setTargetPasswords(p=>({...p,[person.actor_code]:e.target.value}))}/></label><button type="button" disabled={loading} onClick={()=>changeCreatedPassword(person.actor_code)}><KeyRound size={15}/>Cambiar</button></article>)}</div></section>;
}
