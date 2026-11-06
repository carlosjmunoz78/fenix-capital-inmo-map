import type {CerebroVoiceView} from './jarvisVoiceSurfacePolicy';
import {resolveCerebroVoiceSurface} from './jarvisVoiceSurfacePolicy';

/**
 * Read-only LAB identity indicator for all existing CEREBRO views.
 * No microphone, audio playback, synth provider, spending or permissions.
 * Feature-gated to Vite development builds; never changes existing speechSynthesis.
 */
export default function CerebroJarvisVoiceLabStatus({view}:{view:CerebroVoiceView}) {
 const labEnabled=import.meta.env.DEV&&import.meta.env.VITE_CEREBRO_JARVIS_V2_LAB==='1';
 if(!labEnabled)return null;
 const identity=resolveCerebroVoiceSurface({pathname:'/cerebro',view,host:'FENIX_APP',companyId:'fenix'});
 if(identity.owner!=='JARVIS_V2')return null;
 return <div role="status" aria-label="Estado de JARVIS V2 LAB" style={{display:'flex',gap:'0.65rem',flexWrap:'wrap',alignItems:'center',padding:'0.55rem 0.8rem',fontSize:'0.85rem'}}>
  <strong>JARVIS V2 · Más clara · 1,10×</strong>
  <span>Identidad seleccionada en LAB · síntesis dinámica aún no conectada</span>
 </div>;
}
