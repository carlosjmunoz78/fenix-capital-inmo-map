create or replace function public.fenix_prod_actor_binding_guard(p_actor_code text)
returns jsonb
language plpgsql
stable security definer
set search_path to 'fenix_prod','public','auth','pg_temp'
as $function$
declare c jsonb; r text; z text;
begin
  if auth.uid() is null then
    if coalesce(auth.role(),'')='service_role' then
      select role, zone_code into r,z from fenix_prod.actors where actor_code=p_actor_code and active=true limit 1;
      if r is null then return jsonb_build_object('ok',false,'status',403,'error','forbidden'); end if;
      return jsonb_build_object('ok',true,'status',200,'actor_code',p_actor_code,'role',r,'zone_code',z,'binding','service_role_resolved_actor');
    end if;
    return jsonb_build_object('ok',false,'status',401,'error','unauthorized');
  end if;
  c:=public.fenix_prod_actor_context_by_auth_server(auth.uid());
  if not coalesce((c->>'ok')::boolean,false) then return jsonb_build_object('ok',false,'status',403,'error','identity_not_linked'); end if;
  if c->>'actor_code' is distinct from p_actor_code then return jsonb_build_object('ok',false,'status',403,'error','actor_mismatch'); end if;
  return jsonb_build_object('ok',true,'status',200,'actor_code',c->>'actor_code','role',c->>'role','zone_code',c->>'zone_code','binding','user');
end
$function$;

create or replace function public.fenix_prod_ana_knowledge_answer_user(p_question text)
returns jsonb
language plpgsql
stable security definer
set search_path to 'public','fenix_prod','auth','pg_temp'
as $function$
declare
 me text;
 q text:=btrim(coalesce(p_question,''));
 qn text;
 hit record;
 correction_hit record;
begin
 if auth.uid() is null then return jsonb_build_object('ok',false,'status',401,'error','unauthorized'); end if;
 select actor_code into me from fenix_prod.actors where auth_user_id=auth.uid() and active limit 1;
 if me is null then return jsonb_build_object('ok',false,'status',403,'error','identity_not_linked'); end if;
 if length(q)<3 then return jsonb_build_object('ok',true,'status',200,'found',false); end if;
 qn:=lower(translate(q,'áéíóúüñÁÉÍÓÚÜÑ','aeiouunAEIOUUN'));

 with qt as (
   select distinct token from unnest(regexp_split_to_array(regexp_replace(qn,'[^a-z0-9%]+',' ','g'),'\s+')) token
   where length(token)>=3 and token not in ('necesito','quiero','saber','dime','puedes','para','como','cual','cuales','sobre','esta','este','estos','estas')
 ), ranked as (
   select k.knowledge_code,k.title,k.answer,k.domain,
          count(*) filter (where lower(translate(coalesce(k.title,'')||' '||coalesce(k.answer,'')||' '||array_to_string(k.tags,' '),'áéíóúüñÁÉÍÓÚÜÑ','aeiouunAEIOUUN')) like '%'||qt.token||'%')::int as score,
          k.updated_at
   from fenix_prod.ana_knowledge_cards k cross join qt
   where k.status='approved'
   group by k.knowledge_code,k.title,k.answer,k.domain,k.updated_at
 )
 select * into hit from ranked where score>=2 order by score desc,updated_at desc limit 1;

 if hit.knowledge_code is not null then
   return jsonb_build_object('ok',true,'status',200,'found',true,'answer',hit.answer,'source','CEREBRO_CANONICAL','knowledge_code',hit.knowledge_code,'domain',hit.domain,'score',hit.score);
 end if;

 select c.correction_code,c.approved_rule into correction_hit
 from fenix_prod.ana_correcciones c
 where c.status='approved' and nullif(btrim(coalesce(c.approved_rule,'')),'') is not null
   and exists (
     select 1 from unnest(regexp_split_to_array(regexp_replace(qn,'[^a-z0-9%]+',' ','g'),'\s+')) token
     where length(token)>=4 and lower(translate(c.approved_rule,'áéíóúüñÁÉÍÓÚÜÑ','aeiouunAEIOUUN')) like '%'||token||'%'
   )
 order by c.reviewed_at desc nulls last,c.created_at desc limit 1;
 if correction_hit.correction_code is not null then
   return jsonb_build_object('ok',true,'status',200,'found',true,'answer',correction_hit.approved_rule,'source','CEREBRO_APPROVED_CORRECTION','knowledge_code',correction_hit.correction_code);
 end if;
 return jsonb_build_object('ok',true,'status',200,'found',false);
end
$function$;
