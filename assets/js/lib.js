// Shared helpers: Supabase client, layout (header/footer), icons,
// image handling, lightbox, scroll reveal.
import { createClient } from '../vendor/supabase-js-2.119.2.js';
import { SUPABASE_URL, SUPABASE_KEY, BUCKET } from './config.js';
import { startPetals } from './petals.js';

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'memorial-site-auth' }
});

// ---------- small utils ----------
export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];
export function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
export function safeUrl(u) {
  const s = String(u || '').trim();
  return /^(https?:)?\/\//i.test(s) || s.startsWith('/') ? s : '';
}
export function publicUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith('assets/')) return '/' + path; // restored archive photos shipped with the site
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`;
}
export function fmtDate(iso) {
  try { return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }); }
  catch { return ''; }
}
export function store(key, val) {
  try {
    if (val === undefined) return localStorage.getItem(key);
    localStorage.setItem(key, val);
  } catch { return null; }
}

// ---------- icons (inline stroke SVG) ----------
const S = (d, w = 24, sw = 1.4, extra = '') =>
  `<svg aria-hidden="true" width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`;
export const icon = {
  flame: (w = 22, cls = '') => S('<path d="M12 2.5c2.5 3.2 5 5.6 5 9.2a5 5 0 0 1-10 0c0-3.6 2.5-6 5-9.2z"/><path d="M12 10c1 1.3 2 2.3 2 3.6a2 2 0 0 1-4 0c0-1.3 1-2.3 2-3.6z"/>', w, 1.4, cls ? `class="${cls}"` : ''),
  flameOutline: (w = 16, cls = '') => S('<path d="M12 2.5c2.5 3.2 5 5.6 5 9.2a5 5 0 0 1-10 0c0-3.6 2.5-6 5-9.2z"/>', w, 1.6, cls ? `class="${cls}"` : ''),
  flameSolid: (w = 44, h = 58, cls = 'flame') => `<svg aria-hidden="true" class="${cls}" width="${w}" height="${h}" viewBox="0 0 24 32"><path d="M12 1c3.4 4.4 7 7.8 7 12.8a7 7 0 0 1-14 0C5 8.8 8.6 5.4 12 1z" fill="#F08A3C"/><path d="M12 9c1.6 2 3.2 3.6 3.2 5.8a3.2 3.2 0 0 1-6.4 0c0-2.2 1.6-3.8 3.2-5.8z" fill="#FFE3CC"/></svg>`,
  camera: (w = 26) => S('<rect x="3" y="6" width="18" height="13" rx="2"/><circle cx="12" cy="12.5" r="3.5"/><path d="M8.5 6l1.5-2.5h4L15.5 6"/>', w, 1.3),
  play: (w = 30, fill = '#D9732B') => `<svg aria-hidden="true" width="${w}" height="${w}" viewBox="0 0 24 24" fill="${fill}"><path d="M8 5.5v13l10.5-6.5z"/></svg>`,
  family: (w = 34) => S('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7"/><path d="M18 14c2.2.6 3.5 2.8 3.5 6"/>', w, 1.2),
  integrity: (w = 34) => S('<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>', w, 1.2),
  heart: (w = 34) => S('<path d="M12 20s-7.5-4.5-7.5-10A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 7.5 3c0 5.5-7.5 10-7.5 10z"/>', w, 1.2),
  book: (w = 34) => S('<path d="M2 5h7a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H2z"/><path d="M22 5h-7a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h8z"/>', w, 1.2),
  star: (w = 34) => S('<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>', w, 1.2),
  left: (w = 18) => S('<path d="M15 6l-6 6 6 6"/>', w, 1.6),
  right: (w = 18) => S('<path d="M9 6l6 6-6 6"/>', w, 1.6),
  close: (w = 20) => S('<path d="M6 6l12 12M18 6L6 18"/>', w, 1.6),
  upload: (w = 22) => S('<path d="M12 16V4"/><path d="M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>', w, 1.5),
  pin: (w = 12) => S('<path d="M12 17v5"/><path d="M9 3h6l-1 6 3 3v2H7v-2l3-3z"/>', w, 2),
  menu: (w = 20) => S('<path d="M4 7h16M4 12h16M4 17h16"/>', w, 1.6),
  plus: (w = 16) => S('<path d="M12 5v14M5 12h14"/>', w, 1.8),
  pause: (w = 14) => `<svg aria-hidden="true" width="${w}" height="${w}" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>`,
  playSmall: (w = 14) => `<svg aria-hidden="true" width="${w}" height="${w}" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l10.5-6.5z"/></svg>`,
  arrowUpRight: (w = 15) => S('<path d="M7 17L17 7"/><path d="M8 7h9v9"/>', w, 1.8),
  down: (w = 20) => S('<path d="M12 5v14"/><path d="M6 13l6 6 6-6"/>', w, 1.8)
};
export const valueIcon = (name) => (icon[name] || icon.star)(34);

