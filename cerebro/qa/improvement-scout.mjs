#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

function readJson(filePath, fallback = {}) {
  if (!filePath || !fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function id(parts) {
  return crypto.createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 24);
}

function stdoutText(entry) {
  if (typeof entry === 'string') return entry;
  if (entry && typeof entry.text === 'string') return entry.text;
  if (entry && typeof entry.buffer === 'string') return entry.buffer;
  return '';
}

function flattenTests(report) {
  const rows = [];
  const walk = (suite, parents = []) => {
    const suitePath = [...parents, suite.title].filter(Boolean);
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        const result = (test.results ?? []).at(-1) ?? {};
        rows.push({
          title: [...suitePath, spec.title].filter(Boolean).join(' › '),
          project: test.projectName ?? test.projectId ?? 'unknown',
          duration_ms: Number(result.duration ?? 0),
          stdout: (result.stdout ?? []).map(stdoutText).join('\n')
        });
      }
    }
    for (const child of suite.suites ?? []) walk(child, suitePath);
  };
  for (const suite of report.suites ?? []) walk(suite, []);
  return rows;
}

export function parseObservations(report) {
  const observations = [];
  for (const test of flattenTests(report)) {
    for (const line of test.stdout.split(/\r?\n/)) {
      const marker = 'CEREBRO_OBS:';
      const at = line.indexOf(marker);
      if (at < 0) continue;
      try {
        const value = JSON.parse(line.slice(at + marker.length));
        if (value && typeof value === 'object') observations.push({...value, test_title:test.title, duration_ms:test.duration_ms});
      } catch {
        // Malformed observation is ignored; the QA controller must remain fail-closed, not fail-open.
      }
    }
  }
  return observations;
}

function safeLocalizationSamples(samples, limit = 15) {
  if (!Array.isArray(samples)) return [];
  return samples.slice(0, limit).map(sample => ({
    tag:String(sample?.tag ?? '').slice(0,24),
    role:String(sample?.role ?? '').slice(0,48),
    type:String(sample?.type ?? '').slice(0,48),
    classes:String(sample?.classes ?? '').slice(0,240),
    selector:String(sample?.selector ?? '').slice(0,320),
    href:String(sample?.href ?? '').slice(0,240),
    text:String(sample?.text ?? '').slice(0,160),
    ariaLabel:String(sample?.ariaLabel ?? '').slice(0,160),
    title:String(sample?.title ?? '').slice(0,160),
    width:Number.isFinite(Number(sample?.width)) ? Number(sample.width) : null,
    height:Number.isFinite(Number(sample?.height)) ? Number(sample.height) : null
  })).filter(sample => sample.selector || sample.classes || sample.tag);
}

function candidate({dimension, owner_engine, title, hypothesis, evidence, confidence, target, metric='human_qa_quality', direction='HIGHER', localization_evidence=[]}) {
  const boundedLocalization=safeLocalizationSamples(localization_evidence);
  const fingerprint = id([dimension, owner_engine, target ?? 'GLOBAL', title, evidence, JSON.stringify(boundedLocalization)]);
  return {
    improvement_id: `qa-imp:${fingerprint}`,
    company_id: 'fenix',
    engine_id: owner_engine,
    environment: 'PREPROD',
    version: '0.2.0',
    source: 'QA-001_HUMAN_READONLY_OBSERVATION',
    target: target ?? 'GLOBAL',
    dimension,
    title,
    hypothesis,
    evidence,
    localization_evidence:boundedLocalization,
    localization_status:boundedLocalization.length ? 'OBSERVED_ELEMENT_SAMPLES_AVAILABLE' : 'NO_ELEMENT_SAMPLES',
    confidence,
    risk_class: 'LOW',
    expected_metric_delta: {name: metric, direction, measurement: 'CONTROLLED_OLD_VS_NEW'},
    next_gate: 'OWNER_PREPROD_CANDIDATE',
    auto_fix_eligible: false,
    promotion_authorized: false,
    prod_authorized: false,
    prod_write_authorized: false,
    customer_data: false,
    trading_access: false,
    additional_cost_eur: 0
  };
}

