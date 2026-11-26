import { sb, layout, esc, icon, publicUrl, reveal, uploadImage, lightbox, $ } from './lib.js';
import { ALBUMS } from './archive-data.js';

const main = document.getElementById('main');
await layout('gallery');

const { data: seasonsData } = await sb.from('memorial_seasons').select('id,title,sort').order('sort');
const seasons = seasonsData || [];
const seasonName = (id) => seasons.find((x) => x.id === id)?.title || '';
const PAGE = 24;
let filter = 'all';
let page = 0;
let items = [];

const COVERS = { wedding: 'wedding-IMG_20261124_083049_513', wawa: 'wawa-IMG_20261124_153731_463', salika: 'salika-IMG_20261124_112157_682', shao: 'shao-IMG_20261124_154024_212', younger: 'younger-IMG_20261124_080144_901' };
const IMG = 'assets/img/archive/';
const full = (ph) => `${IMG}${ph.f}.webp`;
const thumb = (ph) => `${IMG}thumbs/${ph.f}.webp`;
const cover = (a) => a.photos.find((p) => p.f === COVERS[a.key]) || a.photos[0];
const early = ALBUMS.filter((a) => a.cat === 'early');
const ministry = ALBUMS.filter((a) => a.cat === 'ministry');
const kicker = (a) => a.kicker || (a.cat === 'ministry' ? 'Mission outreach' : a.cat === 'family' ? 'Family' : 'Early life');
const plural = (n) => `${n} photograph${n === 1 ? '' : 's'}`;

function albumCard(a) {
  const c = cover(a);
  return `<a class="album-card reveal" href="#album-${esc(a.key)}" data-album="${esc(a.key)}" aria-label="Open the ${esc(a.title)} album, ${plural(a.photos.length)}">
    <span class="album-cover"><img src="${esc(a.remote ? c.src : thumb(c))}" ${c.tw ? `width="${c.tw}" height="${c.th}"` : ''} alt="" loading="lazy" decoding="async"></span>
    <span class="album-body">
      <span class="album-kicker">${esc(kicker(a))}</span>
      <span class="album-title">${esc(a.title)}</span>
      <span class="album-meta"><span>${plural(a.photos.length)}</span><span class="album-open" aria-hidden="true">Open album →</span></span>
    </span>
  </a>`;
}

main.innerHTML = `
<section class="page-hero gallery-hero">
  <div class="wrap">
    <p class="eyebrow rise">Photo gallery</p>
    <h1 class="h1 rise d1">His Life in Pictures</h1>
    <p class="lead rise d2">Restored photographs from his early years and the rural mission fields he served, kept in albums by place, alongside the pictures family and friends have shared.</p>
    <nav class="gallery-jump rise d3" aria-label="Gallery sections">
      <a href="#early-life">Early Life &amp; Family</a><a href="#missions">Ministry &amp; Missions</a><a href="#shared">Shared Memories</a><a href="#upload">Share a Photo</a>
    </nav>
  </div>
</section>

<section class="gallery-cat on-light" id="early-life" aria-labelledby="early-h">
  <span id="family-archive" class="anchor-alias"></span>
  <div class="wrap">
    <header class="cat-head">
      <div><p class="eyebrow">Albums</p><h2 class="h2" id="early-h">Early Life &amp; Family</h2></div>
      <p class="cat-note">The years before the mission field, and the family he built.</p>
    </header>
    <div class="album-grid" id="early-albums"></div>
  </div>
</section>

<section class="gallery-cat ministry on-light" id="missions" aria-labelledby="missions-h">
  <div class="wrap">
    <div class="ministry-intro">
      <div>
        <p class="eyebrow">Ministry &amp; missionary outreaches</p>
        <h2 class="h2" id="missions-h">A Life Dedicated to the Gospel</h2>
      </div>
      <div class="ministry-copy">
        <p>Pastor I. O. Odusina was a full-time rural evangelist, church planter, ordained pastor and Special Apostle in the Cherubim and Seraphim Movement Church.</p>
        <p>As Chairman of the Church Planting and Mission Board he established churches and took the gospel to remote communities. He visited local churches to revive and strengthen them, supported rural congregations and delivered relief materials to mission outposts, in Wawa, Jika, Kainji, Shao Ile and many other communities.</p>
        <p>These photographs record that commitment.</p>
      </div>
    </div>
    <div class="album-grid" id="ministry-albums"></div>
  </div>
</section>

<section class="gallery-cat shared on-light" id="shared" aria-labelledby="shared-h">
  <div class="wrap">
    <header class="cat-head">
      <div><p class="eyebrow">From family and friends</p><h2 class="h2" id="shared-h">Shared Memories</h2></div>
      <a class="btn btn-gold" href="#upload">${icon.plus()}Share a Photo</a>
    </header>
    <p class="lead" style="margin:0 0 26px;max-width:620px">Pictures of him that friends and relatives have kept over the years. The family approves each one before it appears here.</p>
    <div class="pills" role="group" aria-label="Filter shared photos by season" id="filters" style="padding-bottom:24px"></div>
    <div class="masonry" id="grid" style="margin-top:8px"></div>
    <div class="center" style="margin-top:28px"><button class="btn btn-ghost" type="button" id="more" hidden>Load more photos</button></div>
  </div>
</section>

<section class="on-light" id="upload" style="scroll-margin-top:70px">
  <div class="wrap section" style="display:flex;flex-wrap:wrap;gap:48px 72px">
    <div style="flex:1 1 340px;min-width:0">
      <p class="eyebrow">Do you have a picture of him?</p>
      <h2 class="h2">Share a Photo</h2>
      <p class="lead" style="margin-top:18px">Old or recent, formal or candid: every picture helps us see more of him. Tell us a little about it so the family can place it in the right season of his life.</p>
      <ul style="margin:26px 0 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:12px;color:var(--text-2);font-size:15px">
        <li>— Any phone photo: it is resized and compressed automatically</li>
        <li>— You can add up to 10 photos at once</li>
        <li>— The family reviews every photo before it is shown</li>
      </ul>
    </div>
    <div class="form-card" style="flex:999 1 560px;min-width:0" id="formCard"></div>
  </div>
</section>

<div class="album-sheet" id="albumSheet" role="dialog" aria-modal="true" aria-labelledby="albumTitle" hidden>
  <div class="album-sheet-inner">
    <header class="album-sheet-head">
      <button class="icon-btn" type="button" id="albumClose" aria-label="Close album">${icon.left()}</button>
      <div class="album-sheet-title"><p class="album-kicker" id="albumKicker"></p><h2 id="albumTitle"></h2></div>
    </header>
    <p class="album-desc" id="albumDesc"></p>
    <div class="album-photos" id="albumPhotos"></div>
  </div>
</div>`;

