import {useEffect,useMemo,useState} from 'react';
import {createPortal} from 'react-dom';
import {calculateMortgage} from './calculator';

type MortgageType='fixed'|'mixed'|'variable';
type Base={principal:number;rate:number;years:number;purchasePrice?:number;income?:number;other?:number};
function num(v:string|undefined){const n=Number(v);return Number.isFinite(n)?n:0;}
function readBase():Base|null{
 const labels=Array.from(document.querySelectorAll<HTMLLabelElement>('.calc-grid label'));
 if(labels.length<6)return null;
 const values=labels.map(l=>l.querySelector<HTMLInputElement>('input')?.value||'');
 return {principal:num(values[0]),rate:num(values[1]),years:num(values[2]),purchasePrice:values[3]?num(values[3]):undefined,income:values[4]?num(values[4]):undefined,other:values[5]?num(values[5]):undefined};
}
const eur=(n:number|null)=>n===null?'—':`${n.toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})} €`;

export default function CalculatorProEnhancement(){
 const[host,setHost]=useState<HTMLElement|null>(null),[base,setBase]=useState<Base|null>(null);
 const[costs,setCosts]=useState<number|''>(''),[savings,setSavings]=useState<number|''>(''),[target,setTarget]=useState(35),[mortgageType,setMortgageType]=useState<MortgageType>('fixed');
 useEffect(()=>{
  let body:HTMLElement|null=null;
  const sync=()=>{const next=document.querySelector<HTMLElement>('.calc-body');setHost(next);setBase(readBase());if(body!==next){body?.removeEventListener('input',sync);body=next;body?.addEventListener('input',sync)}};
  sync();const obs=new MutationObserver(sync);obs.observe(document.body,{childList:true,subtree:true});
  return()=>{obs.disconnect();body?.removeEventListener('input',sync)};
 },[]);
 const result=useMemo(()=>{if(!base||base.principal<=0||base.years<=0)return null;try{return calculateMortgage({principal:base.principal,annualRate:base.rate,years:base.years,purchasePrice:base.purchasePrice,purchaseCosts:costs===''?undefined:Number(costs),availableSavings:savings===''?undefined:Number(savings),netIncome:base.income,otherPayments:base.other,targetEffortPct:target,mortgageType})}catch{return null}},[base,costs,savings,target,mortgageType]);
 const scenarios=useMemo(()=>{if(!base||mortgageType!=='fixed')return[];return [-.5,0,.5].map(delta=>{const rate=Math.max(0,base.rate+delta);try{return {label:delta<0?'TIN −0,50 pp':delta>0?'TIN +0,50 pp':'Escenario actual',rate,res:calculateMortgage({principal:base.principal,annualRate:rate,years:base.years,purchasePrice:base.purchasePrice,purchaseCosts:costs===''?undefined:Number(costs),availableSavings:savings===''?undefined:Number(savings),netIncome:base.income,otherPayments:base.other,targetEffortPct:target,mortgageType:'fixed'})}}catch{return null}}).filter(Boolean) as Array<{label:string;rate:number;res:ReturnType<typeof calculateMortgage>}>},[base,target,costs,savings,mortgageType]);
 if(!host)return null;
 return createPortal(<section data-testid="calculator-pro-advanced" style={{display:'grid',gap:12,marginTop:14,paddingTop:14,borderTop:'1px solid var(--border,#ddd)'}}>
  <div><strong>Planificación avanzada</strong><div style={{fontSize:11,color:'var(--muted,#667085)',marginTop:3}}>Fondos propios, esfuerzo objetivo, modalidad y sensibilidad de cuota. Los escenarios no predicen tipos futuros.</div></div>
  <div className="calc-grid">
   <label>Modalidad<select aria-label="Modalidad hipotecaria" value={mortgageType} onChange={e=>setMortgageType(e.target.value as MortgageType)}><option value="fixed">Fija</option><option value="mixed">Mixta</option><option value="variable">Variable</option></select></label>
   <label>Gastos compra €<input aria-label="Gastos compra" type="number" min="0" value={costs} onChange={e=>setCosts(e.target.value===''?'':Number(e.target.value))}/></label>
   <label>Ahorro disponible €<input aria-label="Ahorro disponible" type="number" min="0" value={savings} onChange={e=>setSavings(e.target.value===''?'':Number(e.target.value))}/></label>
   <label>Esfuerzo objetivo %<input aria-label="Esfuerzo objetivo" type="number" min="1" max="100" step="0.5" value={target} onChange={e=>setTarget(Math.max(1,Math.min(100,Number(e.target.value)||35)))}/></label>
  </div>
  {result&&result.projectionStatus==='calculated'&&<div className="result-box" data-testid="calculator-pro-capacity"><div className="result-row"><span>Coste total adquisición <b>{eur(result.acquisitionTotal)}</b></span><span>Fondos propios necesarios <b>{eur(result.requiredOwnFunds)}</b></span></div><div className="result-row"><span>Falta de ahorro <b>{eur(result.savingsGap)}</b></span><span>Cuota máxima al {result.targetEffortPct}% <b>{eur(result.maxMonthlyMortgageAtTarget)}</b></span></div><div className="result-row"><span>Principal máximo objetivo <b>{eur(result.maxPrincipalAtTarget)}</b></span><span>Financiación <b>{result.financingPct===null?'—':`${result.financingPct}%`}</b></span></div></div>}
  {result&&result.projectionStatus==='assumptions_required'&&<div className="warning" data-testid="calculator-pro-assumptions">Para una hipoteca {mortgageType==='mixed'?'mixta':'variable'} hacen falta hipótesis explícitas de tramo/tipo futuro. La calculadora no inventa una proyección.</div>}
  <div data-testid="calculator-pro-comparator"><strong style={{fontSize:12}}>Comparador de escenarios</strong>{mortgageType==='fixed'?<div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:7,marginTop:7}}>{scenarios.map(s=><article key={s.label} style={{border:'1px solid var(--border,#ddd)',borderRadius:10,padding:9,minWidth:0}}><small style={{display:'block'}}>{s.label}</small><b style={{display:'block',margin:'4px 0'}}>{s.rate.toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})}%</b><span style={{fontSize:11}}>Cuota {eur(s.res.monthlyPayment)}</span><span style={{display:'block',fontSize:11}}>Intereses {eur(s.res.estimatedInterest)}</span><span style={{display:'block',fontSize:11}}>Fondos propios {eur(s.res.requiredOwnFunds)}</span></article>)}</div>:<div style={{fontSize:11,color:'var(--muted,#667085)',marginTop:7}}>El comparador automático se desactiva para modalidades mixta/variable hasta definir hipótesis explícitas.</div>}</div>
  <small style={{color:'var(--muted,#667085)'}}>Tipo fijo calculado con TIN constante. Modalidades variable y mixta requieren supuestos explícitos antes de proyectar cuotas futuras.</small>
 </section>,host);
}
