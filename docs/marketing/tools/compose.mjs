import { chromium } from '@playwright/test';
import fs from 'fs';
const RAW = '/private/tmp/claude-502/shots/raw';
const OUT = '/Users/javi/javi-portfolio/docs/marketing/play-screenshots';
fs.mkdirSync(OUT, { recursive: true });
const slides = [
  ['01-home', 'Sabe a dónde va tu dinero', 'Tu mes de un vistazo'],
  ['02-budgets', 'Ponle límite a cada categoría', 'Con avisos antes de pasarte'],
  ['03-goals', 'Ahorra para lo que importa', 'Metas con progreso y fecha'],
  ['04-forecast', '¿Llegas a fin de mes?', 'Mira cuánto puedes gastar al día'],
  ['05-analysis', 'Descubre lo que pagas sin usar', 'Detecta tus suscripciones'],
  ['06b-household', 'Finanzas en pareja', 'Comparte movimientos, presupuestos y metas'],
];
const html = (img, title, sub) => `<!doctype html><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0}
body{width:1080px;height:1920px;overflow:hidden;font-family:-apple-system,"SF Pro Display","Helvetica Neue",Arial,sans-serif;
background:radial-gradient(circle at 20% 0%,#6366f1 0%,#312e81 38%,#0b1020 80%);color:#fff;position:relative}
h1{position:absolute;top:110px;left:70px;right:70px;font-size:84px;line-height:1.05;font-weight:800;letter-spacing:-1.5px}
p{position:absolute;top:340px;left:70px;right:70px;font-size:44px;opacity:.85;font-weight:500}
.phone{position:absolute;top:470px;left:110px;width:860px;height:1560px;border-radius:70px;border:12px solid #0b1020;
outline:3px solid rgba(255,255,255,.25);overflow:hidden;box-shadow:0 40px 120px rgba(0,0,0,.55)}
.phone img{width:100%;display:block}
</style><h1>${title}</h1><p>${sub}</p><div class="phone"><img src="data:image/png;base64,${fs.readFileSync(img).toString('base64')}"></div>`;
const b = await chromium.launch({ channel: 'chrome' });
const page = await b.newPage({ viewport: { width: 1080, height: 1920 } });
let n = 1;
for (const [file, title, sub] of slides) {
  await page.setContent(html(`${RAW}/${file}.png`, title, sub));
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${String(n).padStart(2, '0')}-${file.replace(/^\d+b?-/, '')}.png` });
  n++;
}
// Feature graphic (1024x500)
const logo = fs.readFileSync('/Users/javi/javi-portfolio/frontend/public/moneyLogo.png').toString('base64');
const fp = await b.newPage({ viewport: { width: 1024, height: 500 } });
await fp.setContent(`<!doctype html><meta charset="utf-8"><style>*{margin:0;box-sizing:border-box}body{width:1024px;height:500px;display:flex;align-items:center;gap:48px;padding:0 70px;font-family:-apple-system,"Helvetica Neue",Arial,sans-serif;background:radial-gradient(circle at 15% 0%,#6366f1 0%,#312e81 40%,#0b1020 85%);color:#fff}
img{width:210px;height:210px;border-radius:44px;object-fit:cover}h1{font-size:68px;line-height:1.05;font-weight:800;letter-spacing:-1px}p{font-size:30px;opacity:.85;margin-top:16px}</style>
<img src="data:image/png;base64,${logo}"><div><h1>Money Manager</h1><p>Controla tus gastos y ahorra más</p></div>`);
await fp.waitForTimeout(400);
await fp.screenshot({ path: `${OUT}/feature-graphic-1024x500.png` });
await b.close();
