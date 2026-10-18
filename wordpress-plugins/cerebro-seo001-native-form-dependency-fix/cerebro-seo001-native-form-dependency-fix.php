<?php
/**
 * Plugin Name: CEREBRO SEO001 Native Form Dependency Fix
 * Description: PREPROD-only compatibility wrapper. On non-Elementor pages, removes the accidental elementor-frontend dependency from the CEREBRO native-form handle without modifying the Universal plugin.
 * Version: 0.1.0-preprod
 * Author: CEREBRO OS / Fénix Capital
 */

defined('ABSPATH') || exit;

add_action('wp_enqueue_scripts', static function (): void {
    $host = wp_parse_url(home_url('/'), PHP_URL_HOST);
    if ($host !== 'staging.fenixcapital.es' || is_admin()) {
        return;
    }

    $handle = 'cerebro-universal-landing-native-form';
    $scripts = wp_scripts();

    if (!isset($scripts->registered[$handle])) {
        return;
    }

    $post_id = get_queried_object_id();
    $is_elementor = false;

    if ($post_id) {
        $is_elementor = 'builder' === get_post_meta($post_id, '_elementor_edit_mode', true);
    }

    if ($is_elementor) {
        return;
    }

    $deps = (array) $scripts->registered[$handle]->deps;
    if (!in_array('elementor-frontend', $deps, true)) {
        return;
    }

    $scripts->registered[$handle]->deps = array_values(array_diff($deps, ['elementor-frontend']));
}, 9999);
