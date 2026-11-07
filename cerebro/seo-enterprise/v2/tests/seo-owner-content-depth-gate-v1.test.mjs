import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {auditSeoContentDepth} from '../runtime/seo-owner-content-depth-gate-v1.mjs';

const root='cerebro/seo-enterprise/v2/';
const topics=[
 'luz natural ventanas orientación sombra temperatura aire ventilación cortinas persianas tranquilidad vivienda espacios estancias balcones',
 'comunidad propietarios cuotas derramas ascensor accesibilidad escalera vecinos juntas mantenimiento jardín portales fachadas obras pendientes',
 'presupuesto ahorro ingresos estabilidad financiación tipo interés cuotas mensuales ofertas plazos condiciones servicios entidad bancaria asesoramiento',
 'registro cargas escrituras titularidad certificados licencias documentación notaría información registral superficie anotaciones contrato arras gestoría',
 'barrio transportes colegios mercado farmacia supermercados distancias aparcamiento autobús ruido zonas verdes rutinas familiares comodidad',
 'reformas pintura cocina instalaciones fontanería enchufes caldera aislamiento humedades mobiliario ventanas suministros eficiencia energética presupuesto',
 'visitas agentes preguntas fotografías anotaciones comparación deseos necesidades prioridades mediciones distribución habitaciones baños pasillos espacios',
 'edificio conservación tejado tejados portería terrazas zonas comunes elementos compartidos ascensores suministros seguridad accesos iluminación',
 'negociación oferta condiciones plazos vendedor comprador calendario señal reserva comunicación documentación claridad acuerdo comprobaciones',
 'experiencia compradora emociones decisión lógica pareja familia horarios trabajo desplazamientos descanso convivencia expectativas costes seguridad',
 'hipoteca solvencia bancos criterios estudio viabilidad trámites documentos economía ahorro tasación negociación decisión financiación'
];
const paragraph=(topic,i)=>{
 const a='En una visita conviene preguntar y comprobar '+topic+'.';
 const b='El comprador podrá interpretar mejor las diferencias si dedica tiempo a '+topic+' sin decidir de inmediato.';
 const c='Una explicación práctica sobre '+topic+' permite comparar las alternativas y aclarar los detalles que siguen pendientes.';
 return '<p>'+[a,b,c,a,b,c].join(' ')+'</p>';
};
function fixture(type='ARTICLE'){
 const paraCount=type==='ARTICLE'?10:9;
 const faqCount=type==='ARTICLE'?6:8;
 const paras=topics.slice(0,paraCount).map(paragraph);
 const groups=[
  '<h2>Qué necesitas comprobar antes de avanzar</h2>'+paras.slice(0,3).join(''),
  '<h2>El coste real y lo que todavía desconoces</h2>'+paras.slice(3,5).join(''),
  '<h2>Documentos y señales que conviene revisar</h2>'+paras.slice(5,7).join(''),
  '<h2>Cómo decidir sin precipitarte</h2>'+paras.slice(7).join('')
 ];
 const faqs=Array.from({length:faqCount},(_,i)=>{
  const seed=topics[i].split(' ').slice(0,5).join(' ');
  return '<div class="faq-item"><h3>¿Qué debo preguntar sobre '+seed+'?</h3><p>'+
   'Conviene preguntar qué datos concretos se conocen, revisar la documentación disponible y valorar cómo influye este aspecto en tu rutina. Ante cuestiones técnicas solicita una comprobación profesional antes de comprometerte.'+
   '</p></div>';
 }).join('');
 return '<h1>Qué revisar antes de decidirte por un piso en Córdoba</h1>'+
  groups.join('')+'<section class="faq" aria-label="Dudas frecuentes"><h2>Lo que suelen preguntar los compradores</h2>'+faqs+'</section>';
}

