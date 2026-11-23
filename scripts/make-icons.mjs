// Renders the app icon set (assets/images/*.png) from the SVG below. Run: node scripts/make-icons.mjs
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const out = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'images');

const BACKGROUND = '#111920';
const LAVENDER = '#C9B5FF';
const INK = '#2B1E45';

const SPADE =
  'M50 6 C50 6 10 38 10 62 C10 76 21 85 33 85 C40 85 46 81 49 75 C48 85 44 92 37 96 L63 96 C56 92 52 85 51 75 C54 81 60 85 67 85 C79 85 90 76 90 62 C90 38 50 6 50 6 Z';

/** A top-down chip with eight edge inserts and a spade, centred in a 1024 box with the given diameter. */
function chip(diameter, { face = LAVENDER, ink = INK, mono = false } = {}) {
  const r = diameter / 2;
  const inserts = Array.from({ length: 8 }, (_, i) => {
    const angle = i * 45;
    const w = r * 0.26;
    const h = r * 0.2;
    return `<rect x="${512 - w / 2}" y="${512 - r}" width="${w}" height="${h}" rx="${h * 0.12}" fill="${ink}" transform="rotate(${angle} 512 512)"/>`;
  }).join('');
  const spadeSize = r * 0.92;
  const spade = `<path d="${SPADE}" fill="${ink}" transform="translate(${512 - spadeSize / 2} ${512 - spadeSize * 0.53}) scale(${spadeSize / 100})"/>`;
  if (mono) {
    // Silhouette for Android themed icons: only the alpha channel matters.
    return `
      <circle cx="512" cy="512" r="${r * 0.94}" fill="none" stroke="#fff" stroke-width="${r * 0.12}" stroke-dasharray="${r * 0.37} ${r * 0.368}" />
      <circle cx="512" cy="512" r="${r * 0.7}" fill="none" stroke="#fff" stroke-width="${r * 0.045}"/>
      <path d="${SPADE}" fill="#fff" transform="translate(${512 - spadeSize / 2} ${512 - spadeSize * 0.53}) scale(${spadeSize / 100})"/>`;
  }
  return `
    <circle cx="512" cy="512" r="${r}" fill="${face}"/>
    <clipPath id="edge"><circle cx="512" cy="512" r="${r}"/></clipPath>
    <g clip-path="url(#edge)">${inserts}</g>
    <circle cx="512" cy="512" r="${r * 0.72}" fill="${face}" stroke="${ink}" stroke-opacity="0.55" stroke-width="${r * 0.03}"/>
    ${spade}`;
}

const svg = (body, background) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">${
    background ? `<rect width="1024" height="1024" fill="${background}"/>` : ''
  }${body}</svg>`;

const files = [
  // Launcher icon without mask (iOS, legacy Android, stores).
  { name: 'icon.png', size: 1024, svg: svg(chip(700), BACKGROUND) },
  // Android adaptive foreground: keep the chip inside the 66/108 safe zone.
  { name: 'android-icon-foreground.png', size: 1024, svg: svg(chip(560)) },
  { name: 'android-icon-monochrome.png', size: 1024, svg: svg(chip(540, { mono: true })) },
  { name: 'splash-icon.png', size: 304, svg: svg(chip(960)) },
  { name: 'favicon.png', size: 48, svg: svg(chip(960)) },
];

const browser = await chromium.launch();
for (const file of files) {
  const page = await browser.newPage({ viewport: { width: file.size, height: file.size } });
  await page.setContent(
    `<html><body style="margin:0;background:transparent"><div style="width:${file.size}px;height:${file.size}px">${file.svg.replace(
      'width="1024" height="1024"',
      `width="${file.size}" height="${file.size}"`,
    )}</div></body></html>`,
  );
  await page.screenshot({ path: path.join(out, file.name), omitBackground: true });
  await page.close();
  console.log('wrote', file.name);
}
await browser.close();
