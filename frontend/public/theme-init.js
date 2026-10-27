// Sets the look before the page paints, so a light theme does not flash dark first.
// Same rules as src/core/theme/theme.ts.
(function () {
  try {
    var choice = localStorage.getItem('mm_theme');
    var light = window.matchMedia('(prefers-color-scheme: light)').matches;
    var theme = choice === 'light' || choice === 'dark' ? choice : light ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    // People with a session never see the text search engines read (see scripts/prerender.mjs),
    // and their dashboard downloads with the main chunk instead of after it.
    if (localStorage.getItem('mm_user')) {
      document.documentElement.classList.add('has-session');
      preload('session-preload');
    }
    if (localStorage.getItem('mm_locale') === 'en') preload('locale-preload');
    var bar = document.querySelector('meta[name="theme-color"]');
    if (bar) bar.setAttribute('content', theme === 'light' ? '#ffffff' : '#0f172a');
  } catch (e) {
    /* storage blocked: the dark default stays */
  }

  /** Preloads the files listed in a meta tag that the build writes (see vite.config.ts). */
  function preload(name) {
    var meta = document.querySelector('meta[name="' + name + '"]');
    if (!meta) return;
    meta.content.split(' ').forEach(function (href) {
      if (!href) return;
      var link = document.createElement('link');
      if (/\.css$/.test(href)) {
        link.rel = 'preload';
        link.as = 'style';
        // Vite asks for these with crossorigin: without it the preload is not reused and the
        // stylesheet downloads twice.
        link.crossOrigin = '';
      } else {
        link.rel = 'modulepreload';
      }
      link.href = href;
      document.head.appendChild(link);
    });
  }
})();
