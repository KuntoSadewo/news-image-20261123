// The World in One Day — 23 November 2026
// A self-contained news poster generator (Node 22, standard library only).
// It draws a 1024x1024 front-page style poster of the day's world news with
// its own tiny rasteriser and its own PNG encoder, then writes entry.png to
// the output directory (MAKEFUN_OUTPUT_DIR, else ./output). No network, no
// clock, no randomness: the same bytes come out on every run.

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// ---------------------------------------------------------------- PNG encoder

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function encodePNG(width, height, rgb) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour RGB
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 3 + 1)] = 0; // filter: none
    rgb.copy(raw, y * (width * 3 + 1) + 1, y * width * 3, (y + 1) * width * 3);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------------- canvas

const W = 1024;
const H = 1024;
const px = Buffer.alloc(W * H * 3);

function setPx(x, y, r, g, b) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = r;
  px[i + 1] = g;
  px[i + 2] = b;
}

function fillRect(x, y, w, h, col) {
  for (let yy = Math.max(0, y); yy < Math.min(H, y + h); yy++) {
    for (let xx = Math.max(0, x); xx < Math.min(W, x + w); xx++) {
      const i = (yy * W + xx) * 3;
      px[i] = col[0];
      px[i + 1] = col[1];
      px[i + 2] = col[2];
    }
  }
}

function fillCircle(cx, cy, rad, col) {
  for (let yy = cy - rad; yy <= cy + rad; yy++) {
    for (let xx = cx - rad; xx <= cx + rad; xx++) {
      const dx = xx - cx;
      const dy = yy - cy;
      if (dx * dx + dy * dy <= rad * rad) setPx(xx, yy, col[0], col[1], col[2]);
    }
  }
}

// ------------------------------------------------------- 5x7 bitmap typeface
// Every glyph is seven rows of five pixels. '#' is ink, '.' is blank.
// Uppercase, digits and punctuation live here; lowercase is added below.

