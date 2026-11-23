#!/usr/bin/env node
// Screenshot a route of the Expo web preview, for quick visual checks during development.
//
//   npx expo start --web --port 8090          (leave running in another shell)
//   node scripts/web-shot.mjs /dev/gallery .preview/gallery.png [--port 8090] [--width 390] [--height 844]
//                                             [--full] [--scale 2] [--wait 800] [--click "text"]...
//
// --full   captures the whole scrollable page instead of one viewport
// --scale  multiplies the root font size the way large system text would (web approximation only)
// --click  clicks the first element with that visible text before the screenshot; repeatable
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const positional = [];
const options = { port: '8081', width: '390', height: '844', wait: '800', scale: '1', full: false, click: [] };
for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === '--full') options.full = true;
  else if (arg === '--click') options.click.push(args[(i += 1)]);
  else if (arg.startsWith('--')) options[arg.slice(2)] = args[(i += 1)];
  else positional.push(arg);
}
const [route = '/', output = '.preview/shot.png'] = positional;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: Number(options.width), height: Number(options.height) },
  deviceScaleFactor: 2,
  colorScheme: 'light', // the app must stay dark even on a light device
});
page.on('pageerror', (error) => console.error('[page error]', error.message));
page.on('console', (message) => {
  if (message.type() === 'error') console.error('[console error]', message.text());
});
await page.goto(`http://localhost:${options.port}${route}`, { waitUntil: 'networkidle' });
if (options.scale !== '1') {
  await page.addStyleTag({ content: `html { font-size: ${Number(options.scale) * 100}% !important; }` });
}
for (const text of options.click) {
  await page.getByText(text, { exact: false }).first().click();
  await page.waitForTimeout(300);
}
await page.waitForTimeout(Number(options.wait));
await page.screenshot({ path: output, fullPage: options.full });
await browser.close();
console.log(`saved ${output}`);
