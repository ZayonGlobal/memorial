import { sb, layout, esc, icon, valueIcon, placeholder, ornament, bokeh, publicUrl, safeUrl, reveal, candleCount, fmtDate } from './lib.js';

const main = document.getElementById('main');
const s = await layout('home');

const [seasonsR, kidsR, tribR, candles] = await Promise.all([
  sb.from('memorial_seasons').select('*').order('sort'),
  sb.from('memorial_children').select('id,sort,name,relation,duration,quote,photo_url').order('sort'),
  sb.from('memorial_tributes').select('id,name,relationship,location,message,created_at,featured')
    .eq('status', 'approved').order('featured', { ascending: false }).order('created_at', { ascending: false }).limit(3),
  candleCount()
]);
const allSeasons = seasonsR.data || [];
const seasons = allSeasons.slice(0, 4);
const kids = kidsR.data || [];
const tributes = tribR.data || [];

// Season covers: use cover_url, else the first family photo of that season
const needCover = allSeasons.filter((x) => !x.cover_url).map((x) => x.id);
if (needCover.length) {
  const { data } = await sb.from('memorial_season_photos').select('season_id,image_url,sort').in('season_id', needCover).order('sort');
  (data || []).forEach((p) => { const se = allSeasons.find((x) => x.id === p.season_id); if (se && !se.cover_url) se.cover_url = p.image_url; });
}

// ---------- slideshow slides: his portrait first, then every season that has a headline ----------
const slides = [{
  img: s.portrait_url, alt: `Portrait of ${s.name || 'him'}`,
  title: s.hero_headline || 'A Life Well Lived', word: s.hero_accent || 'Forever loved',
  k: [s.birth_year, s.death_year].filter(Boolean).join(' — ')
}].concat(allSeasons.filter((x) => (x.hero_line || '').trim()).map((x) => ({
  img: x.cover_url, alt: x.title, title: x.hero_line, word: x.title,
  k: `Chapter ${x.numeral || ''}${x.period ? ' · ' + x.period : ''}`
})));
const hold = Math.min(15, Math.max(3, Number(s.slide_seconds) || 6));

