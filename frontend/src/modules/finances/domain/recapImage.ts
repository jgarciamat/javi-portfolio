/** A square-ish card with the figures of a month, drawn on a canvas to share it. */
export interface RecapImageData {
  title: string;
  month: string;
  headline: string;
  headlineHint: string;
  lines: string[];
  footer: string;
}

const WIDTH = 1080;
const HEIGHT = 1350;

function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  weight: number,
  color: string
) {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
  ctx.fillText(text, x, y);
}

/** Draws the card and returns it as a PNG. */
export function recapImage(data: RecapImageData): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('canvas'));

  const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  gradient.addColorStop(0, '#0f172a');
  gradient.addColorStop(1, '#312e81');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  drawText(ctx, data.title, 90, 170, 54, 600, '#a5b4fc');
  drawText(ctx, data.month, 90, 250, 80, 800, '#f8fafc');
  drawText(ctx, data.headline, 90, 560, 220, 800, '#4ade80');
  drawText(ctx, data.headlineHint, 90, 650, 54, 500, '#e2e8f0');
  data.lines.forEach((line, i) => drawText(ctx, line, 90, 830 + i * 100, 52, 500, '#f1f5f9'));
  drawText(ctx, data.footer, 90, HEIGHT - 110, 46, 600, '#94a3b8');

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('blob'))), 'image/png')
  );
}
