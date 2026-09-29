<?php
/**
 * Plugin Name: Fénix CEREBRO Leads
 * Description: Captura leads web en CEREBRO/Fénix Uno, acepta email o teléfono como dato mínimo y normaliza el correo público de Fénix Capital.
 * Version: 1.3.3
 * Author: Fénix Capital
 */

if (!defined('ABSPATH')) { exit; }

const FENIX_CEREBRO_LEADS_VERSION = '1.3.3';
const FENIX_CEREBRO_LEADS_ENDPOINT = 'https://cluhljgonannaafpmblx.supabase.co/functions/v1/fenix-web-lead';
const FENIX_CEREBRO_CANONICAL_EMAIL = 'hipotecas@fenixcapital.es';
const FENIX_CEREBRO_OLD_EMAIL = 'info@fenixcapital.es';

function fenix_cerebro_replace_email($html) {
    if (!is_string($html) || $html === '') return $html;
    return str_ireplace(FENIX_CEREBRO_OLD_EMAIL, FENIX_CEREBRO_CANONICAL_EMAIL, $html);
}

add_filter('the_content', 'fenix_cerebro_replace_email', 999);
add_filter('widget_text', 'fenix_cerebro_replace_email', 999);
add_filter('widget_text_content', 'fenix_cerebro_replace_email', 999);
add_filter('wp_nav_menu_items', 'fenix_cerebro_replace_email', 999);

add_action('template_redirect', function () {
    if (is_admin() || wp_doing_ajax() || wp_is_json_request()) return;
    ob_start('fenix_cerebro_replace_email');
}, 0);

function fenix_cerebro_normalize_phone($value) {
    return preg_replace('/\D+/', '', (string)$value);
}

function fenix_cerebro_rate_key() {
    $ip = isset($_SERVER['REMOTE_ADDR']) ? (string)$_SERVER['REMOTE_ADDR'] : 'unknown';
    return 'fenix_lead_rl_' . substr(hash('sha256', wp_salt('auth') . '|' . $ip), 0, 32);
}

function fenix_cerebro_lead_payload($data) {
    $email = isset($data['email']) ? strtolower(trim(sanitize_email($data['email']))) : '';
    $phone = isset($data['phone']) ? fenix_cerebro_normalize_phone($data['phone']) : '';
    $name = isset($data['name']) ? trim(sanitize_text_field($data['name'])) : '';

    return [
        'email' => $email,
        'phone' => $phone,
        'name' => $name,
        'source' => 'web',
        'landing_url' => isset($data['landing_url']) ? esc_url_raw($data['landing_url']) : '',
        'utm_source' => isset($data['utm_source']) ? sanitize_text_field($data['utm_source']) : '',
        'utm_medium' => isset($data['utm_medium']) ? sanitize_text_field($data['utm_medium']) : '',
        'utm_campaign' => isset($data['utm_campaign']) ? sanitize_text_field($data['utm_campaign']) : '',
        'consent_privacy' => !empty($data['consent_privacy']),
        'consent_marketing' => !empty($data['consent_marketing']),
        'website' => isset($data['website']) ? sanitize_text_field($data['website']) : '',
    ];
}