test('owner policy article requires 1000 total and 750 real body excluding six FAQ',()=>{
 const result=auditSeoContentDepth({html:fixture('ARTICLE'),persona:'PARTICULARES',content_type:'ARTICLE'});
 assert.equal(result.status,'DEPTH_PRECHECK_PASS_RELEASE_HOLD',JSON.stringify(result.issues));
 assert.equal(result.required_total_words,1000);
 assert.equal(result.required_main_words,750);
 assert.ok(result.main_content_words_excluding_faq>=750);
 assert.ok(result.total_visible_words>=1000);
 assert.equal(result.faq_count,6);
 assert.equal(result.buyer_persona_independent_relevance_verified,false);
 assert.equal(result.no_filler_independently_verified,false);
 assert.equal(result.publish_authorized,false);
});

test('landing requires 900 total and 600 body excluding eight FAQ',()=>{
 const result=auditSeoContentDepth({html:fixture('LANDING'),persona:'INMOBILIARIAS',content_type:'LANDING'});
 assert.equal(result.status,'DEPTH_PRECHECK_PASS_RELEASE_HOLD',JSON.stringify(result.issues));
 assert.equal(result.required_total_words,900);
 assert.equal(result.required_main_words,600);
 assert.equal(result.faq_count,8);
 assert.equal(result.publish_authorized,false);
});

test('legacy owner V3 articles preserved but now explicitly on depth HOLD',()=>{
 const files=['drafts/2026-11-06-b2c-comparar-pisos-cordoba-v3-faq.draft.html',
 'drafts/2026-11-06-b2b-derivacion-comprador-cordoba-v3-faq.draft.html'];
 for(let i=0;i<files.length;i++){
  const html=fs.readFileSync(root+files[i],'utf8');
  const out=auditSeoContentDepth({html,persona:i===0?'PARTICULARES':'INMOBILIARIAS'});
  assert.equal(out.status,'DEPTH_HOLD');
  assert.ok(out.issues.includes('TOTAL_WORDS_BELOW_MINIMUM'));
  assert.ok(out.issues.includes('MAIN_WORDS_BELOW_MINIMUM'));
  assert.equal(out.publish_authorized,false);
 }
});

test('cannot pretend 1000-word article by inflating FAQ with minimal main copy',()=>{
 const html=fixture('ARTICLE');
 const changed=html.replace(/<h2>Qué necesitas comprobar antes de avanzar<\/h2>[\s\S]*?<section class="faq"/,
  '<h2>Qué necesitas comprobar antes de avanzar</h2>'+
  '<p>Revisa las condiciones de tu compra sin precipitarte.</p><section class="faq"');
 const out=auditSeoContentDepth({html:changed,persona:'PARTICULARES'});
 assert.equal(out.status,'DEPTH_HOLD');
 assert.ok(out.issues.includes('MAIN_WORDS_BELOW_MINIMUM'));
 assert.ok(out.issues.includes('MAIN_PARAGRAPHS_BELOW_MINIMUM'));
});

test('duplicating otherwise long sections blocks release, counting FAQ separately',()=>{
 const html=fixture('ARTICLE');
 const para=(html.match(/<p>[\s\S]*?<\/p>/)||[])[0];
 assert.ok(para);
 const duplicated=html.replace(/<h2>El coste real/,para+'<h2>El coste real');
 const out=auditSeoContentDepth({html:duplicated,persona:'PARTICULARES'});
 assert.equal(out.status,'DEPTH_HOLD');
 assert.ok(out.issues.includes('REPEATED_OR_NEAR_DUPLICATE_PARAGRAPHS'));
});

test('wrong scope and malicious policy weakening fail closed',()=>{
 const html=fixture();
 assert.throws(()=>auditSeoContentDepth({html,persona:'OTRA_EMPRESA'}));
 const policy=JSON.parse(fs.readFileSync(root+'seo-owner-content-depth-policy-v1-2026-11-06.json','utf8'));
 assert.throws(()=>auditSeoContentDepth({html,persona:'PARTICULARES',policy:{...policy,no_padding_to_reach_minimum:false}}));
});
