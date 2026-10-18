import { useEffect, useState } from 'react';

/** White border around the code, in modules (the QR standard asks for four). */
const QUIET_ZONE = 4;

/** Dark modules of the QR code of `text`; the library is only downloaded when one is shown. */
async function qrModules(text: string): Promise<boolean[][]> {
  const { default: qrcode } = await import('qrcode-generator');
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const size = qr.getModuleCount();
  return Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, col) => qr.isDark(row, col))
  );
}

/** A QR code drawn as SVG (sharp at any size, black on white so every camera reads it). */
export function QrCode({
  text,
  label,
  size = 200,
}: {
  text: string;
  label: string;
  size?: number;
}) {
  const [modules, setModules] = useState<boolean[][] | null>(null);

  useEffect(() => {
    void qrModules(text).then(setModules);
  }, [text]);

  if (!modules) {
    return <div className="qr-code qr-code-loading" style={{ width: size, height: size }} />;
  }
  const side = modules.length + QUIET_ZONE * 2;
  const path = modules
    .flatMap((cells, row) =>
      cells.map((dark, col) => (dark ? `M${col + QUIET_ZONE} ${row + QUIET_ZONE}h1v1h-1z` : ''))
    )
    .join('');
  return (
    <svg
      className="qr-code"
      role="img"
      aria-label={label}
      viewBox={`0 0 ${side} ${side}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
    >
      <rect width={side} height={side} fill="#fff" />
      <path d={path} fill="#000" />
    </svg>
  );
}
