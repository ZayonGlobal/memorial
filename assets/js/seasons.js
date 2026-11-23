import { sb, layout, esc, placeholder, bokeh, publicUrl, reveal, lightbox, $ } from './lib.js';

const main = document.getElementById('main');
await layout('seasons');

const [seR, phR, shR] = await Promise.all([
  sb.from('memorial_seasons').select('*').order('sort'),
  sb.from('memorial_season_photos').select('*').order('sort'),
  sb.from('memorial_gallery').select('id,uploader_name,image_path,caption,year_text,season_id,created_at')
    .eq('status', 'approved').not('season_id', 'is', null).order('created_at', { ascending: false })
]);
const seasons = seR.data || [];
const family = phR.data || [];
const shared = shR.data || [];

// one list of photos per season for the lightbox
const bySeason = {};
seasons.forEach((x) => {
  const fam = family.filter((p) => p.season_id === x.id).map((p) => ({ src: publicUrl(p.image_url), caption: p.caption || '', meta: x.title }));
  const sh = shared.filter((p) => p.season_id === x.id).map((p) => ({ src: publicUrl(p.image_path), caption: p.caption || '', meta: `Shared by ${p.uploader_name}${p.year_text ? ' · ' + p.year_text : ''}`, by: p.uploader_name }));
  bySeason[x.id] = { fam, sh, all: [...fam, ...sh] };
});

function grid(x) {
  const { fam, sh, all } = bySeason[x.id];
  if (!all.length) {
    return `<div class="grid">
      <div class="tile big" style="cursor:default">${placeholder('Photos coming soon')}</div>
      <div class="tile" style="cursor:default">${placeholder('', true)}</div>
      <div class="tile" style="cursor:default">${placeholder('', true)}</div>
    </div>`;
  }
  const shown = all.slice(0, 6);
  return `<div class="grid">${shown.map((p, i) => {
    const isShared = i >= fam.length;
    return `<button type="button" class="tile ${i === 0 ? 'big' : ''}" data-season="${esc(x.id)}" data-i="${i}" aria-label="View photo${p.caption ? ': ' + esc(p.caption) : ''}">
      <img src="${esc(p.src)}" alt="${esc(p.caption || x.title)}" loading="lazy">
      ${i === 0 && p.caption && !isShared ? `<span class="tcap">${esc(p.caption)}</span>` : ''}
      ${isShared ? `<span class="tag">Shared by ${esc(p.by)}</span>` : ''}
      ${i === shown.length - 1 && all.length > shown.length ? `<span class="tag" style="left:auto;right:10px">+${all.length - shown.length} more</span>` : ''}
    </button>`;
  }).join('')}</div>`;
}

main.innerHTML = `
<section class="dark page-hero center">
  ${bokeh([['left:10%', 'top:20%', 210, 0], ['right:8%', 'top:8%', 160, -8], ['right:34%', 'bottom:6%', 100, -13]])}
  <div class="wrap" style="max-width:980px">
    <p class="eyebrow rise" style="font-size:23px">Chapters of a life well lived</p>
    <h1 class="h1 rise d1">Seasons of His Life</h1>
    <p class="lead rise d2" style="margin-top:22px">From his childhood to his final years, each chapter holds the family's photographs, a few words about who he was then, and the pictures friends have shared.</p>
    <nav class="pills center rise d3" aria-label="Jump to a season" style="margin-top:40px">
      ${seasons.map((x) => `<a class="pill" href="#season-${esc(x.id)}"><span class="num">${esc(x.numeral)}</span>${esc(x.title)}</a>`).join('')}
    </nav>
  </div>
</section>

<div class="on-light">
  <section class="wrap chapters" id="chapters">
    <div class="line" aria-hidden="true"></div>
    ${seasons.map((x) => {
      const n = bySeason[x.id];
      return `
    <article class="chapter" id="season-${esc(x.id)}">
      <span class="dot" aria-hidden="true">${esc(x.numeral)}</span>
      <div class="row">
        <div class="txt reveal">
          <p class="k">Chapter ${esc(x.numeral)}${x.period ? ' · ' + esc(x.period) : ''}</p>
          <h2 class="h3" style="font-size:46px">${esc(x.title)}</h2>
          ${x.eyebrow ? `<p class="sub">${esc(x.eyebrow)}</p>` : ''}
          <p class="body">${esc(x.writeup)}</p>
          ${n.all.length ? `<p class="label" style="margin-top:22px;display:flex;flex-wrap:wrap;gap:6px 18px;font-weight:500;letter-spacing:.14em;color:var(--muted-2)"><span>${n.fam.length} family ${n.fam.length === 1 ? 'photo' : 'photos'}</span>${n.sh.length ? `<span>${n.sh.length} shared by friends</span>` : ''}</p>` : ''}
        </div>
        <div class="reveal" style="flex:999 1 560px;min-width:0;display:flex">${grid(x)}</div>
      </div>
    </article>`;
    }).join('')}
    ${!seasons.length ? '<p class="empty">The seasons of his life will be shared here soon.</p>' : ''}
  </section>
</div>

<section class="next-band">
  <div class="wrap">
    <div><p class="eyebrow gd" style="font-size:20px">Do you have a photo of him?</p><p class="big">Add it to the season it belongs to</p></div>
    <a class="btn btn-dark" href="gallery.html#upload">Share a Photo →</a>
  </div>
</section>`;

main.removeAttribute('aria-busy');
main.addEventListener('click', (e) => {
  const t = e.target.closest('[data-season]');
  if (!t) return;
  lightbox(bySeason[t.dataset.season].all, Number(t.dataset.i));
});

// gold line "draws" itself as you scroll
const line = $('.chapters .line');
const sec = $('#chapters');
function draw() {
  if (!line || !sec) return;
  const r = sec.getBoundingClientRect();
  const p = Math.min(1, Math.max(0, (window.innerHeight * 0.75 - r.top) / r.height));
  line.style.setProperty('--draw', p.toFixed(3));
}
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
  addEventListener('scroll', draw, { passive: true }); draw();
} else line?.style.setProperty('--draw', '1');

reveal();
if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
