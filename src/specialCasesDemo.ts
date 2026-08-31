export type DemoRow=Record<string,unknown>;

const herenciaUno:DemoRow={
 id:'demo-herencia-documentacion',nombre:'DEMO · Herencia Familia Romero',activo:true,estado:'En curso',fase:'Documentación',
 cliente:['María Romero López'],responsable:['Belén · Dirección'],notaria:['Notaría DEMO Córdoba Centro'],registro:['Registro de la Propiedad DEMO nº 3'],
 siguiente_accion:'Recibir certificado de últimas voluntades y validar testamento',faltantes:'Certificado de últimas voluntades',bloqueo:'Falta un documento obligatorio para cerrar la fase documental',
 requiere_validacion:true,ultima_actividad:'2026-08-29',firma_prevista:'2026-09-24',firma_realizada:false,
 notas:'CASO DEMO PRE-PROD. Tres herederos. Existe testamento. Vivienda en Córdoba y saldo bancario pendiente de inventario.',
 causante:'Antonio Romero García',fecha_fallecimiento:'2026-07-18',tipo_sucesion:'Testamentaria',numero_herederos:3,
 inventario:'Vivienda, cuenta bancaria y vehículo',valor_estimado:'285.000 €',impuesto_sucesiones:'Pendiente de liquidación',plusvalia:'Pendiente de cálculo',
 interlocutor_actual:'Familia / gestoría',documentacion_recibida:'Certificado defunción, libro de familia, copia simple del testamento',
 documentacion_faltante:'Certificado de últimas voluntades',riesgo:'Medio',prioridad:'Alta'
};

const herenciaDos:DemoRow={
 id:'demo-herencia-notaria',nombre:'DEMO · Herencia Hermanos Molina',activo:true,estado:'En curso',fase:'Preparación de firma',
 cliente:['Laura Molina Ruiz','Javier Molina Ruiz'],responsable:['Belén · Dirección'],notaria:['Notaría DEMO Avenida América'],registro:['Registro de la Propiedad DEMO nº 1'],
 siguiente_accion:'Confirmar borrador de escritura y coordinar firma con los dos herederos',faltantes:'',bloqueo:'',requiere_validacion:false,
 ultima_actividad:'2026-08-29',firma_prevista:'2026-09-05',firma_realizada:false,
 notas:'CASO DEMO PRE-PROD. Declaración de herederos y liquidación fiscal completadas. Pendiente únicamente coordinación de firma.',
 causante:'Francisco Molina Pérez',fecha_fallecimiento:'2026-05-03',tipo_sucesion:'Intestada',numero_herederos:2,
 inventario:'Vivienda habitual y plaza de garaje',valor_estimado:'198.000 €',impuesto_sucesiones:'Liquidado',plusvalia:'Presentada',
 interlocutor_actual:'Notaría',documentacion_recibida:'Expediente documental completo',documentacion_faltante:'',riesgo:'Bajo',prioridad:'Firma próxima'
};

const obraUno:DemoRow={
 id:'demo-obra-control',nombre:'DEMO · Residencial Azahar · 18 viviendas',activo:true,estado:'En curso',fase:'Control administrativo',
 cliente_promotor:['Promociones Azahar DEMO S.L.'],responsable:['Belén · Dirección'],notaria:['Notaría DEMO Córdoba Centro'],registro:['Registro de la Propiedad DEMO nº 5'],
 interlocutor_actual:'Arquitecto técnico / Ayuntamiento',siguiente_accion:'Validar licencia, división horizontal y documentación técnica antes del envío',
 documentacion_faltante:'Certificado final de coordinación de seguridad',bloqueo_incidencia:'Pendiente un certificado técnico',requiere_validacion:true,estado_envio:'No enviado',
 ultima_actividad:'2026-08-29',firma_prevista:'2026-10-21',firma_realizada:false,
 notas:'CASO DEMO PRE-PROD. Promoción de 18 viviendas. Se simula una fase temprana-media con control documental y validación técnica.',
 promotor:'Promociones Azahar DEMO S.L.',direccion_promocion:'Av. DEMO del Brillante 120, Córdoba',numero_viviendas:18,
 licencia_obra:'Recibida',declaracion_obra_nueva:'Borrador',division_horizontal:'En revisión',seguro_decennal:'Pendiente',libro_edificio:'En preparación',
 tecnico:'Arquitecto DEMO',riesgo:'Medio',prioridad:'Alta'
};

