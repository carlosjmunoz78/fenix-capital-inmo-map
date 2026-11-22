<?php
/**
 * SEO-001 · Fenix CEREBRO Leads · READONLY contract candidate, NOT a WordPress plugin.
 * No hooks, REST routes, remote calls, database operations or client identifiers.
 * Only after authentic private restore + independently reviewed E2E may the
 * existing WordPress plugin be surgically adapted to this contract.
 */
declare(strict_types=1);
namespace Fenix\Cerebro\SEO001\Leads;

final class ConsentAndChannelCandidate {
    private const CHANNELS = [
        'elementor' => 'elementor_server',
        'native_b2b' => 'native_b2b_endpoint',
        'generic_allowlisted' => 'generic_browser'
    ];

    public static function explicitlyChecked($raw): bool {
        if ($raw === true || $raw === 1) return true;
        if (!is_string($raw)) return false;
        return in_array(strtolower(trim($raw)), ['1', 'true', 'yes', 'on'], true);
    }

    private static function hold(string $reason): array {
        return [
            'status' => 'HOLD',
            'reason' => $reason,
            'production_authorized' => false,
            'crm_write_authorized' => false,
            'newsletter_send_authorized' => false,
            'independently_certified' => false
        ];
    }

    public static function evaluate(array $consent, array $verifiedContext): array {
        // Context must be constructed from a trusted server-side inventory,
        // never taken directly from a client-supplied "origin" field.
        if (($verifiedContext['trusted_form_inventory'] ?? null) !== true ||
            ($verifiedContext['form_allowlisted'] ?? null) !== true)
            return self::hold('FORM_INVENTORY_NOT_ATTESTED');

        $origin = $verifiedContext['server_verified_origin'] ?? null;
        $channel = $verifiedContext['capture_channel'] ?? null;
        if (!is_string($origin) || !array_key_exists($origin, self::CHANNELS) ||
            $channel !== self::CHANNELS[$origin])
            return self::hold('NOT_CANONICAL_CAPTURE_CHANNEL');

        if (!self::explicitlyChecked($consent['consent_privacy'] ?? null))
            return self::hold('PRIVACY_NOTICE_NOT_ACKNOWLEDGED');

        // This is NOT legal proof of affirmative consent, only a value gate.
        $marketing = self::explicitlyChecked($consent['consent_marketing'] ?? null);
        $key = $verifiedContext['stable_idempotency_key'] ?? null;
        if (!is_string($key) ||
            !preg_match('/^[a-z][a-z0-9._:-]{15,79}$/D', $key))
            return self::hold('STABLE_RETRY_KEY_NOT_VERIFIED');

        return [
            'status' => 'ELIGIBLE_FOR_PRIVATE_E2E_ONLY',
            'canonical_channel' => $channel,
            'stable_idempotency_key' => $key,
            'privacy_value_normalized' => true,
            'marketing_opt_in_value' => $marketing,
            'real_opt_in_evidence_attested' => false,
            'duplicate_delivery_proven_absent' => false,
            'backend_idempotency_proven' => false,
            'production_authorized' => false,
            'crm_write_authorized' => false,
            'newsletter_send_authorized' => false,
            'independently_certified' => false
        ];
    }
}
