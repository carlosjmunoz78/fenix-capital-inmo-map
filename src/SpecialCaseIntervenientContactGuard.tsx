import {useEffect,useState} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import {fetchSpecialCasesRuntime} from './specialCasesRuntime';

type Row=Record<string,unknown>;
type Envelope={intervinientes?:Row[]};
function text(r:Row|undefined,...keys:string[]){for(const k of keys){const v=r?.[k];if(typeof v==='string'&&v.trim())return v.trim()}return''}

export default function SpecialCaseIntervenientContactGuard(){
 const location=useLocation(),navigate=useNavigate();
 const match=location.pathname.match(/^\/(herencias|obras-nuevas)\/([^/]+)$/);
 const active=Boolean(match)&&match?.[2]!=='nuevo';
 const kind=match?.[1]||'',id=match?.[2]?decodeURIComponent(match[2]):'';
 const[people,setPeople]=useState<Row[]>([]);
 useEffect(()=>{if(!active)return;let alive=true;fetchSpecialCasesRuntime<Envelope>(`/${kind}/${encodeURIComponent(id)}`).then(r=>{if(alive&&r.status===200)setPeople(Array.isArray(r.data?.intervinientes)?r.data!.intervinientes!:[])}).catch(()=>{if(alive)setPeople([])});return()=>{alive=false}},[active,kind,id]);
 useEffect(()=>{if(!active||!people.length)return;const wire=()=>{const table=document.querySelector(`[data-testid="${kind}-intervinientes"] tbody`);if(!table)return;[...table.querySelectorAll('tr')].forEach((tr,index)=>{const person=people[index];const contactId=text(person,'contacto_id','persona_id','id_contacto','id');if(!contactId)return;const row=tr as HTMLElement;row.dataset.contactId=contactId;row.tabIndex=0;row.setAttribute('role','link');row.setAttribute('aria-label',`Abrir ficha de contacto ${text(person,'persona','persona_entidad','nombre')||contactId}`);row.classList.add('special-intervenient-link');row.onclick=()=>navigate(`/contactos/${encodeURIComponent(contactId)}`);row.onkeydown=(event)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();navigate(`/contactos/${encodeURIComponent(contactId)}`)}}})};wire();const observer=new MutationObserver(wire);observer.observe(document.body,{childList:true,subtree:true});return()=>{observer.disconnect();document.querySelectorAll('.special-intervenient-link').forEach(el=>{const row=el as HTMLElement;row.onclick=null;row.onkeydown=null;row.classList.remove('special-intervenient-link');row.removeAttribute('role');row.removeAttribute('tabindex');row.removeAttribute('aria-label');delete row.dataset.contactId})}},[active,people,kind,navigate]);
 return null;
}
