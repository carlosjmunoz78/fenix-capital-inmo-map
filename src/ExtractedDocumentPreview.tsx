import {AlertTriangle,CheckCircle2,FileSearch,X} from 'lucide-react';

type Extraction={
 document_type?:string;
 person?:string;
 confidence?:number;
 summary?:string;
 fields?:Record<string,unknown>;
};

type Props={
 filename:string;
 extraction:Extraction;
 reviewRequired?:boolean;
 conflicts?:unknown[];
 onClose:()=>void;
 onRefresh:()=>void;
};

const labels:Record<string,string>={
 nombre:'Nombre',apellidos:'Apellidos',documento_identidad:'DNI / NIE / Pasaporte',fecha_nacimiento:'Fecha de nacimiento',telefono:'Teléfono',email:'Email',domicilio:'Domicilio',codigo_postal:'Código postal',localidad:'Localidad',provincia:'Provincia',nacionalidad:'Nacionalidad',estado_civil:'Estado civil',profesion:'Profesión',empresa:'Empresa',tipo_contrato:'Tipo de contrato',antiguedad_laboral:'Antigüedad laboral',ingresos_netos_mensuales:'Ingresos netos / mes',otros_ingresos_mensuales:'Otros ingresos / mes',cuotas_deuda_mensuales:'Cuotas de deuda / mes',ahorros:'Ahorros',precio_vivienda:'Precio vivienda',importe_solicitado:'Importe solicitado'
};
const money=new Set(['ingresos_netos_mensuales','otros_ingresos_mensuales','cuotas_deuda_mensuales','ahorros','precio_vivienda','importe_solicitado']);
function show(key:string,v:unknown){
 if(v===null||v===undefined||v==='')return 'No detectado';
 if(money.has(key)&&typeof v==='number')return new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:2}).format(v);
 return String(v);
}

export default function ExtractedDocumentPreview({filename,extraction,reviewRequired=false,conflicts=[],onClose,onRefresh}:Props){
 const fields=extraction.fields??{};
 const entries=Object.entries(labels).map(([key,label])=>({key,label,value:fields[key]}));
 const detected=entries.filter(x=>x.value!==null&&x.value!==undefined&&x.value!=='').length;
 const confidence=Math.round(Math.max(0,Math.min(1,Number(extraction.confidence)||0))*100);
 return <div role="presentation" style={{position:'fixed',inset:0,zIndex:10050,background:'rgba(10,10,14,.72)',display:'grid',placeItems:'center',padding:16}}>
  <section role="dialog" aria-modal="true" aria-label="Vista previa de datos extraídos" data-testid="document-extraction-preview" style={{width:'min(1120px,96vw)',height:'min(90vh,920px)',overflow:'hidden',display:'grid',gridTemplateRows:'auto auto minmax(0,1fr) auto',background:'var(--panel,#fff)',color:'var(--text,#18181b)',border:'2px solid #870064',borderRadius:22,boxShadow:'0 28px 90px rgba(0,0,0,.34)'}}>
   <header style={{display:'flex',justifyContent:'space-between',gap:16,padding:'18px 20px',borderBottom:'1px solid var(--border,#ddd)'}}><div style={{display:'flex',gap:12,alignItems:'flex-start'}}><span style={{width:44,height:44,borderRadius:13,display:'grid',placeItems:'center',background:'rgba(255,95,0,.12)',color:'#FF5F00'}}><FileSearch size={22}/></span><div><small style={{fontWeight:900,letterSpacing:'.1em',color:'#870064'}}>VISTA PREVIA INTELIGENTE</small><h2 style={{margin:'4px 0 3px',fontSize:21}}>{extraction.document_type||'Documento'} · {extraction.person||'Persona no identificada'}</h2><div style={{fontSize:12,color:'var(--muted,#667085)'}}>{filename} · {detected} datos detectados · confianza {confidence}%</div></div></div><button type="button" onClick={onClose} aria-label="Cerrar vista previa" style={{width:40,height:40,borderRadius:12,border:'1px solid var(--border,#ddd)',background:'transparent',color:'inherit',cursor:'pointer'}}><X size={18}/></button></header>
   <div style={{padding:'12px 20px',borderBottom:'1px solid var(--border,#ddd)',display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>{reviewRequired?<><AlertTriangle size={17}/><strong style={{color:'#b45309'}}>Hay conflictos: no se ha sobrescrito ningún dato existente.</strong></>:<><CheckCircle2 size={17}/><strong>Los datos válidos se han aplicado automáticamente a la ficha.</strong></>}{conflicts.length>0&&<span style={{fontSize:12}}>{conflicts.length} conflicto{conflicts.length===1?'':'s'} pendiente{conflicts.length===1?'':'s'} de revisión.</span>}</div>
   <main style={{overflow:'auto',padding:20}}>{extraction.summary&&<div style={{marginBottom:16,padding:13,borderRadius:14,background:'rgba(135,0,100,.07)',fontSize:13,lineHeight:1.5}}><strong>Resumen:</strong> {extraction.summary}</div>}<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:10}}>{entries.map(({key,label,value})=><div key={key} data-empty={value===null||value===undefined||value===''?'true':'false'} style={{border:'1px solid var(--border,#ddd)',borderRadius:14,padding:'11px 12px',background:'var(--surface,#fff)',opacity:value===null||value===undefined||value===''?.62:1}}><small style={{display:'block',fontSize:9.5,fontWeight:850,textTransform:'uppercase',letterSpacing:'.06em',color:'var(--muted,#667085)'}}>{label}</small><strong style={{display:'block',marginTop:5,fontSize:13,lineHeight:1.35,wordBreak:'break-word'}}>{show(key,value)}</strong></div>)}</div></main>
   <footer style={{padding:'14px 20px',borderTop:'1px solid var(--border,#ddd)',display:'flex',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}><span style={{fontSize:11,color:'var(--muted,#667085)'}}>El PDF original se conserva. Los campos no visibles no se inventan; los conflictos requieren revisión.</span><div style={{display:'flex',gap:8}}><button type="button" onClick={onClose} style={{padding:'10px 14px',borderRadius:11,border:'1px solid var(--border,#ddd)',background:'transparent',color:'inherit',fontWeight:800,cursor:'pointer'}}>Seguir aquí</button><button type="button" onClick={onRefresh} style={{padding:'10px 14px',borderRadius:11,border:0,background:'#FF5F00',color:'#fff',fontWeight:900,cursor:'pointer'}}>Ver ficha ya actualizada</button></div></footer>
  </section>
 </div>;
}
