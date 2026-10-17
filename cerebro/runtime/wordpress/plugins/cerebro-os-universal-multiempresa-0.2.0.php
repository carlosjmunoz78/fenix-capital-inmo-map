<?php
/**
 * Plugin Name: CEREBRO OS Universal Gateway · Multiempresa
 * Description: Gateway universal reusable de CEREBRO OS para nuevas empresas y webs. Multiempresa, configurable, fail-closed y preparado para envolver proveedores WordPress existentes.
 * Version: 0.2.0
 * Author: CEREBRO OS
 */
if (!defined('ABSPATH')) { exit; }

define('CEREBRO_MULTI_VERSION','0.2.0');
define('CEREBRO_MULTI_OPTION','cerebro_os_universal_multiempresa');

function cerebro_multi_defaults() {
    return [
        'company_id'=>'',
        'engine_id'=>'PLUGIN-UNIVERSAL-001',
        'environment'=>'PREPROD',
        'lead_endpoint_preprod'=>'',
        'lead_endpoint_prod'=>'',
        'canonical_email'=>'',
        'legacy_email'=>'',
        'enable_native_lead_capture'=>0,
        'allow_prod_mutations'=>0,
    ];
}
function cerebro_multi_cfg() {
    $saved=get_option(CEREBRO_MULTI_OPTION,[]);
    if(!is_array($saved)) $saved=[];
    return apply_filters('cerebro_universal_multiempresa_config',array_merge(cerebro_multi_defaults(),$saved));
}
function cerebro_multi_env() {
    $env=strtoupper((string)(cerebro_multi_cfg()['environment']??'PREPROD'));
    return in_array($env,['LAB','PREPROD','PROD'],true)?$env:'PREPROD';
}
function cerebro_multi_ready() {
    $cfg=cerebro_multi_cfg();
    return !empty($cfg['company_id'])&&!empty($cfg['engine_id']);
}
function cerebro_multi_endpoint() {
    $cfg=cerebro_multi_cfg();
    $endpoint=cerebro_multi_env()==='PROD'?(string)($cfg['lead_endpoint_prod']??''):(string)($cfg['lead_endpoint_preprod']??'');
    return esc_url_raw((string)apply_filters('cerebro_universal_multiempresa_lead_endpoint',$endpoint,$cfg));
}
function cerebro_multi_prod_mutations_allowed() {
    $cfg=cerebro_multi_cfg();
    return cerebro_multi_env()==='PROD'&&!empty($cfg['allow_prod_mutations']);
}
function cerebro_multi_existing_runtime_present() {
    $server=rest_get_server(); $routes=$server?$server->get_routes():[];
    foreach(array_keys($routes) as $route){ if(strpos($route,'/cerebro-universal/v1')===0)return true; }
    return false;
}
function cerebro_multi_payload($data) {
    $phone=isset($data['phone'])?preg_replace('/\D+/','',(string)$data['phone']):'';
    return [
        'email'=>isset($data['email'])?strtolower(trim(sanitize_email($data['email']))):'',
        'phone'=>$phone,
        'name'=>isset($data['name'])?trim(sanitize_text_field($data['name'])):'',
        'source'=>isset($data['source'])?sanitize_text_field($data['source']):'web',
        'landing_url'=>isset($data['landing_url'])?esc_url_raw($data['landing_url']):'',
        'utm_source'=>isset($data['utm_source'])?sanitize_text_field($data['utm_source']):'',
        'utm_medium'=>isset($data['utm_medium'])?sanitize_text_field($data['utm_medium']):'',
        'utm_campaign'=>isset($data['utm_campaign'])?sanitize_text_field($data['utm_campaign']):'',
        'consent_privacy'=>!empty($data['consent_privacy']),
        'consent_marketing'=>!empty($data['consent_marketing']),
        'website'=>isset($data['website'])?sanitize_text_field($data['website']):'',
    ];
}
function cerebro_multi_forward_lead($payload,$idem='') {
    if(!cerebro_multi_ready()) return new WP_Error('cerebro_not_configured','CEREBRO Universal no está configurado.',['status'=>503]);
    if(!empty($payload['website'])) return ['ok'=>true,'accepted'=>true,'honeypot'=>true];
    if(empty($payload['email'])&&empty($payload['phone'])) return new WP_Error('identifier_required','Debe existir al menos un email o teléfono.',['status'=>422]);
    if(!empty($payload['email'])&&!is_email($payload['email'])) return new WP_Error('invalid_email','Email no válido.',['status'=>422]);
    if(!empty($payload['phone'])&&(strlen($payload['phone'])<7||strlen($payload['phone'])>15)) return new WP_Error('invalid_phone','Teléfono no válido.',['status'=>422]);
    $endpoint=cerebro_multi_endpoint();
    if(!$endpoint) return new WP_Error('lead_endpoint_missing','Endpoint de leads no configurado.',['status'=>503]);
    if(!$idem)$idem='wp-'.substr(hash('sha256',($payload['email']?:$payload['phone']).'|'.microtime(true).'|'.wp_rand()),0,40);
    $response=wp_remote_post($endpoint,[
        'timeout'=>8,'redirection'=>0,
        'headers'=>[
            'Content-Type'=>'application/json','Origin'=>home_url(),
            'x-cerebro-idempotency-key'=>$idem,
            'User-Agent'=>'CEREBRO-Universal-Multiempresa/'.CEREBRO_MULTI_VERSION,
        ],
        'body'=>wp_json_encode($payload),
    ]);
    if(is_wp_error($response))return $response;
    $status=(int)wp_remote_retrieve_response_code($response);
    $body=json_decode((string)wp_remote_retrieve_body($response),true);
    if($status<200||$status>=300||!is_array($body)||empty($body['ok'])){
        return new WP_Error('cerebro_rejected','CEREBRO no pudo aceptar la operación.',['status'=>$status?:502,'remote'=>is_array($body)?$body:null]);
    }
    return $body;
}
function cerebro_multi_replace_email($html) {
    $cfg=cerebro_multi_cfg(); $old=(string)($cfg['legacy_email']??''); $new=(string)($cfg['canonical_email']??'');
    if(!$old||!$new||!is_string($html)||$html==='')return $html;
    return str_ireplace($old,$new,$html);
}
add_filter('the_content','cerebro_multi_replace_email',999);
add_filter('widget_text','cerebro_multi_replace_email',999);
add_filter('widget_text_content','cerebro_multi_replace_email',999);
add_filter('wp_nav_menu_items','cerebro_multi_replace_email',999);

