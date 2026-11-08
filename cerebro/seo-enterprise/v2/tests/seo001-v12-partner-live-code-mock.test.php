<?php
/* SEO-001 V12: executes actual extracted WordPress PHP functions, all HTTP mocked.
 * No live requests, no real WP bootstrap, no customer data, zero external writes.
 */
error_reporting(E_ALL);
define('MINUTE_IN_SECONDS',60);
$GLOBALS['ctx']=['host'=>'fenixcapital.es','routes'=>[], 'actions'=>[], 'filters'=>[],
  'http'=>[], 'reply'=>['response'=>['code'=>201],'body'=>'{"ok":true,"lead_created":true,"lead_id":"MOCK_ONLY"}'],
  'rate'=>[], 'checks'=>0];
class WP_Error {
 public $code;public $message;public $data;
 function __construct($code,$message,$data=[]){$this->code=$code;$this->message=$message;$this->data=$data;}
 function get_error_code(){return $this->code;}
}
class WP_REST_Response {
 public $data;public $status;
 function __construct($data,$status=200){$this->data=$data;$this->status=$status;}
}
class WP_REST_Request {
 private $method;private $route;private $params;private $headers;
 function __construct($method='POST',$route='/cerebro-seo001/v0/partner-lead',$params=[],$headers=[]){
   $this->method=$method;$this->route=$route;$this->params=$params;$this->headers=$headers;
 }
 function get_method(){return $this->method;}
 function get_route(){return $this->route;}
 function get_json_params(){return $this->params;}
 function get_header($key){return $this->headers[strtolower($key)]??'';}
}
function add_action($name,$fn,$priority=10,$args=1){$GLOBALS['ctx']['actions'][$name][]=$fn;}
function add_filter($name,$fn,$priority=10,$args=1){$GLOBALS['ctx']['filters'][$name][]=$fn;}
function register_rest_route($namespace,$route,$params){$GLOBALS['ctx']['routes'][$namespace.$route]=$params;}
function home_url($p='/'){return 'https://'.$GLOBALS['ctx']['host'].$p;}
function wp_parse_url($url,$part=null){return parse_url($url,$part);}
function absint($v){return abs((int)$v);}
function sanitize_text_field($v){return trim(strip_tags((string)$v));}
function sanitize_textarea_field($v){return sanitize_text_field($v);}
function sanitize_email($v){return filter_var(trim((string)$v),FILTER_SANITIZE_EMAIL);}
function sanitize_key($v){return preg_replace('/[^a-z0-9_-]/','',strtolower((string)$v));}
function esc_url_raw($v){return (string)$v;}
function wp_json_encode($v){return json_encode($v,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);}
function is_email($v){return (bool)filter_var($v,FILTER_VALIDATE_EMAIL);}
function is_wp_error($v){return $v instanceof WP_Error;}
function wp_salt($scope){return 'OFFLINE_PHP_FAKE_SALT_NOT_REAL';}
function get_transient($key){return $GLOBALS['ctx']['rate'][$key]??false;}
function set_transient($key,$value,$expiry){$GLOBALS['ctx']['rate'][$key]=$value;return true;}
function wp_rand(){return 12345;}
function wp_remote_retrieve_response_code($v){return $v['response']['code']??0;}
function wp_remote_retrieve_body($v){return $v['body']??'';}
function wp_remote_post($url,$options){
 // Fail closed: NO real HTTP. Every path, including errors, is intercepted.
 if(!str_starts_with($url,'https://')||!str_contains($url,'.supabase.co/functions/v1/'))throw new RuntimeException('UNEXPECTED_NETWORK_TARGET');
 $GLOBALS['ctx']['http'][]=['url'=>$url,'options'=>$options];
 if(!empty($GLOBALS['ctx']['use_local_sink'])){
   $target=getenv('SEO001_V13_LOCAL_SINK');
   if(!is_string($target)||!preg_match('~^http://127\.0\.0\.1:34381/ingest$~D',$target))
     throw new RuntimeException('V13_LOOPBACK_ONLY');
   $header="Content-Type: application/json\r\nx-fenix-idempotency-key: ".
       $options['headers']['x-fenix-idempotency-key']."\r\n";
   $context=stream_context_create(['http'=>[
     'method'=>'POST','header'=>$header,'content'=>$options['body'],
     'timeout'=>3,'ignore_errors'=>true,'follow_location'=>0]]);
   $response=file_get_contents($target,false,$context);
   if($response===false)throw new RuntimeException('V13_LOOPBACK_TRANSPORT_FAILED');
   $line=$http_response_header[0]??'';
   if(!preg_match('/^HTTP\/1\.[01] ([0-9]{3})/',$line,$m))throw new RuntimeException('V13_BAD_STATUS');
   return ['response'=>['code'=>(int)$m[1]],'body'=>$response];
 }
 return $GLOBALS['ctx']['reply'];
}
require __DIR__.'/../fixtures/seo001-v12-live-plugin-excerpts.php';
foreach($GLOBALS['ctx']['actions']['rest_api_init']??[] as $hook){$hook();}
$route=$GLOBALS['ctx']['routes']['cerebro-seo001/v0/partner-lead']??null;
if(!$route||!is_callable($route['callback']))throw new RuntimeException('ROUTE_MISSING');
function check($ok,$name){$GLOBALS['ctx']['checks']++;if(!$ok)throw new RuntimeException('V12_FAIL_'.$name);}
function resetlab($host='fenixcapital.es'){
 $GLOBALS['ctx']['host']=$host;$GLOBALS['ctx']['http']=[];
 $GLOBALS['ctx']['rate']=[];$GLOBALS['ctx']['reply']=['response'=>['code'=>201],'body'=>'{"ok":true,"lead_created":true,"lead_id":"MOCK_ONLY"}'];
}
function baseinput(){return ['landing_id'=>52716,'funnel'=>'PARTNER','agency'=>'Agencia de prueba',
 'name'=>'Persona ficticia','email'=>'synthetic@example.invalid','phone'=>'','partner_need'=>'Colaboración general con la inmobiliaria',
 'message'=>'No incluye datos reales', 'consent_privacy'=>true, 'consent_marketing'=>false,
 'landing_url'=>'https://fenixcapital.es/?page_id=52716&preview=true','website'=>''];}
