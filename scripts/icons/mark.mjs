// The Kindling mark: a flame resting on kindling (a few twigs), with sparks rising from it.
// Drawn in a 1024x1024 box; every icon is this glyph on a different background.

const GOLD = "#ffc857";
const EMBER = "#ff7a59";
const CORE = "#fff3cf";
const TWIG = "#f6f1ff";
const TWIG_SHADE = "#c9bff5";

/** The flame, twigs and sparks. `mono` draws one flat colour (for Android's themed icon). */
export function glyph({ mono = null } = {}) {
  const fill = (color) => (mono ?? color);
  const defs = mono
    ? ""
    : `<linearGradient id="flame" x1="0.5" y1="0" x2="0.5" y2="1"><stop offset="0" stop-color="${GOLD}"/><stop offset="1" stop-color="${EMBER}"/></linearGradient>`;
  const flame = mono ? mono : "url(#flame)";
  return {
    defs,
    body: `
  <g>
    <path d="M512 128 C548 232 668 300 690 452 C706 566 650 664 540 692 C482 706 410 690 368 636 C330 588 334 512 372 452 C388 482 410 498 430 496 C412 410 440 320 512 128 Z" fill="${flame}"/>
    <path d="M512 372 C536 430 592 466 598 548 C602 612 562 662 512 666 C462 662 422 618 428 560 C432 520 460 492 478 466 C490 486 502 492 510 488 C498 452 500 410 512 372 Z" fill="${fill(CORE)}"/>
    <g stroke-linecap="round">
      <path d="M312 846 L712 726" stroke="${fill(TWIG_SHADE)}" stroke-width="60"/>
      <path d="M712 846 L312 726" stroke="${fill(TWIG)}" stroke-width="60"/>
    </g>
    <path d="M744 214 L760 252 L798 268 L760 284 L744 322 L728 284 L690 268 L728 252 Z" fill="${fill(GOLD)}"/>
    <path d="M304 304 L314 330 L340 340 L314 350 L304 376 L294 350 L268 340 L294 330 Z" fill="${fill(GOLD)}"/>
    <circle cx="640" cy="130" r="17" fill="${fill(GOLD)}"/>
  </g>`,
  };
}

/** A complete SVG: optional gradient background (square, rounded, or none) with the glyph scaled about the centre. */
export function svg({ size = 1024, background = "full", radius = 224, scale = 1, dy = 0, mono = null } = {}) {
  const { defs, body } = glyph({ mono });
  const bg =
    background === "none"
      ? ""
      : `<rect width="1024" height="1024" ${background === "rounded" ? `rx="${radius}"` : ""} fill="url(#bg)"/>`;
  const bgDefs = background === "none" ? "" : `<linearGradient id="bg" x1="0" y1="0" x2="0.6" y2="1"><stop offset="0" stop-color="#8b76f5"/><stop offset="1" stop-color="#4a33c0"/></linearGradient>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024"><defs>${bgDefs}${defs}</defs>${bg}<g transform="translate(512 ${512 + dy}) scale(${scale}) translate(-512 -512)">${body}</g></svg>`;
}
