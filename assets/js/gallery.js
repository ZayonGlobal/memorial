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
    <div class="pills" role="group" aria-label="Filter photos by season" id="filters" style="padding-bottom:28px;border-bottom:1px solid rgba(217,115,43,.18)"></div>
    <div class="masonry" id="grid" style="margin-top:28px"></div>
    <div class="center" style="margin-top:28px"><button class="btn btn-ghost" type="button" id="more" hidden>Load more photos</button></div>
  </div>
</section>


<section class="archive-section on-light" id="family-archive" aria-labelledby="archive-title">
  <div class="wrap section">
    <div class="archive-heading">
      <div><p class="eyebrow">Preserved moments</p><h2 class="h2" id="archive-title">The Family Photo Archive</h2>
      <p class="lead">Browse separate albums from his younger years and rural missions, including church planting, evangelism and outreach. Each collection preserves its original photographs.</p></div>
      <span class="archive-count" aria-label="27 archive photographs">27 photographs</span>
    </div>
    <div class="archive-filters" id="archive-filters" role="group" aria-label="Choose an archive collection"></div>
    <div class="archive-grid" id="archive-grid"></div>
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
</section>`;


const archivePhotos = [{"group":"younger","label":"Younger years","src":"assets/img/archive/younger-IMG_20261124_080124_858.webp"},{"group":"younger","label":"Younger years","src":"assets/img/archive/younger-IMG_20261124_080144_901.webp"},{"group":"younger","label":"Younger years","src":"assets/img/archive/younger-IMG_20261124_080348_457.webp"},{"group":"younger","label":"Younger years","src":"assets/img/archive/younger-IMG_20261124_080420_781.webp"},{"group":"younger","label":"Younger years","src":"assets/img/archive/younger-IMG_20261124_083024_122.webp"},{"group":"younger","label":"Younger years","src":"assets/img/archive/younger-IMG_20261124_083034_510.webp"},{"group":"younger","label":"Younger years","src":"assets/img/archive/younger-IMG_20261124_083049_513.webp"},{"group":"younger","label":"Younger years","src":"assets/img/archive/younger-IMG_20261124_083114_727.webp"},{"group":"younger","label":"Younger years","src":"assets/img/archive/younger-IMG_20261124_083127_920.webp"},{"group":"auna","label":"Auna","src":"assets/img/archive/auna-IMG_20261124_111158_961.webp"},{"group":"auna","label":"Auna","src":"assets/img/archive/auna-IMG_20261124_111211_206.webp"},{"group":"auna","label":"Auna","src":"assets/img/archive/auna-IMG_20261124_111234_803.webp"},{"group":"jika","label":"Jika","src":"assets/img/archive/jika-IMG_20261124_110720_755.webp"},{"group":"jika","label":"Jika","src":"assets/img/archive/jika-IMG_20261124_110736_374.webp"},{"group":"balugu","label":"Balugu","src":"assets/img/archive/balugu-IMG_20261124_111403_728.webp"},{"group":"balugu","label":"Balugu","src":"assets/img/archive/balugu-IMG_20261124_111429_037.webp"},{"group":"balugu","label":"Balugu","src":"assets/img/archive/balugu-IMG_20261124_111452_945.webp"},{"group":"balugu","label":"Balugu","src":"assets/img/archive/balugu-IMG_20261124_111505_058.webp"},{"group":"balugu","label":"Balugu","src":"assets/img/archive/balugu-IMG_20261124_111522_243.webp"},{"group":"kainji","label":"Kainji","src":"assets/img/archive/kainji-IMG_20261124_110925_320.webp"},{"group":"kainji","label":"Kainji","src":"assets/img/archive/kainji-IMG_20261124_110956_656.webp"},{"group":"kainji","label":"Kainji","src":"assets/img/archive/kainji-IMG_20261124_111015_007.webp"},{"group":"wawa","label":"Wawa","src":"assets/img/archive/wawa-IMG_20261124_105810_798.webp"},{"group":"wawa","label":"Wawa","src":"assets/img/archive/wawa-IMG_20261124_105900_775.webp"},{"group":"wawa","label":"Wawa","src":"assets/img/archive/wawa-IMG_20261124_110001_883.webp"},{"group":"wawa","label":"Wawa","src":"assets/img/archive/wawa-IMG_20261124_110026_705.webp"},{"group":"wawa","label":"Wawa","src":"assets/img/archive/wawa-IMG_20261124_110040_007.webp"}];
let archiveGroup = 'all';
const archiveGroups = [['all','All albums'],['younger','Younger years'],['missions','Rural missions'],['auna','Auna'],['jika','Jika'],['balugu','Balugu'],['kainji','Kainji'],['wawa','Wawa']];
function renderArchive() {
  const subset = archivePhotos.filter(p => archiveGroup === 'all' || (archiveGroup === 'missions' ? p.group !== 'younger' : p.group === archiveGroup));
  document.getElementById('archive-filters').innerHTML = archiveGroups.map(([key,label]) =>
    `<button type="button" class="pill" data-archive="${key}" aria-pressed="${key === archiveGroup}">${label}</button>`).join('');
  const grid=document.getElementById('archive-grid');
  grid.style.display='block';
  const groups=[...new Set(subset.map(p=>p.group))];
  grid.innerHTML=groups.map(key=>{
    const photos=subset.filter(p=>p.group===key);
    return `<section style="margin:32px 0 48px" aria-label="${esc(photos[0].label)} album"><div style="display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:18px"><h3 class="h3" style="margin:0;font-size:clamp(24px,4vw,34px)">${esc(photos[0].label)}</h3><span class="label">${photos.length} photographs</span></div><div class="archive-grid">${photos.map(p=>`<button type="button" class="archive-photo" data-archive-i="${subset.indexOf(p)}" aria-label="View ${esc(p.label)} photograph"><span class="archive-image" style="background:#f2f3ef"><img src="${esc(p.src)}" style="object-fit:contain;image-orientation:from-image" loading="lazy" decoding="async" alt="${esc(p.label)} — archival photograph"></span><span class="archive-photo-caption"><span>${esc(p.label)}</span><span aria-hidden="true">View photo ↗</span></span></button>`).join('')}</div></section>`;
  }).join('');
  grid.onclick=e=>{
    const tile=e.target.closest('[data-archive-i]');if(!tile)return;
    const selected=subset[Number(tile.dataset.archiveI)];
    const album=subset.filter(p=>p.group===selected.group);
    lightbox(album.map(p=>({src:p.src,caption:p.label,meta:'Family archive photograph'})),album.indexOf(selected));
  };
}
document.getElementById('archive-filters').addEventListener('click',e=>{
 const button=e.target.closest('[data-archive]');if(!button)return;
 archiveGroup=button.dataset.archive;renderArchive();
});
renderArchive();

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
if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
