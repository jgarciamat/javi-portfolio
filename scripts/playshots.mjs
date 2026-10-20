// Capturas de la app para Google Play. SOLO contra una pila LOCAL de demo con datos ficticios
// (usuario demo, BD temporal). Uso, desde la raíz del repo:
//   BASE=http://localhost:5410 EMAIL=demo@… PASSWORD=… STATE=wizards.json [TABLET=1] node scripts/playshots.mjs
// STATE (opcional) es un JSON {clave: valor} de localStorage con el asistente de la Renta y el de
// Autónomos ya rellenados con datos inventados (se guardan en el dispositivo, no en la cuenta).
// Después: python3 scripts/playcompose.py (marco + titular) → docs/marketing/play-screenshots/.
// Falla si la página capturada dice «Money Manager» (la marca antigua) u otros textos prohibidos.
import fs from 'node:fs';
import { createRequire } from 'node:module';

const { chromium } = createRequire(new URL('../frontend/package.json', import.meta.url))('playwright');
const T = process.env.TABLET === '1';
const DIR = T ? 'build/playshots-t' : 'build/playshots';
const BASE = process.env.BASE ?? 'http://localhost:5410';
if (!/^http:\/\/(localhost|127\.0\.0\.1)[:/]/.test(BASE)) throw new Error('Solo contra una pila local de demo');
const EMAIL = process.env.EMAIL ?? 'demo@moneymanager.local';
const PASSWORD = process.env.PASSWORD ?? 'e2e-Password-1';
const STATE = process.env.STATE ? JSON.parse(fs.readFileSync(process.env.STATE, 'utf8')) : {};
fs.mkdirSync(DIR, { recursive: true });

// Lo que nunca puede salir en una captura de la ficha: la marca antigua y textos internos.
const FORBIDDEN = [/money\s*manager/i, /NO CONFIRMADO/i, /\bundefined\b|\bNaN\b/];

const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({
  viewport: T ? { width: 800, height: 1097 } : { width: 390, height: 672 },
  deviceScaleFactor: T ? 1.75 : 2.14,
  isMobile: !T,
  hasTouch: true,
  locale: 'es-ES',
  colorScheme: 'dark',
  timezoneId: 'Europe/Madrid',
});
// The wizards' data goes in once, before the app reads it.
await ctx.addInitScript((state) => {
  if (sessionStorage.getItem('playshots-state')) return;
  for (const [k, v] of Object.entries(state)) localStorage.setItem(k, v);
  sessionStorage.setItem('playshots-state', '1');
}, STATE);
const page = await ctx.newPage();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await page.goto(BASE + '/login');
await page.locator('#login-email').fill(EMAIL);
await page.locator('input[type="password"]').fill(PASSWORD);
await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
await sleep(2500);
const skip = page.getByRole('button', { name: 'Saltar el tour' });
if (await skip.count()) await skip.click();
await sleep(600);

async function menu(label) {
  await page.getByRole('button', { name: 'Abrir menú' }).click();
  await sleep(500);
  await page.locator('nav button, aside button').filter({ hasText: label }).first().click();
  await sleep(1500);
}
/** Scrolls so that the first element with this text sits `offset` px below the top. */
async function scrollToText(re, offset = 120) {
  const el = page.getByText(re).first();
  await el.evaluate((e, o) => window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - o), offset);
  await sleep(600);
}
async function shot(name) {
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  const text = await page.evaluate(() => document.body.innerText);
  const bad = FORBIDDEN.find((re) => re.test(text));
  if (bad) throw new Error(`${name}: la página contiene ${bad}; no se captura`);
  await page.screenshot({ path: `${DIR}/${name}.png` });
  console.log('ok', name);
}
/** Opens step `n` of the guided assistant (Renta or Autónomos) from its row of steps. */
async function wizardStep(n) {
  await page.locator('button', { hasText: `Paso ${n}:` }).first().click();
  await sleep(900);
}

// 1 · Resumen del mes, sin el aviso de presupuesto (tapa las cifras)
for (let i = 0; i < 8; i++) {
  const closed = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => {
      const box = x.closest('div,li,section,article');
      return box && /superado el presupuesto|a punto de superar|has gastado|% del presupuesto/i.test((box.textContent || '').slice(0, 160)) && (x.textContent || '').trim().length <= 2;
    });
    if (b) { b.click(); return true; }
    return false;
  });
  if (!closed) break;
  await sleep(250);
}
await scrollToText(/^Saldo disponible$/, T ? 330 : 250);
await shot('01-home');

// 2 · Previsión de fin de mes
await scrollToText(/Llegas a fin de mes/, T ? 200 : 140);
await shot('02-forecast');

// 3 · Presupuestos: la tarjeta del resumen, con lo gastado y lo que queda de cada categoría
await scrollToText(/Presupuestos del mes/, T ? 200 : 250);
await shot('03-budgets');

// 4 · Renta guiada: el asistente paso a paso con el resultado
await menu('Renta (IRPF)');
await wizardStep(9);
await scrollToText(T ? /% hecho/ : /^Te saldría a /, T ? 120 : 450);
await shot('04-renta');

// 5 · Autónomos: borrador del 130 y el 303
await menu('Autónomos');
// The draft is for the 3rd quarter (due on 20 October); the screen opens on the current quarter.
await wizardStep(1);
await page.locator('select.tx-input').nth(1).selectOption({ label: '3.º trimestre' });
await sleep(500);
await wizardStep(4);
const next = page.getByRole('button', { name: 'Siguiente →' });
if (await next.count()) { await next.first().click(); await sleep(700); }
const prepare = page.getByRole('button', { name: 'Preparar mi borrador' });
if (await prepare.count()) { await prepare.click(); await sleep(1500); }
await scrollToText(/^Calcula tu 130 y tu 303$/, T ? 120 : 110);
await shot('05-autonomos');

// 6 · Inversiones y cripto: el importador de la Renta con archivos inventados
await menu('Renta (IRPF)');
await wizardStep(5);
await scrollToText(/^Ganancia de las ventas de/, T ? 240 : 150);
await shot('06-investments');

// 7 · Metas
await menu('Metas');
await shot('07-goals');

// 8 · Invita a un amigo
await menu('Invita a un amigo');
await sleep(800);
await shot('08-invite');

await browser.close();
