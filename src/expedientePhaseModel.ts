/**
 * Expedientes · único modelo visual de fases principales.
 * Los valores históricos Análisis y Oferta siguen siendo legibles pero ya no son
 * etapas independientes. NO cambia la clasificación de actividad ni el backend.
 */
export const expedienteMainPhases=['Entrada','Documentación','Banco','Tasación','FEIN','Notaría','Firma','Cierre'] as const;
export type ExpedienteMainPhase=typeof expedienteMainPhases[number];
export const expedientePhaseSubsteps:Partial<Record<ExpedienteMainPhase,string>>={
 'Documentación':'Análisis',
 'FEIN':'Oferta'
};
export const expedienteStageOptions=[...expedienteMainPhases,'Revisión legado'] as const;
export function mainExpedientePhase(raw:string):ExpedienteMainPhase{
 const s=raw.trim().toLocaleLowerCase('es');
 if(/^(análisis|analisis|estudio)$/.test(s)||s.includes('document'))return 'Documentación';
 if(/^(oferta|aprobación|aprobacion)$/.test(s)||s.includes('fein'))return 'FEIN';
 if(/^(tasación|tasacion|tasación realizada|pre-ok \+ tasación realizada)$/.test(s))return 'Tasación';
 if(s.includes('notar'))return 'Notaría';
 if(s.includes('firma'))return 'Firma';
 if(/^(cierre|cerrado|finalizado|baja|perdido|pausado)$/.test(s))return 'Cierre';
 if(s.includes('banco'))return 'Banco';
 return 'Entrada';
}
export function expedientePhaseIndex(raw:string):number{return expedienteMainPhases.indexOf(mainExpedientePhase(raw));}
export function currentExpedienteSubstep(row:Record<string,any>|null):string{
 if(!row)return '';
 const rawStage=String(row.stage||row.fase||row.estado||'').trim();
 const parent=mainExpedientePhase(rawStage);
 const persisted=row.payload_operacion?.cerebro_fases_v2?.subpaso;
 if(persisted==='Análisis'&&parent==='Documentación')return persisted;
 if(persisted==='Oferta'&&parent==='FEIN')return persisted;
 const raw=rawStage.toLocaleLowerCase('es');
 if((raw==='análisis'||raw==='analisis')&&parent==='Documentación')return 'Análisis';
 if(raw==='oferta'&&parent==='FEIN')return 'Oferta';
 return '';
}
