import snapshot from '../cerebro/universal/v0/device-runtime-snapshot-fenix-2026-11-15.json';

type DeviceRow=(typeof snapshot.environments)[number];
const formatDate=(s:string)=>Number.isFinite(Date.parse(s))?
 new Date(s).toLocaleString('es-ES',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Madrid'}):
 'SIN_FECHA';
const countsValid=(r:DeviceRow)=>[r.declared_online,r.not_revoked,r.heartbeat_5m,r.heartbeat_24h,
 r.commands_total,r.completed,r.failed,r.receipt_count,r.semantic_verified_count,
 r.comparable_successful_duration_samples].every(x=>Number.isSafeInteger(x)&&x>=0)&&
 r.heartbeat_24h<=r.not_revoked&&r.heartbeat_5m<=r.heartbeat_24h&&
 r.completed+r.failed<=r.commands_total&&r.semantic_verified_count<=r.receipt_count&&
 r.comparable_successful_duration_samples<=r.completed&&
 Number.isFinite(r.p50_completed_seconds)&&Number.isFinite(r.p90_completed_seconds)&&
 r.p50_completed_seconds>=0&&r.p90_completed_seconds>=r.p50_completed_seconds;
export default function CerebroDeviceRuntimeSnapshotPanel(){
 const valid=snapshot.schema==='CEREBRO_DEVICE_RUNTIME_SNAPSHOT_V1'&&
  snapshot.kind==='DATED_READ_ONLY_EVIDENCE'&&snapshot.company_id==='fenix'&&
  snapshot.source_project_role==='SUPABASE_LAB_NOT_PROD'&&
  Number.isFinite(Date.parse(snapshot.observed_at))&&
  snapshot.active_agents_verified===null&&snapshot.active_subagents_verified===null&&
  snapshot.jobs_running_verified===null&&snapshot.cost_eur_measured===null&&
  snapshot.contains_device_ids===false&&snapshot.contains_command_payloads===false&&
  snapshot.contains_personal_data===false&&snapshot.environments.length===2&&
  snapshot.environments.every(countsValid);
 const total=valid?snapshot.environments.reduce((a,r)=>a+r.not_revoked,0):null;
 const recent=valid?snapshot.environments.reduce((a,r)=>a+r.heartbeat_24h,0):null;
 return <section className="op4-device-snapshot" aria-label="Auditoría histórica de agentes de dispositivo LAB">
  <h4>Agentes de dispositivo y órdenes · auditoría histórica LAB</h4>
  <p><strong>ARCHIVO FECHADO, NO EN VIVO.</strong> Lectura agregada de Supabase LAB el {formatDate(snapshot.observed_at)}.
   No muestra identidades, instrucciones, contenido de resultados ni datos de clientes.</p>
  {!valid?<p role="status">EVIDENCIA NO VERIFICADA: contrato del archivo inválido. No se muestran cantidades.</p>:<>
   <p role="status">Registros de dispositivo no revocados: <strong>{total}</strong>. Con latido durante las 24 horas anteriores a la auditoría: <strong>{recent}</strong>.
    El estado almacenado «ONLINE» no prueba actividad actual. Censo de agentes y subagentes activos: <strong>DESCONOCIDO</strong>.</p>
   <div className="op4-device-grid">
    {snapshot.environments.map(item=><article className="op4-device-item" key={item.environment}>
     <strong>{item.environment==='LAB'?'LAB · dispositivos históricos':'PREPROD · etiqueta histórica en BD LAB'}</strong>
     <span>{item.not_revoked} registros no revocados · {item.heartbeat_24h} latidos recientes (24 h)</span>
     <span>Último contacto registrado: {formatDate(item.last_seen_at)}</span>
     <span>Órdenes anteriores: {item.commands_total} · completadas {item.completed} · fallidas {item.failed}</span>
     <span>Resultados registrados: {item.receipt_count} · verificación semántica {item.semantic_verified_count}</span>
     <span>Duración histórica, solo éxitos comparables ({item.comparable_successful_duration_samples}): p50 {item.p50_completed_seconds} s · p90 {item.p90_completed_seconds} s</span>
     <small>Los percentiles no son ETA ni duración garantizada; las órdenes son históricas, no tareas pendientes acreditadas.</small>
    </article>)}
   </div>
  </>}
  <p className="op4-fleet-note">PREPROD es una etiqueta de registros anteriores del proyecto Supabase LAB, no un despliegue activo de App PREPROD.
   No se han creado agentes, ejecutado comandos ni reactivado cron. Para pasar de archivo a estado real harán falta lecturas periódicas autenticadas, identidad verificada y latidos frescos.</p>
 </section>;
