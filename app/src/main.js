// Vice Cover Studio UI: photos in, panels, grades and caption out as a PNG.
// Wires the controls in index.html to the render engine in ./cover.js. A `?shot=`
// query sets up a fixed scene for a screenshot instead (./shots.js).

import { LAYOUTS, SIZES, drawCover, freshCrop, renderCoverAt } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const titleInput = document.getElementById('title');
const subtitleInput = document.getElementById('subtitle');

/** The whole cover, as one object the engine draws. */
const state = {
  photos: [null, null, null, null],
  panelPhoto: [0, 1, 0, 1],
  crops: [freshCrop(), freshCrop(), freshCrop(), freshCrop()],
  layout: 'hero',
  grade: 'sunset',
  title: 'Neon Coast',
  subtitle: 'VICE COAST · EST. 2026',
  lettering: 'block',
  titlePos: 'bottom',
  grain: true,
  vignette: true,
  frame: true,
};

let selectedPanel = 0;
let selectedPhoto = 0;

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function redraw() {
  const [w, h] = SIZES[document.getElementById('size').value] ?? [1080, 1080];
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  canvas.classList.toggle('tall', h > w);
  drawCover(canvas, state);
  syncCropSliders();
}

/** Panel rectangles in canvas pixels, for click hit-testing. */
export function panelRects(w, h, layout) {
  return (LAYOUTS[layout] ?? LAYOUTS.hero).map(([fx, fy, fw, fh]) => [
    fx * w, fy * h, fw * w, fh * h,
  ]);
}

/** The panel under canvas point (x, y), or -1. */
export function panelAt(x, y) {
  const rects = panelRects(canvas.width, canvas.height, state.layout);
  for (let i = rects.length - 1; i >= 0; i--) {
    const [rx, ry, rw, rh] = rects[i];
    if (x >= rx && x < rx + rw && y >= ry && y < ry + rh) return i;
  }
  return -1;
}

function canvasPoint(e) {
  const box = canvas.getBoundingClientRect();
  return [
    ((e.clientX - box.left) / box.width) * canvas.width,
    ((e.clientY - box.top) / box.height) * canvas.height,
  ];
}

/** Drag the selected panel's photo; wheel zooms it. */
let dragging = null;
canvas.addEventListener('pointerdown', (e) => {
  const [x, y] = canvasPoint(e);
  const panel = panelAt(x, y);
  if (panel < 0) return;
  selectedPanel = panel;
  dragging = { x, y };
  canvas.setPointerCapture(e.pointerId);
  syncCropSliders();
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const [x, y] = canvasPoint(e);
  const rects = panelRects(canvas.width, canvas.height, state.layout);
  const [, , rw, rh] = rects[selectedPanel];
  const crop = state.crops[selectedPanel];
  crop.dx = clamp(crop.dx + (x - dragging.x) / rw, -0.5, 0.5);
  crop.dy = clamp(crop.dy + (y - dragging.y) / rh, -0.5, 0.5);
  dragging = { x, y };
  redraw();
});
canvas.addEventListener('pointerup', () => { dragging = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const crop = state.crops[selectedPanel];
  crop.zoom = clamp(crop.zoom * (1 - e.deltaY * 0.001), 1, 3);
  redraw();
}, { passive: false });

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

/** Thumbnails of the loaded photos; click one to put it in the selected panel. */
function renderThumbs() {
  const row = document.getElementById('thumbs');
  row.innerHTML = '';
  state.photos.forEach((photo, i) => {
    if (!photo) return;
    const img = document.createElement('img');
    img.src = photo.src;
    img.alt = `Photo ${i + 1}`;
    img.classList.toggle('selected', i === selectedPhoto);
    img.addEventListener('click', () => {
      selectedPhoto = i;
      state.panelPhoto[selectedPanel] = i;
      renderThumbs();
      redraw();
    });
    row.appendChild(img);
  });
}

/** Adds image files as photos (at most four slots). */
async function addPhotos(files) {
  for (const file of files) {
    const slot = state.photos.findIndex((p) => p === null);
    if (slot < 0) {
      status.textContent = 'Four photos at most — replace one by clicking a thumbnail first.';
      break;
    }
    state.photos[slot] = await loadImage(URL.createObjectURL(file));
    selectedPhoto = slot;
    state.panelPhoto[selectedPanel] = slot;
  }
  renderThumbs();
  redraw();
}

document.getElementById('photos').addEventListener('change', (e) => {
  addPhotos([...e.target.files]);
  e.target.value = '';
});

/** Sample photos ship with the app; loading one fills an empty slot. */
async function loadSample(name) {
  const img = await loadImage(`samples/${name}.jpg`);
  let slot = state.photos.findIndex((p) => p === null);
  if (slot < 0) slot = selectedPhoto;
  state.photos[slot] = img;
  selectedPhoto = slot;
  state.panelPhoto[selectedPanel] = slot;
  renderThumbs();
  redraw();
}
document.getElementById('sample-boulevard').addEventListener('click', () => loadSample('boulevard'));
document.getElementById('sample-pier').addEventListener('click', () => loadSample('pier'));

