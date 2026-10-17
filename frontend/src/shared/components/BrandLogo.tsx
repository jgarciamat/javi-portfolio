/** The Finanverso planet, decorative. Small WebP files: 96 px, or 192 px on sharp screens. */
export function BrandLogo({ className, size }: { className: string; size: number }) {
  return (
    <img
      className={className}
      src="/logo-96.webp"
      srcSet="/logo-96.webp 96w, /logo-192.webp 192w"
      sizes={`${size}px`}
      alt=""
      width={size}
      height={size}
    />
  );
}