export function placeholder(label = 'Photo', light = false, cls = '') {
  return `<div class="ph ${light ? 'light' : ''} ${cls}">${icon.camera()}<span>${esc(label)}</span></div>`;
}
export function ornament(color = '#D9732B') {
  return `<div class="ornament" aria-hidden="true"><span style="background:${color}"></span><span style="width:auto;height:auto;background:none;color:${color}">${icon.flameOutline(18)}</span><span style="background:${color}"></span></div>`;
}
export function bokeh(list) {
  // list of [left/right css, top/bottom css, size, delay]
  return list.map(([x, y, s, d]) =>
    `<div class="bokeh" aria-hidden="true" style="${x};${y};width:${s}px;height:${s}px;animation-delay:${d}s"></div>`).join('');
}

// ---------- settings ----------
let settingsPromise;
export function getSettings() {
  if (!settingsPromise) {
    settingsPromise = sb.from('memorial_settings').select('data').eq('id', 1).maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error(error);
        return data?.data || {};
      });
  }
  return settingsPromise;
}

// ---------- layout ----------
const NAV = [
  ['index.html', 'Home', 'home'],
  ['story.html', 'His Story', 'story'],
  ['seasons.html', 'Seasons', 'seasons'],
  ['children.html', 'The Children Speak', 'children'],
  ['tributes.html', 'Tributes', 'tributes'],
  ['gallery.html', 'Gallery', 'gallery']
];

