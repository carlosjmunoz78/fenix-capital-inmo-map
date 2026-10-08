const EXPLICIT_ALIASES = Object.freeze({
  'skill-creator': 'Creador de Skills',
  'github': 'Gestor de GitHub',
  'agent-browser': 'Navegador Automático',
  'supabase-postgres-best-practices': 'Buenas Prácticas Supabase',
  'obsidian': 'Memoria Obsidian',
  'kairos-lite': 'Asistente de Ingeniería Kairos',
  'reddit-content-ops': 'Operador de Contenido Reddit'
});

function clean(value){
  return typeof value === 'string' ? value.trim() : '';
}

function titleCase(value){
  return value
    .replace(/^skillwrap:/i,'')
    .replace(/^[a-z0-9-]+-skills:/i,'')
    .replace(/[_:/-]+/g,' ')
    .replace(/\s+/g,' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((part)=>part.length <= 3 && part.toUpperCase() === part ? part : `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

export function resolveHumanAlias(skill={}){
  const explicit=clean(skill.human_alias);
  if(explicit) return explicit;

  const names=[skill.declared_name,skill.name,skill.technical_name]
    .map(clean)
    .filter(Boolean);
  for(const name of names){
    const known=EXPLICIT_ALIASES[name.toLowerCase()];
    if(known) return known;
  }

  const raw=names[0] || clean(skill.engine_id) || clean(skill.candidate_id) || clean(skill.wrapper_id) || 'Skill';
  const human=titleCase(raw);
  if(!human || human.length <= 2) return `Skill ${human || 'sin nombre'}`;
  return human;
}

export function withHumanAlias(skill={}){
  return Object.freeze({...skill,human_alias:resolveHumanAlias(skill)});
}

export function buildHumanRequiredEmailEnvelope({item={},plain_language,exact_action,technical_detail=null,event_version=null}={}){
  const human_alias=resolveHumanAlias(item);
  const technical_id=clean(item.candidate_id) || clean(item.engine_id) || clean(item.wrapper_id) || clean(item.name) || 'unknown';
  const stage=clean(item.stage) || 'HUMAN_GATE';
  const human_required=clean(item.human_required) || 'HUMAN_REQUIRED';
  const version=clean(event_version) || clean(item.updated_at) || String(item.run_id ?? 'unknown');
  const dedupe_marker=`[CEREBRO-HUMAN:${technical_id}:${stage}:${version}]`;
  return Object.freeze({
    subject:`CEREBRO · TE NECESITO · ${human_alias} · ${human_required}`,
    first_line:'Te necesito.',
    human_alias,
    technical_id,
    human_required,
    stage,
    plain_language:clean(plain_language),
    exact_action:clean(exact_action),
    technical_detail:technical_detail ?? null,
    dedupe_marker,
    gated_action_authorized:false
  });
}
