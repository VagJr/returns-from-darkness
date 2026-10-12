// Replay the classic sprite frames, with a static alternative for reduced motion.
const motion = matchMedia('(prefers-reduced-motion: reduce)');
function update() {
  document.querySelectorAll('[data-classic-logo]').forEach(image => {
    image.src = '/assets/returns-from-darkness-classic-' + (motion.matches ? 'static' : 'animated') + '.webp';
  });
}
motion.addEventListener('change', update);
update();