add_action('rest_api_init',function(){
    register_rest_route('cerebro-os/v1','/status',[
        'methods'=>'GET','permission_callback'=>'__return_true',
        'callback'=>function(){ $cfg=cerebro_multi_cfg(); return new WP_REST_Response([
            'ok'=>true,'plugin'=>'CEREBRO OS Universal Gateway · Multiempresa','plugin_version'=>CEREBRO_MULTI_VERSION,
            'configured'=>cerebro_multi_ready(),'company_id'=>$cfg['company_id']??'','engine_id'=>$cfg['engine_id']??'',
            'environment'=>cerebro_multi_env(),'existing_universal_runtime'=>cerebro_multi_existing_runtime_present(),
            'native_lead_capture'=>!empty($cfg['enable_native_lead_capture']),
            'prod_mutations_allowed'=>cerebro_multi_prod_mutations_allowed(),'cost_additional_eur'=>0,
        ],200); }
    ]);
    register_rest_route('cerebro-os/v1','/capabilities',[
        'methods'=>'GET','permission_callback'=>'__return_true',
        'callback'=>fn()=>new WP_REST_Response(['ok'=>true,'capabilities'=>[
            'multiempresa_config','lab_preprod_prod_isolation','provider_preservation','existing_runtime_wrap',
            'optional_native_lead_capture','explicit_marketing_consent','idempotency',
            'canonical_email_normalization','status','capabilities','prod_default_deny'
        ]],200)
    ]);
    $cfg=cerebro_multi_cfg();
    if(!empty($cfg['enable_native_lead_capture'])){
        register_rest_route('cerebro-os/v1','/lead',[
            'methods'=>'POST','permission_callback'=>'__return_true',
            'callback'=>function(WP_REST_Request $request){
                $payload=cerebro_multi_payload($request->get_json_params()?:[]);
                $idem=sanitize_text_field((string)$request->get_header('x-cerebro-idempotency-key'));
                $result=cerebro_multi_forward_lead($payload,$idem);
                if(is_wp_error($result))return $result;
                return new WP_REST_Response($result,!empty($result['lead_created'])?201:200);
            }
        ]);
    }
});
add_action('admin_menu',function(){ add_options_page('CEREBRO OS Universal','CEREBRO OS Universal','manage_options','cerebro-os-universal','cerebro_multi_settings_page'); });
add_action('admin_init',function(){
    register_setting('cerebro_multi_group',CEREBRO_MULTI_OPTION,['type'=>'array','sanitize_callback'=>'cerebro_multi_sanitize','default'=>cerebro_multi_defaults()]);
});
function cerebro_multi_sanitize($input){
    $out=cerebro_multi_defaults();
    $out['company_id']=sanitize_key($input['company_id']??'');
    $out['engine_id']=sanitize_text_field($input['engine_id']??'PLUGIN-UNIVERSAL-001');
    $env=strtoupper(sanitize_text_field($input['environment']??'PREPROD'));
    $out['environment']=in_array($env,['LAB','PREPROD','PROD'],true)?$env:'PREPROD';
    $out['lead_endpoint_preprod']=esc_url_raw($input['lead_endpoint_preprod']??'');
    $out['lead_endpoint_prod']=esc_url_raw($input['lead_endpoint_prod']??'');
    $out['canonical_email']=sanitize_email($input['canonical_email']??'');
    $out['legacy_email']=sanitize_email($input['legacy_email']??'');
    $out['enable_native_lead_capture']=empty($input['enable_native_lead_capture'])?0:1;
    $out['allow_prod_mutations']=0;
    if(!empty($input['allow_prod_mutations'])) add_settings_error('cerebro_multi','prod_default_deny','Las mutaciones PROD permanecen denegadas por defecto.','warning');
    return $out;
}
function cerebro_multi_settings_page(){
    if(!current_user_can('manage_options'))return; $cfg=cerebro_multi_cfg(); $name=CEREBRO_MULTI_OPTION;
    echo '<div class="wrap"><h1>CEREBRO OS Universal · Multiempresa</h1><p>Fail-closed. Sin company_id o endpoint no ejecuta integraciones externas.</p>';
    settings_errors('cerebro_multi'); echo '<form method="post" action="options.php">'; settings_fields('cerebro_multi_group'); echo '<table class="form-table">';
    $fields=['company_id'=>['Company ID','text'],'engine_id'=>['Engine ID','text'],'lead_endpoint_preprod'=>['Lead endpoint LAB/PREPROD','url'],'lead_endpoint_prod'=>['Lead endpoint PROD','url'],'canonical_email'=>['Email canónico','email'],'legacy_email'=>['Email anterior','email']];
    foreach($fields as $key=>$meta){$value=esc_attr((string)($cfg[$key]??''));echo '<tr><th><label for="'.$key.'">'.esc_html($meta[0]).'</label></th><td><input class="regular-text" id="'.$key.'" name="'.$name.'['.$key.']" type="'.$meta[1].'" value="'.$value.'"></td></tr>';}
    echo '<tr><th>Environment</th><td><select name="'.$name.'[environment]">'; foreach(['LAB','PREPROD','PROD'] as $env)echo '<option value="'.$env.'" '.selected($cfg['environment'],$env,false).'>'.$env.'</option>'; echo '</select></td></tr>';
    echo '<tr><th>Captura nativa</th><td><label><input type="checkbox" name="'.$name.'[enable_native_lead_capture]" value="1" '.checked(!empty($cfg['enable_native_lead_capture']),true,false).'> Activar solo si no existe ya otro capturador</label></td></tr>';
    echo '<tr><th>Mutaciones PROD</th><td><strong>DENEGADAS POR DEFECTO</strong></td></tr></table>'; submit_button(); echo '</form></div>';
}
