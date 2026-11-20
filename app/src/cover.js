// Vice Cover Studio render engine: multi-panel GTA-style poster covers drawn on a 2D canvas.
// One state object describes the whole cover; drawCover paints it at any size, so the live
// preview and the exported PNG are the same drawing at different resolutions.

/** Panel rectangles as fractions of the canvas [x, y, w, h], per layout. */
export const LAYOUTS = {
  hero: [
    [0, 0, 1, 0.62],
    [0, 0.62, 1 / 3, 0.38],
    [1 / 3, 0.62, 1 / 3, 0.38],
    [2 / 3, 0.62, 1 / 3, 0.38],
  ],
  full: [[0, 0, 1, 1]],
  grid: [
    [0, 0, 0.5, 0.5],
    [0.5, 0, 0.5, 0.5],
    [0, 0.5, 0.5, 0.5],
    [0.5, 0.5, 0.5, 0.5],
  ],
  triptych: [
    [0, 0, 1 / 3, 1],
    [1 / 3, 0, 1 / 3, 1],
    [2 / 3, 0, 1 / 3, 1],
  ],
};

/** Colour grades: a canvas filter for the photos plus full-cover gradient overlays. */
export const GRADES = {
  sunset: {
    filter: 'saturate(1.35) contrast(1.08)',
    overlays: [
      { from: [0, 0], to: [0, 1], stops: [[0, 'rgba(255,170,60,0.16)'], [0.55, 'rgba(255,110,80,0.05)'], [1, 'rgba(255,46,136,0.34)']], blend: 'overlay' },
      { from: [0, 1], to: [0, 0], stops: [[0, 'rgba(123,47,255,0.22)'], [1, 'rgba(123,47,255,0)']], blend: 'soft-light' },
    ],
  },
  nights: {
    filter: 'saturate(1.45) contrast(1.1)',
    overlays: [
      { from: [0, 0], to: [1, 1], stops: [[0, 'rgba(255,46,136,0.30)'], [0.5, 'rgba(120,40,200,0.08)'], [1, 'rgba(25,200,232,0.30)']], blend: 'overlay' },
      { from: [0, 0], to: [0, 1], stops: [[0, 'rgba(10,10,40,0.18)'], [1, 'rgba(10,10,40,0)']], blend: 'multiply' },
    ],
  },
  golden: {
    filter: 'saturate(1.3) contrast(1.05) brightness(1.04)',
    overlays: [
      { from: [0, 0], to: [0, 1], stops: [[0, 'rgba(255,210,61,0.22)'], [0.6, 'rgba(255,140,40,0.06)'], [1, 'rgba(180,60,20,0.26)']], blend: 'soft-light' },
      { from: [0, 1], to: [0, 0], stops: [[0, 'rgba(255,120,40,0.18)'], [1, 'rgba(255,120,40,0)']], blend: 'overlay' },
    ],
  },
  noir: {
    filter: 'grayscale(0.92) contrast(1.18) brightness(1.02)',
    overlays: [
      { from: [0, 0], to: [1, 1], stops: [[0, 'rgba(255,46,136,0.16)'], [1, 'rgba(25,200,232,0.16)']], blend: 'soft-light' },
    ],
  },
};

export const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

/** A fresh per-panel crop: zoom 1 fills the panel, dx/dy shift the photo inside it. */
export function freshCrop() {
  return { zoom: 1, dx: 0, dy: 0 };
}

let noiseCanvas = null;
/** A small tile of random grey noise, reused as the grain pattern. */
export function grainTile() {
  if (noiseCanvas) return noiseCanvas;
  noiseCanvas = document.createElement('canvas');
  noiseCanvas.width = 140;
  noiseCanvas.height = 140;
  const nctx = noiseCanvas.getContext('2d');
  const data = nctx.createImageData(140, 140);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = 110 + Math.floor(Math.random() * 90);
    data.data[i] = v; data.data[i + 1] = v; data.data[i + 2] = v; data.data[i + 3] = 255;
  }
  nctx.putImageData(data, 0, 0);
  return noiseCanvas;
}

