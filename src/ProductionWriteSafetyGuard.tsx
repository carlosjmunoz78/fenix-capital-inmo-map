import {useLocation} from 'react-router-dom';
import {IS_PRODUCTION} from './supabase';

const blocked:Record<string,{title:string;reason:string}>={
 '/notarias/nueva':{title:'Alta de notaría temporalmente protegida',reason:'El directorio productivo actual es de lectura. No se enviarán datos a servicios de prueba desde producción.'},
 '/registros-propiedad/nuevo':{title:'Alta de registro temporalmente protegida',reason:'El directorio productivo actual es de lectura. No se enviarán datos a servicios de prueba desde producción.'},
 '/herencias/nuevo':{title:'Alta de herencia temporalmente protegida',reason:'Producción aún no tiene una fuente canónica específica para este módulo. No se crearán registros ficticios ni se escribirá en PRE-PROD.'},
 '/obras-nuevas/nuevo':{title:'Alta de obra nueva temporalmente protegida',reason:'Producción aún no tiene una fuente canónica específica para este módulo. No se crearán registros ficticios ni se escribirá en PRE-PROD.'}
};

const legacyDetail=/^\/(tareas|documentacion|tasaciones|firmas)\/[^/]+$/;

export default function ProductionWriteSafetyGuard(){
 const {pathname}=useLocation();
 if(!IS_PRODUCTION)return null;
 const hit=blocked[pathname];
 if(hit)return <div data-testid="prod-write-safety" style={{position:'fixed',inset:0,zIndex:100000,display:'grid',placeItems:'center',padding:24,background:'rgba(10,18,28,.72)',backdropFilter:'blur(6px)'}}>
  <section role="alert" style={{width:'min(640px,100%)',background:'var(--surface,#fff)',color:'var(--text,#17202a)',borderRadius:18,padding:28,boxShadow:'0 24px 70px rgba(0,0,0,.35)',border:'1px solid rgba(255,125,34,.32)'}}>
   <small style={{fontWeight:800,letterSpacing:'.08em'}}>PROTECCIÓN DE DATOS · PRODUCCIÓN</small>
   <h1 style={{margin:'10px 0 8px',fontSize:'1.45rem'}}>{hit.title}</h1>
   <p style={{lineHeight:1.55,margin:'0 0 14px'}}>{hit.reason}</p>
   <p style={{lineHeight:1.55,margin:0,fontWeight:700}}>La pantalla queda bloqueada de forma segura: cero escrituras parciales y cero llamadas a endpoints TEST.</p>
  </section>
 </div>;
 if(!legacyDetail.test(pathname))return null;
 return <>
  <style>{`.ops-table-card select,.ops-table-card input,.ops-table-card textarea,.ops-table-card button.primary{pointer-events:none!important;opacity:.58!important}.ops-table-card button.primary{display:none!important}`}</style>
  <div data-testid="prod-detail-write-safety" role="status" style={{position:'fixed',right:18,bottom:18,zIndex:99990,width:'min(430px,calc(100vw - 36px))',padding:'14px 16px',borderRadius:14,background:'var(--surface,#fff)',color:'var(--text,#17202a)',boxShadow:'0 14px 40px rgba(0,0,0,.22)',border:'1px solid rgba(255,125,34,.32)',fontWeight:700}}>Consulta operativa. La edición heredada queda protegida hasta conectarla al contrato canónico de producción.</div>
 </>;
}
