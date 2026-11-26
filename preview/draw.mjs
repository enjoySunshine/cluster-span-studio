import fs from "node:fs";
import { openSync } from "../dist/node/index.js";
import { CASES, clusterRows } from "./cases.mjs";

const font = openSync(new URL("../test/data/OpenSans/OpenSans-Regular.ttf", import.meta.url));
const glyph = font.glyphForCodePoint(0x41);
const d = glyph.path.toSVG();
const box = glyph.path.bbox;
const w = Math.max(1, Math.ceil(box.maxX - box.minX));
const h = Math.max(1, Math.ceil(box.maxY - box.minY));
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.minX} ${-box.maxY} ${w} ${h}" width="480" height="480">
  <rect x="${box.minX}" y="${-box.maxY}" width="${w}" height="${h}" fill="#111"/>
  <path d="${d}" transform="scale(1,-1)" fill="#f4f1ea"/>
</svg>
`;
fs.writeFileSync(new URL("./out.svg", import.meta.url), svg);
console.log("wrote preview/out.svg", w, h);

// --- Cluster sheet ---------------------------------------------------------
// Renders each case's shaped run cluster by cluster, using the same spans
// measurement reports (see measure.mjs): every cluster is labelled with its
// glyph ids and pen x positions.
const fonts = new Map();
const loadFont = (file) => {
  if (!fonts.has(file)) {
    fonts.set(file, openSync(new URL("../test/data/" + file, import.meta.url)));
  }
  return fonts.get(file);
};

const esc = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const num = (v) => Math.round(v * 100) / 100;

// Inline presentation attributes (not a <style> block) so the sheet renders
// in any SVG viewer.
const GLYPH_FILL = "#20242e";
const BAND_EVEN = "#f2f5fa";
const BAND_ODD = "#e6ecf6";
const SEP = "#b0503c";
const BASELINE = "#9aa2b1";
const CAP_FILL = "#333333";
const LAB_FILL = "#4a4f5c";

const body = [];
let y = 0;
let sheetWidth = 1;

for (const [file, text] of CASES) {
  const f = loadFont(file);
  const run = f.layout(text);
  const clusters = clusterRows(run);

  const upm = f.unitsPerEm;
  const pad = upm * 0.2;
  const capSize = upm * 0.16;
  const labSize = upm * 0.12;
  const capBase = y + pad + capSize;
  const bandTop = capBase + upm * 0.1;
  const baseline = bandTop + f.ascent * 1.05;
  const bandBottom = baseline - f.descent * 1.05;
  const lab1 = bandBottom + labSize * 1.3;
  const lab2 = lab1 + labSize * 1.3;
  const rowBottom = lab2 + pad;

  body.push(
    `<text x="${num(pad)}" y="${num(capBase)}" font-size="${num(capSize)}" font-family="monospace" fill="${CAP_FILL}">${esc(file)} ${esc(text)}</text>`,
  );

  clusters.forEach((cluster, i) => {
    const x0 = pad + cluster.x;
    const x1 = x0 + cluster.advance;
    body.push(
      `<rect x="${num(x0)}" y="${num(bandTop)}" width="${num(Math.max(1, x1 - x0))}" height="${num(bandBottom - bandTop)}" fill="${i % 2 ? BAND_ODD : BAND_EVEN}"/>`,
    );
  });

  let pen = 0;
  for (let i = 0; i < run.glyphs.length; i++) {
    const p = run.positions[i];
    const gx = pad + pen + p.xOffset;
    const gy = baseline - p.yOffset;
    body.push(
      `<path d="${run.glyphs[i].path.toSVG()}" transform="translate(${num(gx)} ${num(gy)})" fill="${GLYPH_FILL}"/>`,
    );
    pen += p.xAdvance;
  }

  body.push(
    `<line x1="${num(pad)}" y1="${num(baseline)}" x2="${num(pad + run.advanceWidth)}" y2="${num(baseline)}" stroke="${BASELINE}" stroke-width="10"/>`,
  );

  clusters.forEach((cluster, i) => {
    const x0 = pad + cluster.x;
    const x1 = x0 + cluster.advance;
    const mid = (x0 + x1) / 2;
    const ids = cluster.glyphs.map((g) => `${g.id}@${g.x}`).join(" ");
    body.push(
      `<line x1="${num(x0)}" y1="${num(bandTop)}" x2="${num(x0)}" y2="${num(bandBottom)}" stroke="${SEP}" stroke-width="14" stroke-dasharray="60 40"/>`,
      `<text x="${num(mid)}" y="${num(lab1)}" font-size="${num(labSize)}" font-family="monospace" text-anchor="middle" fill="${LAB_FILL}">#${i} ${esc(ids)}</text>`,
      `<text x="${num(mid)}" y="${num(lab2)}" font-size="${num(labSize)}" font-family="monospace" text-anchor="middle" fill="${LAB_FILL}">x=${cluster.x} w=${cluster.advance}</text>`,
    );
    if (i === clusters.length - 1) {
      body.push(
        `<line x1="${num(x1)}" y1="${num(bandTop)}" x2="${num(x1)}" y2="${num(bandBottom)}" stroke="${SEP}" stroke-width="14" stroke-dasharray="60 40"/>`,
      );
    }
  });

  sheetWidth = Math.max(sheetWidth, pad * 2 + run.advanceWidth);
  y = rowBottom;
}

const sheet = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${num(sheetWidth)} ${num(y)}" width="1000" height="${num((1000 * y) / sheetWidth)}">
<rect x="0" y="0" width="${num(sheetWidth)}" height="${num(y)}" fill="#ffffff"/>
${body.join("\n")}
</svg>
`;
fs.writeFileSync(new URL("./clusters.svg", import.meta.url), sheet);
console.log("wrote preview/clusters.svg", Math.ceil(sheetWidth), Math.ceil(y));
