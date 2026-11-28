import { sb, layout, esc, ornament, bokeh, publicUrl, reveal, lightbox } from './lib.js';

const main = document.getElementById('main');
const s = await layout('story');

const [secR, tlR] = await Promise.all([
  sb.from('memorial_story_sections').select('*').order('sort'),
  sb.from('memorial_timeline').select('*').order('sort')
]);
const sections = secR.data || [];
const timeline = tlR.data || [];
const quoteAfter = Math.min(3, sections.length);

const glance = [
  ['Born', s.glance_born], ['Parents', s.glance_parents], ['Married to', s.glance_married],
  ['Survived by', s.glance_survived], ['Passed on', s.glance_passed]
].filter(([, v]) => v);

const secHtml = (x) => `
  <article class="story-sec reveal" id="sec-${x.sort}">
    ${x.eyebrow ? `<p class="k">${esc(x.eyebrow)}</p>` : ''}
    <h2 class="h3" style="font-size:42px">${esc(x.title)}</h2>
    <p class="body">${esc(x.body)}</p>
    ${x.image_url ? `<figure><button type="button" class="tile" style="width:100%;display:block" data-lb="${esc(publicUrl(x.image_url))}" data-cap="${esc(x.caption || '')}"><img src="${esc(publicUrl(x.image_url))}" alt="${esc(x.caption || x.title)}" loading="lazy"></button>${x.caption ? `<figcaption>${esc(x.caption)}</figcaption>` : ''}</figure>` : ''}
  </article>`;

const quote = s.his_words ? `
  <blockquote class="quote-block reveal">
    <span aria-hidden="true" style="display:block;font-family:var(--serif);font-size:72px;line-height:.5;color:var(--gold)">“</span>
    <p>${esc(s.his_words)}</p>
    <p class="label" style="margin-top:16px;font-family:var(--sans);font-style:normal;font-size:12px;color:var(--gold)">In his words</p>
  </blockquote>` : '';

main.innerHTML = `
<section class="dark page-hero center">
  ${bokeh([['left:8%', 'top:14%', 200, 0], ['right:10%', 'top:30%', 150, -7], ['left:42%', 'bottom:4%', 90, -12]])}
  <div class="wrap" style="max-width:900px">
    <p class="eyebrow rise" style="font-size:23px">His Life Story</p>
    <h1 class="h1 rise d1" style="font-size:clamp(44px,6vw,78px)">The Story of ${esc(s.name || '')}</h1>
    <p class="years rise d2">${esc(s.birth_year || '')} — ${esc(s.death_year || '')}</p>
    <div class="rise d3">${ornament()}</div>
    ${s.story_intro ? `<p class="lead rise d4" style="margin-top:26px">${esc(s.story_intro)}</p>` : ''}
  </div>
</section>

<div class="on-light">
  ${sections.length > 1 ? `<nav class="m-chapters" aria-label="Chapters of his story">${sections.map((x) => `<a href="#sec-${x.sort}">${esc(x.title)}</a>`).join('')}</nav>` : ''}
  <div class="wrap story-layout">
    <div class="story-main">
      ${sections.slice(0, quoteAfter).map(secHtml).join('')}
      ${quote}
      ${sections.slice(quoteAfter).map(secHtml).join('')}
      ${!sections.length ? '<p class="empty">His story will be shared here soon.</p>' : ''}
    </div>
    <aside class="story-aside">
      ${glance.length ? `<div class="card-white reveal"><h2>At a Glance</h2><dl class="glance">${glance.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></div>` : ''}
      ${timeline.length ? `<div class="card-white reveal" style="border-top:0"><h2>Timeline</h2><ol class="timeline ${timeline.length > 6 ? 'm-fold' : ''}" id="timeline">${timeline.map((t) => `<li><span class="y">${esc(t.year)}</span><span class="l">${esc(t.label)}</span></li>`).join('')}</ol>${timeline.length > 6 ? `<button type="button" class="m-more" aria-controls="timeline" aria-expanded="false">Show all ${timeline.length} dates</button>` : ''}</div>` : ''}
    </aside>
  </div>
</div>

<section class="ministry-band on-light" aria-labelledby="ministry-band-h">
  <div class="wrap">
    <div class="ministry-band-copy">
      <p class="eyebrow">His ministry</p>
      <h2 class="h2" id="ministry-band-h">A Life Dedicated to the Gospel</h2>
      <p class="lead">He served as a full-time rural evangelist, church planter, ordained pastor and Special Apostle in the Cherubim and Seraphim Movement Church, and as Chairman of its Church Planting and Mission Board, reviving local churches and supporting rural congregations.</p>
      <a class="btn btn-dark" href="gallery.html#missions">See the mission albums →</a>
    </div>
    <div class="ministry-band-pics" aria-hidden="true">
      <img src="assets/img/archive/thumbs/wawa-IMG_20261124_153731_463.webp" alt="" loading="lazy" decoding="async">
      <img src="assets/img/archive/thumbs/shao-IMG_20261124_154024_212.webp" alt="" loading="lazy" decoding="async">
    </div>
  </div>
</section>

<section class="next-band">
  <div class="wrap">
    <div><p class="eyebrow gd" style="font-size:20px">Continue</p><p class="big">See him in every season of his life</p></div>
    <div class="archive-story-actions"><a class="btn btn-dark" href="seasons.html">Seasons of His Life →</a><a class="btn btn-outline" href="gallery.html">Photo Gallery →</a></div>
  </div>
</section>`;

main.removeAttribute('aria-busy');
main.addEventListener('click', (e) => {
  const more = e.target.closest('.m-more');
  if (more) {
    const open = document.getElementById('timeline').classList.toggle('m-fold') === false;
    more.setAttribute('aria-expanded', String(open));
    more.textContent = open ? 'Show fewer dates' : `Show all ${timeline.length} dates`;
    return;
  }
  const b = e.target.closest('[data-lb]');
  if (b) lightbox([{ src: b.dataset.lb, caption: b.dataset.cap }]);
});
reveal();
