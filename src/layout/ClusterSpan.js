/**
 * A span of consecutive glyphs in a GlyphRun that forms a single cluster —
 * the unit cursors and line breaking measure, and the unit the preview
 * outlines. The span only references the run's own `glyphs` and `positions`
 * arrays by index, so no per-glyph positions are recorded a second time.
 */
export class ClusterSpan {
  constructor(start, end, x, advance) {
    /**
     * Index of the cluster's first glyph in the run.
     * @type {number}
     */
    this.start = start;

    /**
     * Index one past the cluster's last glyph in the run.
     * @type {number}
     */
    this.end = end;

    /**
     * Pen x position at the start of the cluster.
     * @type {number}
     */
    this.x = x;

    /**
     * Total horizontal advance of the cluster.
     * @type {number}
     */
    this.advance = advance;
  }
}

/**
 * Computes the cluster spans of a shaped run. This is the single clustering
 * shared by preview rendering and measurement.
 *
 * When a complex-script shaper ran (Indic, Myanmar or USE — they tag every
 * glyph with a syllable index), the boundaries follow the shaper's syllable
 * segmentation, so half-forms and marks the shaper reordered in front of
 * their base stay in the base's cluster. Otherwise glyphs group as a base
 * plus its following combining marks, matching the fallback mark positioning
 * in UnicodeLayoutEngine — e.g. Latin text with combining marks.
 *
 * @param {Glyph[]} glyphs the run's glyphs, in display order
 * @param {GlyphPosition[]} positions the run's positions, parallel to `glyphs`
 * @param {GlyphInfo[]?} glyphInfos the run's glyph infos, when shaped by OpenType
 * @return {ClusterSpan[]}
 */
export function computeClusters(glyphs, positions, glyphInfos = null) {
  let bySyllable =
    glyphInfos != null &&
    glyphInfos.length === glyphs.length &&
    glyphInfos.every(
      (info) =>
        info.shaperInfo != null && typeof info.shaperInfo.syllable === 'number',
    );

  // A new cluster starts at every syllable boundary, or — without shaper
  // syllables — at every glyph that is not a combining mark.
  let startsCluster = (i) =>
    bySyllable
      ? glyphInfos[i].shaperInfo.syllable !==
        glyphInfos[i - 1].shaperInfo.syllable
      : !glyphs[i].isMark;

  let clusters = [];
  let start = 0;
  let x = 0;
  let pen = 0;
  let advance = 0;

  for (let i = 0; i < glyphs.length; i++) {
    if (i > 0 && startsCluster(i)) {
      clusters.push(new ClusterSpan(start, i, x, advance));
      start = i;
      x = pen;
      advance = 0;
    }

    pen += positions[i].xAdvance;
    advance += positions[i].xAdvance;
  }

  if (start < glyphs.length) {
    clusters.push(new ClusterSpan(start, glyphs.length, x, advance));
  }

  return clusters;
}
