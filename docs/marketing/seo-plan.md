# Plan SEO de Finanverso

Borrador de trabajo del agente `seo` (sin datos personales ni claves). Fecha: 18 de octubre de 2026.

## Hecho en la primera ronda (técnico)

- Cada página pública (45 en español y 16 en inglés bajo `/en`) se pre-renderiza con su título, descripción, canonical, `hreflang` es/en/x-default, Open Graph, Twitter Card y su texto real. `/pricing`, `/terms`, `/privacy` y `/login` dejan de servir la portada (antes tenían el título y el canonical de la home).
- Las direcciones que no existen devuelven un 404 de verdad (`404.html`, que sigue cargando la app). `/en/guias/*` redirige con 301 a la guía en español, porque las guías solo están en español.
- Datos estructurados en `@graph`: `Organization`, `WebSite`, `WebApplication` y `MobileApplication` con las ofertas reales (Gratis, 3,49 €/mes, 29,99 €/año, sin valoraciones), `HowTo` en Hacienda paso a paso, `VideoObject` de los vídeos públicos (Videoteca, guías y Hacienda), `Article` en las guías, `BreadcrumbList` en todas las páginas salvo la portada, y `FAQPage` solo en la portada, que es la única con preguntas visibles.
- `sitemap.xml` se genera con `npm run sitemap`: `lastmod` por página (solo cambia cuando cambia su texto), alternates es/en, imágenes de la portada y vídeos públicos. Los vídeos Premium no aparecen nunca. Si el sitemap se queda desfasado, el build avisa.
- Enlazado interno: cada calculadora enlaza a sus guías, a la Videoteca y a Hacienda paso a paso. Cada guía enlaza a su vídeo público, a la Videoteca y a Hacienda. El registro (`/login?mode=register`) se enlaza desde todas las páginas. Ningún enlace interno lleva UTM.

## Próximas acciones (por prioridad)

1. **Search Console** (lo hace el propietario, ver abajo): verificar el dominio, enviar el sitemap, pedir la indexación de `/`, `/calculadora-renta`, `/hacienda-paso-a-paso/renta-web` y `/videoteca`.
2. **Títulos y descripciones demasiado largos** (Google los corta a unos 60 caracteres en el título y 155 en la descripción). Son textos de contenido (`guides*.ts` y `es.json`):
   - `/calculadora-renta`: 81 caracteres en el título y 232 en la descripción.
   - `/hacienda-paso-a-paso`: 75 en el título y 174 en la descripción.
   - Descripciones de los modelos 303 y 130 y de Renta WEB: entre 180 y 191.
   - Guías de familia numerosa, alquiler, maternidad, Comunitat Valenciana y cuota de autónomos: entre 73 y 81 en el título.
3. **Páginas nuevas por intención de búsqueda.** Cada una con texto propio, fuente oficial con fecha de consulta, enlace a su calculadora o vídeo, y CTA de registro.

   | Página propuesta | Palabras clave | Fuente |
   |---|---|---|
   | `/guias/como-hacer-la-renta-2025-paso-a-paso` | cómo hacer la renta, renta 2025 paso a paso | AEAT |
   | `/guias/plazos-renta-2025` | plazo renta 2025, cuándo empieza la renta | AEAT |
   | `/guias/modelo-303-casillas` | modelo 303 casillas, cómo rellenar el 303 | AEAT |
   | `/guias/alta-autonomo-paso-a-paso` | darse de alta como autónomo, modelo 036/037 | AEAT y Seguridad Social |
   | `/guias/tarifa-plana-autonomos-2026` | tarifa plana autónomos 2026, 80 euros | Seguridad Social y BOE |
   | `/guias/verifactu-que-es` | verifactu, facturación autónomos 2026 | AEAT y BOE |
   | `/calculadora-sueldo-neto` | calculadora sueldo neto 2026, salario bruto a neto | AEAT (retenciones) |
   | `/calculadora-cuota-autonomos` | calculadora cuota autónomos 2026 | Seguridad Social |
   | `/guias/app-para-controlar-gastos` | app para controlar gastos, gestor de gastos gratis | (comparativa honesta) |
   | `/guias/ingreso-minimo-vital`, `/guias/bono-social-electrico`, `/guias/bono-alquiler-joven` | requisitos, cómo pedirlo | Seguridad Social, BOE, ministerios |

   Las tres últimas ya tienen vídeo público (45 a 48): la guía y el vídeo se refuerzan entre sí.