// ---------- archive albums ----------
const albumsByKey = Object.fromEntries(ALBUMS.map((a) => [a.key, a]));
function renderAlbums() {
  $('#early-albums').innerHTML = early.map(albumCard).join('');
  $('#ministry-albums').innerHTML = ministry.map(albumCard).join('');
}
renderAlbums();

// Family-verified photos the admin added to the "Seasons of His Life" chapters become extra
// Early Life & Family albums (one per chapter that has photos; the ministry chapter joins the missions).
const { data: seasonPhotos } = await sb.from('memorial_season_photos').select('season_id,image_url,caption,sort').order('sort');
if (seasonPhotos?.length) {
  for (const se of seasons) {
    // archive photos linked into a season already have their own album here, so leave them out
    const ps = seasonPhotos.filter((p) => p.season_id === se.id && !p.image_url.startsWith('assets/'));
    if (!ps.length) continue;
    const isMinistry = /ministry|mission/i.test(se.title);
    const a = { key: 'season-' + se.sort, cat: isMinistry ? 'ministry' : 'family', title: se.title, remote: true,
      desc: 'Photographs the family added to this chapter of his life.',
      photos: ps.map((p) => ({ src: publicUrl(p.image_url), cap: p.caption || '' })) };
    albumsByKey[a.key] = a; (isMinistry ? ministry : early).push(a);
  }
  renderAlbums();
}

const sheet = $('#albumSheet');
let openKey = null, sheetLastFocus = null;
const photoSrc = (a, p) => (a.remote ? p.src : full(p));
const thumbSrc = (a, p) => (a.remote ? p.src : thumb(p));

