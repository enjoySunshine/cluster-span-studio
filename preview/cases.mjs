// The strings under test, shared by the preview (draw.mjs) and the
// measurement (measure.mjs), so both always look at the same runs.
export const CASES = [
  // नमस्ते — half-form + vowel sign stay in one cluster
  ['NotoSans/NotoSansDevanagari-Regular.ttf', 'नमस्ते'],
  // क्षि — pre-base reordered vowel stays with the ligature
  ['NotoSans/NotoSansDevanagari-Regular.ttf', 'क्षि'],
  // क  क — the two spaces group into one cluster
  ['NotoSans/NotoSansDevanagari-Regular.ttf', 'क  क'],
  // မြန်မာ — pre-base reordered medial stays with its base
  ['NotoSans/NotoSansMyanmar-Regular.ttf', 'မြန်မာ'],
  // ᬓᬶ — base + vowel sign, one cluster
  ['NotoSans/NotoSansBalinese-Regular.ttf', 'ᬓᬶ'],
  // x + combining acute + combining diaeresis — Latin marks fallback
  ['FontkitMarkFallbackTest/FontkitMarkFallbackTest-Italic.ttf', 'x́̈'],
];

/**
 * The per-cluster readout both tools show: every glyph's id and pen x
 * position inside each cluster, derived from the run's own positions —
 * the single recording of glyph positions, read (never copied) here.
 */
export function clusterRows(run) {
  return run.clusters.map((cluster) => {
    let x = cluster.x;
    let glyphs = [];
    for (let i = cluster.start; i < cluster.end; i++) {
      glyphs.push({
        id: run.glyphs[i].id,
        x,
        advance: run.positions[i].xAdvance,
      });
      x += run.positions[i].xAdvance;
    }

    return { x: cluster.x, advance: cluster.advance, glyphs };
  });
}
