begin;

alter table fenix_prod.ana_knowledge_cards
  add column if not exists tags text[] not null default '{}',
  add column if not exists domain text not null default 'general';

create index if not exists ana_knowledge_cards_search_idx
  on fenix_prod.ana_knowledge_cards
  using gin (to_tsvector('spanish', coalesce(title,'') || ' ' || coalesce(answer,'') || ' ' || array_to_string(tags,' ')));

insert into fenix_prod.ana_knowledge_cards(knowledge_code,title,answer,status,tags,domain)
values
('HIP-DOC-BASE','Documentación base para estudio hipotecario',
'Documentación base Fénix: DNI/NIE; contrato o acreditación laboral; 3 últimas nóminas; vida laboral; movimientos bancarios de los últimos 6 meses; IRPF o certificado de retenciones; detalle de préstamos y otras deudas; precio y dirección del inmueble; honorarios de agencia si existen; contrato de arras si existe; y nota simple o referencia catastral.',
'approved',array['documentación','documentos','hipoteca','nóminas','vida laboral','irpf','arras','nota simple'],'hipotecas'),
('HIP-100-CRITERIOS','Criterios operativos para financiación al 100%',
'Para estudiar financiación al 100% se revisa el encaje con los criterios vigentes de Fénix: primera vivienda, ausencia de deudas con Seguridad Social o Hacienda y el perfil habilitado. Entre los perfiles contemplados están menores de 35 años, mayores de 35 con menor a cargo y funcionarios, sujetos siempre a viabilidad y revisión del expediente.',
'approved',array['100%','cien por cien','primera vivienda','funcionario','menor de 35','hijos','seguridad social','hacienda'],'hipotecas'),
('HIP-RATIO','Ratio de endeudamiento',
'El objetivo operativo de endeudamiento es aproximadamente el 35%. Puede estudiarse flexibilidad hasta alrededor del 37% cuando el expediente lo justifica y existe capacidad suficiente.',
'approved',array['ratio','endeudamiento','35%','37%','cuota','ingresos'],'viabilidad'),
('HIP-AUTONOMOS','Criterios básicos para autónomos',
'Para autónomos, Fénix revisa especialmente antigüedad suficiente en la actividad, renta positiva, declaraciones trimestrales de IVA e IRPF, renta anual, movimientos bancarios y vida laboral. Como referencia operativa se exige normalmente una trayectoria de al menos 3 años, siempre sujeta al análisis completo del expediente.',
'approved',array['autónomo','autonomos','iva','irpf','3 años','renta','vida laboral'],'viabilidad'),
('HIP-FLUJO','Flujo operativo hipotecario',
'Flujo estándar Fénix: viabilidad; documentación y contrato; envío a banco; CIRBE; recepción de condiciones; tasación; validación técnica; FEIN; acta previa; y firma. Los tiempos concretos dependen de banco, documentación y validaciones.',
'approved',array['flujo','proceso','CIRBE','tasación','FEIN','acta','firma','banco'],'operativa'),
('HIP-NO-VIABLES','Causas frecuentes de no viabilidad',
'Entre las causas frecuentes de no viabilidad están dos contratos temporales sin refuerzo suficiente, una combinación laboral demasiado reciente o inestable, ratio insuficiente, autónomo con antigüedad insuficiente o inmueble rústico sin vivienda correctamente inscrita. Las excepciones requieren justificación y revisión específica.',
'approved',array['no viable','denegado','temporal','ratio','autónomo','rústica','excepción'],'viabilidad')
on conflict(knowledge_code) do update set
 title=excluded.title,answer=excluded.answer,status='approved',tags=excluded.tags,domain=excluded.domain,updated_at=now();

create or replace function public.fenix_prod_ana_knowledge_answer_user(p_question text)
returns jsonb language plpgsql stable security definer set search_path='public','fenix_prod','auth','pg_temp' as $$
declare
 me text;
 q text:=btrim(coalesce(p_question,''));
 qts tsquery;
 hit record;
 correction_hit record;
begin
 if auth.uid() is null then return jsonb_build_object('ok',false,'status',401,'error','unauthorized'); end if;
 select actor_code into me from fenix_prod.actors where auth_user_id=auth.uid() and active limit 1;
 if me is null then return jsonb_build_object('ok',false,'status',403,'error','identity_not_linked'); end if;
 if length(q)<3 then return jsonb_build_object('ok',true,'status',200,'found',false); end if;

 qts:=websearch_to_tsquery('spanish',q);

 select k.knowledge_code,k.title,k.answer,k.domain,
        ts_rank_cd(to_tsvector('spanish',coalesce(k.title,'')||' '||coalesce(k.answer,'')||' '||array_to_string(k.tags,' ')),qts) as rank
 into hit
 from fenix_prod.ana_knowledge_cards k
 where k.status='approved'
   and to_tsvector('spanish',coalesce(k.title,'')||' '||coalesce(k.answer,'')||' '||array_to_string(k.tags,' ')) @@ qts
 order by rank desc,k.updated_at desc
 limit 1;

 if hit.knowledge_code is not null and hit.rank>0 then
   return jsonb_build_object('ok',true,'status',200,'found',true,'answer',hit.answer,'source','CEREBRO_CANONICAL','knowledge_code',hit.knowledge_code,'domain',hit.domain,'rank',hit.rank);
 end if;

 select c.correction_code,c.approved_rule
 into correction_hit
 from fenix_prod.ana_correcciones c
 where c.status='approved'
   and nullif(btrim(coalesce(c.approved_rule,'')),'') is not null
   and to_tsvector('spanish',coalesce(c.scope_type,'')||' '||coalesce(c.scope_code,'')||' '||coalesce(c.approved_rule,'')) @@ qts
 order by c.reviewed_at desc nulls last,c.created_at desc
 limit 1;

 if correction_hit.correction_code is not null then
   return jsonb_build_object('ok',true,'status',200,'found',true,'answer',correction_hit.approved_rule,'source','CEREBRO_APPROVED_CORRECTION','knowledge_code',correction_hit.correction_code);
 end if;

 return jsonb_build_object('ok',true,'status',200,'found',false);
end $$;

revoke all on function public.fenix_prod_ana_knowledge_answer_user(text) from public,anon;
grant execute on function public.fenix_prod_ana_knowledge_answer_user(text) to authenticated,service_role;

commit;
