import {
  AlertTriangle,
  Banknote,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Calculator,
  CheckCircle2,
  ChevronDown,
  FileCheck2,
  FileText,
  FolderOpen,
  Gauge,
  Home,
  Landmark,
  LogOut,
  Minimize2,
  Search,
  SlidersHorizontal,
  UserRound,
  Users,
  X
} from 'lucide-react';
import fenixLogoReference from './fenix-logo-reference.svg';
import belenDirectorReference from './belen-director-reference.svg';

type CalcState = {
  principal:number;
  rate:number;
  years:number;
  purchasePrice:number|'';
  income:number|'';
  other:number|'';
  open:boolean;
  minimized:boolean;
};

type MortgageResult = {
  monthlyPayment:number;
  totalPaid:number;
  estimatedInterest:number;
  financingPct:number|null;
  effortPct:number|null;
  warnings:string[];
}|null;

type Props = {
  onNavigate:(route:string)=>void;
  onLogout:()=>void;
  calc:CalcState;
  setCalc:(updater:(value:CalcState)=>CalcState)=>void;
  result:MortgageResult;
};

const menu = [
  ['Inicio','/inicio',Home],
  ['Expedientes','/expedientes',FolderOpen],
  ['Bancos','/bancos',Landmark],
  ['Contactos','/contactos',Users],
  ['Inmobiliarias','/inmobiliarias',Building2],
  ['Tasaciones','/tasaciones',FileText],
  ['Firmas','/firmas',FileCheck2],
  ['Documentación','/documentacion',FileText],
  ['Financieros','/financieros',UserRound],
  ['Visitadores','/visitadores',Users],
  ['Economía','/economia',Gauge],
  ['Agenda','/agenda',CalendarDays],
  ['Informes','/informes',BarChart3]
] as const;

const team = [
  ['Diego López','Senior','18','2','1','92%'],
  ['Marta Ruiz','Senior','14','1','2','88%'],
  ['Luis García','Junior','8','1','1','75%'],
  ['Elena Martín','Junior','6','0','1','82%']
];

const banks = [
  ['BBVA','78%','24h','245.000 €','95%','ok'],
  ['Caja Rural Granada','72%','48h','198.000 €','90%','ok'],
  ['ING','65%','72h','156.000 €','85%','warn'],
  ['Abanca','58%','72h','142.000 €','75%','warn'],
  ['Unicaja','45%','96h','128.000 €','65%','bad']
];