4. **Vídeos incrustados en las páginas.** Google indexa mejor un `VideoObject` cuando el vídeo se ve en la propia página. Hace falta añadir `https://www.youtube-nocookie.com` a `frame-src` en la CSP, mostrar un reproductor con miniatura que solo cargue el iframe al pulsarlo, y empezar por las 4 guías de Hacienda.
5. **Fechas en las guías.** Añadir `updated` a cada guía, visible en la página, y llevarlo a `Article.dateModified`. Hoy no se publica ninguna fecha para no inventarla.
6. **Guías en inglés.** Solo merecen la pena las de expatriados («Spanish income tax for expats», «autónomo in Spain»). Si no, mejor no traducir.
7. **Imágenes Open Graph por sección** (Renta, autónomos, Hacienda, Videoteca) de 1200×630. Hoy todas usan `og-image.png`.
8. **Core Web Vitals.** Medir en PageSpeed la portada y `/calculadora-renta`. Las capturas de la portada son webp: comprobar que llevan `width`/`height` y `loading="lazy"` fuera de la primera pantalla.
9. **Enlaces de calidad**: foros de autónomos, comunidades de finanzas personales y blogs de gestorías. Aportar las guías como recurso, sin comprar enlaces.
10. **Medir cada mes**: consultas y CTR por página en Search Console, cobertura (404 y «rastreada, no indexada») y registros con `utm_source` desde YouTube y Play.

## YouTube (propuestas; publicar requiere permiso)

- Títulos: la palabra clave al principio y como mucho 70 caracteres. Mover «para tontos» al final o quitarlo cuando no quepa. Ejemplos:
  - «Renta WEB 2025 paso a paso: revisa y presenta tu borrador» (en lugar de «Renta WEB para tontos: …»).
  - «Modelo 303 paso a paso: IVA trimestral para autónomos».
  - «Modelo 130 paso a paso: pago fraccionado del IRPF».
  - «Certificado digital FNMT: cómo conseguirlo paso a paso».
  - «Ingreso Mínimo Vital 2026: requisitos y cómo pedirlo».
- Descripción: primera línea con la palabra clave y un enlace a la guía de la web con UTM, por ejemplo `https://finanverso.app/hacienda-paso-a-paso/modelo-303?utm_source=youtube&utm_medium=video&utm_campaign=v22`. Después, capítulos (`00:00 …`), la fuente oficial con su fecha y el aviso de que es orientativo.
- Playlists públicas por sección de la Videoteca (Empieza, App, Hacienda, Autónomos, Renta, Hogar y ayudas). Los vídeos Premium (ocultos) nunca van en playlists públicas.
- Pantalla final con el vídeo siguiente de la misma sección y tarjeta a la guía relacionada.

## Ficha de Google Play (propuesta, no publicada)

- **Título (≤ 30):** `Finanverso: gastos y la Renta` (29)
- **Descripción breve (≤ 80):** `Controla gastos y presupuestos, haz la Renta y tus impuestos de autónomo.` (73)
- **Descripción completa:** partir de `docs/marketing/play-listing.md` con estos cambios:
  - Primer párrafo con las búsquedas reales: «app para controlar gastos», «presupuesto mensual», «declaración de la Renta», «modelo 303 y 130».
  - Un bloque «HACIENDA PASO A PASO» (Cl@ve, Renta WEB, 303, 130) y otro «VÍDEOS PASO A PASO» que lleve a la Videoteca.
  - Precios iguales que en la web: gratis para empezar; Premium a 3,49 €/mes o 29,99 €/año, con 14 días de prueba.
  - Sin valoraciones ni número de usuarios inventados. Terminar con el aviso de que las estimaciones fiscales son orientativas.

## Search Console (pasos para el propietario)

1. Entra en https://search.google.com/search-console con la cuenta de la marca y añade una propiedad de tipo **Dominio** `finanverso.app`.
2. Verifícala con el registro TXT que da Google, en el DNS de Cloudflare (DNS › Añadir registro › TXT, nombre `@`). La propiedad de prefijo `https://finanverso.app/` ya puede estar verificada con el archivo HTML de `public/`: no lo borres.
3. Ve a **Sitemaps** y envía `https://finanverso.app/sitemap.xml`. Comprueba que pone «Correcto» y unas 61 URL descubiertas.
4. En **Inspección de URLs**, prueba `/`, `/pricing`, `/en` y `/videoteca`. Mira la página renderizada, el canonical elegido por Google y los datos estructurados detectados.
5. En **Mejoras**, revisa breadcrumbs, vídeos y fragmentos de producto o software, y corrige los avisos que salgan.
6. Haz lo mismo en Bing Webmaster Tools (puede importar la propiedad desde Search Console).
7. Qué vigilar las próximas 4 semanas:
   - Que `/pricing`, `/terms` y `/privacy` dejen de salir como duplicados de la portada.
   - Que las URL `/en` se indexen con su `hreflang`.
   - Los 404 nuevos de direcciones antiguas.
   - Las impresiones y el CTR de «calculadora renta», «modelo 303 paso a paso», «modelo 130» y «cuota autónomos 2026».

## Segunda ronda (18 de octubre de 2026)

- **Hecho:** títulos (≤ 65) y descripciones (≤ 155) de todas las páginas, con un test que lo vigila; 9 guías nuevas (Renta 2025, plazos, casillas del 303, alta de autónomo, tarifa plana, VERI*FACTU, IMV, bono social, Bono Alquiler Joven) con fuentes oficiales y fecha de consulta; vídeo incrustado (youtube-nocookie, carga al pulsar) en las guías con vídeo público y en las de Hacienda; «Actualizado» visible y `dateModified` en el JSON-LD; `frame-src` de la CSP.
- **Pendiente:** `/calculadora-sueldo-neto` y `/calculadora-cuota-autonomos` (otro agente); enlazarlas desde las guías cuando existan. VERI*FACTU, tarifa plana y bono social cambian con frecuencia: revisar las guías cuando se publique la norma del nuevo aplazamiento y a final de año (el bono social baja del 42,5/57,5 % al 35/50 % el 1 de enero de 2027 salvo prórroga).
- **Medir:** impresiones y CTR de las 9 guías nuevas, vídeos detectados en Search Console (Mejoras › Vídeos) y errores de la CSP (está en modo Report-Only).

