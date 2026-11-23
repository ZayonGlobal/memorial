import { sb, layout, esc, icon, bokeh, publicUrl, reveal, fmtDate, candleCount, lightCandle, hasLitCandle, uploadImage, lightbox, toast, $ } from './lib.js';

const main = document.getElementById('main');
await layout('tributes');

const RELS = ['Family', 'Friend', 'Colleague', 'Church / Mosque / Community', 'Mentee', 'Neighbour', 'Other'];
const PAGE = 12;
let filter = 'All';
let page = 0;
let done = false;

main.innerHTML = `
<section class="dark">
  ${bokeh([['left:6%', 'top:18%', 200, 0], ['left:40%', 'bottom:6%', 120, -10], ['right:28%', 'top:8%', 90, -5]])}
  <div class="wrap" style="padding-top:90px;padding-bottom:96px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:48px">
    <div style="flex:1 1 460px;min-width:0">
      <p class="eyebrow rise" style="font-size:23px">Words from those who loved him</p>
      <h1 class="h1 rise d1">Tributes</h1>
      <p class="lead rise d2" style="margin-top:20px;max-width:520px">Family, friends, colleagues and neighbours remember him here. Every tribute is read by the family before it appears.</p>
      <a class="btn btn-gold rise d3" href="#write" style="margin-top:30px">Leave a Tribute</a>
    </div>
    <div class="candle-box rise d3" id="candle">
      <div class="candle" id="candleArt"><div class="halo" aria-hidden="true"></div>${icon.flameSolid()}<div class="wax" aria-hidden="true"></div></div>
      <p class="count" id="candleCount" aria-live="polite">—</p>
      <p class="label" style="margin:4px 0 0;font-weight:500;color:var(--on-dark-3)" id="candleLabel">candles lit in his memory</p>
      <div id="candleAction"></div>
    </div>
  </div>
</section>

<div class="on-light">
  <div class="wrap two-col">
    <div class="main">
      <div class="pills" role="group" aria-label="Filter tributes by relationship" id="filters"></div>
      <div class="tribute-grid" id="list" style="margin-top:28px"></div>
      <div class="center" style="margin-top:32px"><button class="btn btn-outline" type="button" id="more" hidden>Load more tributes</button></div>
    </div>
    <aside class="side" id="write" style="scroll-margin-top:90px">
      <div class="form-card" id="formCard"></div>
    </aside>
  </div>
</div>`;

// ---------- candle ----------
async function renderCandle() {
  const n = await candleCount();
  $('#candleCount').textContent = n ?? '—';
  $('#candleLabel').textContent = n === 1 ? 'candle lit in his memory' : 'candles lit in his memory';
  const lit = hasLitCandle();
  $('#candleArt').classList.toggle('lit', lit);
  $('#candleAction').innerHTML = lit
    ? `<p style="margin:18px 0 0;font-family:var(--serif);font-style:italic;font-size:20px;color:var(--gold-light)">Thank you. Your candle is lit.</p>`
    : `<button class="btn btn-gold" type="button" id="lightBtn" style="margin-top:20px;width:100%">Light a Candle</button>`;
  $('#lightBtn')?.addEventListener('click', async (e) => {
    e.currentTarget.disabled = true;
    try { await lightCandle(); await renderCandle(); }
    catch (err) { console.error(err); toast('Sorry, the candle could not be lit. Please try again.'); e.currentTarget.disabled = false; }
  });
}
renderCandle();

// ---------- filters ----------
function renderFilters() {
  const labels = ['All', ...RELS];
  $('#filters').innerHTML = labels.map((l) => `<button type="button" class="pill light" aria-pressed="${l === filter}" data-f="${esc(l)}">${esc(l === 'All' ? 'All' : l)}</button>`).join('');
}
$('#filters').addEventListener('click', (e) => {
  const b = e.target.closest('[data-f]'); if (!b) return;
  filter = b.dataset.f; renderFilters(); page = 0; done = false; $('#list').innerHTML = ''; load();
});

