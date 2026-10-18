<?php
/**
 * Plugin Name: CEREBRO SEO001 Elementor Dependency Guard
 * Description: PREPROD-only guard that prevents CEREBRO Universal's native-form handle from pulling Elementor frontend on non-Elementor pages.
 * Version: 0.1.0-preprod
 * Author: CEREBRO OS / Fénix Capital
 * Requires PHP: 8.1
 */

defined('ABSPATH') || exit;

const CEREBRO_SEO001_EDG_VERSION = '0.1.0-preprod';
const CEREBRO_SEO001_EDG_NATIVE_HANDLE = 'cerebro-universal-landing-native-form';

function cerebro_seo001_edg_is_staging_host(): bool {
    $host = wp_parse_url(home_url('/'), PHP_URL_HOST);
    return is_string($host) && strtolower($host) === 'staging.fenixcapital.es';
}

function cerebro_seo001_edg_is_elementor_document(int $post_id): bool {
    if ($post_id <= 0) {
        return false;
    }

    if (class_exists('\\Elementor\\Plugin')) {
        try {
            $documents = \Elementor\Plugin::$instance->documents ?? null;
            if ($documents && method_exists($documents, 'get')) {
                $document = $documents->get($post_id);
                if ($document && method_exists($document, 'is_built_with_elementor')) {
                    return (bool) $document->is_built_with_elementor();
                }
            }
        } catch (Throwable $e) {
            // Fail closed to the metadata check below. No mutation is performed here.
        }
    }

    return get_post_meta($post_id, '_elementor_edit_mode', true) === 'builder';
}

function cerebro_seo001_edg_other_enqueued_handle_needs_elementor_frontend(WP_Scripts $scripts): bool {
    foreach ((array) $scripts->queue as $queued_handle) {
        if ($queued_handle === CEREBRO_SEO001_EDG_NATIVE_HANDLE || $queued_handle === 'elementor-frontend') {
            continue;
        }
        if (!isset($scripts->registered[$queued_handle])) {
            continue;
        }
        $deps = (array) $scripts->registered[$queued_handle]->deps;
        if (in_array('elementor-frontend', $deps, true)) {
            return true;
        }
    }
    return false;
}

add_action('wp_enqueue_scripts', static function (): void {
    if (is_admin() || !cerebro_seo001_edg_is_staging_host()) {
        return;
    }

    $post_id = (int) get_queried_object_id();
    if (cerebro_seo001_edg_is_elementor_document($post_id)) {
        return;
    }

    $scripts = wp_scripts();
    $handle = CEREBRO_SEO001_EDG_NATIVE_HANDLE;

    if (!isset($scripts->registered[$handle])) {
        return;
    }

    $native = $scripts->registered[$handle];
    $deps = (array) $native->deps;
    if (!in_array('elementor-frontend', $deps, true)) {
        return;
    }

    // Smallest causal change: detach only the incorrect dependency edge.
    $native->deps = array_values(array_diff($deps, ['elementor-frontend']));

    // If nothing else explicitly requires Elementor frontend on this non-builder page,
    // ensure a top-level enqueue from the same runtime cannot keep the broken asset alive.
    if (!cerebro_seo001_edg_other_enqueued_handle_needs_elementor_frontend($scripts)) {
        wp_dequeue_script('elementor-frontend');
    }
}, 999999);
