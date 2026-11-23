// Apply a manual Light/Dark choice before first paint (no flash).
try {
  var s = JSON.parse(localStorage.getItem('hom-compass.appearance') || 'null');
  var m = s && s.state && s.state.mode;
  if (m === 'light' || m === 'dark') {
    document.documentElement.setAttribute('data-theme', m);
    var c = m === 'dark' ? '#0c1d1a' : '#f4f9f8';
    document.querySelectorAll('meta[name="theme-color"]').forEach(function (e) {
      e.setAttribute('content', c);
    });
  }
} catch (e) {}
