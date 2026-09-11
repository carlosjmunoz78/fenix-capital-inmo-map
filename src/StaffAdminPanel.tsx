import {useCallback,useEffect,useMemo,useState} from 'react';
import {KeyRound,UserPlus,UsersRound} from 'lucide-react';
import {fetchStaffAdminApi} from './supabase';
import './staff-admin-panel.css';

type Ctx={actor_code?:string;role?:string};
type Staff={actor_code:string;auth_user_id:string;profile_kind?:string;display_name?:string;active?:boolean};
type StaffList={items?:Staff[];error?:string};
type ApiResult={ok?:boolean;error?:string};

export default function StaffAdminPanel({ctx}:{ctx:Ctx|null}){
 const actor=ctx?.actor_code||'';
 const canAdmin=actor==='CARLOS-ADMIN'||actor==='BELEN-DIR';
 const allowedRoles=useMemo(()=>actor==='CARLOS-ADMIN'?['Director','Financiero','Visitador']:actor==='BELEN-DIR'?['Financiero','Visitador']:[],[actor]);
 const[staff,setStaff]=useState<Staff[]>([]),[loading,setLoading]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 const[name,setName]=useState(''),[email,setEmail]=useState(''),[role,setRole]=useState(''),[password,setPassword]=useState('');
 const[targetPasswords,setTargetPasswords]=useState<Record<string,string>>({});
 const load=useCallback(async()=>{if(!canAdmin)return;const r=await fetchStaffAdminApi<StaffList>('/users');if(r.status===200)setStaff(r.data?.items??[]);},[canAdmin]);
 useEffect(()=>{if(allowedRoles.length&&!allowedRoles.includes(role))setRole(allowedRoles[0]);},[allowedRoles,role]);
 useEffect(()=>{void load();},[load]);
 async function createStaff(e:React.FormEvent){e.preventDefault();setError('');setMessage('');if(password.length<8){setError('La contraseña inicial debe tener al menos 8 caracteres.');return;}setLoading(true);const r=await fetchStaffAdminApi<ApiResult>('/users',{method:'POST',body:JSON.stringify({full_name:name,email,role,password})});setLoading(false);if(r.status!==201){setError(r.data?.error==='role_not_allowed'?'Ese perfil no puede crear ese rol.':'No se pudo crear la cuenta.');return;}setName('');setEmail('');setPassword('');setMessage('Cuenta creada y vinculada correctamente.');await load();}
 async function changeCreatedPassword(userId:string){const next=targetPasswords[userId]||'';setError('');setMessage('');if(next.length<8){setError('La nueva contraseña debe tener al menos 8 caracteres.');return;}setLoading(true);const r=await fetchStaffAdminApi<ApiResult>(`/users/${userId}/password`,{method:'PATCH',body:JSON.stringify({password:next})});setLoading(false);if(r.status!==200){setError(r.data?.error==='not_creator'?'Solo puedes cambiar la contraseña de una persona creada por ti.':'No se pudo cambiar la contraseña.');return;}setTargetPasswords(p=>({...p,[userId]:''}));setMessage('Contraseña de la cuenta creada actualizada.');}
 if(!canAdmin)return null;
 return <section className="staff-admin-card" aria-labelledby="staff-admin-title"><div className="staff-admin-title"><UsersRound size={20}/><div><strong id="staff-admin-title">Gestión de equipo</strong><p>{actor==='CARLOS-ADMIN'?'Puedes dar de alta Directores, Financieros y Visitadores.':'Puedes dar de alta Financieros y Visitadores.'} Solo puedes cambiar contraseñas de cuentas creadas por ti.</p></div></div><form className="staff-create-form" onSubmit={createStaff}><label>Nombre<input value={name} onChange={e=>setName(e.target.value)} required minLength={2}/></label><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label><label>Rol<select value={role} onChange={e=>setRole(e.target.value)}>{allowedRoles.map(x=><option key={x}>{x}</option>)}</select></label><label>Contraseña inicial<input type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} minLength={8} required/></label><button type="submit" disabled={loading}><UserPlus size={16}/>{loading?'Guardando…':'Dar de alta'}</button></form>{error&&<p className="staff-admin-error" role="alert">{error}</p>}{message&&<p className="staff-admin-success" role="status">{message}</p>}<div className="staff-created-list"><h3>Personas creadas por ti</h3>{staff.length===0?<p>No hay cuentas creadas por este usuario.</p>:staff.map(person=><article key={person.auth_user_id}><div><strong>{person.display_name||person.actor_code}</strong><span>{person.profile_kind||'Usuario'}</span></div><label>Nueva contraseña<input aria-label={`Nueva contraseña para ${person.display_name||person.actor_code}`} type="password" autoComplete="new-password" minLength={8} value={targetPasswords[person.auth_user_id]||''} onChange={e=>setTargetPasswords(p=>({...p,[person.auth_user_id]:e.target.value}))}/></label><button type="button" disabled={loading} onClick={()=>changeCreatedPassword(person.auth_user_id)}><KeyRound size={15}/>Cambiar</button></article>)}</div></section>;
}
