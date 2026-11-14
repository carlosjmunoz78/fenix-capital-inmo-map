<?php
/**
 * Plugin Name: CEREBRO SEO001 · Partner Form Scoped V0
 * Description: Formulario B2B aislado para cuatro contenidos SEO001; no altera CRM, Supabase ni formularios existentes.
 * Version: 0.2.0
 */
if (!defined('ABSPATH')) exit;
function seo001_partner_allowed_v0(): bool {
    return is_singular(array('post','page')) && in_array((int)get_queried_object_id(),array(52661,52663,52714,52716),true);
}
add_shortcode('fenix_seo001_partner_form', static function($atts = []) {
    if (!seo001_partner_allowed_v0()) return '';
    $a=shortcode_atts(array('city'=>'Córdoba'),(array)$atts,'fenix_seo001_partner_form');
    $city=sanitize_text_field((string)$a['city']);
    $id=(int)get_queried_object_id();
    ob_start(); ?>
    <section class="seo001-partner-card" role="form" aria-label="Solicitud de colaboración para agencias inmobiliarias" data-seo001-partner-id="<?php echo esc_attr((string)$id); ?>" data-seo001-partner-city="<?php echo esc_attr($city); ?>">
      <h3>Cuéntanos qué necesita tu agencia</h3>
      <p>Indícanos tus datos profesionales y el tipo de operación. Revisaremos la solicitud individualmente, sin prometer resultados bancarios.</p>
      <div class="seo001-partner-fields">
        <label>Nombre de la agencia *<input name="agency" type="text" maxlength="130" autocomplete="organization" required></label>
        <label>Persona de contacto *<input name="name" type="text" maxlength="140" autocomplete="name" required></label>
        <label>Correo electrónico<input name="email" type="email" maxlength="200" autocomplete="email"></label>
        <label>Teléfono<input name="phone" type="tel" maxlength="30" autocomplete="tel"></label>
        <label class="seo001-partner-wide">Tipo de colaboración
          <select name="partner_need">
            <option>Seguimiento hipotecario de compradores</option>
            <option>Coordinar compraventas encadenadas</option>
            <option>Estudio financiero de una operación</option>
            <option>Colaboración general con la inmobiliaria</option>
          </select>
        </label>
        <label class="seo001-partner-wide">Describe brevemente tu caso<textarea name="message" rows="4" maxlength="1800" placeholder="No incluyas datos bancarios ni documentación sensible"></textarea></label>
        <label class="seo001-partner-check seo001-partner-wide"><input type="checkbox" name="consent_privacy" required><span>He leído y acepto la <a href="<?php echo esc_url(home_url('/declaracion-de-privacidad/')); ?>">información de privacidad</a>.</span></label>
        <label class="seo001-partner-check seo001-partner-wide"><input type="checkbox" name="consent_marketing"><span>Quiero recibir comunicaciones comerciales de Fénix Capital (opcional).</span></label>
      </div>
      <div class="seo001-partner-hp" aria-hidden="true"><label>No rellenar<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
      <button type="button" class="seo001-partner-send">Solicitar colaboración</button>
      <p class="seo001-partner-status" role="status" aria-live="polite"></p>
    </section>
    <?php return (string)ob_get_clean();
});
add_action('wp_enqueue_scripts',static function() {
    if (!seo001_partner_allowed_v0()) return;
    $p=get_queried_object();
    if (!$p instanceof WP_Post || !has_shortcode((string)$p->post_content,'fenix_seo001_partner_form')) return;
    $s='seo001-partner-v0-style';
    wp_register_style($s,false,array(),'0.2.0');wp_enqueue_style($s);
    wp_add_inline_style($s,'.seo001-partner-card,.seo001-partner-card *{box-sizing:border-box}.seo001-partner-card{max-width:760px;margin:24px auto;background:#fff;border:1px solid #eccbb4;border-radius:18px;padding:clamp(20px,3vw,32px);color:#222;box-shadow:0 14px 40px rgba(0,0,0,.07)}.seo001-partner-card h3{color:#222;font-size:clamp(24px,3vw,32px);margin:0 0 8px}.seo001-partner-card p{color:#454545;line-height:1.55}.seo001-partner-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.seo001-partner-fields label{display:flex;flex-direction:column;gap:7px;font-size:15px;font-weight:650;color:#222}.seo001-partner-fields input:not([type=checkbox]),.seo001-partner-fields textarea,.seo001-partner-fields select{width:100%;min-width:0;background:white;border:1px solid #aaa;border-radius:9px;padding:11px;color:#222;font:inherit}.seo001-partner-fields input:focus,.seo001-partner-fields textarea:focus,.seo001-partner-fields select:focus{outline:3px solid rgba(255,95,0,.23)}.seo001-partner-wide{grid-column:1/-1}.seo001-partner-check{flex-direction:row!important;align-items:start;gap:9px!important;font-weight:400!important;line-height:1.45}.seo001-partner-check input{flex:0 0 auto;margin:4px 0 0}.seo001-partner-card a{color:#a84300;text-decoration:underline}.seo001-partner-send{background:#ff5f00;color:#222;border:0;border-radius:8px;min-height:48px;padding:12px 24px;font-weight:800;cursor:pointer;margin-top:18px}.seo001-partner-send:disabled{opacity:.6}.seo001-partner-status{min-height:22px;margin:12px 0 0}.seo001-partner-status[data-kind=error]{color:#9c1d1d}.seo001-partner-status[data-kind=ok]{color:#176b32}.seo001-partner-hp{position:absolute!important;left:-9999px!important;opacity:0!important}@media(max-width:640px){.seo001-partner-fields{grid-template-columns:minmax(0,1fr)}.seo001-partner-card{padding:18px 14px}.seo001-partner-wide{grid-column:1}}');
    $h='seo001-partner-v0-js';wp_register_script($h,false,array(),'0.2.0',true);wp_enqueue_script($h);
    wp_localize_script($h,'SEO001PartnerV0',array('endpoint'=>esc_url_raw(rest_url('cerebro-seo001/v0/partner-lead'))));
    $js=<<<'JS'
(function(){'use strict';
function value(root,name){var el=root.querySelector('[name="'+name+'"]');return el?String(el.value||'').trim():''}
function check(root,name){var el=root.querySelector('[name="'+name+'"]');return !!(el&&el.checked)}
function feedback(root,msg,kind){var el=root.querySelector('.seo001-partner-status');if(el){el.textContent=msg;el.dataset.kind=kind||''}}
document.addEventListener('click',async function(e){
var btn=e.target instanceof Element?e.target.closest('.seo001-partner-send'):null;if(!btn)return;
var root=btn.closest('.seo001-partner-card');if(!root||root.dataset.busy==='1')return;e.preventDefault();
var agency=value(root,'agency'),name=value(root,'name'),email=value(root,'email'),phone=value(root,'phone');
if(!agency||!name){feedback(root,'Indica la agencia y persona de contacto.','error');return}
if(!email&&!phone){feedback(root,'Indica correo o teléfono de contacto.','error');return}
if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){feedback(root,'Corrige el correo electrónico.','error');return}
var digits=phone.replace(/\D/g,'');if(phone&&(digits.length<7||digits.length>15)){feedback(root,'Revisa el teléfono.','error');return}
if(!check(root,'consent_privacy')){feedback(root,'Debes aceptar la información de privacidad.','error');return}
var city=root.dataset.seo001PartnerCity||'Córdoba';var slug=city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
var params=new URLSearchParams(location.search);var body={agency:agency,partner_need:value(root,'partner_need'),name:name,email:email,phone:phone,source:'web_agency_partner',city:city,funnel:'PARTNER',asset:'partner_'+slug,resource:'partner_'+slug,message:'Agencia: '+agency+'\nNecesidad: '+value(root,'partner_need')+'\nConsulta: '+value(root,'message'),landing_url:location.href.split('#')[0],landing_id:Number(root.dataset.seo001PartnerId||0),utm_source:params.get('utm_source')||'',utm_medium:params.get('utm_medium')||'',utm_campaign:params.get('utm_campaign')||'',consent_privacy:true,consent_marketing:check(root,'consent_marketing'),website:value(root,'website')};
root.dataset.busy='1';btn.disabled=true;feedback(root,'Enviando…','');var idem='seo001-partner-'+(crypto.randomUUID?crypto.randomUUID():String(Date.now())+'-'+Math.random().toString(16).slice(2));
try{var r=await fetch((window.SEO001PartnerV0||{}).endpoint,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','x-fenix-idempotency-key':idem},body:JSON.stringify(body)});
var j=await r.json().catch(function(){return null});if(!r.ok||!j||!j.ok)throw Error('send_failed');
root.querySelectorAll('input:not([name=website]),textarea').forEach(function(x){if(x.type==='checkbox')x.checked=false;else x.value=''});
feedback(root,'Solicitud recibida. Te contactaremos lo antes posible.','ok');
}catch(err){feedback(root,'No se pudo enviar. Inténtalo de nuevo o utiliza la página de contacto.','error')}
finally{btn.disabled=false;root.dataset.busy='0'}
},false);
})();
JS;
    wp_add_inline_script($h,$js,'after');
},1);


