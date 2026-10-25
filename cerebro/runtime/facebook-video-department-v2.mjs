import fs from 'node:fs/promises';
import {buildFacebookVideoBrief as buildV1} from './facebook-video-department-v1.mjs';

export const FACEBOOK_VIDEO_DEPARTMENT_VERSION='1.1.1';

const REELS=Object.freeze({
  'FB-FIN-25-30-FIRST-HOME':`Te gusta el piso. Mucho. Ya estás pensando dónde va el sofá y, justo entonces, aparece la frase: “hay que reservar hoy”. Ahí es donde conviene separar emoción y números. Si estás buscando tu primera vivienda, antes de entregar dinero necesitas saber si la financiación que imaginas tiene sentido con tus ingresos, tus deudas, tu ahorro y esa vivienda concreta. Y ojo: no siempre necesitas tener ahorrado el veinte por ciento, pero tampoco existe un cien por cien automático para todo el mundo. Hay perfiles y viviendas que permiten plantear más financiación y otros que no. La gracia no está en correr sin mirar. Está en comprobar rápido y, si encaja, correr con ventaja. En Fénix Capital hacemos primero los números y después aceleramos contigo. Si estás buscando tu primera casa, cuéntanos tu caso antes de reservar.`,
  'FB-FIN-35-45-FAMILY-MOVE':`La casa que necesita tu familia no empieza por el máximo que te presta el banco. Empieza por una pregunta bastante más útil: ¿qué cuota os deja seguir viviendo tranquilos después de firmar? Porque cambiar de casa con treinta y cinco o cuarenta y cinco años significa encajar colegio, coche, ahorro, vacaciones, imprevistos y, muchas veces, la venta de vuestra vivienda actual. Y ahí el calendario importa casi tanto como la hipoteca. El error es mirar solo el precio de la nueva casa y preguntar “¿nos lo conceden?”. Nosotros preferimos ordenar primero ingresos, deudas, ahorro, vivienda y tiempos. Después vemos qué operación tiene sentido y qué margen deja a la familia. Si encaja, se acelera. Si obliga a ir demasiado justos, se corrige antes de comprometerse. Comprar mejor no es apurar más. Es decidir con margen. Si estáis pensando en cambiar de casa, contadnos vuestro escenario y ordenamos la operación.`,
  'FB-FIN-45-55-REFINANCE':`Una cuota más baja no siempre significa una financiación mejor. A veces solo significa que vas a pagar durante más años. Si tienes hipoteca, quizá algún préstamo y una economía estable, merece la pena mirar el conjunto antes de tocar nada. Refinanciar puede tener sentido, pero solo si mejora de verdad la estructura: coste total, plazo, vinculaciones y margen mensual. A veces conviene novar. Otras, subrogar. Otras, reorganizar deudas. Y muchas veces la mejor decisión es no tocar una buena hipoteca. Por eso en Fénix Capital no empezamos prometiendo ahorro. Empezamos comparando escenarios. Queremos saber qué ganas, qué te cuesta y qué riesgo introduces con cada cambio. La pregunta no es solo cuánto pagas este mes. Es si tu financiación sigue siendo la adecuada para los próximos años. Si quieres revisarla, cuéntanos cómo la tienes montada y comparamos alternativas con números encima de la mesa.`
});

const LONG_APPEND=Object.freeze({
  'FB-FIN-25-30-FIRST-HOME':`Y hay otro punto que suele decidir si una operación va cómoda o va forzada: los gastos y el colchón que queda después de comprar. No basta con que el banco diga que sí. La compra tiene que seguir teniendo sentido cuando sumas impuestos, tasación, mudanza, imprevistos y los primeros meses en la vivienda. Esa foto completa es la que conviene revisar antes de reservar.`
});

function wc(text){return String(text).trim().split(/\s+/).filter(Boolean).length}

export function buildFacebookVideoBrief(){
  const b=structuredClone(buildV1());
  b.schema_version='1.1.1';
  b.editorial_revision='NEAR_MINUTE_REELS_PLUS_THREE_MINUTE_LONGFORM';
  for(const c of b.campaigns){
    const reel=REELS[c.id];
    if(!reel)throw new Error(`FACEBOOK_V2_REEL_MISSING:${c.id}`);
    c.formats.reel.text=reel;
    c.script_metrics.reel_words=wc(reel);
    if(LONG_APPEND[c.id]){
      c.formats.long.text=`${c.formats.long.text} ${LONG_APPEND[c.id]}`;
      c.script_metrics.long_words=wc(c.formats.long.text);
    }
  }
  b.gates.reel_word_floor=b.campaigns.every(c=>c.script_metrics.reel_words>=135&&c.script_metrics.reel_words<=165);
  b.gates.reel_creative_turns=b.campaigns.every(c=>/[¿?]|pero|porque|ojo|error|gracia/i.test(c.formats.reel.text));
  b.gates.longform_word_floor=b.campaigns.every(c=>c.script_metrics.long_words>=520);
  if(!Object.values(b.gates).every(Boolean))throw new Error(`FACEBOOK_VIDEO_V2_GATE_RED:${JSON.stringify(b.gates)}`);
  return b;
}

if(import.meta.url===`file://${process.argv[1]}`){
  const out=process.argv[2]||'/tmp/cerebro-facebook-video-brief-v2.json';
  const brief=buildFacebookVideoBrief();
  await fs.writeFile(out,JSON.stringify(brief,null,2)+'\n','utf8');
  console.log(JSON.stringify({ok:true,version:FACEBOOK_VIDEO_DEPARTMENT_VERSION,out,campaigns:brief.campaigns.map(c=>({id:c.id,target:c.target.age_band,reel_words:c.script_metrics.reel_words,long_words:c.script_metrics.long_words,hook:c.hook,cta:c.cta}))}));
}
