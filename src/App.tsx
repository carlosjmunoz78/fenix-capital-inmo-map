import { useEffect, useMemo, useState } from 'react';
import { Calculator, Moon, Sun, Minimize2, X } from 'lucide-react';
import { calculateMortgage, FORMULA_VERSION } from './calculator';

type Theme = 'light' | 'dark';

const menu = ['Inicio','Expedientes','Bancos','Contactos','Inmobiliarias','Tasaciones','Firmas','Documentación','Financieros','Visitadores','Agenda/Tareas','Informes','Buscador'];

export default function App(){
  const [theme,setTheme]=useState<Theme>(() => (sessionStorage.getItem('fenix-theme') as Theme) || 'light');
  const [calcOpen,setCalcOpen]=useState(true);
  const [calcMin,setCalcMin]=useState(false);
  const [principal,setPrincipal]=useState(100000);
  const [rate,setRate]=useState(3);
  const [years,setYears]=useState(30);
  const [purchasePrice,setPurchasePrice]=useState<number|''>('');
  const [income,setIncome]=useState<number|''>('');
  const [other,setOther]=useState<number|''>('');

  useEffect(()=>{
    document.documentElement.dataset.theme=theme;
    sessionStorage.setItem('fenix-theme',theme);
  },[theme]);

  const result=useMemo(()=>{
    try{
      return calculateMortgage({principal,annualRate:rate,years,purchasePrice:purchasePrice===''?undefined:Number(purchasePrice),netIncome:income===''?undefined:Number(income),otherPayments:other===''?undefined:Number(other),mortgageType:'fixed'});
    }catch{return null}
  },[principal,rate,years,purchasePrice,income,other]);

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">F</div><div><strong>FÉNIX CAPITAL</strong><span>PRE-PROD · Fase 1</span></div></div>
      <nav>{menu.map((item,i)=><button className={i===0?'nav-item active':'nav-item'} key={item}>{item}</button>)}</nav>
    </aside>
    <main className="main">
      <header className="topbar">
        <div><h1>Inicio</h1><p>Entorno TEST · datos sintéticos</p></div>
        <div className="top-actions">
          <button className="theme-toggle" onClick={()=>setTheme(theme==='light'?'dark':'light')} aria-label="Cambiar tema">{theme==='light'?<Moon size={18}/>:<Sun size={18}/>}<span>{theme==='light'?'Oscuro':'Claro'}</span></button>
          <div className="avatar">CT</div>
        </div>
      </header>
      <section className="hero-card"><div><span className="eyebrow">CONTROL OPERATIVO</span><h2>Todo preparado para validar la APP real</h2><p>Shell único, navegación por rol y Calculadora PRO transversal. WordPress se mantiene fuera hasta cerrar QA.</p></div><div className="hero-kpi"><strong>PRE-PROD</strong><span>sin datos reales</span></div></section>
      <section className="grid">
        <article className="card"><span className="eyebrow">SIGUIENTE</span><h3>QA visual + navegador</h3><p>Responsive, cambio Claro/Oscuro, logout A→B, caché, back/forward y estado local.</p></article>
        <article className="card"><span className="eyebrow">SEGURIDAD</span><h3>RBAC servidor</h3><p>La interfaz nunca sustituye permisos. Todo acceso sensible se revalida en backend.</p></article>
        <article className="card"><span className="eyebrow">CAL-001</span><h3>Motor validado</h3><p>Amortización francesa · fórmula {FORMULA_VERSION}.</p></article>
      </section>
    </main>

    {!calcOpen && <button className="calc-launcher" onClick={()=>{setCalcOpen(true);setCalcMin(false)}}><Calculator size={20}/>Calculadora PRO</button>}
    {calcOpen && <section className={calcMin?'calc-panel minimized':'calc-panel'} aria-label="Calculadora Hipotecaria PRO">
      <header><div><span className="eyebrow">CAL-001</span><strong>Calculadora Hipotecaria PRO</strong></div><div className="calc-actions"><button onClick={()=>setCalcMin(!calcMin)}><Minimize2 size={17}/></button><button onClick={()=>setCalcOpen(false)}><X size={17}/></button></div></header>
      {!calcMin && <div className="calc-body">
        <div className="calc-grid">
          <label>Importe €<input type="number" min="1" value={principal} onChange={e=>setPrincipal(Number(e.target.value))}/></label>
          <label>TIN anual %<input type="number" min="0" step="0.01" value={rate} onChange={e=>setRate(Number(e.target.value))}/></label>
          <label>Plazo años<input type="number" min="1" value={years} onChange={e=>setYears(Number(e.target.value))}/></label>
          <label>Precio compra €<input type="number" min="0" value={purchasePrice} onChange={e=>setPurchasePrice(e.target.value===''?'':Number(e.target.value))}/></label>
          <label>Ingresos netos €/mes<input type="number" min="0" value={income} onChange={e=>setIncome(e.target.value===''?'':Number(e.target.value))}/></label>
          <label>Otras cuotas €/mes<input type="number" min="0" value={other} onChange={e=>setOther(e.target.value===''?'':Number(e.target.value))}/></label>
        </div>
        {result ? <div className="result-box"><div><span>Cuota estimada</span><strong>{result.monthlyPayment.toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})} €</strong></div><div className="result-row"><span>Total pagado <b>{result.totalPaid.toLocaleString('es-ES')} €</b></span><span>Intereses <b>{result.estimatedInterest.toLocaleString('es-ES')} €</b></span></div>{result.financingPct!==null&&<div className="result-row"><span>Financiación <b>{result.financingPct}%</b></span>{result.effortPct!==null&&<span>Esfuerzo <b>{result.effortPct}%</b></span>}</div>}{result.warnings.map(w=><div className="warning" key={w}>{w}</div>)}</div> : <div className="warning">Revisa importe, plazo y tipo.</div>}
        <p className="calc-note">Simulación matemática. No implica aprobación bancaria ni sustituye validación de Belén.</p>
      </div>}
    </section>}
  </div>
}