const FONT = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.####', '#....', '#....', '#....', '#....', '#....', '.####'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.####', '#....', '#....', '#.###', '#...#', '#...#', '.###.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '#.#.#', '.#.#.'],
  X: ['#...#', '.#.#.', '..#..', '..#..', '..#..', '.#.#.', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  '0': ['.###.', '#..##', '#.#.#', '##..#', '#...#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '..#..', '..#..', '..#..'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  ',': ['.....', '.....', '.....', '.....', '.##..', '.##..', '.#...'],
  ':': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.....'],
  ';': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.#...'],
  "'": ['.##..', '.##..', '.#...', '.....', '.....', '.....', '.....'],
  '-': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '?': ['.###.', '#...#', '....#', '..##.', '..#..', '.....', '..#..'],
  '(': ['...#.', '..#..', '.#...', '.#...', '.#...', '..#..', '...#.'],
  ')': ['.#...', '..#..', '....#', '....#', '....#', '..#..', '.#...'],
  '&': ['.##..', '#..#.', '#.#..', '.#...', '#.#.#', '#..#.', '.##.#'],
  '%': ['##..#', '##.#.', '....#', '...#.', '..#..', '.#...', '#..##'],
  '$': ['..#..', '.####', '#.#..', '.###.', '..#.#', '####.', '..#..'],
  '/': ['....#', '....#', '...#.', '..#..', '..#..', '.#...', '.#...'],
  '+': ['.....', '..#..', '..#..', '.###.', '..#..', '..#..', '.....'],
  '"': ['.#.#.', '.#.#.', '.....', '.....', '.....', '.....', '.....'],
};

// Lowercase glyphs, added to the same table.
Object.assign(FONT, {
  a: ['.....', '.....', '.####', '....#', '.####', '#...#', '.####'],
  b: ['#....', '#....', '####.', '#...#', '#...#', '#...#', '####.'],
  c: ['.....', '.....', '.####', '#....', '#....', '#....', '.####'],
  d: ['....#', '....#', '.####', '#...#', '#...#', '#...#', '.####'],
  e: ['.....', '.....', '.###.', '#...#', '#####', '#....', '.###.'],
  f: ['..##.', '.#...', '.#...', '####.', '.#...', '.#...', '.#...'],
  g: ['.....', '.....', '.####', '#...#', '.####', '....#', '.###.'],
  h: ['#....', '#....', '####.', '#...#', '#...#', '#...#', '#...#'],
  i: ['..#..', '.....', '.##..', '..#..', '..#..', '..#..', '.###.'],
  j: ['...#.', '.....', '..##.', '...#.', '...#.', '...#.', '.##..'],
  k: ['#....', '#....', '#..#.', '#.#..', '##...', '#.#..', '#..#.'],
  l: ['.##..', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  m: ['.....', '.....', '##.#.', '#.#.#', '#.#.#', '#.#.#', '#.#.#'],
  n: ['.....', '.....', '####.', '#...#', '#...#', '#...#', '#...#'],
  o: ['.....', '.....', '.###.', '#...#', '#...#', '#...#', '.###.'],
  p: ['.....', '.....', '####.', '#...#', '####.', '#....', '#....'],
  q: ['.....', '.....', '.####', '#...#', '.####', '....#', '....#'],
  r: ['.....', '.....', '#.##.', '##..#', '#....', '#....', '#....'],
  s: ['.....', '.....', '.####', '#....', '.###.', '....#', '####.'],
  t: ['.#...', '.#...', '####.', '.#...', '.#...', '.#..#', '..##.'],
  u: ['.....', '.....', '#...#', '#...#', '#...#', '#..##', '.##.#'],
  v: ['.....', '.....', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  w: ['.....', '.....', '#...#', '#.#.#', '#.#.#', '#.#.#', '.#.#.'],
  x: ['.....', '.....', '#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
  y: ['.....', '.....', '#...#', '#...#', '.####', '....#', '.###.'],
  z: ['.....', '.....', '#####', '...#.', '..#..', '.#...', '#####'],
});

// ---------------------------------------------------------------- text engine

// One character cell is 5x7 font pixels; each font pixel is `scale` device
// pixels, and a cell advances 6*scale (one blank column between letters).
function textWidth(str, scale) {
  return str.length === 0 ? 0 : str.length * 6 * scale - scale;
}

function drawText(str, x, y, scale, col, bold) {
  let cx = x;
  for (const ch of str) {
    const glyph = FONT[ch] || FONT[' '];
    for (let row = 0; row < 7; row++) {
      for (let colI = 0; colI < 5; colI++) {
        if (glyph[row][colI] === '#') {
          fillRect(cx + colI * scale, y + row * scale, bold ? scale + 1 : scale, scale, col);
        }
      }
    }
    cx += 6 * scale;
  }
  return cx;
}

function drawTextCentered(str, y, scale, col, bold) {
  const x = Math.round((W - textWidth(str, scale)) / 2);
  drawText(str, x, y, scale, col, bold);
}

// Greedy word wrap: returns the lines of `str` that fit `maxWidth` at `scale`.
function wrap(str, scale, maxWidth) {
  const words = str.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const trial = line === '' ? word : line + ' ' + word;
    if (textWidth(trial, scale) <= maxWidth || line === '') {
      line = trial;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line !== '') lines.push(line);
  return lines;
}

// ------------------------------------------------------------------- palette

const PAPER = [250, 247, 240];
const INK = [24, 24, 27];
const GREY = [90, 90, 96];
const RED = [178, 34, 34];
const WHITE = [255, 255, 255];
const HAIR = [196, 190, 178];

// -------------------------------------------------------------------- stories
// The day's news: Monday 23 November 2026, as reported that day.

const STORIES = [
  {
    cat: 'WORLD',
    color: [29, 78, 216],
    head: 'Ukraine Sea Drones Hit Russian Ships',
    body: 'Kyiv confirms naval drones hit two Russian ships near Benghazi. A Russian strike on Dymer killed 11.',
  },
  {
    cat: 'CLIMATE',
    color: [21, 128, 61],
    head: 'COP31 Climate Talks Collapse',
    body: 'The longest UN climate summit ends with no deal after fossil fuels were cut from the draft text.',
  },
  {
    cat: 'COURTS',
    color: [124, 58, 237],
    head: 'Myanmar Genocide, Rules World Court',
    body: 'The ICJ rules Myanmar committed genocide against the Rohingya. Britain sanctions five military figures.',
  },
  {
    cat: 'MIDDLE EAST',
    color: [180, 83, 9],
    head: 'Tankers Hit Mines in Hormuz',
    body: "Iran's Guards say three tankers caught fire after hitting mines. Tehran threatens a response.",
  },
  {
    cat: 'MARKETS',
    color: [15, 118, 110],
    head: 'Bitcoin Rebounds From Two-Year Low',
    body: 'Bitcoin fell to $55,100, its lowest since 2024, then rose toward $61,000 as US futures bounced.',
  },
  {
    cat: 'INDONESIA',
    color: [220, 38, 38],
    head: 'Deadly Banten Candy Factory Fire',
    body: "Rescuers collected victims in 24 body bags after Saturday's factory fire. Dozens are still missing.",
  },
  {
    cat: 'EUROPE',
    color: [37, 99, 235],
    head: 'Burnham Defends New EU Deal',
    body: 'The PM defends the EU reset deal in Parliament as former prime ministers clash over reopening Brexit.',
  },
  {
    cat: 'AMERICAS',
    color: [147, 51, 234],
    head: 'Mexico Captures Cartel Boss',
    body: "Forces capture 'El Chapo Isidro', an FBI top-ten fugitive, in Guasave, Sinaloa.",
  },
  {
    cat: 'SPORT',
    color: [219, 39, 119],
    head: "UK to Host 2035 Women's World Cup",
    body: 'FIFA confirms the UK as host, with England, Scotland, Wales and Northern Ireland staging it.',
  },
];

// --------------------------------------------------------------------- layout

const MARGIN = 36;
const TEXTW = W - MARGIN * 2;

function drawStory(story, y) {
  // Category chip: coloured block with white bold label.
  const chipScale = 2;
  const chipTextW = textWidth(story.cat, chipScale);
  const chipW = chipTextW + 16;
  const chipH = 24;
  fillRect(MARGIN, y, chipW, chipH, story.color);
  drawText(story.cat, MARGIN + 8, y + 5, chipScale, WHITE, true);

  // Headline beside the chip, bold, may wrap onto the next line.
  const headScale = 4;
  const headX = MARGIN + chipW + 14;
  const headLines = wrap(story.head, headScale, W - MARGIN - headX);
  let hy = y - 2;
  for (const line of headLines) {
    drawText(line, headX, hy, headScale, INK, true);
    hy += 7 * headScale + 4;
  }
  const headBottom = y + Math.max(chipH, headLines.length * (7 * headScale + 4) - 4);

  // Summary under the headline, full width, regular weight.
  const bodyScale = 3;
  const bodyLines = wrap(story.body, bodyScale, TEXTW);
  let by = headBottom + 3;
  for (const line of bodyLines) {
    drawText(line, MARGIN, by, bodyScale, INK, false);
    by += 7 * bodyScale + 3;
  }
  return by; // y just past the summary
}

function render() {
  fillRect(0, 0, W, H, PAPER);

  // Masthead.
  fillRect(0, 0, W, 14, RED);
  drawTextCentered('THE WORLD IN ONE DAY', 34, 8, INK, true);
  drawTextCentered('Monday 23 November 2026', 100, 5, RED, true);
  fillRect(MARGIN, 144, TEXTW, 5, INK);
  fillRect(MARGIN, 154, TEXTW, 2, INK);
  drawTextCentered('The day\'s biggest stories, on one page', 166, 2, GREY, false);

  // Stories, stacked with hairline separators.
  let y = 186;
  STORIES.forEach((story, i) => {
    if (i > 0) {
      fillRect(MARGIN, y - 7, TEXTW, 1, HAIR);
    }
    y = drawStory(story, y) + 10;
  });

  // Bottom band.
  fillRect(0, H - 14, W, 14, RED);
}

render();

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? './output';
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'entry.png'), encodePNG(W, H, px));
