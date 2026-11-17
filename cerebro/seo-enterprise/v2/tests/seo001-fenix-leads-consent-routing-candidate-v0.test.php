<?php
declare(strict_types=1);
require __DIR__ . '/../runtime/seo001-fenix-leads-consent-routing-candidate-v0.php';
use Fenix\Cerebro\SEO001\Leads\ConsentAndChannelCandidate as Gate;
$checks = 0;
function eq($actual, $expected, string $name): void {
    global $checks;
    $checks++;
    if ($actual !== $expected) throw new \RuntimeException("FAILED: " . $name);
}
$invalid = [false, 0, '0', 'false', 'no', 'off', '', null, [], ['true'], 2, -1];
foreach ($invalid as $n => $v) {
    eq(Gate::explicitlyChecked($v), false, 'negative consent '.$n);
}
foreach ([true, 1, '1', 'true', 'TRUE', 'on', 'yes', ' yes '] as $n => $v) {
    eq(Gate::explicitlyChecked($v), true, 'affirmative checkbox value '.$n);
}
$base = [
    'trusted_form_inventory'=>true,
    'form_allowlisted'=>true,
    'server_verified_origin'=>'elementor',
    'capture_channel'=>'elementor_server',
    'stable_idempotency_key'=>'form-000000000000001'
];
$accepted = Gate::evaluate(['consent_privacy'=>'on', 'consent_marketing'=>'false', 'email'=>'example.invalid'], $base);
eq($accepted['status'], 'ELIGIBLE_FOR_PRIVATE_E2E_ONLY', 'eligible contract only');
eq($accepted['marketing_opt_in_value'], false, 'marketing false never opt in');
eq($accepted['newsletter_send_authorized'], false, 'no newsletter side effects');
eq($accepted['crm_write_authorized'], false, 'no CRM mutations');
eq($accepted['independently_certified'], false, 'never self certify');
eq(array_key_exists('email', $accepted), false, 'no PII returned');
$wrongChannel = $base;
$wrongChannel['capture_channel'] = 'generic_browser';
eq(Gate::evaluate(['consent_privacy'=>true],$wrongChannel)['status'],'HOLD','Elementor generic capture denied');
$untrusted = $base;
$untrusted['trusted_form_inventory'] = false;
eq(Gate::evaluate(['consent_privacy'=>true],$untrusted)['status'],'HOLD','untrusted origin denied');
$unknown = $base;
$unknown['server_verified_origin'] = 'any_form';
eq(Gate::evaluate(['consent_privacy'=>true],$unknown)['status'],'HOLD','unknown form denied');
$privacyMissing = Gate::evaluate(['consent_privacy'=>'false'], $base);
eq($privacyMissing['status'],'HOLD','false privacy never accepted');
eq($privacyMissing['reason'],'PRIVACY_NOTICE_NOT_ACKNOWLEDGED','privacy negative reason');
$keyMissing = $base;
unset($keyMissing['stable_idempotency_key']);
eq(Gate::evaluate(['consent_privacy'=>true],$keyMissing)['status'],'HOLD','missing retry key denied');
foreach (['native_b2b'=>'native_b2b_endpoint','generic_allowlisted'=>'generic_browser'] as $origin=>$channel) {
    $context=$base;
    $context['server_verified_origin']=$origin;
    $context['capture_channel']=$channel;
    $x=Gate::evaluate(['consent_privacy'=>true,'consent_marketing'=>true],$context);
    eq($x['status'],'ELIGIBLE_FOR_PRIVATE_E2E_ONLY','verified route '.$origin);
    eq($x['marketing_opt_in_value'],true,'explicit marketing '.$origin);
    eq($x['backend_idempotency_proven'],false,'actual dedup not asserted '.$origin);
}
eq(Gate::evaluate(['consent_privacy'=>'on'],$base)['stable_idempotency_key'],
   Gate::evaluate(['consent_privacy'=>'on'],$base)['stable_idempotency_key'],
   'stable identical retry key in read-only fixture');
echo json_encode(['state'=>'ISOLATED_CONTRACT_PASS_NOT_LIVE_E2E',
 'assertions'=>$checks,'prod_writes'=>0,'real_clients_used'=>false,'release_authorized'=>false],JSON_THROW_ON_ERROR).PHP_EOL;
