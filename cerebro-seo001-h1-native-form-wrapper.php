<?php
/**
 * Plugin Name: CEREBRO SEO001 H1 Native Form Dependency Wrapper
 * Description: PREPROD-only compatibility wrapper for CEREBRO Universal native form. On non-Elementor requests in staging, removes only the accidental elementor-frontend dependency from the native-form handle. No PROD writes.
 * Version: 0.1.0
 * Author: CEREBRO OS / Fénix Capital
 * Requires PHP: 8.1
 */

if (!defined('ABSPATH')) {
    exit;
}

const CEREBRO_SEO001_H1_WRAPPER_VERSION = '0.1.0';
const CEREBRO_SEO001_H1_TARGET_HOST = 'staging.fenixcapital.es';
const CEREBRO_SEO001_H1_NATIVE_HANDLE = 'cerebro-universal-landing-native-form';
const CEREBRO_SEO001_H1_DEPENDENCY = 'elementor-frontend';

$GLOBALS['cerebro_seo001_h1_wrapper_status'] = 'BOOT';

function cerebro_seo001_h1_is_staging_host(): bool
{
    $host = wp_parse_url(home_url('/'), PHP_URL_HOST);
    return is_string($host) && strtolower($host) === CEREBRO_SEO001_H1_TARGET_HOST;
}

function cerebro_seo001_h1_is_elementor_document(int $post_id): bool
{
    if ($post_id <= 0) {
        return false;
    }

    if (class_exists('\\Elementor\\Plugin')) {
        try {
            $plugin = \Elementor\Plugin::$instance ?? null;
            $documents = is_object($plugin) ? ($plugin->documents ?? null) : null;
            if (is_object($documents) && method_exists($documents, 'get')) {
                $document = $documents->get($post_id);
                if (is_object($document)
                    && method_exists($document, 'is_built_with_elementor')
                    && $document->is_built_with_elementor()) {
                    return true;
                }
            }
        } catch (\Throwable $e) {
        }
    }

    if ('builder' === (string) get_post_meta($post_id, '_elementor_edit_mode', true)) {
        return true;
    }

    $elementor_data = get_post_meta($post_id, '_elementor_data', true);
    if (is_string($elementor_data)) {
        $trimmed = trim($elementor_data);
        if ($trimmed !== '' && $trimmed !== '[]' && $trimmed !== '{}') {
            return true;
        }
    }

    return false;
}

function cerebro_seo001_h1_set_status(string $status): void
{
    $GLOBALS['cerebro_seo001_h1_wrapper_status'] = $status;

    if (defined('WP_DEBUG_LOG') && WP_DEBUG_LOG) {
        error_log('[CEREBRO SEO001 H1 ' . CEREBRO_SEO001_H1_WRAPPER_VERSION . '] ' . $status);
    }
}

function cerebro_seo001_h1_fix_native_form_dependency(): void
{
    if (is_admin()) {
        cerebro_seo001_h1_set_status('NOOP_ADMIN');
        return;
    }

    if (!cerebro_seo001_h1_is_staging_host()) {
        cerebro_seo001_h1_set_status('NOOP_HOST_GUARD');
        return;
    }

    $scripts = wp_scripts();
    if (!is_object($scripts) || !isset($scripts->registered[CEREBRO_SEO001_H1_NATIVE_HANDLE])) {
        cerebro_seo001_h1_set_status('NOOP_NATIVE_HANDLE_ABSENT');
        return;
    }

    $post_id = (int) get_queried_object_id();
    if ($post_id > 0 && cerebro_seo001_h1_is_elementor_document($post_id)) {
        cerebro_seo001_h1_set_status('NOOP_ELEMENTOR_DOCUMENT');
        return;
    }

    $registered = $scripts->registered[CEREBRO_SEO001_H1_NATIVE_HANDLE];
    $deps = array_values((array) $registered->deps);

    if (!in_array(CEREBRO_SEO001_H1_DEPENDENCY, $deps, true)) {
        cerebro_seo001_h1_set_status('NOOP_DEPENDENCY_ABSENT');
        return;
    }

    $registered->deps = array_values(array_filter(
        $deps,
        static fn($dep): bool => $dep !== CEREBRO_SEO001_H1_DEPENDENCY
    ));

    cerebro_seo001_h1_set_status('APPLIED_REMOVE_ELEMENTOR_FRONTEND_DEP');
}
add_action('wp_enqueue_scripts', 'cerebro_seo001_h1_fix_native_form_dependency', 9999);

function cerebro_seo001_h1_observability_marker(): void
{
    if (is_admin() || !cerebro_seo001_h1_is_staging_host()) {
        return;
    }

    $status = isset($GLOBALS['cerebro_seo001_h1_wrapper_status'])
        ? sanitize_key((string) $GLOBALS['cerebro_seo001_h1_wrapper_status'])
        : 'unknown';

    echo "\n<!-- CEREBRO_SEO001_H1_WRAPPER version=" . esc_html(CEREBRO_SEO001_H1_WRAPPER_VERSION)
        . " status=" . esc_html($status) . " -->\n";
}
add_action('wp_footer', 'cerebro_seo001_h1_observability_marker', 9999);
