/** The card with the figures of a month, drawn on a canvas so it can be shared as a picture. */
export interface RecapImageData {
  title: string;
  month: string;
  /** Share of the income that was saved, 0 to 100 (fills the ring). */
  rate: number;
  headline: string;
  headlineHint: string;
  lines: string[];
  footer: string;
  site: string;
}

const WIDTH = 1080;
const HEIGHT = 1350;
const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";

function text(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  size: number,
  weight: number,
  color: string,
  align: 'left' | 'center' | 'right' = 'left'
) {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.fillText(value, x, y);
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function glow(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(15, 23, 42, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

/** Draws the card and returns it as a PNG. */
export function recapImage(data: RecapImageData): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('canvas'));

  ctx.fillStyle = '#0b1020';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  glow(ctx, 900, 160, 620, 'rgba(99, 102, 241, 0.55)');
  glow(ctx, 120, 1220, 560, 'rgba(34, 197, 94, 0.30)');

  // Header: what this is and which month.
  roundedRect(ctx, 90, 100, 470, 68, 34);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
  ctx.fill();
  text(ctx, data.title, 125, 147, 34, 600, '#c7d2fe');
  text(ctx, data.month, 90, 292, 96, 800, '#f8fafc');

  // The savings rate as a ring.
  const cx = WIDTH / 2;
  const cy = 640;
  const radius = 215;
  ctx.lineWidth = 44;
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  const share = Math.min(100, Math.max(0, data.rate)) / 100;
  if (share > 0) {
    const gradient = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
    gradient.addColorStop(0, '#4ade80');
    gradient.addColorStop(1, '#22d3ee');
    ctx.strokeStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * share);
    ctx.stroke();
  }
  text(ctx, data.headline, cx, cy + 40, 140, 800, '#f8fafc', 'center');
  text(ctx, data.headlineHint, cx, cy + 105, 38, 500, '#cbd5e1', 'center');

  // What stands out.
  data.lines.forEach((line, i) => {
    const y = 905 + i * 110;
    roundedRect(ctx, 90, y, 900, 92, 28);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fill();
    text(ctx, line, 130, y + 59, 40, 600, '#f1f5f9');
  });

  // Signature.
  text(ctx, data.footer, 90, HEIGHT - 80, 44, 800, '#f8fafc');
  text(ctx, data.site, WIDTH - 90, HEIGHT - 80, 36, 500, '#94a3b8', 'right');

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('blob'))), 'image/png')
  );
}
