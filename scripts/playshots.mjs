// Capturas de la app (pila LOCAL de demo, datos ficticios) para las capturas de Google Play.
import { chromium } from 'playwright';
const T = process.env.TABLET === '1';
const DIR = T ? 'build/playshots-t' : 'build/playshots';
import fs from 'node:fs'; fs.mkdirSync(DIR, { recursive: true });
const BASE = 'http://localhost:5410';
const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ viewport: T ? { width: 800, height: 1097 } : { width: 390, height: 672 }, deviceScaleFactor: T ? 1.75 : 2.14, isMobile: !T, hasTouch: true, locale: 'es-ES', colorScheme: 'dark', timezoneId: 'Europe/Madrid' });
const page = await ctx.newPage();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await page.goto(BASE + '/login');
await page.locator('#login-email').fill('demo@moneymanager.local');
await page.locator('input[type="password"]').fill('e2e-Password-1');
await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
await sleep(2500);
const skip = page.getByRole('button', { name: 'Saltar el tour' });
if (await skip.count()) await skip.click();
await sleep(600);
async function menu(label) {
  await page.getByRole('button', { name: 'Abrir menú' }).click(); await sleep(500);
  await page.locator('nav button, aside button').filter({ hasText: label }).first().click(); await sleep(1300);
}
const shot = async (n) => { await page.evaluate(() => document.activeElement && document.activeElement.blur()); await page.screenshot({ path: `${DIR}/${n}.png` }); };
for (let i = 0; i < 8; i++) { const done = await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.closest('div,li,section,article') && /superado el presupuesto|a punto de superar|has gastado/i.test((x.closest('div,li,section,article').textContent || '').slice(0, 120)) && (x.textContent || '').trim().length <= 2); if (b) { b.click(); return true; } return false; }); if (!done) break; await sleep(250); }
await page.evaluate(() => window.scrollTo(0, 0)); await sleep(300);
await shot('01-home');
await page.evaluate(() => window.scrollTo(0, 0));
// forecast: bring the "¿Llegas a fin de mes?" card up
await page.evaluate(() => { const h = [...document.querySelectorAll('h2,h3,summary,button')].find((e) => /Llegas a fin de mes/.test(e.textContent || '')); if (h) { const y = h.getBoundingClientRect().top + window.scrollY - 230; window.scrollTo(0, y); } });
await sleep(700); await shot('04-forecast');
await menu('Presupuestos'); await shot('02-budgets');
await menu('Metas'); await shot('03-goals');
await menu('Análisis'); await shot('05-analysis');
await menu('Ajustes');
await page.evaluate(() => { const h = [...document.querySelectorAll('h2,h3')].find((e) => /Hogar compartido/.test(e.textContent || '')); if (h) window.scrollTo(0, h.getBoundingClientRect().top + window.scrollY - 150); });
await sleep(700); await shot('06-household');
await browser.close(); console.log('ok');
