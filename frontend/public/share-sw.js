// «Compartir con Finanverso»: loaded by the app's service worker (see vite.config.ts). The web app
// is a share target (site.webmanifest): what another app shares arrives here as a POST, is kept in
// a cache (on the device only) and the importer opens with it (src/core/share/sharedImport.ts).
var SHARE_CACHE = 'finanverso-share';

self.addEventListener('fetch', function (event) {
  var url = new URL(event.request.url);
  if (event.request.method !== 'POST' || url.pathname !== '/compartir') return;
  event.respondWith(
    (async function () {
      var form = await event.request.formData();
      var cache = await caches.open(SHARE_CACHE);
      await cache.delete('/compartir/archivo');
      await cache.delete('/compartir/texto');
      var file = form.getAll('files').find(function (f) {
        return typeof f !== 'string';
      });
      if (file) {
        await cache.put(
          '/compartir/archivo',
          new Response(file, {
            headers: {
              'content-type': file.type || 'application/octet-stream',
              'x-file-name': encodeURIComponent(file.name || 'compartido'),
            },
          })
        );
      }
      var text = ['title', 'text', 'url']
        .map(function (name) {
          return form.get(name);
        })
        .filter(function (value) {
          return typeof value === 'string' && value.trim();
        })
        .join('\n');
      if (text) await cache.put('/compartir/texto', new Response(text));
      return Response.redirect('/?importar=compartido', 303);
    })()
  );
});