export async function layout(active) {
  const s = await getSettings();
  const name = s.name || 'In Loving Memory';

  if (active !== 'home') document.title = `${document.title.split('—')[0].trim()} — ${name}`;
  else document.title = `In Loving Memory of ${name}`;

  const head = $('#site-header');
  if (head) {
    let bar = '';
    if (false && active === 'home' && s.show_service) { // on the home page the service details sit in the slideshow band
      const link = safeUrl(s.service_livestream_url) || safeUrl(s.service_programme_url) || safeUrl(s.service_map_url);
      bar = `<div class="service-bar"><div class="wrap">
        <span class="t">${esc(s.service_title || 'Funeral Service')}</span>
        ${s.service_date || s.service_time ? `<span>${esc([s.service_date, s.service_time].filter(Boolean).join(' · '))}</span>` : ''}
        ${s.service_venue ? `<span>${esc(s.service_venue)}</span>` : ''}
        ${safeUrl(s.service_map_url) ? `<a href="${esc(safeUrl(s.service_map_url))}" target="_blank" rel="noopener">Map →</a>` : ''}
        ${safeUrl(s.service_programme_url) ? `<a href="${esc(safeUrl(s.service_programme_url))}" target="_blank" rel="noopener">Order of service →</a>` : ''}
        ${safeUrl(s.service_livestream_url) ? `<a href="${esc(safeUrl(s.service_livestream_url))}" target="_blank" rel="noopener">Watch livestream →</a>` : ''}
        ${!link ? '' : ''}
      </div></div>`;
    }
    head.outerHTML = `${bar}<header class="site-header ${active === 'home' ? 'over' : ''}"><div class="wrap">
      <a class="brand" href="index.html">${icon.flame(22)}<span>In Loving Memory</span></a>
      <nav aria-label="Main"><div class="nav-links" id="nav-links">
        ${NAV.map(([href, label, key]) => `<a href="${href}" ${key === active ? 'aria-current="page"' : ''}>${label}</a>`).join('')}
        <a class="nav-candle-m" href="tributes.html#candle">Light a Candle</a>
      </div></nav>
      <a class="nav-candle" href="tributes.html#candle">${icon.flameOutline(16, 'flame')}Light a Candle</a>
      <button class="nav-toggle" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="nav-links">${icon.menu()}</button>
    </div></header>`;
    const t = $('.nav-toggle');
    const hdr = $('.site-header');
    const solid = () => hdr.classList.toggle('solid', window.scrollY > 40 || $('#nav-links').classList.contains('open'));
    if (hdr.classList.contains('over')) { addEventListener('scroll', solid, { passive: true }); solid(); }
    t?.addEventListener('click', () => {
      const open = $('#nav-links').classList.toggle('open');
      solid();
      t.setAttribute('aria-expanded', String(open));
      t.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
  }

  const foot = $('#site-footer');
  if (foot) {
    foot.outerHTML = `<footer class="site-footer"><div class="wrap">
      ${ornament()}
      <p class="eyebrow" style="margin-top:22px;font-size:19px">In loving memory of</p>
      <p class="name">${esc(name)}</p>
      <p style="margin:8px 0 0;font-size:12px;letter-spacing:.3em;text-transform:uppercase">${esc(s.birth_year || '')} — ${esc(s.death_year || '')}</p>
      <nav aria-label="Footer">${NAV.slice(1).map(([h, l]) => `<a href="${h}">${l}</a>`).join('')}</nav>
      <p class="note">${esc(s.footer_note || 'Built with love by his family')} · <a class="admin-link" href="admin.html">Family login</a></p>
    </div></footer>`;
  }
  if (s.petals !== false) startPetals(s.petals_amount || 'medium');
  return s;
}

// ---------- scroll reveal ----------
export function reveal(root = document) {
  const els = $$('.reveal:not(.in)', root);
  if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  els.forEach((e, i) => { e.style.transitionDelay = `${(i % 4) * 90}ms`; io.observe(e); });
}

// ---------- toast ----------
export function toast(msg) {
  let t = $('#toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.append(t); }
  t.textContent = msg; t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 3500);
}

// ---------- images ----------
// Every photo is resized and converted to WebP in the visitor's browser
// before it is uploaded: smaller files, faster on mobile data, and the
// re-encode strips hidden metadata such as GPS location.
//   • longest side at most 2000px (enough for the full-width slideshow)
//   • WebP quality 0.80, stepping down (0.72, 0.64) if a file is still
//     larger than ~550KB
//   • Chrome, Edge, Firefox and Android encode WebP natively; Safari
//     (iPhone/Mac) uses a small WebP encoder loaded only when needed.
const IMG = { maxDim: 2000, quality: 0.8, minQuality: 0.6, targetBytes: 550 * 1024, maxInputBytes: 40 * 1024 * 1024 };

function friendly(message) { const e = new Error(message); e.friendly = true; return e; }

let nativeWebp;
async function canEncodeWebpNatively() {
  if (nativeWebp !== undefined) return nativeWebp;
  try {
    const c = document.createElement('canvas'); c.width = c.height = 2;
    const b = await new Promise((r) => c.toBlob(r, 'image/webp', 0.8));
    nativeWebp = !!b && b.type === 'image/webp';
  } catch { nativeWebp = false; }
  return nativeWebp;
}

async function decodeImage(file) {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    // older browsers: fall back to an <img> element
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } catch {
      throw friendly('This photo could not be read. Please choose a JPG, PNG or WebP photo (on iPhone, a screenshot of the photo also works).');
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }
  }
}

async function encodeWebp(canvas, quality) {
  if (await canEncodeWebpNatively()) {
    const b = await new Promise((r) => canvas.toBlob(r, 'image/webp', quality));
    if (b && b.type === 'image/webp') return b;
  }
  const { default: encode } = await import('../vendor/webp/webp-encode.js');
  const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
  const buf = await encode(data, { quality: Math.round(quality * 100), method: 4 });
  return new Blob([buf], { type: 'image/webp' });
}

export async function compressImage(file, opts = {}) {
  const o = { ...IMG, ...opts };
  if (!file) throw friendly('Please choose a photo.');
  if (file.size > o.maxInputBytes) throw friendly('That photo is too large (over 40MB). Please choose a smaller one.');
  const src = await decodeImage(file);
  const w = src.width || src.naturalWidth, h = src.height || src.naturalHeight;
  if (!w || !h) throw friendly('This photo could not be read. Please try another one.');
  const scale = Math.min(1, o.maxDim / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * scale));
  c.height = Math.max(1, Math.round(h * scale));
  const ctx = c.getContext('2d', { alpha: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, c.width, c.height);
  if (src.close) src.close();
  let q = o.quality, blob = await encodeWebp(c, q);
  while (blob.size > o.targetBytes && q - 0.08 >= o.minQuality) {
    q = Math.round((q - 0.08) * 100) / 100;
    blob = await encodeWebp(c, q);
  }
  const base = (file.name || 'photo').replace(/\.[^.]+$/, '').replace(/[^\w-]+/g, '-').slice(0, 60) || 'photo';
  return new File([blob], `${base}.webp`, { type: 'image/webp' });
}

