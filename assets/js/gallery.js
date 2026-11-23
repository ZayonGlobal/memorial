import { sb, layout, esc, icon, bokeh, publicUrl, reveal, uploadImage, lightbox, $ } from './lib.js';

const main = document.getElementById('main');
await layout('gallery');

const { data: seasonsData } = await sb.from('memorial_seasons').select('id,title,sort').order('sort');
const seasons = seasonsData || [];
const seasonName = (id) => seasons.find((x) => x.id === id)?.title || '';
const PAGE = 24;
let filter = 'all';
let page = 0;
let items = [];

main.innerHTML = `
<section class="dark">
  ${bokeh([['right:10%', 'top:12%', 220, 0], ['left:4%', 'bottom:4%', 130, -8]])}
  <div class="wrap" style="padding-top:90px;padding-bottom:48px;display:flex;flex-wrap:wrap;gap:24px 64px;align-items:flex-end;justify-content:space-between">
    <div style="flex:1 1 460px;min-width:0">
      <p class="eyebrow rise" style="font-size:23px">Photos from family and friends</p>
      <h1 class="h1 rise d1">Shared Memories</h1>
      <p class="lead rise d2" style="margin-top:18px;max-width:540px">Pictures of him that friends and relatives have kept over the years. Each one is approved by the family before it appears here.</p>
    </div>
    <a class="btn btn-gold rise d3" href="#upload">${icon.plus()}Share a Photo</a>
  </div>
  <div class="wrap" style="padding-bottom:100px">
    <div class="pills" role="group" aria-label="Filter photos by season" id="filters" style="padding-bottom:28px;border-bottom:1px solid rgba(195,165,122,.18)"></div>
    <div class="masonry" id="grid" style="margin-top:28px"></div>
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
        <li>— JPG or PNG, up to 10MB each</li>
        <li>— You can add up to 10 photos at once</li>
        <li>— The family reviews every photo before it is shown</li>
      </ul>
    </div>
    <div class="form-card" style="flex:999 1 560px;min-width:0" id="formCard"></div>
  </div>
</section>`;

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
      err.textContent = (ex?.message?.includes('10MB') ? ex.message : 'Sorry, something went wrong while uploading. Please check your connection and try again.') + (sent ? ` (${sent} of ${files.length} were sent.)` : '');
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
if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