function fenix_cerebro_forward_lead($payload, $idem = '') {
    if (!empty($payload['website'])) {
        return ['ok' => true, 'accepted' => true, 'honeypot' => true];
    }

    if (empty($payload['email']) && empty($payload['phone'])) {
        return new WP_Error('identifier_required', 'Debe existir al menos un email o teléfono.', ['status' => 422]);
    }
    if (!empty($payload['email']) && !is_email($payload['email'])) {
        return new WP_Error('invalid_email', 'Email no válido.', ['status' => 422]);
    }
    if (!empty($payload['phone']) && (strlen($payload['phone']) < 7 || strlen($payload['phone']) > 15)) {
        return new WP_Error('invalid_phone', 'Teléfono no válido.', ['status' => 422]);
    }

    $key = fenix_cerebro_rate_key();
    $count = (int)get_transient($key);
    if ($count >= 10) {
        return new WP_Error('rate_limited', 'Demasiados intentos. Prueba de nuevo en unos minutos.', ['status' => 429]);
    }
    set_transient($key, $count + 1, 10 * MINUTE_IN_SECONDS);

    if (!$idem) {
        $basis = ($payload['email'] ?: $payload['phone']) . '|' . microtime(true) . '|' . wp_rand();
        $idem = 'wp-' . substr(hash('sha256', $basis), 0, 40);
    }

    $response = wp_remote_post(FENIX_CEREBRO_LEADS_ENDPOINT, [
        'timeout' => 8,
        'redirection' => 0,
        'headers' => [
            'Content-Type' => 'application/json',
            'Origin' => home_url(),
            'x-fenix-idempotency-key' => $idem,
            'User-Agent' => 'Fenix-CEREBRO-Leads/' . FENIX_CEREBRO_LEADS_VERSION,
        ],
        'body' => wp_json_encode($payload),
    ]);

    if (is_wp_error($response)) return $response;
    $status = (int)wp_remote_retrieve_response_code($response);
    $body = json_decode((string)wp_remote_retrieve_body($response), true);
    if ($status < 200 || $status >= 300 || !is_array($body) || empty($body['ok'])) {
        return new WP_Error('cerebro_rejected', 'CEREBRO no pudo aceptar el lead.', [
            'status' => $status ?: 502,
            'remote' => is_array($body) ? $body : null
        ]);
    }
    return $body;
}

add_action('rest_api_init', function () {
    register_rest_route('fenix-cerebro/v1', '/lead', [
        'methods' => 'POST',
        'permission_callback' => '__return_true',
        'callback' => function (WP_REST_Request $request) {
            $payload = fenix_cerebro_lead_payload($request->get_json_params() ?: []);
            $idem = sanitize_text_field((string)$request->get_header('x-fenix-idempotency-key'));
            $result = fenix_cerebro_forward_lead($payload, $idem);
            if (is_wp_error($result)) return $result;
            return new WP_REST_Response($result, !empty($result['lead_created']) ? 201 : 200);
        },
    ]);
});

function fenix_cerebro_pick_elementor_field($fields, $needles) {
    foreach ($fields as $key => $field) {
        $label = strtolower((string)($field['title'] ?? $field['label'] ?? $key));
        $value = $field['value'] ?? '';
        foreach ($needles as $needle) {
            if (strpos($label, $needle) !== false) return $value;
        }
    }
    return '';
}

/* Elementor Pro, si está activo: captura server-side sin depender del navegador. */
add_action('elementor_pro/forms/new_record', function ($record, $handler) {
    if (!is_object($record) || !method_exists($record, 'get')) return;
    $raw = $record->get('fields');
    if (!is_array($raw)) return;

    $payload = fenix_cerebro_lead_payload([
        'email' => fenix_cerebro_pick_elementor_field($raw, ['email', 'correo', 'e-mail']),
        'phone' => fenix_cerebro_pick_elementor_field($raw, ['telefono', 'teléfono', 'phone', 'movil', 'móvil']),
        'name' => fenix_cerebro_pick_elementor_field($raw, ['nombre', 'name']),
        'landing_url' => wp_get_referer() ?: home_url('/'),
        'consent_privacy' => true,
        'consent_marketing' => (bool)fenix_cerebro_pick_elementor_field($raw, ['marketing', 'newsletter', 'comercial', 'novedades']),
    ]);
    if (empty($payload['email']) && empty($payload['phone'])) return;

    fenix_cerebro_forward_lead($payload, 'elementor-' . substr(hash('sha256', wp_json_encode($payload) . '|' . time()), 0, 40));
}, 10, 2);