const values = Array.isArray(s.values) ? s.values : [];
main.innerHTML = `
<section class="hx" id="hx" aria-roledescription="carousel" aria-label="Moments from his life" style="--hold:${hold}s">
  <div class="wrap hx-grid">
    <div class="hx-copy">
      <p class="hx-eyebrow">In loving memory of <b>${esc(s.name || '')}</b></p>
      <div class="hx-stack">
        ${slides.map((sl, i) => `
        <div class="hx-line" data-line="${i}" aria-hidden="${i ? 'true' : 'false'}">
          ${i === 0 ? '<h1 class="hx-title">' : '<p class="hx-title" role="heading" aria-level="2">'}${esc(sl.title)}${i === 0 ? '</h1>' : '</p>'}
          <span class="hx-side"><span class="w">${esc(sl.word)}</span>${sl.k ? `<span class="k">${esc(sl.k)}</span>` : ''}</span>
        </div>`).join('')}
      </div>
      ${s.welcome ? `<p class="hx-lead">${esc(s.welcome)}</p>` : ''}
      <div class="hx-cta">
        <a class="btn btn-dark" href="story.html">Read His Story ${icon.arrowUpRight()}</a>
        <a class="btn btn-ghost" href="children.html">Watch His Children ${icon.right(16)}</a>
      </div>
    </div>
    <div class="hx-frame">
      ${slides.map((sl, i) => `
      <div class="hx-slide" role="group" aria-roledescription="slide" aria-label="${i + 1} of ${slides.length}" aria-hidden="${i ? 'true' : 'false'}">
        <div class="hx-bg">${sl.img ? `<img src="${esc(publicUrl(sl.img))}" alt="${esc(sl.alt)}" ${i ? 'fetchpriority="low"' : 'fetchpriority="high"'} decoding="async">` : placeholder(i ? 'Season photo' : 'His portrait')}</div>
      </div>`).join('')}
    </div>
  </div>
  <div class="hx-band">
    <div class="wrap">
      ${s.show_service ? `<div class="hx-who"><b>${esc(s.service_title || 'Funeral Service')}</b><span>${esc([s.service_date, s.service_time, s.service_venue].filter(Boolean).join(' · '))}${[['service_livestream_url', 'Livestream'], ['service_programme_url', 'Order of service'], ['service_map_url', 'Map']].filter(([k]) => safeUrl(s[k])).map(([k, l]) => ` · <a href="${esc(safeUrl(s[k]))}" target="_blank" rel="noopener" style="color:var(--gold)">${l} →</a>`).join('')}</span></div>`
        : `<div class="hx-who"><b>${esc(s.name || '')}</b><span>${esc([s.birth_year, s.death_year].filter(Boolean).join(' — '))}</span></div>`}
      ${slides.length > 1 ? `<div class="hx-ctrl">
        <span class="num" aria-hidden="true">01</span><span class="of" aria-hidden="true">/ ${String(slides.length).padStart(2, '0')}</span>
        <div class="hx-bars" role="group" aria-label="Choose a slide">${slides.map((sl, i) => `<button type="button" aria-label="Show slide ${i + 1}: ${esc(sl.title)}"></button>`).join('')}</div>
        <button type="button" class="hx-pp" aria-label="Pause slideshow">${icon.pause()}</button>
      </div>` : ''}
      <a class="hx-down" href="#explore" aria-label="Scroll down">${icon.down()}</a>
    </div>
  </div>
</section>

<div class="dark-2 flow-root" id="explore">
  <div class="wrap">
    ${s.tagline_before || s.tagline_highlight ? `<div class="center reveal" style="padding-top:96px;max-width:760px;margin:0 auto">
      ${s.tagline_before || s.tagline_highlight ? `<p style="margin:0;font-family:var(--serif);font-size:clamp(30px,3.4vw,44px);line-height:1.2">${esc(s.tagline_before || '')} <em style="color:var(--gold)">${esc(s.tagline_highlight || '')}</em>.</p>` : ''}
    </div>` : ''}
    <section class="explore flat" aria-label="Explore">
      <a class="explore-card lift reveal" href="story.html"><span class="eyebrow" style="font-size:19px">Where his journey began</span><span class="t">His Life Story</span><span class="d">From his roots and early years to the family and legacy he leaves behind.</span><span class="go uline">Read his story →</span></a>
      <a class="explore-card lift reveal" href="children.html"><span class="eyebrow" style="font-size:19px">In their own words</span><span class="t">The Children Speak</span><span class="d">His children share their memories of him, one after the other.</span><span class="go uline">Watch the videos →</span></a>
      <a class="explore-card lift reveal" href="tributes.html"><span class="eyebrow" style="font-size:19px">Share what he meant to you</span><span class="t">Leave a Tribute</span><span class="d">Write a few words, or add a photo you have with him to the gallery.</span><span class="go uline">Write a tribute →</span></a>
    </section>
  </div>
  <section class="wrap section" aria-labelledby="who">
    <div class="split reveal">
      <div><p class="eyebrow">The man we knew</p><h2 class="h2" id="who">Who He Was</h2></div>
      <div><p class="lead ph-text" style="margin:0">${esc(s.about || '')}</p>${s.saying ? `<p style="margin:18px 0 0;font-family:var(--serif);font-style:italic;font-size:22px;color:var(--gold-light)">“${esc(s.saying)}”</p>` : ''}</div>
    </div>
    ${values.length ? `<div class="values">${values.map((v) => `
      <div class="value reveal"><span style="color:var(--gold)">${valueIcon(v.icon)}</span><h3>${esc(v.title)}</h3><p>${esc(v.text)}</p></div>`).join('')}</div>` : ''}
  </section>
</div>

<section class="on-light" aria-labelledby="seasons-h">
  <div class="wrap section">
    <div class="center reveal">
      <p class="eyebrow">Chapters of his life</p>
      <h2 class="h2" id="seasons-h">Seasons of His Life</h2>
      ${ornament('#C4621F')}
      <p class="lead" style="max-width:560px;margin:22px auto 0">Photographs from every season of his life, each with a few words on who he was then.</p>
    </div>
    <div class="season-cards">
      ${seasons.map((x) => `
      <a class="season-card lift reveal" href="seasons.html#season-${esc(x.id)}">
        <div class="media zoom">${x.cover_url ? `<img class="cover" src="${esc(publicUrl(x.cover_url))}" alt="" loading="lazy">` : placeholder('Photo')}</div>
        <div class="cap"><span class="k">Chapter ${esc(x.numeral)}${x.period ? ' · ' + esc(x.period) : ''}</span><span class="t">${esc(x.title)}</span><span class="go uline">View chapter →</span></div>
      </a>`).join('')}
    </div>
    <div class="center" style="margin-top:44px"><a class="btn btn-dark" href="seasons.html">See all the seasons</a></div>
  </div>
</section>


<section class="archive-teaser on-light" aria-labelledby="archive-teaser-title">
  <div class="wrap archive-teaser-layout">
    <div class="archive-teaser-pictures">
      <img src="assets/img/archive/younger-IMG_20261124_080144_901.webp" alt="Restored photograph from his younger years" loading="lazy" decoding="async">
      <img src="assets/img/archive/auna-IMG_20261124_111158_961.webp" alt="Restored photograph from the Auna mission collection" loading="lazy" decoding="async">
    </div>
    <div class="archive-teaser-copy">
      <p class="eyebrow">His journey in photographs</p>
      <h2 class="h2" id="archive-teaser-title">Moments Worth Remembering</h2>
      <p class="lead">Explore photographs of his earlier years and the places his journeys took him, carefully preserved for generations to come.</p>
      <a class="btn btn-dark" href="gallery.html#family-archive">Explore the photo archive →</a>
    </div>
  </div>
</section>
<section class="dark" aria-labelledby="kids-h">
  ${bokeh([['right:8%', 'top:10%', 240, -4], ['left:6%', 'bottom:10%', 160, -10]])}
  <div class="wrap section">
    <div class="split reveal">
      <div><p class="eyebrow">In their own words</p><h2 class="h2" id="kids-h">The Children Speak</h2></div>
      <p class="lead">${esc(s.children_intro || '')}</p>
    </div>
    <a class="video-teaser lift reveal" href="children.html">
      <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px">
        <span class="play-ring">${icon.play(30)}</span>
        <span class="label">Play all${s.children_total ? ' · ' + esc(s.children_total) : ''}</span>
      </div>
      ${kids.find((k) => k.quote) ? `<span style="position:absolute;left:32px;right:32px;bottom:26px;font-family:var(--serif);font-style:italic;font-size:21px;color:var(--on-dark-2)">“${esc(kids.find((k) => k.quote).quote)}”</span>` : ''}
    </a>
    <div class="child-chips">
      ${kids.map((k, i) => `
      <a class="child-chip lift reveal" href="children.html?child=${i + 1}">
        <span class="n">${k.photo_url ? `<img class="cover" src="${esc(publicUrl(k.photo_url))}" alt="" loading="lazy">` : i + 1}</span>
        <span style="min-width:0"><span class="nm">${esc(k.name)}</span><span class="rl">${esc(k.relation)}${k.duration ? ' · ' + esc(k.duration) : ''}</span></span>
      </a>`).join('')}
    </div>
  </div>
</section>

<section class="on-light" aria-labelledby="trib-h">
  <div class="wrap section">
    <div class="reveal" style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:24px">
      <div><p class="eyebrow">Words from those who loved him</p><h2 class="h2" id="trib-h">Tributes</h2></div>
      <a class="candle-pill" href="tributes.html#candle" style="color:var(--text)">
        <span style="color:var(--gold-dark)">${icon.flame(24, 'flame')}</span>
        <span style="font-size:15px"><strong style="font-weight:600">${candles ?? '—'}</strong> ${candles === 1 ? 'candle' : 'candles'} lit in his memory</span>
      </a>
    </div>
    <div class="tribute-grid" style="margin-top:52px">
      ${tributes.length ? tributes.map((t) => `
      <article class="tribute lift reveal">
        <span class="q" aria-hidden="true">“</span>
        <p class="m clamp">${esc(t.message)}</p>
        <div class="who"><span><b>${esc(t.name)}</b><small>${esc(t.relationship)}${t.location ? ' · ' + esc(t.location) : ''}</small></span><time datetime="${esc(t.created_at)}">${esc(fmtDate(t.created_at))}</time></div>
      </article>`).join('') : `<p class="empty" style="flex:1">Be the first to leave a few words in his memory.</p>`}
    </div>
    <div class="center" style="margin-top:40px"><a class="link-line uline" href="tributes.html">Read all tributes →</a></div>
  </div>
</section>

<section class="cta-band">
  <div class="wrap reveal">
    <p class="eyebrow gd">Do you have a memory of him?</p>
    <h2 class="h2">Share a Memory of Him</h2>
    <p style="margin:18px auto 0;max-width:560px;color:var(--muted)">Write a few words, or add a photo you have with him to the family gallery. The family reads everything before it appears on the site.</p>
    <div class="cta-row"><a class="btn btn-gold" href="tributes.html#write">Write a Tribute</a><a class="btn btn-dark" href="gallery.html#upload">Share a Photo</a></div>
  </div>
</section>`;