/* Server-side legal gate for only this form's four draft IDs.
 * This does not alter generic web-lead requests, other funnels or Supabase.
 * No contact is created for invalid requests. */
add_filter('rest_pre_dispatch',static function($pre,$server,$req) {
    if ($pre !== null || $req->get_method() !== 'POST' || $req->get_route() !== '/fenix-cerebro/v1/lead') return $pre;
    $body=$req->get_json_params();
    if (!is_array($body) || strtoupper((string)($body['funnel']??'')) !== 'PARTNER') return $pre;
    $id=absint($body['landing_id']??0);
    if (!in_array($id,array(52661,52663,52714,52716),true)) return $pre;
    if (!empty($body['website'])) return $pre;
    $consent=filter_var($body['consent_privacy']??false,FILTER_VALIDATE_BOOLEAN);
    if (!$consent) return new WP_Error('seo001_partner_privacy_required','Se requiere la aceptación de la información de privacidad.',array('status'=>422));
    $agency=sanitize_text_field((string)($body['agency']??''));
    $name=sanitize_text_field((string)($body['name']??''));
    if ($agency==='' || $name==='') return new WP_Error('seo001_partner_identity_required','Identifica la agencia y persona de contacto.',array('status'=>422));
    return $pre;
},9,3);


/* Dedicated B2B API: preserves structured agency/need and explicit source.
 * Reuses the existing PROD lead guard and rate limits without touching it.
 * No effects from rejected requests; published non-SEO pages remain unchanged. */
