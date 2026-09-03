const DOCUMENT_PREFIXES:Array<[RegExp,string]>=[
 [/^dni\b/i,'DNI'],[/^nie\b/i,'NIE'],[/^nomina\b/i,'Nómina'],[/^prestamo\b/i,'Préstamo / deuda'],[/^deuda\b/i,'Préstamo / deuda'],[/^vida\s*laboral\b/i,'Vida laboral'],[/^irpf\b/i,'IRPF'],[/^cirbe\b/i,'CIRBE'],[/^movimientos?\b/i,'Movimientos bancarios'],[/^extracto\b/i,'Movimientos bancarios'],[/^nota\s*simple\b/i,'Nota simple'],[/^tarjeta\s*(?:de\s*)?visita\b/i,'Tarjeta de visita'],[/^contrato\b/i,'Contrato'],[/^arras\b/i,'Arras']
];
function cleanBase(name:string){return name.replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim();}
export function classifyFilename(name:string){const base=cleanBase(name);for(const[rx,type]of DOCUMENT_PREFIXES){const m=base.match(rx);if(m){const person=base.slice(m[0].length).replace(/^\s*[-–—:]?\s*/,'').trim();return{type,person,complete:Boolean(person)}}}return{type:'',person:'',complete:false};}
