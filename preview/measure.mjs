import { openSync } from "../dist/node/index.js";
import { CASES, clusterRows } from "./cases.mjs";

// Measurement: reports each cluster's width (used by cursors and line
// breaking) and the glyph ids and pen x positions inside it. Reads the same
// cluster spans the preview draws, from the same shared case list.
const fonts = new Map();
const loadFont = (file) => {
  if (!fonts.has(file)) {
    fonts.set(file, openSync(new URL("../test/data/" + file, import.meta.url)));
  }
  return fonts.get(file);
};

for (const [file, text] of CASES) {
  const run = loadFont(file).layout(text);
  console.log(
    `${file} ${JSON.stringify(text)} total=${run.advanceWidth} clusters=${run.clusters.length}`,
  );
  clusterRows(run).forEach((cluster, i) => {
    const glyphs = cluster.glyphs.map((g) => `${g.id}@${g.x}`).join(" ");
    console.log(
      `  cluster ${i}: x=${cluster.x} width=${cluster.advance} glyphs=${glyphs}`,
    );
  });
}
