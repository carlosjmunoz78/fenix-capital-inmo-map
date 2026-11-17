<?php
declare(strict_types=1);
/**
 * SEO-001 read-only synthetic integration of the EXISTING versioned B2B
 * WordPress plugin callback (not a copy), using pure PHP WordPress shims.
 * NEVER connects to a real WordPress site, CRM, Supabase, email or internet.
 * This is NOT proof of full WordPress/Elementor E2E or legal compliance.
 */
define('ABSPATH', '/synthetic-isolated-lab/');
$GLOBALS['lab_actions'] = [];
$GLOBALS['lab_filters'] = [];
$GLOBALS['lab_shortcodes'] = [];
$GLOBALS['lab_routes'] = [];
$GLOBALS['lab_forwarded'] = [];
$GLOBALS['lab_page_id'] = 52661;
$GLOBALS['lab_forward_calls'] = 0;
function add_action($name, $callback, $priority = 10, $accepted_args = 1): void {
    $GLOBALS['lab_actions'][$name][] = $callback;
}
function add_filter($name, $callback, $priority = 10, $accepted_args = 1): void {
    $GLOBALS['lab_filters'][$name][] = $callback;
}
function add_shortcode($name, $callback): void {
    $GLOBALS['lab_shortcodes'][$name] = $callback;
}
function register_rest_route($namespace, $route, $options): void {
    $GLOBALS['lab_routes'][$namespace . $route] = $options;
}
function is_singular($types): bool {return true;}
function get_queried_object_id(): int {return $GLOBALS['lab_page_id'];}
function home_url($path = '/'): string {return 'https://fenixcapital.es' . $path;}
function wp_parse_url($url, $component = -1) {return parse_url($url, $component);}
function wp_json_encode($value): string {return json_encode($value, JSON_THROW_ON_ERROR);}
function sanitize_text_field($value): string {
    return trim(strip_tags((string)$value));
}
function absint($value): int {return abs((int)$value);}
function is_wp_error($value): bool {return $value instanceof WP_Error;}
class WP_Error {
    private string $code; private int $status;
    public function __construct(string $code, string $message, array $data = []) {
        $this->code = $code; $this->status = $data['status'] ?? 500;
    }
    public function get_error_code(): string {return $this->code;}
    public function get_error_data(): array {return ['status' => $this->status];}
}
class WP_REST_Request {
    public function __construct(private array $body, private string $route = '/cerebro-seo001/v0/partner-lead',
        private string $method = 'POST', private array $headers = []) {}
    public function get_json_params(): array {return $this->body;}
    public function get_route(): string {return $this->route;}
    public function get_method(): string {return $this->method;}
    public function get_header(string $key): string {return $this->headers[strtolower($key)] ?? '';}
}
class WP_REST_Response {
    public function __construct(private array $data, private int $status = 200) {}
    public function get_data(): array {return $this->data;}
    public function get_status(): int {return $this->status;}
}
/* Strictly mock two global functions that the REAL existing B2B
 * route expects to find in the existing Fenix Leads bridge.
 */