add_action('wp_enqueue_scripts', function () {
    $handle = 'fenix-cerebro-leads';
    wp_register_script($handle, '', [], FENIX_CEREBRO_LEADS_VERSION, true);
    wp_enqueue_script($handle);
    wp_localize_script($handle, 'FenixCerebroLead', [
        'restUrl' => esc_url_raw(rest_url('fenix-cerebro/v1/lead')),
        'canonicalEmail' => FENIX_CEREBRO_CANONICAL_EMAIL,
        'oldEmail' => FENIX_CEREBRO_OLD_EMAIL,
    ]);
    $js = <<<'JS'
(function(){
  const cfg=window.FenixCerebroLead||{};
  const assetRe=/\.(pdf|zip|docx?|xlsx?|pptx?)(\?|#|$)/i;
  const freeWords=/\b(descargar|descarga|gu[ií]a|checklist|plantilla|ebook|recurso|gratis|gratuito|lead magnet)\b/i;
  const legalWords=/privacidad|cookies|aviso[-_\s]?legal|protecci[oó]n[-_\s]?datos|t[eé]rminos/i;

  const magnets={
    '/hipotecas/hipoteca-autopromotor/':{
      label:'Checklist Hipoteca Autopromotor',
      asset:'https://fenixcapital.es/wp-content/uploads/2026/05/checklist-hipoteca-autopromotor-fenix-capital.pdf'
    },
    '/inmobiliarias/evitar-operaciones-caidas/':{
      label:'Checklist para evitar operaciones caídas',
      asset:'https://fenixcapital.es/wp-content/uploads/2026/05/checklist_operaciones_caidas_partner_fenix_capital.pdf'
    },
    '/guia-hipoteca-100/':{
      label:'Guía Hipoteca 100%',
      asset:'https://fenixcapital.es/wp-content/uploads/2025/12/Guia-hipoteca-100-Fenix-Capital.pdf'
    }
  };

  const calculatorPages=[
    '/calculadora-hipotecaria/',
    '/autodiagnostico-hipoteca/',
    '/inmobiliarias/calculadora-preanalisis-hipotecario/'
  ];

  function val(form,selectors){for(const s of selectors){const el=form.querySelector(s);if(el&&String(el.value||'').trim())return String(el.value).trim()}return ''}
  function checked(form,selectors){for(const s of selectors){const el=form.querySelector(s);if(el&&el.checked)return true}return false}
  function canonicalize(){
    document.querySelectorAll('a[href^="mailto:"]').forEach(a=>{
      if((a.getAttribute('href')||'').toLowerCase().includes((cfg.oldEmail||'').toLowerCase())) a.setAttribute('href','mailto:'+cfg.canonicalEmail);
      if((a.textContent||'').toLowerCase().includes((cfg.oldEmail||'').toLowerCase())) a.textContent=(a.textContent||'').replace(new RegExp(cfg.oldEmail,'ig'),cfg.canonicalEmail);
    });
  }
  function sessionKey(resource){ return 'fenix-gated:'+resource; }

  function captureModal(opts){
    const resource=opts.resource||location.pathname;
    let wrap=document.getElementById('fenix-lead-gate');
    if(wrap)wrap.remove();
    wrap=document.createElement('div');
    wrap.id='fenix-lead-gate';
    wrap.style.cssText='position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.62);display:flex;align-items:center;justify-content:center;padding:18px';
    wrap.innerHTML='<div style="width:min(520px,100%);background:#fff;border-radius:16px;padding:26px;box-shadow:0 20px 70px rgba(0,0,0,.35);font-family:inherit;color:#111"><button type="button" data-close style="float:right;border:0;background:transparent;font-size:25px;cursor:pointer">×</button><h2 style="margin:0 32px 8px 0">'+(opts.title||'Déjanos tu correo')+'</h2><p style="margin:0 0 18px">'+(opts.subtitle||'Te enviamos el siguiente paso y, si quieres, te llamamos para revisar tu caso.')+'</p><form><label>Correo electrónico *<input type="email" name="email" required style="width:100%;margin:6px 0 12px;padding:12px"></label><label>Nombre<input type="text" name="name" style="width:100%;margin:6px 0 12px;padding:12px"></label><label>Teléfono<input type="tel" name="phone" style="width:100%;margin:6px 0 12px;padding:12px"></label><label style="display:flex;gap:8px;align-items:flex-start;margin:4px 0 10px"><input type="checkbox" name="privacy" required> <span>He leído la información de privacidad.</span></label><label style="display:flex;gap:8px;align-items:flex-start;margin:4px 0 14px"><input type="checkbox" name="marketing"> <span>Quiero recibir información, novedades, recursos y comunicaciones comerciales de Fénix Capital.</span></label><button type="submit" style="width:100%;padding:13px;cursor:pointer">'+(opts.cta||'Continuar')+'</button><div data-msg style="min-height:22px;margin-top:10px;font-size:14px"></div></form></div>';
    document.body.appendChild(wrap);
    wrap.querySelector('[data-close]').addEventListener('click',()=>wrap.remove());
    wrap.addEventListener('click',e=>{if(e.target===wrap)wrap.remove()});
    const form=wrap.querySelector('form'),msg=wrap.querySelector('[data-msg]');
    form.addEventListener('submit',async e=>{
      e.preventDefault();
      const email=val(form,['input[name="email"]']),name=val(form,['input[name="name"]']),phone=val(form,['input[name="phone"]']);
      const params=new URLSearchParams(location.search);
      const payload={
        email,phone,name,
        source:opts.source||'web_lead_magnet',
        landing_url:location.href,
        asset_url:opts.asset||'',
        asset_label:opts.label||document.title,
        utm_source:params.get('utm_source')||'',
        utm_medium:params.get('utm_medium')||'',
        utm_campaign:params.get('utm_campaign')||'',
        consent_privacy:true,
        consent_marketing:checked(form,['input[name="marketing"]']),
        website:''
      };
      msg.textContent='Preparando…';
      try{
        const idem='magnet-'+crypto.randomUUID();
        const r=await fetch(cfg.restUrl,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','x-fenix-idempotency-key':idem},body:JSON.stringify(payload)});
        const b=await r.json().catch(()=>null);
        if(!r.ok||!b||!b.ok)throw new Error('lead_rejected');
        sessionStorage.setItem(sessionKey(resource),'1');
        wrap.remove();
        if(typeof opts.onSuccess==='function')opts.onSuccess(b);
        else if(opts.asset)window.location.href=opts.asset;
      }catch(_){
        msg.textContent='No hemos podido continuar. Revisa el correo e inténtalo de nuevo.';
      }
    });
  }

  function shouldGate(a){
    if(!(a instanceof HTMLAnchorElement))return false;
    const href=a.href||'';
    if(!href||legalWords.test(href)||legalWords.test(a.textContent||''))return false;
    let sameOrigin=false;try{sameOrigin=new URL(href,location.href).origin===location.origin}catch(_){}
    return sameOrigin&&(assetRe.test(href)||freeWords.test(a.textContent||''));
  }

  function installMagnetReplacement(){
    const m=magnets[location.pathname];
    if(!m)return;
    document.querySelectorAll('iframe[src*="sibforms.com"]').forEach(frame=>{
      const box=document.createElement('div');
      box.style.cssText='padding:24px;border:1px solid rgba(0,0,0,.12);border-radius:14px;text-align:center;background:#fff';
      box.innerHTML='<strong style="display:block;font-size:1.2rem;margin-bottom:8px">'+m.label+'</strong><span style="display:block;margin-bottom:14px">Acceso gratuito con correo electrónico.</span><button type="button" style="padding:12px 18px;cursor:pointer">Quiero acceder</button>';
      box.querySelector('button').addEventListener('click',()=>captureModal({resource:m.asset,asset:m.asset,label:m.label,source:'web_lead_magnet_native',title:'Accede gratis al recurso',subtitle:'Déjanos tu correo y te abrimos el recurso.'}));
      frame.replaceWith(box);
    });
  }

  function installCalculatorFollowup(){
    if(!calculatorPages.includes(location.pathname))return;
    if(document.getElementById('fenix-calc-followup'))return;
    const box=document.createElement('div');
    box.id='fenix-calc-followup';
    box.style.cssText='display:none;margin:28px auto;padding:22px;border:1px solid rgba(0,0,0,.12);border-radius:16px;background:#fff;max-width:760px;text-align:center';
    box.innerHTML='<strong style="display:block;font-size:1.25rem;margin-bottom:8px">¿Quieres un análisis más completo de tu resultado?</strong><span style="display:block;margin-bottom:14px">¿Quieres ir un paso más allá? Podemos revisar tu caso y darte una orientación más completa.</span><button type="button" style="padding:12px 18px;cursor:pointer">Quiero un análisis más completo</button>';
    box.querySelector('button').addEventListener('click',()=>captureModal({
      resource:'calc-followup:'+location.pathname,
      label:'Seguimiento calculadora · '+document.title,
      source:'web_calculator_followup',
      title:'Amplía tu resultado',
      subtitle:'Déjanos tu correo. Si añades teléfono, podemos llamarte para revisar tu caso.',
      cta:'Quiero ampliar mi resultado'
    }));
    const anchors=[...document.querySelectorAll('main,#primary,.site-content,.entry-content,.elementor')];
    const target=anchors[0]||document.body;
    target.appendChild(box);

    function reveal(){
      box.style.display='block';
      setTimeout(()=>{ try{ box.scrollIntoView({behavior:'smooth',block:'center'}); }catch(_){} },120);
    }

    document.addEventListener('click',function(e){
      const el=e.target instanceof Element?e.target.closest('button,input[type="submit"],[role="button"]'):null;
      if(!el || el.closest('#fenix-calc-followup,#fenix-lead-gate')) return;
      const txt=((el.textContent||'')+' '+(el.getAttribute('value')||'')+' '+(el.getAttribute('aria-label')||'')).toLowerCase();
      if(/calcular|simular|analizar|resultado|diagn[oó]stico/.test(txt)) setTimeout(reveal,500);
    },true);

    document.addEventListener('submit',function(e){
      const form=e.target;
      if(!(form instanceof HTMLFormElement) || form.closest('#fenix-lead-gate')) return;
      setTimeout(reveal,500);
    },true);
  }

  canonicalize();
  installMagnetReplacement();
  installCalculatorFollowup();

  document.addEventListener('click',function(ev){
    const a=ev.target instanceof Element?ev.target.closest('a'):null;
    if(!a||!shouldGate(a))return;
    if(sessionStorage.getItem(sessionKey(a.href))==='1')return;
    ev.preventDefault();ev.stopPropagation();
    captureModal({resource:a.href,asset:a.href,label:(a.textContent||'').trim(),source:'web_lead_magnet',title:'Accede gratis al recurso',subtitle:'Déjanos tu correo y te abrimos el recurso.'});
  },true);

  document.addEventListener('submit',function(ev){
    const form=ev.target;if(!(form instanceof HTMLFormElement))return;
    if(form.closest('#fenix-lead-gate'))return;
    const email=val(form,['input[type="email"]','input[name*="email" i]','input[name*="correo" i]']);
    const phone=val(form,['input[type="tel"]','input[name*="phone" i]','input[name*="telefono" i]','input[name*="tel" i]']);
    if(!email&&!phone)return;
    const name=val(form,['input[name*="name" i]','input[name*="nombre" i]']);
    const params=new URLSearchParams(location.search);
    const payload={email,phone,name,source:'web',landing_url:location.href,utm_source:params.get('utm_source')||'',utm_medium:params.get('utm_medium')||'',utm_campaign:params.get('utm_campaign')||'',consent_privacy:checked(form,['input[type="checkbox"][name*="priv" i]','input[type="checkbox"][name*="consent" i]']),consent_marketing:checked(form,['input[type="checkbox"][name*="marketing" i]','input[type="checkbox"][name*="newsletter" i]','input[type="checkbox"][name*="comercial" i]']),website:''};
    const idem='browser-'+crypto.randomUUID();
    fetch(cfg.restUrl,{method:'POST',credentials:'same-origin',keepalive:true,headers:{'Content-Type':'application/json','x-fenix-idempotency-key':idem},body:JSON.stringify(payload)}).catch(()=>{});
  },true);
})();
JS;
    wp_add_inline_script($handle, $js);
});
