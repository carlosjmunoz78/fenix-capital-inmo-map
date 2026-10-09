import test from 'node:test';
import assert from 'node:assert/strict';
import {buildHumanSkillCard,buildRepoDailySummary} from '../communication/repo-daily-summary.mjs';

const holdSkill={
  candidate_id:'github-wide-skills:secret-tech-id',wrapper_id:'skillwrap:internal-wrapper-id',name:'kairos-lite',human_alias:'Asistente de Ingeniería Kairos',domain:'software-engineering-devops',engine_bindings:['FACT-001','QA-001','DEP-001'],stage:'SAFE_HANDLER_TERMINAL_HOLD',status:'TERMINAL_HOLD',run_id:123456,additional_cost_eur:0
};
const humanSkill={
  candidate_id:'candidate-human-gate',name:'agent-browser',human_alias:'Navegador Automático',domain:'browser-automation-scraping',human_required:'HIGH_RISK',stage:'PREPROD_PROMOTION_REVIEW',additional_cost_eur:0
};
const completedSkill={
  candidate_id:'candidate-completed',name:'github',human_alias:'GitHub seguro',domain:'software-engineering-devops',stage:'SAFE_COMPLETE',status:'COMPLETED',additional_cost_eur:0,updated_at:'2026-10-10T08:00:00Z'
};

test('skill card is an executive business explanation, not a technical dump',()=>{
  const card=buildHumanSkillCard(holdSkill,'HOLD');
  assert.match(card,/Asistente de Ingeniería Kairos/);
  assert.match(card,/Qué es realmente:/);
  assert.match(card,/Por qué la queremos:/);
  assert.match(card,/Ejemplo real:/);
  assert.match(card,/Estado: ⏸️ APARCADA/);
  assert.match(card,/Qué ha cambiado desde el último informe:/);
  assert.match(card,/Qué se ha conseguido:/);
  assert.match(card,/Qué falta:/);
  assert.match(card,/Qué podrá hacer CEREBRO:/);
  assert.match(card,/Dónde puede mejorar CEREBRO:/);
  assert.match(card,/Impacto medido:/);
  assert.match(card,/Decisión de CEREBRO: APARCAR/);
  assert.match(card,/Siguiente paso:/);
  assert.match(card,/¿Necesitas hacer algo\?: NO\./);
});

test('main skill card hides candidate ids wrappers run ids and internal stages',()=>{
  const card=buildHumanSkillCard(holdSkill,'HOLD');
  assert.doesNotMatch(card,/github-wide-skills:secret-tech-id/);
  assert.doesNotMatch(card,/skillwrap:internal-wrapper-id/);
  assert.doesNotMatch(card,/123456/);
  assert.doesNotMatch(card,/SAFE_HANDLER_TERMINAL_HOLD/);
});

test('human-required skill says clearly that Carlos must act using plain language',()=>{
  const card=buildHumanSkillCard(humanSkill,'WAITING_HUMAN');
  assert.match(card,/Navegador Automático/);
  assert.match(card,/Estado: 🔴 NECESITA TU DECISIÓN/);
  assert.match(card,/¿Necesitas hacer algo\?: SÍ\. Motivo: riesgo alto\./);
  assert.doesNotMatch(card,/HIGH_RISK/);
});

test('first daily summary is concise and caps parked skills instead of flooding owner email',()=>{
  const manyHolds=Object.fromEntries(Array.from({length:8},(_,i)=>[`hold${i}`,{...holdSkill,candidate_id:`hold-${i}`,name:`hold-skill-${i}`,human_alias:`Aparcada ${i}`} ]));
  const summary=buildRepoDailySummary({
    skillState:{in_flight:{},waiting_safe_handler:{},waiting_human:{human:humanSkill},terminal_hold:manyHolds,completed:{done:completedSkill},last_action:'TERMINAL_HOLD_CONTINUE_OTHER_SAFE_WORK'},
    communicationState:{pending:{}}
  });
  assert.match(summary.human[1],/0 skills avanzando, 1 esperando tu decisión y 8 aparcadas/);
  assert.match(summary.human[2],/Primera fotografía ejecutiva registrada/);
  assert.ok(summary.skills_engines.length<=5,'one human decision + max three parked + max three completed, without flooding');
  assert.ok(summary.skills_engines.some(x=>x.includes('Navegador Automático')));
});

test('second daily summary hides unchanged parked and completed skills but keeps active human decisions visible',()=>{
  const initial=buildRepoDailySummary({
    skillState:{waiting_human:{human:humanSkill},terminal_hold:{hold:holdSkill},completed:{done:completedSkill}},communicationState:{pending:{}}
  });
  const second=buildRepoDailySummary({
    skillState:{waiting_human:{human:humanSkill},terminal_hold:{hold:holdSkill},completed:{done:completedSkill}},communicationState:{pending:{},skill_digest_snapshot:initial._skill_snapshot}
  });
  assert.equal(second.skills_engines.length,1);
  assert.match(second.skills_engines[0],/Navegador Automático/);
  assert.match(second.human[2],/No hay cambios de estado de skills/);
  assert.match(second.human[3],/3 skills permanecen sin cambios/);
});

test('a changed parked skill reappears in the next executive digest',()=>{
  const initial=buildRepoDailySummary({skillState:{terminal_hold:{hold:holdSkill}},communicationState:{}});
  const changed={...holdSkill,updated_at:'2026-10-10T10:00:00Z'};
  const second=buildRepoDailySummary({skillState:{terminal_hold:{hold:changed}},communicationState:{skill_digest_snapshot:initial._skill_snapshot}});
  assert.equal(second.skills_engines.length,1);
  assert.match(second.skills_engines[0],/Asistente de Ingeniería Kairos/);
  assert.match(second.skills_engines[0],/Tiene un cambio relevante/);
});

test('daily summary does not expose raw commit hashes workflow ids or private candidate ids in owner-facing output',()=>{
  const summary=buildRepoDailySummary({
    runs:[{name:'very-technical-workflow-name',status:'completed',conclusion:'failure',id:987654321}],
    commits:[{sha:'deadbeefcafebabe',commit:{message:'fix: deeply technical implementation detail'}}],
    skillState:{terminal_hold:{hold:holdSkill}},communicationState:{}
  });
  const visibleSections={...summary};delete visibleSections._skill_snapshot;
  const visible=JSON.stringify(visibleSections);
  assert.doesNotMatch(visible,/987654321/);
  assert.doesNotMatch(visible,/deadbeef/);
  assert.doesNotMatch(visible,/deeply technical implementation detail/);
  assert.doesNotMatch(visible,/github-wide-skills:secret-tech-id/);
});

test('snapshot keys do not leak raw candidate ids',()=>{
  const summary=buildRepoDailySummary({skillState:{terminal_hold:{hold:holdSkill}},communicationState:{}});
  assert.doesNotMatch(JSON.stringify(summary._skill_snapshot),/github-wide-skills:secret-tech-id/);
  assert.ok(Object.keys(summary._skill_snapshot).some(k=>k==='name:kairos-lite'));
});