## Tercera ronda: muro de registro (18 de octubre de 2026)

- **Hecho:** las guías (`/guias/*`), Hacienda paso a paso (`/hacienda-paso-a-paso/*`) y las calculadoras solo se ven enteras con cuenta. Sin cuenta, la app y el HTML pre-renderizado muestran lo mismo: el H1, la introducción, el principio de la primera sección (2 párrafos), los títulos de lo que sigue y el panel de registro con el vídeo 1. En las calculadoras, qué hacen y sus preguntas (sin respuestas ni formulario). Las listas (`/guias`, `/hacienda-paso-a-paso`), la Videoteca, la portada, precios y páginas legales siguen públicas.
- **Datos estructurados:** fuera `HowTo`, `FAQPage` de las calculadoras y `VideoObject` de las guías (ya no está en lo que se ve); quedan `Article` (también en Hacienda), `WebApplication` y `BreadcrumbList`. El sitemap ya no declara vídeos en las guías; la Videoteca los conserva. `npm run test:seo` (también en el build) comprueba que el HTML no lleva el texto bloqueado y que los datos estructurados cuadran.
- **Medir:** impresiones, posición media y CTR de las guías y calculadoras (pueden bajar: hay menos texto indexable), avisos de «HowTo»/«Preguntas frecuentes» que desaparecen en Mejoras, y registros que llegan con `next` a una guía.

## Indexación 25-10-2026

Informe «Indexación de páginas» de Search Console (última actualización 19-10-2026): 78 indexadas y 152 sin indexar. No hay que indexarlo todo.

| Motivo | URLs | Qué son | Veredicto |
|---|---|---|---|
| Excluida por «noindex» | 121 | Todas son `/login?next=…` y `/login?mode=register&next=…` (es y `/en`), una pareja por guía, calculadora y paso de Hacienda | Intencional: `/login` lleva `noindex, follow` a propósito. Corregido el origen del ruido (ver abajo) |
| Página con redirección | 27 | `http://` y `www.` a `https://finanverso.app/` (3) y `/en/guias` y `/en/guias/<slug>` (24, 301 a `/guias…`; las guías no están traducidas) | Intencional (HTTP, www). Los `/en/guias…` salían de enlaces del SPA en inglés: corregido |
| Descubierta, sin indexar | 2 | `/login` (noindex a propósito) y `/en/hacienda-paso-a-paso/modelo-130` (pública, en el sitemap, `index, follow`, canonical y hreflang correctos) | La primera, intencional; la segunda solo necesita tiempo y señales |
| Rastreada, sin indexar | 2 | `/pricing` y `/en/videoteca` (públicas, en el sitemap, bien etiquetadas) | Calidad/antigüedad: Google las rastreó y aún no las ha indexado. Sin error técnico |

Comprobado en el sitio real el 25-10-2026: título y description únicos, `meta robots` `index, follow`, canonical y hreflang es/en/x-default en `/pricing`, `/en/videoteca` y `/en/hacienda-paso-a-paso/modelo-130`; los tres están en `sitemap.xml`. No hay cabeceras `X-Robots-Tag` en el servidor: el único `noindex` es el de `/login` y `/404` del pre-renderizado (`frontend/scripts/seo/pages.mjs`). Las rutas privadas de la app no llevan URL propia (pantallas dentro de `/` con sesión).

Corregido en el repo (pendiente de desplegar con la release en curso):

- Los enlaces «Crea tu cuenta» y «Entra» del muro de registro de las guías, calculadoras y pasos de Hacienda llevan `rel="nofollow"` en el HTML pre-renderizado (`scripts/seo/pages.mjs`): Google ya no descubre una URL de login por cada página.
- `robots.txt`: `Disallow: /*?next=` y `/*&next=` para no gastar rastreo en esas URL. Las ya conocidas irán desapareciendo del informe solas.
- Nuevo `SiteLink` (`src/shared/components/SiteLink.tsx`): en las páginas `/en`, los enlaces a `/guias…` van directos a la URL final en español, sin pasar por la redirección `/en/guias…`.
- `sitemap.xml`: sin cambios de URL (78, ninguna redirige); solo se actualizan los `lastmod` de las páginas cuyo HTML cambia.

Qué hacer en Search Console: no validar el grupo «noindex» ni las redirecciones de HTTP/www. Tras desplegar, validar «Página con redirección» (`/en/guias…`) y vigilar las 2 sin indexar entre 2 y 6 semanas. Si siguen igual, mejorar el texto de `/pricing` (preguntas frecuentes reales) y enlazar `/en/videoteca` desde más páginas en inglés.
