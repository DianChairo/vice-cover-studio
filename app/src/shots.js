// Fixed scenes for screenshots: ?shot=editor shows the page with the sample photos loaded;
// ?shot=cover shows the cover alone. Extra params pick the scene: layout, grade, lettering,
// size (1080x1080, 1080x1350 or 1920x1080), title and subtitle. window.__shotReady is set
// once the scene has painted, so headless Chrome can wait for it before screenshotting.
export async function runShot(shot, query, load) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const scene = {
    layout: query.get('layout') ?? 'hero',
    grade: query.get('grade') ?? 'sunset',
    lettering: query.get('lettering') ?? 'block',
    size: query.get('size') ?? '1080x1080',
    title: query.get('title') ?? query.get('caption') ?? 'Neon Coast',
    subtitle: query.get('subtitle') ?? 'VICE COAST · EST. 2026',
  };
  await load(scene);
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
