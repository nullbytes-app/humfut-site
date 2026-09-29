// HumFut animated icons: play once when an icon comes into view, and again
// when its card or row is hovered or focused. Parts are animated by
// components.css (.hf-ai.is-playing / .is-looping). Nothing moves with
// prefers-reduced-motion.
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  function play(ai) {
    if (reduce.matches || ai.classList.contains('is-looping')) return;
    ai.classList.remove('is-playing');
    void ai.getBoundingClientRect(); // restart the animation
    ai.classList.add('is-playing');
  }
  window.HumFutIcons = { play: play };

  var icons = Array.prototype.slice.call(document.querySelectorAll('.hf-ai'));
  if ('IntersectionObserver' in window) {
    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        play(entry.target);
        seen.unobserve(entry.target);
      });
    }, { threshold: 0.6 });
    icons.forEach(function (ai) {
      if (!ai.closest('[data-ai-manual]')) seen.observe(ai);
    });
  }

  document.querySelectorAll('[data-ai-host]').forEach(function (host) {
    var replay = function () { host.querySelectorAll('.hf-ai').forEach(play); };
    host.addEventListener('pointerenter', replay);
    host.addEventListener('focusin', replay);
  });
})();
