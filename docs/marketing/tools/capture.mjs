import { chromium } from '@playwright/test';
const OUT = '/private/tmp/claude-502/shots/raw';
import fs from 'fs'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 390, height: 693 }, deviceScaleFactor: 1080 / 390, isMobile: true, hasTouch: true, locale: 'es-ES', colorScheme: 'dark' });
const p = await ctx.newPage();
await p.goto('http://localhost:5186/login');
await p.locator('#login-email').fill('demo@moneymanager.local');
await p.locator('input[type="password"]').fill('e2e-Password-1');
await p.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
await p.waitForTimeout(2500);
const skip = p.getByRole('button', { name: 'Saltar el tour' });
if (await skip.count()) await skip.click();
await p.waitForTimeout(1200);
const shot = async (name) => { await p.waitForTimeout(900); await p.screenshot({ path: `${OUT}/${name}.png` }); };
const go = async (label) => { await p.getByRole('button', { name: 'Abrir menú' }).click(); await p.waitForTimeout(500); await p.locator('nav button, aside button').filter({ hasText: label }).first().click(); await p.waitForTimeout(1200); };
await shot('01-home');
// Forecast block on the summary
const f = p.getByText('¿Llegas a fin de mes?').first();
if (await f.count()) { await f.scrollIntoViewIfNeeded(); await p.evaluate(() => window.scrollBy(0, -90)); await shot('04-forecast'); }
const scrollTo = async (text, offset = 110) => { const e = p.getByText(text).first(); if (await e.count()) { await e.evaluate((el, o) => { const r = el.getBoundingClientRect(); window.scrollTo(0, window.scrollY + r.top - o); }, offset); } };
for (const [label, name] of [['Presupuestos', '02-budgets'], ['Metas', '03-goals'], ['Análisis', '05-analysis'], ['Cuentas', '07-accounts']]) { await go(label); 
  await shot(name); }
await go('Ajustes'); await shot('06-settings');
await scrollTo('Hogar compartido', 120); await shot('06b-household');
await b.close();