export async function uploadImage(file, folder = 'submissions') {
  const f = await compressImage(file);
  if (f.size > 10 * 1024 * 1024) throw friendly('That photo is still too large after compressing. Please choose a smaller one.');
  const path = `${folder}/${crypto.randomUUID()}.webp`;
  const { error } = await sb.storage.from(BUCKET).upload(path, f, { contentType: 'image/webp', upsert: false, cacheControl: '31536000' });
  if (error) throw error;
  return path;
}

// ---------- lightbox ----------
let lb, lbItems = [], lbIndex = 0, lastFocus;
export function lightbox(items, index = 0) {
  lbItems = items; lbIndex = index; lastFocus = document.activeElement;
  if (!lb) {
    lb = document.createElement('div');
    lb.className = 'lightbox'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Photo viewer');
    lb.innerHTML = `<button class="icon-btn x" type="button" aria-label="Close">${icon.close()}</button>
      <button class="icon-btn prev" type="button" aria-label="Previous photo">${icon.left()}</button>
      <button class="icon-btn next" type="button" aria-label="Next photo">${icon.right()}</button>
      <figure><img alt=""><figcaption></figcaption></figure>`;
    document.body.append(lb);
    lb.addEventListener('click', (e) => { if (e.target === lb) closeLb(); });
    $('.x', lb).onclick = closeLb;
    $('.prev', lb).onclick = () => showLb(lbIndex - 1);
    $('.next', lb).onclick = () => showLb(lbIndex + 1);
    // swipe left/right on touch screens
    let sx = null, sy = 0;
    lb.addEventListener('touchstart', (e) => { if (e.touches.length === 1) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; } }, { passive: true });
    lb.addEventListener('touchend', (e) => {
      if (sx === null) return;
      const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; sx = null;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3 && lbItems.length > 1) showLb(lbIndex + (dx < 0 ? 1 : -1));
    }, { passive: true });
    document.addEventListener('keydown', (e) => {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') closeLb();
      if (e.key === 'ArrowLeft') showLb(lbIndex - 1);
      if (e.key === 'ArrowRight') showLb(lbIndex + 1);
    });
  }
  lb.classList.add('open'); requestAnimationFrame(() => lb.classList.add('show'));
  document.body.style.overflow = 'hidden';
  showLb(index);
  $('.x', lb).focus();
}
function showLb(i) {
  if (!lbItems.length) return;
  lbIndex = (i + lbItems.length) % lbItems.length;
  const it = lbItems[lbIndex];
  const img = $('img', lb); img.src = it.src; img.alt = it.alt || it.caption || 'Photo';
  $('figcaption', lb).innerHTML = `${esc(it.caption || '')}${it.meta ? `<small>${esc(it.meta)}</small>` : ''}`;
  // preload the neighbours so swiping feels instant
  if (lbItems.length > 1) [lbIndex + 1, lbIndex - 1].forEach((j) => { const n = lbItems[(j + lbItems.length) % lbItems.length]; if (n?.src) new Image().src = n.src; });
  const multi = lbItems.length > 1;
  $('.prev', lb).style.display = multi ? '' : 'none';
  $('.next', lb).style.display = multi ? '' : 'none';
}
function closeLb() {
  lb.classList.remove('show');
  setTimeout(() => lb.classList.remove('open'), 300);
  if (!document.querySelector('.album-sheet.show')) document.body.style.overflow = '';
  lastFocus?.focus?.();
}

// ---------- candles ----------
export async function candleCount() {
  const { count, error } = await sb.from('memorial_candles').select('id', { count: 'exact', head: true });
  if (error) { console.error(error); return null; }
  return count ?? 0;
}
export async function lightCandle() {
  const { error } = await sb.from('memorial_candles').insert({ created_at: new Date().toISOString() });
  if (error) throw error;
  store('memorial-candle-lit', '1');
}
export const hasLitCandle = () => store('memorial-candle-lit') === '1';
