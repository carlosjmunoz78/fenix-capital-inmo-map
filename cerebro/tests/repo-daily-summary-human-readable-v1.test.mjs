import test from 'node:test';
import assert from 'node:assert/strict';
import {buildHumanSkillCard,buildRepoDailySummary} from '../communication/repo-daily-summary.mjs';

const holdSkill={
  candidate_id:'github-wide-skills:secret-tech-id',
  wrapper_id:'skillwrap:internal-wrapper-id',
  name:'kairos-lite',
  human_alias:'Asistente de Ingeniería Kairos',
  domain:'software-engineering-devops',
  engine_bindings:['FACT-001','QA-001','DEP-001'],
  stage:'SAFE_HANDLER_TERMINAL_HOLD',
  status:'TERMINAL_HOLD',
  run_id:123456,
  additional_cost_eur:0
};

const humanSkill={
  candidate_id:'candidate-human-gate',
  name:'agent-browser',
  human_alias:'Navegador Automático',
  domain:'browser-automation-scraping',
  human_required:'HIGH_RISK',
  stage:'PREPROD_PROMOTION_REVIEW',
  additional_cost_eur:0
};

test('skill card explains what the skill really does before any technical detail',()=>{
  const card=buildHumanSkillCard(holdSkill,'HOLD');
  assert.match(card,/Asistente de Ingeniería Kairos/);
  assert.match(card,/Qué es realmente:/);
  assert.match(card,/planifica, construye, prueba y mantiene software/);
  assert.match(card,/Estado: APARCADA · NO SE INTEGRA DE MOMENTO/);
  assert.match(card,/Qué se ha conseguido:/);
  assert.match(card,/Qué falta:/);
  assert.match(card,/Dónde puede mejorar CEREBRO:/);
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

test('human-required skill says clearly that Carlos must act and why',()=>{
  const card=buildHumanSkillCard(humanSkill,'WAITING_HUMAN');
  assert.match(card,/Navegador Automático/);
  assert.match(card,/Estado: PARADA · NECESITA TU DECISIÓN/);
  assert.match(card,/¿Necesitas hacer algo\?: SÍ\./);
  assert.match(card,/HIGH_RISK/);
});

test('daily summary leads with plain counts and renders human skill cards',()=>{
  const summary=buildRepoDailySummary({
    runs:[{name:'cerebro-skill-kairos-internal',status:'completed',conclusion:'success'}],
    commits:[{sha:'abcdef0123456789',commit:{message:'chore(cerebro): internal change'}}],
    skillState:{
      in_flight:{},
      waiting_safe_handler:{},
      waiting_human:{human:humanSkill},
      terminal_hold:{hold:holdSkill},
      completed:{},
      last_action:'TERMINAL_HOLD_CONTINUE_OTHER_SAFE_WORK'
    },
    communicationState:{pending:{}}
  });
  assert.match(summary.human[0],/0 skills activas, tiene 1 en HOLD y 1 esperando una decisión humana/);
  assert.equal(summary.skills_engines.length,2);
  assert.ok(summary.skills_engines.some(x=>x.includes('Asistente de Ingeniería Kairos')));
  assert.ok(summary.skills_engines.some(x=>x.includes('Navegador Automático')));
  assert.match(summary.next_safe_work[0],/seguirá con otras habilidades seguras/);
});

test('daily summary does not dump raw commit hashes or workflow run ids into the main owner-facing sections',()=>{
  const summary=buildRepoDailySummary({
    runs:[{name:'very-technical-workflow-name',status:'completed',conclusion:'failure',id:987654321}],
    commits:[{sha:'deadbeefcafebabe',commit:{message:'fix: deeply technical implementation detail'}}],
    skillState:{terminal_hold:{hold:holdSkill}},
    communicationState:{}
  });
  const visible=JSON.stringify(summary);
  assert.doesNotMatch(visible,/987654321/);
  assert.doesNotMatch(visible,/deadbeef/);
  assert.doesNotMatch(visible,/deeply technical implementation detail/);
});