document.getElementById('fill-all').addEventListener('click', () => {
  state.panelPhoto = state.panelPhoto.map(() => selectedPhoto);
  redraw();
  status.textContent = `Photo ${selectedPhoto + 1} now fills every panel.`;
});

/** One choice row (layout / grade / lettering): exactly one active button. */
function wireChoiceRow(id, apply) {
  const row = document.getElementById(id);
  row.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-layout], button[data-grade], button[data-lettering]');
    if (!btn) return;
    row.querySelectorAll('.choice').forEach((c) => c.classList.remove('active'));
    btn.classList.add('active');
    apply(btn.dataset);
    redraw();
  });
}
wireChoiceRow('layouts', (d) => { state.layout = d.layout; selectedPanel = 0; });
wireChoiceRow('grades', (d) => { state.grade = d.grade; });
wireChoiceRow('lettering', (d) => { state.lettering = d.lettering; });

/** Crop sliders edit the selected panel's crop. */
function syncCropSliders() {
  const crop = state.crops[selectedPanel];
  const zoom = document.getElementById('zoom');
  const sx = document.getElementById('shift-x');
  const sy = document.getElementById('shift-y');
  if (document.activeElement !== zoom) zoom.value = crop.zoom;
  if (document.activeElement !== sx) sx.value = crop.dx;
  if (document.activeElement !== sy) sy.value = crop.dy;
  document.getElementById('zoom-val').textContent = `${crop.zoom.toFixed(2)}×`;
  document.getElementById('shift-x-val').textContent = crop.dx.toFixed(2);
  document.getElementById('shift-y-val').textContent = crop.dy.toFixed(2);
}
document.getElementById('zoom').addEventListener('input', (e) => {
  state.crops[selectedPanel].zoom = Number(e.target.value);
  redraw();
});
document.getElementById('shift-x').addEventListener('input', (e) => {
  state.crops[selectedPanel].dx = Number(e.target.value);
  redraw();
});
document.getElementById('shift-y').addEventListener('input', (e) => {
  state.crops[selectedPanel].dy = Number(e.target.value);
  redraw();
});
document.getElementById('reset-crop').addEventListener('click', () => {
  state.crops[selectedPanel] = freshCrop();
  redraw();
});

titleInput.addEventListener('input', () => { state.title = titleInput.value; redraw(); });
subtitleInput.addEventListener('input', () => { state.subtitle = subtitleInput.value; redraw(); });
document.getElementById('title-pos').addEventListener('change', (e) => {
  state.titlePos = e.target.value;
  redraw();
});
document.getElementById('size').addEventListener('change', redraw);
for (const id of ['grain', 'vignette', 'frame']) {
  document.getElementById(id).addEventListener('change', (e) => {
    state[id] = e.target.checked;
    redraw();
  });
}

/** Downloads a canvas as a PNG file. */
export function downloadPNG(art, filename) {
  return new Promise((resolve) => {
    art.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      resolve();
    }, 'image/png');
  });
}

document.getElementById('export').addEventListener('click', async () => {
  const key = document.getElementById('size').value;
  const [w, h] = SIZES[key];
  const art = renderCoverAt(state, w, h);
  await downloadPNG(art, `vice-cover-${w}x${h}.png`);
  status.textContent = `Saved vice-cover-${w}x${h}.png`;
});

document.getElementById('export-all').addEventListener('click', async () => {
  const names = [];
  for (const key of Object.keys(SIZES)) {
    const [w, h] = SIZES[key];
    const art = renderCoverAt(state, w, h);
    await downloadPNG(art, `vice-cover-${w}x${h}.png`);
    names.push(`${w}x${h}`);
  }
  status.textContent = `Saved all three sizes: ${names.join(', ')}.`;
});

/** Screenshot scenes: ?shot=editor shows the page with samples; ?shot=cover the cover alone. */
const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, async (scene) => {
    if (scene.size) document.getElementById('size').value = scene.size;
    if (scene.layout) {
      state.layout = scene.layout;
      document.querySelectorAll('#layouts .choice').forEach((c) =>
        c.classList.toggle('active', c.dataset.layout === scene.layout));
    }
    if (scene.grade) {
      state.grade = scene.grade;
      document.querySelectorAll('#grades .choice').forEach((c) =>
        c.classList.toggle('active', c.dataset.grade === scene.grade));
    }
    if (scene.lettering) {
      state.lettering = scene.lettering;
      document.querySelectorAll('#lettering .choice').forEach((c) =>
        c.classList.toggle('active', c.dataset.lettering === scene.lettering));
    }
    if (scene.title) { state.title = scene.title; titleInput.value = scene.title; }
    if (scene.subtitle) { state.subtitle = scene.subtitle; subtitleInput.value = scene.subtitle; }
    const pier = await loadImage('samples/pier.jpg');
    const boulevard = await loadImage('samples/boulevard.jpg');
    state.photos[0] = pier;
    state.photos[1] = boulevard;
    selectedPhoto = 0;
    renderThumbs();
    redraw();
  });
} else {
  // First paint: the two sample photos, so the maker is visible at once.
  loadSample('pier').then(() => loadSample('boulevard')).catch(() => redraw());
  redraw();
}
