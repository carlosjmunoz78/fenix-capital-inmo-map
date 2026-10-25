export const KINETIC_CAPTIONS_VERSION = '2.7.0';

function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }
function esc(text) { return String(text ?? '').replace(/[{}]/g, '').replace(/\n/g, ' '); }
function assTime(sec) {
  const s = Math.max(0, Number(sec) || 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const whole = Math.floor(s % 60);
  const cs = Math.floor((s - Math.floor(s)) * 100);
  return `${h}:${String(m).padStart(2, '0')}:${String(whole).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

function chunkWords(text, maxWords = 4) {
  const words = esc(text).split(/\s+/).filter(Boolean);
  const chunks = [];
  for (let i = 0; i < words.length; i += maxWords) chunks.push(words.slice(i, i + maxWords).join(' '));
  return chunks;
}

export function planKineticCaptionsV27({ blocks, width = 1080, height = 1920, font_name = 'DejaVu Sans' } = {}) {
  if (!Array.isArray(blocks) || blocks.length === 0) throw new Error('KINETIC_CAPTION_BLOCKS_REQUIRED');
  const events = [];
  for (let bi = 0; bi < blocks.length; bi++) {
    const b = blocks[bi] || {};
    const start = Number(b.start_sec ?? 0);
    const end = Number(b.end_sec ?? (start + 2));
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) throw new Error(`KINETIC_CAPTION_TIMING_INVALID:${bi + 1}`);
    const chunks = chunkWords(b.text, Number(b.max_words_per_burst || 4));
    if (!chunks.length) continue;
    const duration = end - start;
    const slot = duration / chunks.length;
    chunks.forEach((phrase, ci) => {
      const evStart = start + ci * slot;
      const evEnd = ci === chunks.length - 1 ? end : Math.min(end, evStart + slot + 0.08);
      const emphasis = /\b(para|no|hoy|datos|primero|decide|casa|hipoteca|100%|24h|24 h)\b/i.test(phrase);
      events.push({
        event_id: `b${bi + 1}-c${ci + 1}`,
        start_sec: Number(evStart.toFixed(3)),
        end_sec: Number(evEnd.toFixed(3)),
        text: phrase,
        emphasis,
        x: Math.round(width / 2),
        y: Math.round(height * 0.78),
        font_size: emphasis ? Math.round(clamp(width * 0.074, 44, 86)) : Math.round(clamp(width * 0.064, 38, 76)),
        motion: ci % 3 === 0 ? 'PUNCH_IN' : ci % 3 === 1 ? 'RISE' : 'LOCKED_POP',
      });
    });
  }
  return {
    schema_version: '1.0.0',
    renderer_version: KINETIC_CAPTIONS_VERSION,
    width,
    height,
    font_name,
    events,
    burned_in_required: true,
    sidecar_only_forbidden: true,
    publish_authorized: false,
    promotion_eligible: false,
    human_creative_review_required: true,
  };
}

function motionTags(event) {
  const base = `\\an2\\pos(${event.x},${event.y})\\fs${event.font_size}\\bord4\\shad0\\1c&HFFFFFF&\\3c&H101010&`;
  if (event.motion === 'PUNCH_IN') return `${base}\\fscx82\\fscy82\\t(0,140,\\fscx108\\fscy108)\\t(140,260,\\fscx100\\fscy100)\\fad(35,90)`;
  if (event.motion === 'RISE') return `${base}\\move(${event.x},${event.y + 54},${event.x},${event.y},0,180)\\fad(45,90)`;
  return `${base}\\fscx96\\fscy96\\t(0,110,\\fscx102\\fscy102)\\t(110,220,\\fscx100\\fscy100)\\fad(30,80)`;
}

export function renderKineticAssV27(plan) {
  if (!plan?.events?.length) throw new Error('KINETIC_CAPTION_EVENTS_REQUIRED');
  if (plan.sidecar_only_forbidden !== true) throw new Error('KINETIC_CAPTION_BURNIN_POLICY_REQUIRED');
  const header = `[Script Info]\nScriptType: v4.00+\nPlayResX: ${plan.width}\nPlayResY: ${plan.height}\nScaledBorderAndShadow: yes\nWrapStyle: 2\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Fenix,${plan.font_name},62,&H00FFFFFF,&H000000FF,&H00101010,&H00000000,-1,0,0,0,100,100,0,0,1,4,0,2,80,80,180,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;
  const lines = plan.events.map((event) => {
    const accent = event.emphasis ? '{\\1c&H55D7FF&}' : '';
    return `Dialogue: 0,${assTime(event.start_sec)},${assTime(event.end_sec)},Fenix,,0,0,0,,{${motionTags(event)}}${accent}${esc(event.text)}`;
  });
  return header + lines.join('\n') + '\n';
}

export function ffmpegBurnInArgs({ input, assFile, output }) {
  if (!input || !assFile || !output) throw new Error('KINETIC_CAPTION_FFMPEG_PATHS_REQUIRED');
  return ['-hide_banner', '-loglevel', 'error', '-i', input, '-vf', `ass=${assFile}`, '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-c:a', 'copy', '-movflags', '+faststart', '-y', output];
}