main.removeAttribute('aria-busy');
reveal();
slideshow(document.getElementById('hx'), slides.length, hold);

// ---------- slideshow controller ----------
function slideshow(root, n, holdSec) {
  const bgs = [...root.querySelectorAll('.hx-slide')];
  const lines = [...root.querySelectorAll('.hx-line')];
  const bars = [...root.querySelectorAll('.hx-bars button')];
  const pp = root.querySelector('.hx-pp');
  const num = root.querySelector('.hx-ctrl .num');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let i = 0, timer = null, paused = reduce, visible = true;
  const layer = (k) => [bgs[k], lines[k]];

  function enter(k) {
    layer(k).forEach((el) => { el.classList.remove('off'); void el.offsetWidth; el.classList.add('on'); el.setAttribute('aria-hidden', 'false'); });
  }
  function leave(k) {
    layer(k).forEach((el) => {
      el.classList.remove('on'); el.classList.add('off'); el.setAttribute('aria-hidden', 'true');
      clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('off'), 1100);
    });
  }
  function ui() {
    if (num) num.textContent = String(i + 1).padStart(2, '0');
    bars.forEach((b, j) => {
      b.classList.remove('run', 'done'); void b.offsetWidth;
      if (j < i) b.classList.add('done');
      if (j === i) { b.setAttribute('aria-current', 'true'); if (!paused) b.classList.add('run'); else b.classList.add('done'); }
      else b.removeAttribute('aria-current');
    });
    if (pp) {
      pp.innerHTML = paused ? icon.playSmall() : icon.pause();
      pp.setAttribute('aria-label', paused ? 'Play slideshow' : 'Pause slideshow');
    }
    root.classList.toggle('paused', paused);
  }
  function schedule() {
    clearTimeout(timer);
    if (!paused && visible && n > 1) timer = setTimeout(() => go(i + 1), holdSec * 1000);
  }
  function go(k) {
    k = (k + n) % n;
    if (k === i) return;
    leave(i); i = k; enter(i); ui(); schedule();
  }
  requestAnimationFrame(() => requestAnimationFrame(() => { enter(0); ui(); schedule(); }));
  if (n < 2) return;
  bars.forEach((b, j) => b.addEventListener('click', () => go(j)));
  pp?.addEventListener('click', () => { paused = !paused; ui(); schedule(); });
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; schedule(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => { visible = e.isIntersecting && !document.hidden; schedule(); }, { threshold: 0.2 }).observe(root);
  }
}