function fenix_cerebro_lead_payload($data): array {
    if (!is_array($data)) throw new RuntimeException('EXPECTED_ARRAY');
    return array_intersect_key($data, array_flip([
        'email','phone','name','agency','partner_need','consent_privacy',
        'consent_marketing','landing_id','funnel','source','website','message'
    ]));
}
function fenix_cerebro_forward_lead($payload, $idem = ''): array {
    $GLOBALS['lab_forward_calls']++;
    if (!is_array($payload)) throw new RuntimeException('PAYLOAD_INVALID');
    $GLOBALS['lab_forwarded'][] = ['payload' => $payload, 'key' => $idem];
    return ['ok' => true, 'lead_created' => true, 'mock_only' => true];
}
require __DIR__ . '/../wordpress/cerebro-seo001-partner-form-v0.php';
require __DIR__ . '/../runtime/seo001-fenix-leads-consent-routing-candidate-v0.php';
use Fenix\Cerebro\SEO001\Leads\ConsentAndChannelCandidate as Candidate;
$assertions = 0;
function check(bool $state, string $label): void {
    global $assertions;
    ++$assertions;
    if (!$state) throw new RuntimeException('INTEGRATION_FIXTURE_FAILED: ' . $label);
}
check(isset($GLOBALS['lab_shortcodes']['fenix_seo001_partner_form']), 'existing shortcode registered');
check(isset($GLOBALS['lab_actions']['rest_api_init']), 'existing rest init registered');
foreach ($GLOBALS['lab_actions']['rest_api_init'] as $callback) $callback();
check(isset($GLOBALS['lab_routes']['cerebro-seo001/v0/partner-lead']), 'existing B2B REST route registered');
check(isset($GLOBALS['lab_filters']['rest_pre_dispatch']), 'existing pre-dispatch scope hook registered');
$route = $GLOBALS['lab_routes']['cerebro-seo001/v0/partner-lead'];
check(($route['methods'] ?? '') === 'POST', 'B2B POST only');
$cb = $route['callback'];
check(is_callable($cb), 'B2B endpoint callable');
$valid = [
    'landing_id' => 52661,
    'funnel' => 'PARTNER',
    'agency' => 'Fenix Synthetic Laboratory',
    'name' => 'Test Contact',
    'email' => 'synthetic@example.invalid',
    'phone' => '',
    'partner_need' => 'Seguimiento hipotecario de compradores',
    'consent_privacy' => true,
    'consent_marketing' => false,
    'website' => '',
    'message' => 'Pure fixture without real customers'
];
$key = 'lab-shared-idempotency-00000001';
function request(array $body, string $key = 'lab-shared-idempotency-00000001'): WP_REST_Request {
    return new WP_REST_Request($body, '/cerebro-seo001/v0/partner-lead', 'POST',
        ['x-fenix-idempotency-key' => $key]);
}
function errorCode($x): ?string {return $x instanceof WP_Error ? $x->get_error_code() : null;}
function failure(array $body, string $expected): void {
    global $cb;
    $before = $GLOBALS['lab_forward_calls'];
    $response = $cb(request($body));
    check(errorCode($response) === $expected, 'expected rejection: '.$expected);
    check($GLOBALS['lab_forward_calls'] === $before, 'rejected payload not forwarded: '.$expected);
}
failure(array_merge($valid,['consent_privacy' => 'false']), 'seo001_partner_privacy_required');
failure(array_merge($valid,['consent_privacy' => '0']), 'seo001_partner_privacy_required');
failure(array_merge($valid,['consent_privacy' => false]), 'seo001_partner_privacy_required');
failure(array_merge($valid,['consent_privacy' => 'no']), 'seo001_partner_privacy_required');
failure(array_merge($valid,['consent_privacy' => null]), 'seo001_partner_privacy_required');
failure(array_merge($valid,['landing_id' => 11111]), 'seo001_partner_landing_invalid');
failure(array_merge($valid,['funnel' => 'B2C']), 'seo001_partner_landing_invalid');
failure(array_merge($valid,['agency' => '']), 'seo001_partner_identity_required');
failure(array_merge($valid,['name' => '']), 'seo001_partner_identity_required');
failure(array_merge($valid,['partner_need' => 'Unlisted need']), 'seo001_partner_need_invalid');
$giant = $valid; $giant['message'] = str_repeat('synthetic-lab-text', 1200);
failure($giant, 'seo001_partner_payload_invalid');
check(!seo001_partner_allowed_v0() === false, 'partner page in whitelist');
$GLOBALS['lab_page_id'] = 123456;
check(seo001_partner_allowed_v0() === false, 'partner shortcode disabled outside whitelist');
$GLOBALS['lab_page_id'] = 52661;
$trap = $cb(request(array_merge($valid,['website'=>'synthetic bot honeypot'])));
check($trap instanceof WP_REST_Response && $trap->get_status() === 202, 'honeypot accepted without delivery');
check($GLOBALS['lab_forward_calls'] === 0, 'no bot payload forwarded');
$ok = $cb(request($valid, $key));
check($ok instanceof WP_REST_Response && $ok->get_status() === 201, 'accepted through REAL versioned endpoint callback');
check($GLOBALS['lab_forward_calls'] === 1, 'single call for single accepted request');
$first = $GLOBALS['lab_forwarded'][0];
check($first['key'] === $key, 'caller-provided retry key retained');
check(($first['payload']['consent_privacy'] ?? null) === true, 'privacy normalized true after explicit checkbox');
check(($first['payload']['consent_marketing'] ?? null) === false, 'marketing remains false');
check(($first['payload']['funnel'] ?? '') === 'PARTNER', 'partner funnel retained');
check(($first['payload']['agency'] ?? '') === $valid['agency'], 'agency contract retained');
check(($first['payload']['source'] ?? '') === 'web_agency_partner', 'source attribution retained');
$marketing = $cb(request(array_merge($valid, ['consent_marketing' => 'false']), 'lab-other-idempotency-00000002'));
check($marketing instanceof WP_REST_Response, 'explicit marketing false accepted for lead');
check(($GLOBALS['lab_forwarded'][1]['payload']['consent_marketing'] ?? null) === false, 'string false does not opt into marketing');
/* Deliberately DO NOT assert backend deduplication. The mock is stateless and
 * cannot prove the WordPress bridge/CRM idempotency semantics.
 */
$stillHold = Candidate::evaluate(['consent_privacy'=>true], [
 'trusted_form_inventory'=>true, 'form_allowlisted'=>true,
 'server_verified_origin'=>'native_b2b','capture_channel'=>'native_b2b_endpoint',
 'stable_idempotency_key'=>$key
]);
check($stillHold['status']==='ELIGIBLE_FOR_PRIVATE_E2E_ONLY', 'candidate only eligible for private E2E');
check($stillHold['backend_idempotency_proven'] === false, 'backend dedup still HOLD');
check($stillHold['production_authorized'] === false, 'no production grant');
check($stillHold['crm_write_authorized'] === false, 'no real CRM mutation');
check($stillHold['newsletter_send_authorized'] === false, 'no newsletter send');
echo json_encode([
  'status'=>'MOCK_WORDPRESS_VERSIONED_B2B_CALLBACK_PASS',
  'assertions'=>$assertions,
  'fixture_only'=>true,
  'original_b2b_plugin_callback_invoked'=>true,
  'real_fenix_leads_plugin_exercised'=>false,
  'actual_elementor_runtime_exercised'=>false,
  'real_crm_calls'=>0,
  'production_writes'=>0,
  'release_authorized'=>false
],JSON_THROW_ON_ERROR) . PHP_EOL;
