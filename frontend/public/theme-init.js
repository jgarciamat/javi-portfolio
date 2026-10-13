// Sets the look before the page paints, so a light theme does not flash dark first.
// Same rules as src/core/theme/theme.ts.
(function () {
  try {
    var choice = localStorage.getItem('mm_theme');
    var light = window.matchMedia('(prefers-color-scheme: light)').matches;
    var theme = choice === 'light' || choice === 'dark' ? choice : light ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    // People with a session never see the text search engines read (see scripts/prerender.mjs).
    if (localStorage.getItem('mm_user')) document.documentElement.classList.add('has-session');
    var bar = document.querySelector('meta[name="theme-color"]');
    if (bar) bar.setAttribute('content', theme === 'light' ? '#ffffff' : '#0f172a');
  } catch (e) {
    /* storage blocked: the dark default stays */
  }
})();
