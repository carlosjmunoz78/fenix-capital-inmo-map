<?php
/** READONLY LIVE-SOURCE EXCERPTS: no network, isolated test harness only.
 *  Copied unchanged from the two connected WordPress plugins; NOT a deployable plugin.
 *  This is not a signed original-provider receipt and not a live CRM E2E.
 */
const FENIX_CEREBRO_LEADS_VERSION = '1.3.6-preprod';
const FENIX_CEREBRO_LEADS_ENDPOINT_PROD = 'https://cluhljgonannaafpmblx.supabase.co/functions/v1/fenix-web-lead';
const FENIX_CEREBRO_LEADS_ENDPOINT_PREPROD = 'https://hnqlnvakzaywtafeiybt.supabase.co/functions/v1/fenix-web-lead-preprod';

function fenix_cerebro_leads_endpoint() {
    $host = strtolower((string) wp_parse_url(home_url('/'), PHP_URL_HOST));
    return str_contains($host, 'staging.') ? FENIX_CEREBRO_LEADS_ENDPOINT_PREPROD : FENIX_CEREBRO_LEADS_ENDPOINT_PROD;
}

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
        'city' => isset($data['city']) ? sanitize_text_field($data['city']) : '',
        'funnel' => isset($data['funnel']) ? strtoupper(sanitize_key($data['funnel'])) : '',
        'asset' => isset($data['asset']) ? sanitize_text_field($data['asset']) : '',
        'resource' => isset($data['resource']) ? sanitize_text_field($data['resource']) : '',
        'message' => isset($data['message']) ? sanitize_textarea_field($data['message']) : '',
        'landing_id' => isset($data['landing_id']) ? absint($data['landing_id']) : 0,
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

    $response = wp_remote_post(fenix_cerebro_leads_endpoint(), [
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
