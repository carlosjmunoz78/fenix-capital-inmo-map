export const FENIX_BRAND_THEME_VERSION = '2.7.0';

export const FENIX_BRAND_THEME = Object.freeze({
  company_id: 'fenix',
  engine_id: 'CREATIVE-BRAND-THEME-V27',
  environment: 'PREPROD',
  version: 'v2.7',
  source: 'Manual de marca FENIX CAPITAL 2025',
  palette: Object.freeze({
    charcoal: '#222222',
    purple: '#870064',
    amber: '#FFB71B',
    orange: '#FF5F00',
    white: '#FFFFFF',
    black: '#000000',
  }),
  typography: Object.freeze({
    logo_font: 'Montserrat',
    logo_font_scope: 'LOGO_ONLY',
    advertising_text_forbidden_fonts: ['Montserrat'],
    caption_font_preference: ['Inter', 'Noto Sans', 'DejaVu Sans'],
    caption_font_source: 'ENGINEERING_COMPLEMENT_NOT_DEFINED_BY_BRAND_MANUAL',
  }),
  caption: Object.freeze({
    primary_text: '#FFFFFF',
    emphasis_primary: '#FF5F00',
    emphasis_secondary: '#FFB71B',
    outline: '#222222',
    safe_margin_ratio: 0.10,
    max_words_per_burst: 3,
  }),
  governance: Object.freeze({
    manual_palette_only: true,
    montserrat_reserved_for_logo: true,
    no_unapproved_new_brand_color: true,
    publish_authorized: false,
    promotion_eligible: false,
  }),
});

export function assertFenixTextFontAllowed(fontName) {
  const normalized = String(fontName || '').trim().toLowerCase();
  if (!normalized) throw new Error('FENIX_TEXT_FONT_REQUIRED');
  const forbidden = FENIX_BRAND_THEME.typography.advertising_text_forbidden_fonts
    .map((font) => font.toLowerCase());
  if (forbidden.includes(normalized)) {
    throw new Error(`FENIX_BRAND_FONT_POLICY_RED:${fontName}:LOGO_ONLY`);
  }
  return fontName;
}

export function hexToAssBgr(hex) {
  const raw = String(hex || '').replace('#', '').toUpperCase();
  if (!/^[0-9A-F]{6}$/.test(raw)) throw new Error(`FENIX_BRAND_COLOR_INVALID:${hex}`);
  const r = raw.slice(0, 2);
  const g = raw.slice(2, 4);
  const b = raw.slice(4, 6);
  return `&H${b}${g}${r}&`;
}

export function assertFenixPaletteColor(hex) {
  const allowed = new Set(Object.values(FENIX_BRAND_THEME.palette).map((value) => value.toUpperCase()));
  const normalized = String(hex || '').toUpperCase();
  if (!allowed.has(normalized)) throw new Error(`FENIX_UNAPPROVED_BRAND_COLOR:${hex}`);
  return hex;
}