function submit($body,$headers=['x-fenix-idempotency-key'=>'LAB-ONLY-FIXED-KEY']){
 global $route;
 return $route['callback'](new WP_REST_Request('POST','/cerebro-seo001/v0/partner-lead',$body,$headers));
}
function denied($body,$code){
 resetlab();$r=submit($body);
 check($r instanceof WP_Error,'DENIED_CLASS_'.$code);
 check($r->get_error_code()===$code,'DENIED_CODE_'.$code);
 check(count($GLOBALS['ctx']['http'])===0,'DENIED_ZERO_FORWARD_'.$code);
}
resetlab();
$r=submit(baseinput());
check($r instanceof WP_REST_Response && $r->status===201,'POSITIVE_MOCK_RESPONSE');
check(count($GLOBALS['ctx']['http'])===1,'MOCK_POST_ONCE');
$c=$GLOBALS['ctx']['http'][0];
check($c['url']===FENIX_CEREBRO_LEADS_ENDPOINT_PROD,'LIVE_HOST_ROUTES_TO_PROD_NOT_STAGING');
check($c['options']['headers']['x-fenix-idempotency-key']==='LAB-ONLY-FIXED-KEY','IDEMPOTENCY');
check(($c['options']['redirection']??null)===0,'NO_REDIRECT');
$payload=json_decode($c['options']['body'],true);
check(is_array($payload)&&$payload['funnel']==='PARTNER'&&$payload['agency']==='Agencia de prueba','B2B_FIELDS');
check($payload['consent_privacy']===true&&$payload['consent_marketing']===false,'SEPARATED_CONSENT');
check($payload['source']==='web_agency_partner','SOURCE_BOUND');
resetlab();$b=baseinput();$b['email']='';$b['phone']='600123456';$b['consent_marketing']=true;
$r=submit($b);check($r instanceof WP_REST_Response&&$r->status===201,'PHONE_ONLY_POSITIVE');
check(json_decode($GLOBALS['ctx']['http'][0]['options']['body'],true)['consent_marketing']===true,'OPT_IN_TRUE');
resetlab();$b=baseinput();$b['website']='robot';
$r=submit($b);check($r instanceof WP_REST_Response&&$r->status===202,'HONEYPOT');
check(count($GLOBALS['ctx']['http'])===0,'HONEYPOT_NO_FORWARD');
$b=baseinput();$b['consent_privacy']=false;denied($b,'seo001_partner_privacy_required');
$b=baseinput();$b['landing_id']=52715;denied($b,'seo001_partner_landing_invalid');
$b=baseinput();$b['funnel']='B2C';denied($b,'seo001_partner_landing_invalid');
$b=baseinput();$b['agency']='';denied($b,'seo001_partner_identity_required');
$b=baseinput();$b['name']='';denied($b,'seo001_partner_identity_required');
$b=baseinput();$b['partner_need']='fake need';denied($b,'seo001_partner_need_invalid');
$b=baseinput();$b['email']='';$b['phone']='';denied($b,'identifier_required');
$b=baseinput();$b['email']='not an email';denied($b,'invalid_email');
$b=baseinput();$b['phone']='123';denied($b,'invalid_phone');
resetlab('staging.fenixcapital.es');
$r=submit(baseinput());
check($r instanceof WP_Error&&$r->get_error_code()==='seo001_partner_host_invalid','STAGING_HOST_REJECTED');
check(count($GLOBALS['ctx']['http'])===0,'STAGING_NO_NETWORK');
check(fenix_cerebro_leads_endpoint()===FENIX_CEREBRO_LEADS_ENDPOINT_PREPROD,'STAGING_BRIDGE_DIFFERENT_TARGET');
resetlab();$GLOBALS['ctx']['reply']=['response'=>['code'=>502],'body'=>'{"ok":false}'];
$r=submit(baseinput());
check($r instanceof WP_Error&&$r->get_error_code()==='cerebro_rejected','UPSTREAM_FAILURE_FAIL_CLOSED');
resetlab();for($i=0;$i<10;$i++)submit(baseinput());
$before=count($GLOBALS['ctx']['http']);$r=submit(baseinput());
check($r instanceof WP_Error&&$r->get_error_code()==='rate_limited','RATE_LIMIT');
check(count($GLOBALS['ctx']['http'])===$before,'RATE_LIMIT_NO_EXTRA_FORWARD');
if(getenv('SEO001_V13_LOCAL_SINK')){
 resetlab();$GLOBALS['ctx']['use_local_sink']=true;
 $b=baseinput();$header=['x-fenix-idempotency-key'=>'LAB-V13-FIXED-001'];
 $r1=submit($b,$header);
 check($r1 instanceof WP_REST_Response&&$r1->status===201,'LOCAL_SINK_FIRST');
 check($r1->data['lead_id']==='LAB-LOCAL-ONLY','LOCAL_SINK_RECEIPT');
 $r2=submit($b,$header);
 check($r2 instanceof WP_REST_Response&&$r2->status===200,'LOCAL_SINK_DUPLICATE');
 check($r2->data['lead_created']===false&&$r2->data['deduplicated']===true,'LOCAL_SINK_DEDUPE');
 check(count($GLOBALS['ctx']['http'])===2,'LOCAL_SINK_TWO_CALLS');
 $GLOBALS['ctx']['use_local_sink']=false;
}
echo json_encode(['status'=>'MOCKED_ORIGINAL_PHP_PATH_PASS_REAL_CRM_E2E_HOLD',
 'checks'=>$GLOBALS['ctx']['checks'],'real_http_requests'=>0,'live_crm_writes'=>0,
 'simulated_forward_calls'=>$before,'loopback_http_requests'=>getenv('SEO001_V13_LOCAL_SINK')?2:0,'production_publish_enabled'=>false,
 'source'=>'exact_excerpt_of_two_active_wordpress_plugins_not_live_environment',
 'positive_real_crm_e2e_verified'=>false],JSON_UNESCAPED_UNICODE)."\n";
