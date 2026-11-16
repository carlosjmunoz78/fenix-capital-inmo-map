/** Exact motor lookup for OPERATIVA LAB. Presentation only; never executes a command. */
import type {OwnerUniverseResult} from './cerebroOperativaLabUniverseApi';
import type {UniversalLabProof} from './cerebroUniversalOperativaLabApi';
import masterRegistry from '../cerebro/registry/engine-registry-detailed-20261113.json' with {type:'json'};
type Definition={engine_id:string;name:string;purpose?:string};
type Input={engineId:string;universe:OwnerUniverseResult;proof:UniversalLabProof;definition?:Definition|null};
// The master contains multi-part, digit-leading and nonnumeric LAB IDs; their exact
// spelling is authoritative. Unknown conventional IDs may still be queried, never executed.
const registeredIds=new Set(masterRegistry.engines.map(row=>row.engine_id));
const VALID=/^[A-Z][A-Z0-9]{1,23}(?:-[A-Z][A-Z0-9]{1,23}){0,3}-[0-9]{3}$/;
const LAB_CONTROL_ID='LAB-DEMO-001';
export function extractExactEngineId(question:string):string|null{
 if(typeof question!=='string'||question.length>4000)return null;
 const tokens=question.toUpperCase().match(/[A-Z0-9]+(?:-[A-Z0-9]+)*/g)||[];
 // Don't turn LAB-DEMO-001 commands into read-only master engine queries.
 return tokens.find(token=>token!==LAB_CONTROL_ID&&(registeredIds.has(token)||VALID.test(token)))??null;
}
export function describeEngineLookup({engineId,universe,proof,definition}:Input):string{
 const id=engineId.toUpperCase();
 if(id===LAB_CONTROL_ID||(!registeredIds.has(id)&&!VALID.test(id)))
  return 'Identificador de motor inválido o reservado al control LAB. Ningún cambio ejecutado.';
 if(universe.kind==='denied'||proof.kind==='denied')
  return 'DENEGADO: autorización insuficiente para '+id+'. Ningún dato privado ni acción ejecutada.';
 const scope=(universe.kind==='ready'||universe.kind==='partial')&&universe.data?.owner_scope==='SERVER_VERIFIED_FENIX_ONLY';
 const registry=scope&&universe.data?.registry.status==='OK'?universe.data.registry:null;
 const factory=scope&&universe.data?.factory.status==='OK'?universe.data.factory:null;
 const row=registry?.engines.find(x=>x.company_id==='fenix'&&x.engine_id===id);
 const seed=factory?.catalog.find(x=>x.engine_id===id);
 const scaffold=factory?.scaffolded.find(x=>x.engine_id===id);
 const historic=definition?.engine_id===id?definition:null;
 const job=proof.kind==='ready'&&proof.job001?.state==='OK'&&
  proof.job001.source_environment==='PREPROD'&&proof.job001.executionVerified===false?proof.job001:null;
 const state=job?.engineBindings.find(x=>x.engine_id===id);
 const control=job?.controlEngineBindings.find(x=>x.engine_id===id);
 const parts=['Motor '+id+' · empresa Fénix · solo lectura.'];
 if(historic)parts.push('REGISTRO HISTÓRICO: DEFINIDO, '+historic.name+
  (historic.purpose?' — '+historic.purpose:'')+'. No acredita despliegue ni ejecución.');
 if(row)parts.push('Gateway: registro observado de estado DECLARADO '+(row.engine_state||'SIN ESTADO')+
  ', entorno '+(row.environment||'NO INFORMADO')+', versión '+(row.version||'NO INFORMADA')+
  '. No es un proceso activo demostrado.');
 if(seed||scaffold)parts.push('FACT-001: '+(seed?'definición':'')+
  (seed&&scaffold?' y ':'')+(scaffold?'scaffold':'')+'. Runtime NO_VERIFICADO.');
 if(factory)parts.push('Origen FACT '+(factory.source_status||'NO INFORMADO')+
  '; observado '+(factory.observed_at||'HORA NO INFORMADA')+'.');
 if(state)parts.push('JOB-001 PREPROD: configuración DECLARADA '+state.declared_state+
  ', frescura '+state.freshness+', fecha '+state.observed_config_at+'. Sin heartbeat.');
 if(control)parts.push('JOB-001: '+control.configured_controls+' controles configurados, '+
  control.enabled_controls+' habilitados, '+control.stale_controls+' antiguos. No son trabajos.');
 if(job)parts.push('Fuente PREPROD_JOB001_CONTROL_METADATA, lectura '+(job.observedAt||'HORA NO INFORMADA')+
  '. Ejecución real NO_VERIFICADA.');
 if(!historic&&!row&&!seed&&!scaffold&&!state&&!control)
  parts.push('Sin coincidencia en estas fuentes; no demuestra inexistencia en otros sistemas.');
 if(!registry&&!factory)parts.push('Gateway/FACT: NO_CONECTADO o NO_VERIFICADO; el histórico no es LIVE.');
 parts.push('Estado operativo/latido: NO_VERIFICADO. TTL por recurso: NO INFORMADO. '+
  'Agentes/subagentes activos: DESCONOCIDOS. Control: NO_CONECTADO. '+
  'FinOps global: NO_MEDIDO. Ninguna orden ejecutada.');
 return parts.join(' ');
}