add_action('rest_api_init',static function() {
    register_rest_route('cerebro-seo001/v0','/partner-lead',array(
        'methods'=>'POST',
        'permission_callback'=>'__return_true',
        'callback'=>static function(WP_REST_Request $req) {
            if (strtolower((string)wp_parse_url(home_url('/'),PHP_URL_HOST))!=='fenixcapital.es') {
                return new WP_Error('seo001_partner_host_invalid','Host no permitido.',array('status'=>403));
            }
            $raw=$req->get_json_params();
            if (!is_array($raw) || strlen((string)wp_json_encode($raw))>10000) {
                return new WP_Error('seo001_partner_payload_invalid','Solicitud no válida.',array('status'=>413));
            }
            $allowed=array(52661,52663,52714,52716);
            $landing=absint($raw['landing_id']??0);
            if (!in_array($landing,$allowed,true) || strtoupper((string)($raw['funnel']??''))!=='PARTNER') {
                return new WP_Error('seo001_partner_landing_invalid','Solicitud fuera del circuito profesional.',array('status'=>422));
            }
            if (!empty($raw['website'])) {
                return new WP_REST_Response(array('ok'=>true,'accepted'=>true,'honeypot'=>true),202);
            }
            $consent=filter_var($raw['consent_privacy']??false,FILTER_VALIDATE_BOOLEAN);
            if (!$consent) {
                return new WP_Error('seo001_partner_privacy_required','Se requiere la aceptación de privacidad.',array('status'=>422));
            }
            $agency=sanitize_text_field((string)($raw['agency']??''));
            $name=sanitize_text_field((string)($raw['name']??''));
            if ($agency==='' || $name==='' || strlen($agency)>130 || strlen($name)>140) {
                return new WP_Error('seo001_partner_identity_required','Agencia y contacto obligatorios.',array('status'=>422));
            }
            $allowedNeeds=array(
                'Seguimiento hipotecario de compradores',
                'Coordinar compraventas encadenadas',
                'Estudio financiero de una operación',
                'Colaboración general con la inmobiliaria'
            );
            $need=sanitize_text_field((string)($raw['partner_need']??''));
            if (!in_array($need,$allowedNeeds,true)) {
                return new WP_Error('seo001_partner_need_invalid','Selecciona un tipo de colaboración válido.',array('status'=>422));
            }
            if (!function_exists('fenix_cerebro_lead_payload') || !function_exists('fenix_cerebro_forward_lead')) {
                return new WP_Error('seo001_partner_bridge_unavailable','Captación temporalmente no disponible.',array('status'=>503));
            }
            $payload=fenix_cerebro_lead_payload($raw);
            $payload['source']='web_agency_partner';
            $payload['funnel']='PARTNER';
            $payload['agency']=$agency;
            $payload['partner_need']=$need;
            $payload['consent_privacy']=true;
            $payload['consent_marketing']=filter_var($raw['consent_marketing']??false,FILTER_VALIDATE_BOOLEAN);
            $idem=sanitize_text_field((string)$req->get_header('x-fenix-idempotency-key'));
            $result=fenix_cerebro_forward_lead($payload,$idem);
            if (is_wp_error($result)) return $result;
            return new WP_REST_Response($result,!empty($result['lead_created'])?201:200);
        }
    ));
});
