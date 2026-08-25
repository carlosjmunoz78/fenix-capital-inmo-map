import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, History, Send } from 'lucide-react';

const css=`
.ana-knowledge-mount{margin-top:24px}.ana-knowledge-card{border:1px solid #ececec;background:#fff;border-radius:16px;padding:20px 22px 18px;box-shadow:0 8px 24px rgba(17,17,17,.025);color:#1d1d1f}.ana-knowledge-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:15px}.ana-knowledge-title{display:flex;align-items:center;gap:12px;min-width:0}.ana-knowledge-icon{width:38px;height:38px;border-radius:11px;background:#fff3ed;color:#f36c21;display:grid;place-items:center;flex:0 0 auto}.ana-knowledge-copy strong{display:block;font-size:12.5px;letter-spacing:.075em}.ana-knowledge-copy span{display:block;margin-top:4px;font-size:11px;color:#777;line-height:1.45}.ana-knowledge-history{height:36px;border:1px solid #e7e7e7;background:#fff;border-radius:10px;padding:0 12px;display:flex;align-items:center;gap:7px;font-size:10.5px;font-weight:700;color:#555;cursor:pointer}.ana-knowledge-history:hover{border-color:#ffd3c0;background:#fffaf7;color:#f36c21}.ana-knowledge-input-wrap{position:relative;border:1px solid #e7e7e7;border-radius:13px;background:#fafafa;transition:.18s ease}.ana-knowledge-input-wrap:focus-within{border-color:#f36c21;box-shadow:0 0 0 3px rgba(243,108,33,.08);background:#fff}.ana-knowledge-input{display:block;width:100%;min-height:118px;resize:vertical;border:0;outline:0;background:transparent;color:inherit;padding:16px 18px 44px;font:inherit;font-size:13px;line-height:1.55}.ana-knowledge-input::placeholder{color:#9a9a9f}.ana-knowledge-hint{position:absolute;left:18px;bottom:12px;font-size:10px;color:#999}.ana-knowledge-footer{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:13px}.ana-knowledge-status{font-size:10.5px;color:#8a8a8f}.ana-knowledge-submit{height:40px;border:0;border-radius:10px;padding:0 16px;background:#f36c21;color:#fff;font-size:11px;font-weight:800;display:flex;align-items:center;gap:8px;cursor:pointer;box-shadow:0 7px 16px rgba(243,108,33,.18)}.ana-knowledge-submit:hover{filter:brightness(.97)}.ana-knowledge-submit:disabled{opacity:.46;cursor:not-allowed;box-shadow:none}.dir-shell[data-dir-theme='dark'] .ana-knowledge-card{background:#202023;border-color:#39393e;color:#f4f4f5;box-shadow:none}.dir-shell[data-dir-theme='dark'] .ana-knowledge-icon{background:#3a241d;color:#ff7a42}.dir-shell[data-dir-theme='dark'] .ana-knowledge-copy span,.dir-shell[data-dir-theme='dark'] .ana-knowledge-status,.dir-shell[data-dir-theme='dark'] .ana-knowledge-hint{color:#aaaab2}.dir-shell[data-dir-theme='dark'] .ana-knowledge-history{background:#202023;border-color:#39393e;color:#d7d7db}.dir-shell[data-dir-theme='dark'] .ana-knowledge-history:hover{background:#2c2929;border-color:#70402c;color:#ff7a42}.dir-shell[data-dir-theme='dark'] .ana-knowledge-input-wrap{background:#242427;border-color:#3b3b40}.dir-shell[data-dir-theme='dark'] .ana-knowledge-input-wrap:focus-within{background:#242427;border-color:#ff7a42;box-shadow:0 0 0 3px rgba(255,122,66,.08)}@media(max-width:760px){.ana-knowledge-card{padding:17px 16px 15px}.ana-knowledge-head{align-items:center}.ana-knowledge-copy span{font-size:10.5px}.ana-knowledge-history span{display:none}.ana-knowledge-footer{align-items:flex-start;flex-direction:column}.ana-knowledge-submit{width:100%;justify-content:center}.ana-knowledge-input{min-height:132px}}
`;

export default function AnaKnowledgeBlock(){
  const [mount,setMount]=useState<HTMLElement|null>(null);
  const [value,setValue]=useState('');
  const [status,setStatus]=useState('Preparado para conectar con CEREBRO.');

  useEffect(()=>{
    const place=()=>{
      const quick=document.querySelector('.dir-quick');
      if(!quick){setMount(null);return}
      let node=document.querySelector('.ana-knowledge-mount') as HTMLElement|null;
      if(!node){node=document.createElement('section');node.className='ana-knowledge-mount';quick.insertAdjacentElement('afterend',node)}
      setMount(node);
    };
    place();
    const observer=new MutationObserver(place);
    observer.observe(document.body,{childList:true,subtree:true});
    return()=>{observer.disconnect();document.querySelector('.ana-knowledge-mount')?.remove()};
  },[]);

  if(!mount)return null;
  return createPortal(<><style>{css}</style><article className="ana-knowledge-card" aria-label="Dar conocimiento a Ana"><div className="ana-knowledge-head"><div className="ana-knowledge-title"><div className="ana-knowledge-icon"><BookOpen size={18}/></div><div className="ana-knowledge-copy"><strong>DAR CONOCIMIENTO A ANA</strong><span>Añade criterios, decisiones, excepciones o conocimiento operativo para que Ana pueda utilizarlo después.</span></div></div><button className="ana-knowledge-history" type="button" onClick={()=>setStatus('Historial preparado para su conexión con CEREBRO.')}><History size={15}/><span>Historial</span></button></div><div className="ana-knowledge-input-wrap"><textarea className="ana-knowledge-input" value={value} onChange={e=>setValue(e.target.value)} placeholder="Escribe aquí lo que Ana debe saber o recordar…"/><span className="ana-knowledge-hint">Ej.: “Cuando ocurra X, actuar así…” · “Este banco admite esta excepción…”</span></div><div className="ana-knowledge-footer"><span className="ana-knowledge-status">{status}</span><button className="ana-knowledge-submit" type="button" disabled={!value.trim()} onClick={()=>setStatus('Contenido preparado. La conexión definitiva con CEREBRO se activará en la fase funcional.')}><Send size={15}/>Añadir conocimiento a Ana</button></div></article></>,mount);
}