function openAlbum(key, push = true) {
  const a = albumsByKey[key]; if (!a) return;
  openKey = key; sheetLastFocus = document.activeElement;
  $('#albumKicker').textContent = `${kicker(a)} · ${plural(a.photos.length)}`;
  $('#albumTitle').textContent = a.title;
  $('#albumDesc').textContent = a.desc;
  $('#albumPhotos').innerHTML = a.photos.map((p, i) => `<button type="button" class="album-photo" data-i="${i}" aria-label="View photograph ${i + 1} of ${a.photos.length}${p.cap ? ': ' + esc(p.cap) : ''}">
      <img src="${esc(thumbSrc(a, p))}" ${p.tw ? `width="${p.tw}" height="${p.th}"` : ''} alt="${esc(p.cap || a.title + ' photograph ' + (i + 1))}" loading="lazy" decoding="async">
      ${p.cap ? `<span class="album-photo-cap">${esc(p.cap)}</span>` : ''}
    </button>`).join('');
  sheet.hidden = false; requestAnimationFrame(() => sheet.classList.add('show'));
  document.body.style.overflow = 'hidden';
  sheet.querySelector('.album-sheet-inner').scrollTop = 0;
  $('#albumClose').focus();
  if (push) history.pushState({ album: key }, '', '#album-' + key);
}
function closeAlbum(fromPop = false) {
  if (!openKey) return;
  const key = openKey; openKey = null;
  sheet.classList.remove('show');
  setTimeout(() => { if (!openKey) sheet.hidden = true; }, 250);
  document.body.style.overflow = '';
  (sheetLastFocus && document.contains(sheetLastFocus) ? sheetLastFocus : document.querySelector(`[data-album="${key}"]`))?.focus?.();
  if (!fromPop) {
    if (history.state?.album) history.back();
    else history.replaceState(null, '', location.pathname + location.search + (albumsByKey[key]?.cat === 'ministry' ? '#missions' : '#early-life'));
  }
}
main.addEventListener('click', (e) => {
  const card = e.target.closest('[data-album]');
  if (card) { e.preventDefault(); openAlbum(card.dataset.album); }
});
$('#albumClose').addEventListener('click', () => closeAlbum());
$('#albumPhotos').addEventListener('click', (e) => {
  const b = e.target.closest('.album-photo'); if (!b) return;
  const a = albumsByKey[openKey];
  lightbox(a.photos.map((p, i) => ({ src: photoSrc(a, p), caption: p.cap || '', alt: p.cap || `${a.title} photograph ${i + 1}`,
    meta: `${a.title} · ${i + 1} of ${a.photos.length}` })), Number(b.dataset.i));
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || !openKey || document.querySelector('.lightbox.open')) return;
  closeAlbum();
});
// keep keyboard focus inside the open album
sheet.addEventListener('keydown', (e) => {
  if (e.key !== 'Tab') return;
  const f = [...sheet.querySelectorAll('button')].filter((x) => x.offsetParent);
  if (!f.length) return;
  if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
  else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
});
window.addEventListener('popstate', () => {
  const m = location.hash.match(/^#album-(.+)$/);
  if (m && albumsByKey[m[1]]) openAlbum(m[1], false); else closeAlbum(true);
});

function renderFilters() {
  const opts = [['all', 'All photos'], ...seasons.map((x) => [x.id, x.title])];
  $('#filters').innerHTML = opts.map(([v, l]) => `<button type="button" class="pill" aria-pressed="${v === filter}" data-f="${esc(v)}">${esc(l)}</button>`).join('');
}
$('#filters').addEventListener('click', (e) => {
  const b = e.target.closest('[data-f]'); if (!b) return;
  filter = b.dataset.f; renderFilters(); page = 0; items = []; $('#grid').innerHTML = ''; load();
});

function tile(p, i) {
  const meta = ['Shared by ' + p.uploader_name, seasonName(p.season_id), p.year_text].filter(Boolean).join(' · ');
  return `<button type="button" class="photo" data-i="${i}" aria-label="View photo shared by ${esc(p.uploader_name)}">
    <img src="${esc(publicUrl(p.image_path))}" alt="${esc(p.caption || 'Photo shared by ' + p.uploader_name)}" loading="lazy">
    <span class="pcap">${p.caption ? `<span class="c">${esc(p.caption)}</span>` : ''}<span class="s">${esc(meta)}</span></span>
  </button>`;
}
async function load() {
  const grid = $('#grid');
  grid.classList.add('loading');
  let q = sb.from('memorial_gallery').select('id,uploader_name,image_path,caption,year_text,people,season_id,created_at')
    .eq('status', 'approved').order('created_at', { ascending: false }).range(page * PAGE, page * PAGE + PAGE - 1);
  if (filter !== 'all') q = q.eq('season_id', filter);
  const { data, error } = await q;
  grid.classList.remove('loading');
  if (error) { console.error(error); grid.innerHTML = '<p class="empty">Photos could not be loaded. Please refresh the page.</p>'; return; }
  const start = items.length;
  items = items.concat(data);
  if (!items.length) grid.innerHTML = `<p class="empty" style="column-span:all">${filter === 'all' ? 'No shared photos yet. Be the first to add one.' : 'No photos in this season yet. Be the first to share one.'}</p>`;
  else grid.insertAdjacentHTML('beforeend', data.map((p, i) => tile(p, start + i)).join(''));
  $('#more').hidden = data.length < PAGE;
}
$('#more').addEventListener('click', () => { page++; load(); });
$('#grid').addEventListener('click', (e) => {
  const b = e.target.closest('.photo'); if (!b) return;
  lightbox(items.map((p) => ({
    src: publicUrl(p.image_path),
    caption: p.caption || '',
    meta: ['Shared by ' + p.uploader_name, p.people, seasonName(p.season_id), p.year_text].filter(Boolean).join(' · ')
  })), Number(b.dataset.i));
});

// ---------- upload form ----------
function renderForm() {
  $('#formCard').innerHTML = `
  <form class="form" id="gform" novalidate style="margin-top:0">
    <div class="hp" aria-hidden="true"><label for="g-web">Leave this empty</label><input id="g-web" tabindex="-1" autocomplete="off"></div>
    <label class="drop" for="g-file" id="gdrop">
      ${icon.upload(34)}
      <span class="big">Drag photos here, or tap to choose</span>
      <small>From your phone gallery or computer</small>
    </label>
    <input id="g-file" type="file" accept="image/*" multiple class="sr-only">
    <div class="previews" id="gprev"></div>
    <div class="field-row">
      <div class="field"><label for="g-name">Your name *</label><input id="g-name" required maxlength="120" autocomplete="name" placeholder="Your name"></div>
      <div class="field"><label for="g-season">Season of his life</label><select id="g-season"><option value="">Not sure</option>${seasons.map((x) => `<option value="${esc(x.id)}">${esc(x.title)}</option>`).join('')}</select></div>
    </div>
    <div class="field-row">
      <div class="field"><label for="g-year">Approximate year</label><input id="g-year" maxlength="60" placeholder="e.g. early 1990s"></div>
      <div class="field"><label for="g-who">Who is in the photo</label><input id="g-who" maxlength="300" placeholder="Names, left to right"></div>
    </div>
    <div class="field"><label for="g-cap">The story behind it</label><textarea id="g-cap" rows="4" maxlength="2000" placeholder="Where was this taken? What was happening?"></textarea></div>
    <p class="err" id="gerr" role="alert" hidden></p>
    <button class="btn btn-dark" type="submit" id="gsubmit">Send to the Family</button>
  </form>`;
  let files = [];
  const showPrev = () => {
    $('#gprev').innerHTML = files.map((f, i) => `<figure><img src="${URL.createObjectURL(f)}" alt="Selected photo ${i + 1}"><button type="button" aria-label="Remove photo ${i + 1}" data-rm="${i}">×</button></figure>`).join('');
  };
  const add = (list) => {
    const imgs = [...list].filter((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name));
    files = files.concat(imgs).slice(0, 10); showPrev();
  };
  $('#g-file').addEventListener('change', (e) => { add(e.target.files); e.target.value = ''; });
  $('#gprev').addEventListener('click', (e) => { const b = e.target.closest('[data-rm]'); if (b) { files.splice(Number(b.dataset.rm), 1); showPrev(); } });
  const drop = $('#gdrop');
  ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', (e) => add(e.dataTransfer.files));

  $('#gform').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('#gerr'); err.hidden = true;
    if ($('#g-web').value) return;
    const uploader_name = $('#g-name').value.trim();
    if (!files.length) { err.textContent = 'Please choose at least one photo.'; err.hidden = false; return; }
    if (!uploader_name) { err.textContent = 'Please add your name so the family knows who shared it.'; err.hidden = false; return; }
    const meta = {
      uploader_name,
      season_id: $('#g-season').value || null,
      year_text: $('#g-year').value.trim() || null,
      people: $('#g-who').value.trim() || null,
      caption: $('#g-cap').value.trim() || null
    };
    const btn = $('#gsubmit'); btn.disabled = true;
    let sent = 0;
    try {
      for (const f of files) {
        btn.textContent = `Uploading ${sent + 1} of ${files.length}…`;
        const image_path = await uploadImage(f);
        const { error } = await sb.from('memorial_gallery').insert({ ...meta, image_path });
        if (error) throw error;
        sent++;
      }
      $('#formCard').innerHTML = `<div class="thanks">${icon.flameSolid(40, 52)}<h3>Thank you for sharing</h3><p>${sent === 1 ? 'Your photo has' : `Your ${sent} photos have`} been sent to the family. ${sent === 1 ? 'It' : 'They'} will appear in the gallery once they have reviewed ${sent === 1 ? 'it' : 'them'}.</p><button class="btn btn-outline" type="button" id="again" style="margin-top:22px">Share another</button></div>`;
      $('#again').onclick = renderForm;
    } catch (ex) {
      console.error(ex);
      err.textContent = (ex?.friendly ? ex.message : 'Sorry, something went wrong while uploading. Please check your connection and try again.') + (sent ? ` (${sent} of ${files.length} were sent.)` : '');
      err.hidden = false; btn.disabled = false; btn.textContent = 'Send to the Family';
      files = files.slice(sent); showPrev();
    }
  });
}

renderFilters();
renderForm();
await load();
main.removeAttribute('aria-busy');
reveal();
const deep = location.hash.match(/^#album-(.+)$/);
if (deep && albumsByKey[deep[1]]) { history.replaceState(null, '', location.pathname + '#' + (albumsByKey[deep[1]].cat === 'ministry' ? 'missions' : 'early-life')); openAlbum(deep[1]); }
else if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