export default function DirectionDashboard({onNavigate,onLogout,calc,setCalc,result}:Props){
  return <div className="dir-shell">
    <aside className="dir-sidebar">
      <div className="dir-logo-wrap"><img src={fenixLogoReference} alt="Fénix Capital Hipotecas"/></div>
      <nav className="dir-nav">
        {menu.map(([label,route,Icon],i)=><button key={label} className={i===0?'dir-nav-item active':'dir-nav-item'} onClick={()=>onNavigate(route)}><Icon size={16}/><span>{label}</span></button>)}
      </nav>
      <div className="dir-help-card">
        <div><strong>¿Necesitas ayuda?</strong><span>Pregunta a Ana, tu asistente inteligente.</span></div>
        <div className="dir-help-person"><img className="dir-help-avatar" src={belenDirectorReference} alt="Ana"/></div>
        <button>Abrir chat con Ana <span>→</span></button>
      </div>
    </aside>

    <main className="dir-main">
      <header className="dir-topbar">
        <button className="dir-advanced"><SlidersHorizontal size={15}/>Buscador avanzado</button>
        <div className="dir-search"><Search size={16}/><input placeholder="Buscar expediente, cliente, banco, inmobiliaria, contacto..."/><Search size={15}/></div>
        <div className="dir-top-right">
          <button className="dir-bell" aria-label="Notificaciones"><Bell size={19}/><span>4</span></button>
          <img className="dir-top-avatar" src={belenDirectorReference} alt="Belén Muñoz"/>
          <div className="dir-user-copy"><strong>Belén Muñoz</strong><span>Directora Financiera</span></div>
          <ChevronDown size={15}/>
          <button className="dir-logout" onClick={onLogout} aria-label="Cerrar sesión"><LogOut size={16}/></button>
        </div>
      </header>

      <div className="dir-content">
        <section className="dir-dashboard-top">
          <article className="dir-priority-card">
            <div className="dir-person-wrap"><img src={belenDirectorReference} alt="Belén Muñoz"/></div>
            <div className="dir-priority-copy">
              <h1>Hola Belén, buenos días 👋</h1>
              <p>Estas son tus prioridades de hoy.</p>
              <div className="dir-alert-list">
                <div><AlertTriangle size={15}/><span><strong>2 expedientes bloqueados por documentación</strong><small>Requieren tu validación</small></span></div>
                <div><Banknote size={15}/><span><strong>1 firma requiere forma de pago hoy</strong><small>Expediente ID 12847 · 12:30 h</small></span></div>
                <div><Landmark size={15}/><span><strong>Caja Rural Granada lleva 48h sin responder</strong><small>Pendiente de valoración</small></span></div>
                <div><BriefcaseBusiness size={15}/><span><strong>3 nuevas ofertas bancarias para revisar</strong><small>Expedientes en estudio</small></span></div>
              </div>
              <button className="dir-alert-button">Ver todas las alertas <span>›</span></button>
            </div>
          </article>

          <div className="dir-right-top">
            <section className="dir-kpis">
              <div className="dir-kpi"><FolderOpen size={17}/><span>EXPEDIENTES<br/>EN CURSO</span><strong>46</strong><small className="good">+6 vs. semana pasada</small></div>
              <div className="dir-kpi"><FileCheck2 size={17}/><span>FIRMAS<br/>ESTE MES</span><strong>8</strong><small>Programadas</small></div>
              <div className="dir-kpi"><CheckCircle2 size={17}/><span>FIRMADOS<br/>ESTE MES</span><strong>12</strong><small className="good">+3 vs. mes pasado</small></div>
              <div className="dir-kpi"><AlertTriangle size={17}/><span>EN RIESGO</span><strong>7</strong><small className="bad">Requieren acción</small></div>
              <div className="dir-kpi"><Banknote size={17}/><span>HONORARIOS<br/>PENDIENTES</span><strong>15.800 €</strong><small>Por cobrar</small></div>
            </section>

            <section className="dir-table-card priorities">
              <div className="dir-section-head"><strong>PRIORIDADES Y TAREAS</strong><button>Ver todas</button></div>
              <table><thead><tr><th>TAREA</th><th>PRIORIDAD</th><th>VENCIMIENTO</th><th>EXPEDIENTE</th></tr></thead><tbody>
                <tr><td>□&nbsp;&nbsp;Validar forma de pago - Firma ID 12847</td><td><span className="dot red"/>Alta</td><td>Hoy</td><td>12847</td></tr>
                <tr><td>□&nbsp;&nbsp;Revisar expediente bloqueado - Documentación</td><td><span className="dot red"/>Alta</td><td>Hoy</td><td>12832</td></tr>
                <tr><td>□&nbsp;&nbsp;Llamar a Elena (BBVA) - Expediente ID 12851</td><td><span className="dot amber"/>Media</td><td>Hoy</td><td>12851</td></tr>
                <tr><td>□&nbsp;&nbsp;Aprobar comisión inmobiliaria - 3 expedientes</td><td><span className="dot amber"/>Media</td><td>Mañana</td><td>—</td></tr>
                <tr><td>□&nbsp;&nbsp;Revisar ofertas pendientes - 5 expedientes</td><td><span className="dot blue"/>Baja</td><td>2 días</td><td>—</td></tr>
                <tr><td>□&nbsp;&nbsp;Análisis mensual de rendimiento</td><td><span className="dot blue"/>Baja</td><td>3 días</td><td>—</td></tr>
              </tbody></table>
            </section>
          </div>
        </section>

        <section className="dir-mid-grid">
          <article className="dir-table-card team-card">
            <div className="dir-section-head"><strong>EQUIPO FINANCIERO</strong><button>Ver todos</button></div>
            <div className="dir-team-grid">
              {team.map((p,i)=><div className="dir-team-person" key={p[0]}>
                <div className={`dir-team-avatar avatar-${i}`}>{p[0].split(' ').map(x=>x[0]).join('')}</div>
                <strong>{p[0]}</strong><small>{p[1]}</small>
                <dl><div><dt>Expedientes</dt><dd>{p[2]}</dd></div><div><dt>En riesgo</dt><dd>{p[3]}</dd></div><div><dt>Firmas mes</dt><dd>{p[4]}</dd></div><div><dt>Rendimiento</dt><dd>{p[5]}</dd></div></dl>
                <div className="dir-progress"><span style={{width:p[5]}}/></div>
              </div>)}
            </div>
          </article>

          <article className="dir-table-card bank-card">
            <div className="dir-section-head"><strong>RANKING BANCOS</strong><button>Ver análisis completo</button></div>
            <table><thead><tr><th>BANCO</th><th>CONVERSIÓN</th><th>VEL. RESPUESTA</th><th>LTV MEDIO</th><th>CONFIANZA</th><th>ESTADO</th></tr></thead><tbody>
              {banks.map(b=><tr key={b[0]}><td>{b[0]}</td><td>{b[1]}</td><td>{b[2]}</td><td>{b[3]}</td><td>{b[4]}</td><td><span className={`status-dot ${b[5]}`}/></td></tr>)}
            </tbody></table>
          </article>
        </section>

        <section className="dir-quick">
          <h2>ACCESOS RÁPIDOS</h2>
          <div className="dir-quick-grid">
            <button onClick={()=>onNavigate('/expedientes')}><FolderOpen/>+ Nuevo expediente</button>
            <button onClick={()=>onNavigate('/contactos')}><UserRound/>+ Nuevo contacto</button>
            <button onClick={()=>onNavigate('/inmobiliarias')}><Building2/>+ Nueva inmobiliaria</button>
            <button onClick={()=>onNavigate('/agenda')}><CalendarDays/>Agenda</button>
            <button onClick={()=>onNavigate('/documentacion')}><FileText/>Documentación</button>
            <button onClick={()=>onNavigate('/informes')}><BarChart3/>Informes</button>
          </div>
        </section>
      </div>
    </main>

    {!calc.open && <button className="calc-launcher dir-calc-launcher" onClick={()=>setCalc(v=>({...v,open:true,minimized:false}))}><Calculator size={20}/>Calculadora PRO</button>}
    {calc.open && <section className={calc.minimized?'calc-panel minimized':'calc-panel'} aria-label="Calculadora Hipotecaria PRO">
      <header><div><strong>Calculadora Hipotecaria PRO</strong></div><div className="calc-actions"><button aria-label="Minimizar calculadora" onClick={()=>setCalc(v=>({...v,minimized:!v.minimized}))}><Minimize2 size={17}/></button><button aria-label="Cerrar calculadora" onClick={()=>setCalc(v=>({...v,open:false}))}><X size={17}/></button></div></header>
      {!calc.minimized && <div className="calc-body">
        <div className="calc-grid">
          <label>Importe €<input type="number" min="1" value={calc.principal} onChange={e=>setCalc(v=>({...v,principal:Number(e.target.value)}))}/></label>
          <label>TIN anual %<input type="number" min="0" step="0.01" value={calc.rate} onChange={e=>setCalc(v=>({...v,rate:Number(e.target.value)}))}/></label>
          <label>Plazo años<input type="number" min="1" value={calc.years} onChange={e=>setCalc(v=>({...v,years:Number(e.target.value)}))}/></label>
          <label>Precio compra €<input type="number" min="0" value={calc.purchasePrice} onChange={e=>setCalc(v=>({...v,purchasePrice:e.target.value===''?'':Number(e.target.value)}))}/></label>
          <label>Ingresos netos €/mes<input type="number" min="0" value={calc.income} onChange={e=>setCalc(v=>({...v,income:e.target.value===''?'':Number(e.target.value)}))}/></label>
          <label>Otras cuotas €/mes<input type="number" min="0" value={calc.other} onChange={e=>setCalc(v=>({...v,other:e.target.value===''?'':Number(e.target.value)}))}/></label>
        </div>
        {result ? <div className="result-box"><div><span>Cuota estimada</span><strong>{result.monthlyPayment.toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})} €</strong></div><div className="result-row"><span>Total pagado <b>{result.totalPaid.toLocaleString('es-ES')} €</b></span><span>Intereses <b>{result.estimatedInterest.toLocaleString('es-ES')} €</b></span></div>{result.financingPct!==null&&<div className="result-row"><span>Financiación <b>{result.financingPct}%</b></span>{result.effortPct!==null&&<span>Esfuerzo <b>{result.effortPct}%</b></span>}</div>}{result.warnings.map(w=><div className="warning" key={w}>{w}</div>)}</div> : <div className="warning">Revisa importe, plazo y tipo.</div>}
        <p className="calc-note">Simulación orientativa. No implica aprobación bancaria.</p>
      </div>}
    </section>}
  </div>
}