// ---------- list ----------
function card(t) {
  const img = t.photo_path ? publicUrl(t.photo_path) : '';
  const long = (t.message || '').length > 520;
  return `<article class="tribute ${t.featured ? 'featured' : 'lift'} reveal">
    ${t.featured ? `<span class="pin-badge">${icon.pin()}Pinned by the family</span>` : ''}
    <span class="q" aria-hidden="true">“</span>
    <p class="m ${long ? 'clamp' : ''}">${esc(t.message)}</p>
    ${long ? '<button type="button" class="more" data-more>Read more</button>' : ''}
    ${img ? `<button type="button" data-lb="${esc(img)}" data-cap="${esc(t.name)}" style="all:unset;cursor:zoom-in;display:block"><img src="${esc(img)}" alt="Photo shared by ${esc(t.name)}" loading="lazy"></button>` : ''}
    <div class="who"><span><b>${esc(t.name)}</b><small>${esc(t.relationship)}${t.location ? ' · ' + esc(t.location) : ''}</small></span><time datetime="${esc(t.created_at)}">${esc(fmtDate(t.created_at))}</time></div>
  </article>`;
}
async function load() {
  const list = $('#list');
  list.classList.add('loading');
  let q = sb.from('memorial_tributes').select('id,name,relationship,location,message,photo_path,created_at,featured')
    .eq('status', 'approved').order('featured', { ascending: false }).order('created_at', { ascending: false })
    .range(page * PAGE, page * PAGE + PAGE - 1);
  if (filter !== 'All') q = q.eq('relationship', filter);
  const { data, error } = await q;
  list.classList.remove('loading');
  if (error) { console.error(error); list.innerHTML = '<p class="empty">Tributes could not be loaded. Please refresh the page.</p>'; return; }
  if (page === 0 && !data.length) {
    list.innerHTML = `<p class="empty" style="flex:1">${filter === 'All' ? 'No tributes yet. Be the first to share a few words.' : 'No tributes from this group yet.'}</p>`;
  } else list.insertAdjacentHTML('beforeend', data.map(card).join(''));
  done = data.length < PAGE;
  $('#more').hidden = done;
  reveal(list);
}
$('#more').addEventListener('click', () => { if (!done) { page++; load(); } });
$('#list').addEventListener('click', (e) => {
  const m = e.target.closest('[data-more]');
  if (m) { const p = m.previousElementSibling; const open = p.classList.toggle('clamp'); m.textContent = open ? 'Read more' : 'Show less'; return; }
  const b = e.target.closest('[data-lb]');
  if (b) lightbox([{ src: b.dataset.lb, caption: `Shared by ${b.dataset.cap}` }]);
});

// ---------- form ----------
function renderForm() {
  $('#formCard').innerHTML = `
    <p class="eyebrow gd" style="font-size:20px">Share what he meant to you</p>
    <h2 class="h3" style="font-size:38px">Leave a Tribute</h2>
    <form class="form" id="tform" novalidate>
      <div class="hp" aria-hidden="true"><label for="t-web">Leave this empty</label><input id="t-web" name="website" tabindex="-1" autocomplete="off"></div>
      <div class="field"><label for="t-name">Full name *</label><input id="t-name" name="name" required maxlength="120" autocomplete="name" placeholder="Your name"></div>
      <div class="field"><label for="t-rel">Relationship to him *</label><select id="t-rel" name="relationship" required><option value="">Choose one</option>${RELS.map((r) => `<option>${esc(r)}</option>`).join('')}</select></div>
      <div class="field"><label for="t-loc">Location <span class="opt">(optional)</span></label><input id="t-loc" name="location" maxlength="120" placeholder="City, country"></div>
      <div class="field"><label for="t-msg">Your tribute *</label><textarea id="t-msg" name="message" rows="7" required maxlength="6000" placeholder="Share a memory, a lesson he taught you, or what he meant to you."></textarea></div>
      <div class="field"><span class="lbl">Photo with him <span class="opt">(optional)</span></span>
        <label class="drop" for="t-photo" style="min-height:84px;flex-direction:row" id="tdrop">${icon.upload()}<span>Upload a photo (max 10MB)</span></label>
        <input id="t-photo" name="photo" type="file" accept="image/*" class="sr-only">
        <div class="previews" id="tprev"></div>
      </div>
      <p class="err" id="terr" role="alert" hidden></p>
      <button class="btn btn-dark" type="submit" id="tsubmit">Submit Tribute</button>
      <p class="note">Your tribute will appear once the family has reviewed it.</p>
    </form>`;
  let file = null;
  const inp = $('#t-photo');
  const showPrev = () => {
    $('#tprev').innerHTML = file ? `<figure><img src="${URL.createObjectURL(file)}" alt="Selected photo"><button type="button" aria-label="Remove photo" id="trm">×</button></figure>` : '';
    $('#trm')?.addEventListener('click', () => { file = null; inp.value = ''; showPrev(); });
  };
  inp.addEventListener('change', () => { file = inp.files[0] || null; showPrev(); });
  $('#tform').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('#terr'); err.hidden = true;
    if ($('#t-web').value) return; // bot
    const name = $('#t-name').value.trim(), relationship = $('#t-rel').value, message = $('#t-msg').value.trim(), location = $('#t-loc').value.trim();
    if (!name || !relationship || !message) { err.textContent = 'Please add your name, your relationship to him, and your tribute.'; err.hidden = false; return; }
    const btn = $('#tsubmit'); btn.disabled = true; btn.textContent = file ? 'Uploading photo…' : 'Sending…';
    try {
      let photo_path = null;
      if (file) photo_path = await uploadImage(file);
      btn.textContent = 'Sending…';
      const { error } = await sb.from('memorial_tributes').insert({ name, relationship, location: location || null, message, photo_path });
      if (error) throw error;
      $('#formCard').innerHTML = `<div class="thanks">${icon.flameSolid(40, 52)}<h2>Thank you</h2><p>Your tribute has been received. It will appear here once the family has reviewed it.</p><button class="btn btn-outline" type="button" id="again" style="margin-top:22px">Write another</button></div>`;
      $('#again').onclick = renderForm;
      $('#write').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (ex) {
      console.error(ex);
      err.textContent = ex?.message?.includes('10MB') ? ex.message : 'Sorry, something went wrong sending your tribute. Please check your connection and try again.';
      err.hidden = false; btn.disabled = false; btn.textContent = 'Submit Tribute';
    }
  });
}

renderFilters();
renderForm();
await load();
main.removeAttribute('aria-busy');
reveal();
if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