/** Draws one photo into a panel rect, cover-fit, with the panel's crop applied. */
export function drawPanelPhoto(ctx, photo, rect, crop, grade) {
  const [rx, ry, rw, rh] = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rx, ry, rw, rh);
  ctx.clip();
  if (!photo) {
    const g = ctx.createLinearGradient(rx, ry, rx + rw, ry + rh);
    g.addColorStop(0, '#3d2358');
    g.addColorStop(1, '#160a26');
    ctx.fillStyle = g;
    ctx.fillRect(rx, ry, rw, rh);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = `700 ${Math.max(14, rh * 0.07)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('ADD A PHOTO', rx + rw / 2, ry + rh / 2);
    ctx.restore();
    return;
  }
  const base = Math.max(rw / photo.naturalWidth, rh / photo.naturalHeight);
  const scale = base * (crop?.zoom ?? 1);
  const pw = photo.naturalWidth * scale;
  const ph = photo.naturalHeight * scale;
  const cx = rx + (rw - pw) / 2 + (crop?.dx ?? 0) * rw;
  const cy = ry + (rh - ph) / 2 + (crop?.dy ?? 0) * rh;
  ctx.filter = grade?.filter ?? 'none';
  ctx.drawImage(photo, cx, cy, pw, ph);
  ctx.filter = 'none';
  ctx.restore();
}

/** Paints a gradient overlay across the whole cover. */
export function paintOverlay(ctx, w, h, overlay) {
  const [x0, y0] = overlay.from;
  const [x1, y1] = overlay.to;
  const grad = ctx.createLinearGradient(x0 * w, y0 * h, x1 * w, y1 * h);
  for (const [stop, color] of overlay.stops) grad.addColorStop(stop, color);
  ctx.save();
  ctx.globalCompositeOperation = overlay.blend;
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** Shrinks the title until it fits the banner width; returns the font size used. */
export function fitTitleFont(ctx, text, maxWidth, startSize, family) {
  let size = startSize;
  ctx.font = `900 ${size}px ${family}`;
  while (ctx.measureText(text).width > maxWidth && size > 10) {
    size -= 2;
    ctx.font = `900 ${size}px ${family}`;
  }
  return size;
}

const TITLE_FAMILY = '"Arial Black", "Helvetica Neue", Arial, sans-serif';
const SCRIPT_FAMILY = '"Segoe Script", "Brush Script MT", cursive';

/** Draws the title banner: band, big lettering, subtitle, and a small badge ribbon. */
export function drawTitleBlock(ctx, w, h, state) {
  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim().toUpperCase();
  const bandH = h * 0.2;
  const top = state.titlePos === 'top';
  const bandY = top ? 0 : h - bandH;
  const band = ctx.createLinearGradient(0, bandY, 0, bandY + bandH);
  if (top) {
    band.addColorStop(0, 'rgba(12,4,24,0.88)');
    band.addColorStop(1, 'rgba(12,4,24,0)');
  } else {
    band.addColorStop(0, 'rgba(12,4,24,0)');
    band.addColorStop(1, 'rgba(12,4,24,0.88)');
  }
  ctx.fillStyle = band;
  ctx.fillRect(0, bandY, w, bandH);
  // A thin neon rule above the title.
  const ruleY = top ? bandH * 0.12 : h - bandH * 0.88;
  const rule = ctx.createLinearGradient(0, 0, w, 0);
  rule.addColorStop(0, '#ff9a3d');
  rule.addColorStop(0.5, '#ff2e88');
  rule.addColorStop(1, '#19c8e8');
  ctx.fillStyle = rule;
  ctx.fillRect(w * 0.06, ruleY, w * 0.88, Math.max(2, h * 0.004));

  if (title) {
    const cx = w / 2;
    const baseY = bandY + bandH * 0.45;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (state.lettering === 'neon') {
      const size = fitTitleFont(ctx, title, w * 0.9, h * 0.085, SCRIPT_FAMILY);
      ctx.font = `${size}px ${SCRIPT_FAMILY}`;
      ctx.shadowColor = '#ff2e88';
      ctx.shadowBlur = size * 0.45;
      ctx.fillStyle = '#ffe9f5';
      ctx.fillText(title, cx, baseY);
      ctx.shadowColor = '#19c8e8';
      ctx.shadowBlur = size * 0.2;
      ctx.fillText(title, cx, baseY);
      ctx.shadowBlur = 0;
    } else if (state.lettering === 'outline') {
      const size = fitTitleFont(ctx, title, w * 0.9, h * 0.105, TITLE_FAMILY);
      ctx.font = `900 ${size}px ${TITLE_FAMILY}`;
      ctx.lineWidth = Math.max(2, size * 0.05);
      ctx.strokeStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = size * 0.12;
      ctx.strokeText(title, cx, baseY);
      ctx.shadowBlur = 0;
    } else if (state.lettering === 'gradient') {
      const size = fitTitleFont(ctx, title, w * 0.9, h * 0.105, TITLE_FAMILY);
      ctx.font = `900 ${size}px ${TITLE_FAMILY}`;
      const g = ctx.createLinearGradient(0, baseY - size * 0.55, 0, baseY + size * 0.55);
      g.addColorStop(0, '#ffd23d');
      g.addColorStop(0.5, '#ff7a3d');
      g.addColorStop(1, '#ff2e88');
      ctx.fillStyle = g;
      ctx.shadowColor = 'rgba(0,0,0,0.65)';
      ctx.shadowBlur = size * 0.14;
      ctx.fillText(title, cx, baseY);
      ctx.shadowBlur = 0;
    } else {
      const size = fitTitleFont(ctx, title, w * 0.9, h * 0.105, TITLE_FAMILY);
      ctx.font = `900 ${size}px ${TITLE_FAMILY}`;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.65)';
      ctx.shadowBlur = size * 0.14;
      ctx.fillText(title, cx, baseY);
      ctx.shadowBlur = 0;
    }
  }
  if (subtitle) {
    const subSize = Math.max(12, h * 0.021);
    ctx.font = `700 ${subSize}px system-ui, sans-serif`;
    ctx.fillStyle = '#ffd9ec';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const subY = bandY + bandH * 0.82;
    ctx.fillText(subtitle.split('').join('\u2009'), w / 2, subY);
  }
  // Badge ribbon, top corner opposite the sun.
  const badge = 'VICE COAST';
  const bSize = Math.max(11, h * 0.016);
  ctx.font = `800 ${bSize}px system-ui, sans-serif`;
  const bw = ctx.measureText(badge.split('').join(' ')).width + bSize * 1.6;
  const bh = bSize * 2.1;
  const bx = w - bw - w * 0.03;
  const by = top ? h - bh - h * 0.03 : h * 0.03;
  ctx.save();
  ctx.translate(bx + bw / 2, by + bh / 2);
  ctx.rotate(-0.06);
  ctx.fillStyle = '#ff2e88';
  ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(badge.split('').join(' '), 0, 1);
  ctx.restore();
}

/** Draws a glowing sunset disc in the hero panel's corner. */
export function drawSunDisc(ctx, w, h, layout) {
  if (layout !== 'hero') return;
  const r = Math.min(w, h) * 0.085;
  const cx = w * 0.86;
  const cy = h * 0.13;
  const glow = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 2.4);
  glow.addColorStop(0, 'rgba(255,170,60,0.55)');
  glow.addColorStop(1, 'rgba(255,170,60,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(cx - r * 2.4, cy - r * 2.4, r * 4.8, r * 4.8);
  const disc = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
  disc.addColorStop(0, '#ffd23d');
  disc.addColorStop(0.6, '#ff7a3d');
  disc.addColorStop(1, '#ff2e88');
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Paints the whole cover onto `canvas` at its own pixel size.
 * state: { photos, panelPhoto, crops, layout, grade, title, subtitle,
 *          lettering, titlePos, grain, vignette, frame }
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  const panels = LAYOUTS[state.layout] ?? LAYOUTS.hero;
  const gap = Math.max(4, Math.round(Math.min(w, h) * 0.007));

  ctx.fillStyle = '#160a26';
  ctx.fillRect(0, 0, w, h);
  panels.forEach((frac, i) => {
    const rect = [
      Math.round(frac[0] * w) + (frac[0] > 0 ? gap / 2 : 0),
      Math.round(frac[1] * h) + (frac[1] > 0 ? gap / 2 : 0),
      Math.round(frac[2] * w) - (frac[0] > 0 ? gap / 2 : 0) - (frac[0] + frac[2] < 1 ? gap / 2 : 0),
      Math.round(frac[3] * h) - (frac[1] > 0 ? gap / 2 : 0) - (frac[1] + frac[3] < 1 ? gap / 2 : 0),
    ];
    const photo = state.photos[state.panelPhoto[i]] ?? null;
    drawPanelPhoto(ctx, photo, rect, state.crops[i], grade);
  });
  drawSunDisc(ctx, w, h, state.layout);
  for (const overlay of grade.overlays) paintOverlay(ctx, w, h, overlay);
  if (state.vignette) {
    const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(10,2,20,0.42)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  }
  if (state.grain) {
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = ctx.createPattern(grainTile(), 'repeat');
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  drawTitleBlock(ctx, w, h, state);
  if (state.frame) {
    const bw = Math.max(6, Math.round(Math.min(w, h) * 0.012));
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = bw;
    ctx.strokeRect(bw / 2, bw / 2, w - bw, h - bw);
  }
}

/** Renders the cover at the given size onto a fresh canvas (for export). */
export function renderCoverAt(state, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  drawCover(canvas, state);
  return canvas;
}