export function buildImprovementScoutState({report = {}, quality = {}, now = new Date().toISOString()} = {}) {
  const observations = parseObservations(report);
  const candidates = [];
  const seen = new Set();
  const add = value => {
    if (seen.has(value.improvement_id)) return;
    seen.add(value.improvement_id);
    candidates.push(value);
  };

  for (const obs of observations) {
    const target = `${obs.kind ?? 'OTHER'}:${obs.project ?? 'unknown'}`;
    const owner = obs.kind === 'APP' ? 'APP-001' : 'WEB-001';
    if (Number(obs.mainCount ?? 0) === 0) add(candidate({
      dimension:'accessibility_semantics', owner_engine:'HCI-001', target,
      title:`${obs.kind ?? 'Surface'} sin landmark principal detectable`,
      hypothesis:'Añadir una estructura semántica principal puede mejorar navegación asistida sin cambiar la lógica de negocio.',
      evidence:`mainCount=${Number(obs.mainCount ?? 0)}`, confidence:0.95, metric:'accessible_main_landmark',
      localization_evidence:obs.mainCandidateSamples
    }));
    if (obs.kind === 'WEB' && Number(obs.h1Count ?? 0) !== 1) add(candidate({
      dimension:'information_architecture', owner_engine:'SEO-001', target,
      title:`Jerarquía H1 revisable en ${obs.url ?? 'web'}`,
      hypothesis:'Una jerarquía H1 inequívoca puede mejorar comprensión humana y estructura SEO.',
      evidence:`h1Count=${Number(obs.h1Count ?? 0)}`, confidence:0.90, metric:'single_primary_h1'
    }));
    if (Number(obs.unnamedInteractiveCount ?? 0) > 0) add(candidate({
      dimension:'accessibility_names', owner_engine:'HCI-001', target,
      title:'Controles interactivos visibles sin nombre accesible',
      hypothesis:'Nombrar controles visibles reduce fricción para tecnologías de asistencia.',
      evidence:`unnamedInteractiveCount=${Number(obs.unnamedInteractiveCount ?? 0)}`, confidence:0.96, metric:'unnamed_interactive_count', direction:'LOWER',
      localization_evidence:obs.unnamedInteractiveSamples
    }));
    if (Number(obs.unlabeledInputs ?? 0) > 0) add(candidate({
      dimension:'form_accessibility', owner_engine:'HCI-001', target,
      title:'Campos visibles sin etiqueta programática',
      hypothesis:'Etiquetar entradas mejora comprensión del formulario y reduce errores de interacción.',
      evidence:`unlabeledInputs=${Number(obs.unlabeledInputs ?? 0)}`, confidence:0.96, metric:'unlabeled_input_count', direction:'LOWER',
      localization_evidence:obs.unlabeledInputSamples
    }));
    if (Number(obs.imagesMissingAlt ?? 0) > 0) add(candidate({
      dimension:'image_accessibility', owner_engine:'HCI-001', target,
      title:'Imágenes visibles sin atributo alt',
      hypothesis:'Resolver imágenes informativas sin alt mejora accesibilidad sin requerir nueva infraestructura.',
      evidence:`imagesMissingAlt=${Number(obs.imagesMissingAlt ?? 0)}`, confidence:0.92, metric:'images_missing_alt', direction:'LOWER',
      localization_evidence:obs.imagesMissingAltSamples
    }));
    if (String(obs.project ?? '').toLowerCase().includes('mobile') && Number(obs.smallTouchTargets ?? 0) > 2) add(candidate({
      dimension:'mobile_usability', owner_engine:'HCI-001', target,
      title:'Objetivos táctiles potencialmente pequeños en móvil',
      hypothesis:'Aumentar el área táctil de controles pequeños puede reducir pulsaciones fallidas.',
      evidence:`smallTouchTargets=${Number(obs.smallTouchTargets ?? 0)}`, confidence:0.80, metric:'small_touch_target_count', direction:'LOWER',
      localization_evidence:obs.smallTouchTargetSamples
    }));
    if (obs.horizontalOverflow === true) add(candidate({
      dimension:'responsive', owner_engine:'HCI-001', target,
      title:'Desbordamiento horizontal detectable',
      hypothesis:'Eliminar overflow horizontal mejora el recorrido móvil y reduce fricción.',
      evidence:`scrollWidth=${obs.scrollWidth};clientWidth=${obs.clientWidth}`, confidence:0.98, metric:'horizontal_overflow_count', direction:'LOWER',
      localization_evidence:obs.mainCandidateSamples
    }));
    if (Number(obs.visibleTextChars ?? 0) > 1200 && Number(obs.ctaCount ?? 0) === 0) add(candidate({
      dimension:'cta_discoverability', owner_engine:'MKT-001', target,
      title:'Página con contenido sustancial y CTA no detectable',
      hypothesis:'Hacer más visible una acción principal podría reducir fricción sin añadir pasos.',
      evidence:`visibleTextChars=${Number(obs.visibleTextChars ?? 0)};ctaCount=0`, confidence:0.65, metric:'primary_cta_discoverability'
    }));
    if (Number(obs.duration_ms ?? 0) > 8000) add(candidate({
      dimension:'perceived_performance', owner_engine:owner, target,
      title:'Recorrido humano read-only con duración elevada',
      hypothesis:'Investigar el recorrido lento puede descubrir una mejora de rendimiento perceptible.',
      evidence:`duration_ms=${Number(obs.duration_ms ?? 0)}`, confidence:0.70, metric:'human_journey_duration_ms', direction:'LOWER'
    }));
  }

  if (quality?.coverage?.app_authenticated === 'POR_AUDITAR_PREPROD_HARNESS') add(candidate({
    dimension:'qa_coverage', owner_engine:'QA-001', target:'APP:AUTHENTICATED_PREPROD',
    title:'Cobertura autenticada de App pendiente de harness PREPROD',
    hypothesis:'Un usuario sintético autenticado permitirá descubrir regresiones que el shell público no ve.',
    evidence:'coverage.app_authenticated=POR_AUDITAR_PREPROD_HARNESS', confidence:0.99, metric:'authenticated_app_coverage'
  }));
  if (String(quality?.coverage?.products ?? '').startsWith('POR_AUDITAR')) add(candidate({
    dimension:'qa_coverage', owner_engine:'QAB-001', target:'PRODUCT:PREPROD',
    title:'Productos digitales pendientes de objetivo PREPROD canónico',
    hypothesis:'Registrar un target PREPROD sintético permitirá probar generación, entrega y descarga sin tocar clientes.',
    evidence:`coverage.products=${quality?.coverage?.products}`, confidence:0.99, metric:'synthetic_product_coverage'
  }));

  candidates.sort((a,b) => b.confidence - a.confidence || a.improvement_id.localeCompare(b.improvement_id));
  return {
    schema_version:'0.2.0',
    state_type:'CEREBRO_QA_IMPROVEMENT_SCOUT_STATE_V0',
    company_id:'fenix',
    engine_id:'QA-001',
    environment:'CONTROL_PLANE',
    version:'0.2.0',
    updated_at:now,
    status:candidates.length ? 'IMPROVEMENTS_FOUND' : 'GREEN_NO_IMPROVEMENTS',
    observations_total:observations.length,
    candidates_total:candidates.length,
    candidates,
    human_required:[],
    safety:{prod_write:false,customer_data:false,trading:false,paid_fallback:false,additional_subscription_eur:0}
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const reportPath = arg('--report');
  const qualityPath = arg('--quality');
  const outPath = arg('--out');
  if (!reportPath || !qualityPath || !outPath) throw new Error('usage: improvement-scout.mjs --report <json> --quality <json> --out <json>');
  const state = buildImprovementScoutState({report:readJson(reportPath,{}),quality:readJson(qualityPath,{})});
  fs.mkdirSync(path.dirname(outPath),{recursive:true});
  fs.writeFileSync(outPath,JSON.stringify(state,null,2)+'\n');
  console.log(JSON.stringify({status:state.status,observations:state.observations_total,candidates:state.candidates_total,cost_eur:0}));
}
