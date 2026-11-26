import * as fontkit from 'fontkit';
import assert from 'assert';

const DEV = 'NotoSans/NotoSansDevanagari-Regular.ttf';
const MYMR = 'NotoSans/NotoSansMyanmar-Regular.ttf';
const BALI = 'NotoSans/NotoSansBalinese-Regular.ttf';
const ITALIC = 'FontkitMarkFallbackTest/FontkitMarkFallbackTest-Italic.ttf';

describe('cluster spans', function () {
  let fontCache = {};
  let layout = (file, text) => {
    let font =
      fontCache[file] ||
      (fontCache[file] = fontkit.openSync(
        new URL('data/' + file, import.meta.url),
      ));
    return font.layout(text);
  };

  // [id, x, advance] per glyph, grouped per cluster — the same readout the
  // preview labels and the measurement script prints.
  let readout = (run) =>
    run.clusters.map((cluster) => {
      let x = cluster.x;
      let glyphs = [];
      for (let i = cluster.start; i < cluster.end; i++) {
        glyphs.push([run.glyphs[i].id, x, run.positions[i].xAdvance]);
        x += run.positions[i].xAdvance;
      }

      return { x: cluster.x, advance: cluster.advance, glyphs };
    });

  it('keeps the Devanagari half-form and vowel in one cluster (नमस्ते)', function () {
    let run = layout(DEV, 'नमस्ते');
    assert.equal(run.advanceWidth, 4323);
    assert.deepEqual(readout(run), [
      { x: 0, advance: 1136, glyphs: [[44, 0, 1136]] },
      { x: 1136, advance: 1224, glyphs: [[50, 1136, 1224]] },
      {
        x: 2360,
        advance: 1963,
        glyphs: [
          [215, 2360, 796],
          [40, 3156, 1167],
          [75, 4323, 0],
        ],
      },
    ]);
  });

  it('keeps the pre-base reordered vowel with its ligature (क्षि)', function () {
    let run = layout(DEV, 'क्षि');
    assert.equal(run.advanceWidth, 1988);
    assert.deepEqual(readout(run), [
      {
        x: 0,
        advance: 1988,
        glyphs: [
          [564, 0, 530],
          [179, 530, 1458],
        ],
      },
    ]);
  });

  it('groups the two Devanagari spaces into one cluster (क  क)', function () {
    let run = layout(DEV, 'क  क');
    assert.equal(run.advanceWidth, 4186);
    assert.deepEqual(readout(run), [
      { x: 0, advance: 1561, glyphs: [[25, 0, 1561]] },
      {
        x: 1561,
        advance: 1064,
        glyphs: [
          [3, 1561, 532],
          [3, 2093, 532],
        ],
      },
      { x: 2625, advance: 1561, glyphs: [[25, 2625, 1561]] },
    ]);
  });

  it('keeps the pre-base reordered Myanmar medial with its base (မြန်မာ)', function () {
    let run = layout(MYMR, 'မြန်မာ');
    assert.equal(run.advanceWidth, 2606);
    assert.deepEqual(readout(run), [
      {
        x: 0,
        advance: 905,
        glyphs: [
          [47, 0, 229],
          [29, 229, 676],
        ],
      },
      {
        x: 905,
        advance: 570,
        glyphs: [
          [24, 905, 570],
          [381, 1475, 0],
        ],
      },
      {
        x: 1475,
        advance: 1131,
        glyphs: [
          [29, 1475, 676],
          [368, 2151, 455],
        ],
      },
    ]);
  });

  it('keeps the Balinese base and vowel sign in one cluster (ᬓᬶ)', function () {
    let run = layout(BALI, 'ᬓᬶ');
    assert.equal(run.advanceWidth, 2275);
    assert.deepEqual(readout(run), [
      {
        x: 0,
        advance: 2275,
        glyphs: [
          [23, 0, 2275],
          [58, 2275, 0],
        ],
      },
    ]);
  });

  it('groups Latin combining marks with their base (fallback positioning)', function () {
    let run = layout(ITALIC, 'x́̈');
    assert.equal(run.advanceWidth, 1019);
    assert.deepEqual(readout(run), [
      {
        x: 0,
        advance: 1019,
        glyphs: [
          [5, 0, 1019],
          [6, 1019, 0],
          [16, 1019, 0],
        ],
      },
    ]);

    // The fallback mark positioning itself is untouched.
    assert.deepEqual(
      run.positions.map((p) => [p.xAdvance, p.xOffset, p.yOffset]),
      [
        [1019, 0, 0],
        [0, -75, -15],
        [0, -59, 478],
      ],
    );
  });

  it('leaves the run positions untouched and records no extra positions', function () {
    for (let [file, text, total] of [
      [DEV, 'नमस्ते', 4323],
      [DEV, 'क्षि', 1988],
      [DEV, 'क  क', 4186],
      [MYMR, 'မြန်မာ', 2606],
      [BALI, 'ᬓᬶ', 2275],
      [ITALIC, 'x́̈', 1019],
    ]) {
      let run = layout(file, text);

      // Cluster widths sum to the run's advance: the pen ends where it did.
      assert.equal(run.advanceWidth, total);
      assert.equal(
        run.clusters.reduce((sum, cluster) => sum + cluster.advance, 0),
        total,
      );

      // The spans partition the run without recording positions of their own.
      assert.equal(run.positions.length, run.glyphs.length);
      assert.equal(run.clusters[0].start, 0);
      assert.equal(
        run.clusters[run.clusters.length - 1].end,
        run.glyphs.length,
      );
      for (let i = 1; i < run.clusters.length; i++) {
        assert.equal(run.clusters[i].start, run.clusters[i - 1].end);
      }
    }
  });

  it('does not double the recorded positions for mixed Devanagari + Myanmar', function () {
    let run = layout(DEV, 'नमस्तेမြန်မာ');
    assert.equal(run.positions.length, run.glyphs.length);
    assert.ok(run.clusters.length <= run.glyphs.length);
    assert.equal(run.clusters[0].start, 0);
    assert.equal(run.clusters[run.clusters.length - 1].end, run.glyphs.length);
    assert.equal(
      run.clusters.reduce((sum, cluster) => sum + cluster.advance, 0),
      run.advanceWidth,
    );
  });

  it('computes the spans once per run', function () {
    let run = layout(DEV, 'नमस्ते');
    assert.equal(run.clusters, run.clusters);
  });
});