const obraDos:DemoRow={
 id:'demo-obra-firma',nombre:'DEMO · Edificio Victoria · 9 viviendas',activo:true,estado:'En curso',fase:'Preparación de firma',
 cliente_promotor:['Grupo Victoria DEMO S.L.'],responsable:['Belén · Dirección'],notaria:['Notaría DEMO Gran Capitán'],registro:['Registro de la Propiedad DEMO nº 4'],
 interlocutor_actual:'Notaría / Registro',siguiente_accion:'Cerrar minuta, confirmar comparecientes y reservar hueco de firma',documentacion_faltante:'',bloqueo_incidencia:'',requiere_validacion:false,estado_envio:'Validado y enviado',
 ultima_actividad:'2026-08-29',firma_prevista:'2026-09-11',firma_realizada:false,
 notas:'CASO DEMO PRE-PROD. Documentación administrativa validada. Caso situado en tramo final para visualizar la línea temporal avanzada.',
 promotor:'Grupo Victoria DEMO S.L.',direccion_promocion:'C/ DEMO Victoria 15, Córdoba',numero_viviendas:9,
 licencia_obra:'Validada',declaracion_obra_nueva:'Preparada',division_horizontal:'Validada',seguro_decennal:'Aportado',libro_edificio:'Completo',
 tecnico:'Arquitectura Victoria DEMO',riesgo:'Bajo',prioridad:'Firma próxima'
};

export const demoHerencias=[herenciaUno,herenciaDos];
export const demoObrasNuevas=[obraUno,obraDos];

const people:Record<string,DemoRow[]>={
 'demo-herencia-documentacion':[
  {id:'demo-h1-p1',persona:'María Romero López',rol:'Heredera',empresa_organismo:'',telefono:'600 100 101',email:'maria.romero@demo.fenix'},
  {id:'demo-h1-p2',persona:'Pablo Romero López',rol:'Heredero',empresa_organismo:'',telefono:'600 100 102',email:'pablo.romero@demo.fenix'},
  {id:'demo-h1-p3',persona:'Lucía Romero López',rol:'Heredera',empresa_organismo:'',telefono:'600 100 103',email:'lucia.romero@demo.fenix'}
 ],
 'demo-herencia-notaria':[
  {id:'demo-h2-p1',persona:'Laura Molina Ruiz',rol:'Heredera',empresa_organismo:'',telefono:'600 200 201',email:'laura.molina@demo.fenix'},
  {id:'demo-h2-p2',persona:'Javier Molina Ruiz',rol:'Heredero',empresa_organismo:'',telefono:'600 200 202',email:'javier.molina@demo.fenix'}
 ],
 'demo-obra-control':[
  {id:'demo-o1-p1',persona:'Elena Torres DEMO',rol:'Promotora',empresa_organismo:'Promociones Azahar DEMO S.L.',telefono:'600 300 301',email:'elena@azahar.demo'},
  {id:'demo-o1-p2',persona:'Álvaro Martín DEMO',rol:'Arquitecto técnico',empresa_organismo:'Estudio Técnico DEMO',telefono:'600 300 302',email:'alvaro@tecnico.demo'}
 ],
 'demo-obra-firma':[
  {id:'demo-o2-p1',persona:'Sergio Vela DEMO',rol:'Promotor',empresa_organismo:'Grupo Victoria DEMO S.L.',telefono:'600 400 401',email:'sergio@victoria.demo'},
  {id:'demo-o2-p2',persona:'Marta Notario DEMO',rol:'Interlocutora notaría',empresa_organismo:'Notaría DEMO Gran Capitán',telefono:'600 400 402',email:'marta@notaria.demo'}
 ]
};

export function demoRows(kind:string){return kind==='/herencias'||kind==='herencias'?demoHerencias:kind==='/obras-nuevas'||kind==='obras-nuevas'?demoObrasNuevas:[]}
export function demoDetail(kind:string,id:string){const row=demoRows(kind).find(x=>String(x.id)===id)??null;return row?{item:row,intervinientes:people[id]??[],demo:true}:null}
export function isDemoSpecialCase(id:string){return id.startsWith('demo-herencia-')||id.startsWith('demo-obra-')}
