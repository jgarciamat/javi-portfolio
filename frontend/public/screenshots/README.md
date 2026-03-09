# Screenshots para tiendas de apps

Añade aquí las capturas de pantalla requeridas por cada tienda.
Ver `docs/store-publishing.md` para los tamaños exactos.

## Archivos requeridos

| Archivo | Tamaño | Tienda |
|---|---|---|
| `mobile-dashboard.png` | 390×844 | PWA webmanifest |
| `mobile-transactions.png` | 390×844 | PWA webmanifest |
| `play-phone-1.png` | 1080×1920 recomendado | Google Play (mín. 2) |
| `play-phone-2.png` | 1080×1920 recomendado | Google Play |
| `appstore-65inch.png` | 1290×2796 | App Store iPhone obligatorio |

## Cómo generarlas

La forma más rápida es usar Chrome DevTools:
1. Abre la app en `http://localhost:5173`
2. DevTools → Toggle device toolbar
3. Selecciona el dispositivo (iPhone 14 Pro Max → 393×852)
4. Haz una captura completa: `⋮ → Capture screenshot`
5. Escala al tamaño requerido con cualquier editor de imagen

> ⚠️ Este directorio NO está en `.gitignore` — commitea las capturas junto con el código.
