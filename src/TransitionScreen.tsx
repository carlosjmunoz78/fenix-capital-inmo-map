import { anaAvatar, fenixLogo } from './assets/visualAssets';

const transitionCss=`
.fenix-transition{min-height:100vh;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at 50% 38%,color-mix(in srgb,var(--orange) 8%,var(--bg)),var(--bg) 58%);color:var(--text)}
.fenix-transition-card{width:min(560px,100%);display:flex;flex-direction:column;align-items:center;text-align:center;padding:34px 28px 30px;border:1px solid var(--border);border-radius:24px;background:color-mix(in srgb,var(--panel) 94%,transparent);box-shadow:0 22px 70px rgba(0,0,0,.12);backdrop-filter:blur(14px);animation:fenixTransitionIn .28s ease-out both}
.fenix-transition-brand{display:flex;align-items:center;gap:10px;margin-bottom:26px}.fenix-transition-brand img{width:42px;height:34px;object-fit:contain}.fenix-transition-brand strong{font-size:13px;letter-spacing:.08em}.fenix-transition-ana{width:78px;height:78px;border-radius:50%;object-fit:cover;object-position:center 18%;background:#fff;border:3px solid #fff;box-shadow:0 10px 28px rgba(0,0,0,.14);margin-bottom:20px}
.fenix-transition-kicker{font-size:10px;font-weight:800;letter-spacing:.14em;color:var(--orange);text-transform:uppercase;margin-bottom:10px}.fenix-transition h1{font-size:clamp(22px,3vw,30px);line-height:1.2;max-width:430px;font-weight:750}.fenix-transition p{margin-top:10px;font-size:13px;color:var(--muted)}
.fenix-transition-loader{display:flex;gap:7px;margin-top:22px}.fenix-transition-loader span{width:7px;height:7px;border-radius:999px;background:var(--orange);opacity:.28;animation:fenixTransitionPulse .9s ease-in-out infinite}.fenix-transition-loader span:nth-child(2){animation-delay:.14s}.fenix-transition-loader span:nth-child(3){animation-delay:.28s}
@keyframes fenixTransitionIn{from{opacity:0;transform:translateY(8px) scale(.992)}to{opacity:1;transform:none}}@keyframes fenixTransitionPulse{0%,100%{opacity:.25;transform:scale(.9)}50%{opacity:1;transform:scale(1.08)}}
@media(max-width:640px){.fenix-transition{padding:16px}.fenix-transition-card{padding:30px 20px 26px;border-radius:20px}.fenix-transition-ana{width:70px;height:70px}.fenix-transition h1{font-size:22px}}
@media(prefers-reduced-motion:reduce){.fenix-transition-card,.fenix-transition-loader span{animation:none}}
`;

export default function TransitionScreen(){
  return <div className="fenix-transition" role="status" aria-live="polite">
    <style>{transitionCss}</style>
    <div className="fenix-transition-card">
      <div className="fenix-transition-brand"><img src={fenixLogo} alt=""/><strong>FÉNIX CAPITAL</strong></div>
      <img className="fenix-transition-ana" src={anaAvatar} alt="Ana"/>
      <div className="fenix-transition-kicker">ANA · ASISTENTE FÉNIX</div>
      <h1>Ya casi está. Estoy poniendo todo en orden para ti.</h1>
      <p>Preparando tu espacio de trabajo.</p>
      <div className="fenix-transition-loader" aria-hidden="true"><span/><span/><span/></div>
    </div>
  </div>;
}
