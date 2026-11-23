// Family admin panel: sign in, moderate submissions, edit all site content.
import { sb, esc, icon, publicUrl, uploadImage, lightbox, toast, fmtDate, candleCount, $, $$ } from './lib.js';
import { BUCKET } from './config.js';

const app = $('#app');
let me = null;
let recovering = /type=recovery/.test(location.hash);
const params = new URLSearchParams(location.search);
let view = params.get('v') || 'moderation';

sb.auth.onAuthStateChange((event) => {
  if (event === 'PASSWORD_RECOVERY') { recovering = true; renderRecovery(); }
  if (event === 'SIGNED_OUT') { me = null; renderLogin(); }
});

init();

async function init() {
  const { data: { session } } = await sb.auth.getSession();
  if (recovering && session) return renderRecovery();
  if (!session) return renderLogin();
  await enter(session.user);
}

async function enter(user) {
  const { data, error } = await sb.from('memorial_admins').select('email');
  if (error || !data?.length) return renderDenied(user.email);
  me = user;
  renderShell();
}

// =====================================================================
//  AUTH SCREENS
// =====================================================================
function renderLogin(msg = '') {
  app.innerHTML = `<div class="admin-center"><div class="login">
    <p class="eyebrow gd" style="font-size:20px">In Loving Memory</p>
    <h1>Family Admin</h1>
    <p class="muted" style="margin:8px 0 0">Sign in to review tributes and photos and update the site.</p>
    <form class="form" id="login">
      <div class="field"><label for="em">Email</label><input id="em" type="email" autocomplete="email" required></div>
      <div class="field"><label for="pw">Password</label><input id="pw" type="password" autocomplete="current-password" required minlength="6"></div>
      <p class="err" id="lerr" role="alert" ${msg ? '' : 'hidden'}>${esc(msg)}</p>
      <button class="btn btn-dark" type="submit" id="lbtn">Sign in</button>
    </form>
    <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;margin-top:10px">
      <button class="linkish" type="button" id="forgot">Forgot password?</button>
      <button class="linkish" type="button" id="signup">Create an account</button>
    </div>
    <p class="help" style="margin-top:12px"><a href="index.html" style="color:var(--gold-dark)">← Back to the memorial</a></p>
  </div></div>`;
  const err = (m) => { const e = $('#lerr'); e.textContent = m; e.hidden = !m; };
  $('#login').addEventListener('submit', async (e) => {
    e.preventDefault(); err('');
    const btn = $('#lbtn'); btn.disabled = true; btn.textContent = 'Signing in…';
    const { data, error } = await sb.auth.signInWithPassword({ email: $('#em').value.trim(), password: $('#pw').value });
    btn.disabled = false; btn.textContent = 'Sign in';
    if (error) return err(error.message === 'Invalid login credentials' ? 'That email and password did not match. Try again, or reset your password.' : error.message);
    await enter(data.user);
  });
  $('#forgot').onclick = async () => {
    const email = $('#em').value.trim();
    if (!email) return err('Type your email above first, then press "Forgot password?" again.');
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
    err(error ? error.message : 'If that email has an account, a reset link is on its way. Open it on this device.');
  };
  $('#signup').onclick = async () => {
    const email = $('#em').value.trim(), password = $('#pw').value;
    if (!email || password.length < 8) return err('Type your email and a password of at least 8 characters above, then press "Create an account".');
    const { error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } });
    err(error ? error.message : 'Check your email and confirm your address. Then ask a family admin to add your email under "Family admins", and sign in here.');
  };
}

function renderRecovery() {
  app.innerHTML = `<div class="admin-center"><div class="login">
    <h1>Set a new password</h1>
    <form class="form" id="rec">
      <div class="field"><label for="np">New password</label><input id="np" type="password" autocomplete="new-password" required minlength="8"></div>
      <p class="err" id="rerr" role="alert" hidden></p>
      <button class="btn btn-dark" type="submit">Save password</button>
    </form></div></div>`;
  $('#rec').addEventListener('submit', async (e) => {
    e.preventDefault();
    const { data, error } = await sb.auth.updateUser({ password: $('#np').value });
    if (error) { $('#rerr').textContent = error.message; $('#rerr').hidden = false; return; }
    recovering = false;
    history.replaceState(null, '', location.pathname);
    toast('Password updated');
    await enter(data.user);
  });
}

function renderDenied(email) {
  app.innerHTML = `<div class="admin-center"><div class="login">
    <h1>Not on the family list</h1>
    <p class="muted" style="margin-top:10px">You're signed in as <b>${esc(email)}</b>, but this email isn't on the list of family admins (or hasn't been confirmed yet). Ask a family admin to add it under "Family admins".</p>
    <button class="btn btn-outline" type="button" id="so" style="margin-top:18px">Sign out</button>
  </div></div>`;
  $('#so').onclick = () => sb.auth.signOut();
}

// =====================================================================
//  SHELL
// =====================================================================
const VIEWS = [
  ['moderation', 'Moderation'],
  ['home', 'Home & settings'],
  ['story', 'Life story & timeline'],
  ['seasons', 'Seasons & photos'],
  ['children', "Children's videos"],
  ['admins', 'Family admins'],
  ['export', 'Export & tribute book']
];

async function pendingCount() {
  const [a, b] = await Promise.all([
    sb.from('memorial_tributes').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    sb.from('memorial_gallery').select('id', { count: 'exact', head: true }).eq('status', 'pending')
  ]);
  return { t: a.count || 0, p: b.count || 0 };
}

async function renderShell() {
  app.innerHTML = `<div class="shell">
    <aside class="side">
      <a class="brand" href="index.html" target="_blank" rel="noopener">${icon.flame(22)}<span>Family Admin</span></a>
      <nav aria-label="Admin sections">${VIEWS.map(([k, l]) => `<a href="?v=${k}" data-v="${k}" ${k === view ? 'aria-current="page"' : ''}>${l}${k === 'moderation' ? '<span class="badge" id="pbadge" hidden></span>' : ''}</a>`).join('')}</nav>
      <div class="me"><span>Signed in as</span><b>${esc(me.email)}</b>
        <a href="index.html" target="_blank" rel="noopener">View the site →</a><button type="button" id="so">Sign out</button></div>
    </aside>
    <main class="content" id="content"></main>
  </div>`;
  $('#so').onclick = () => sb.auth.signOut();
  $('.side nav').addEventListener('click', (e) => {
    const a = e.target.closest('[data-v]'); if (!a) return;
    e.preventDefault(); go(a.dataset.v);
  });
  addEventListener('popstate', () => { view = new URLSearchParams(location.search).get('v') || 'moderation'; show(); });
  wireFields($('#content'));
  show();
  refreshBadge();
}
async function refreshBadge() {
  const { t, p } = await pendingCount();
  const b = $('#pbadge'); if (!b) return;
  b.textContent = t + p; b.hidden = !(t + p);
}
function go(v) {
  view = v; history.pushState(null, '', `?v=${v}`); show();
}
function show() {
  $$('.side nav a').forEach((a) => {
    if (a.dataset.v === view) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  const c = $('#content');
  c.innerHTML = '<p class="muted">Loading…</p>';
  ({ moderation: viewModeration, home: viewHome, story: viewStory, seasons: viewSeasons, children: viewChildren, admins: viewAdmins, export: viewExport }[view] || viewModeration)(c);
  window.scrollTo(0, 0);
}

// =====================================================================
//  FIELD HELPERS
// =====================================================================
let uidN = 0;
const uid = () => `f${++uidN}`;

function fieldHtml(f, val, id = uid()) {
  const fid = `${id}-${f.key}`;
  const help = f.help ? `<p class="help">${esc(f.help)}</p>` : '';
  const lab = `<label for="${fid}">${esc(f.label)}</label>`;
  switch (f.type) {
    case 'textarea':
      return `<div class="field">${lab}<textarea id="${fid}" data-k="${f.key}" rows="${f.rows || 4}" placeholder="${esc(f.placeholder || '')}">${esc(val ?? '')}</textarea>${help}</div>`;
    case 'select':
      return `<div class="field">${lab}<select id="${fid}" data-k="${f.key}">${f.options.map(([v, l]) => `<option value="${esc(v)}" ${String(val ?? '') === String(v) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>${help}</div>`;
    case 'switch':
      return `<div class="switch"><span><b style="font-weight:500">${esc(f.label)}</b>${f.help ? `<br><span class="help">${esc(f.help)}</span>` : ''}</span><button type="button" class="sw" role="switch" aria-checked="${!!val}" aria-label="${esc(f.label)}" data-k="${f.key}" data-type="switch"><span></span></button></div>`;
    case 'image':
      return `<div class="field"><span class="lbl">${esc(f.label)}</span><div class="img-field">
        <div class="pv">${val ? `<img src="${esc(publicUrl(val))}" alt="">` : 'No image'}</div>
        <div class="actions"><input type="file" accept="image/*" id="${fid}" class="sr-only" data-img="1"><label class="b" for="${fid}">${icon.upload(16)} ${val ? 'Replace' : 'Upload'}</label>
        <button type="button" class="b bad" data-clear="1" ${val ? '' : 'hidden'}>Remove</button></div>
        <input type="hidden" data-k="${f.key}" data-null="1" value="${esc(val || '')}"></div>${help}</div>`;
    default:
      return `<div class="field">${lab}<input id="${fid}" data-k="${f.key}" ${f.type === 'number' ? 'type="number" data-num="1"' : `type="${f.type === 'url' ? 'url' : 'text'}"`} ${f.nullable || f.type === 'url' ? 'data-null="1"' : ''} value="${esc(val ?? '')}" placeholder="${esc(f.placeholder || '')}">${help}</div>`;
  }
}
function readFields(root) {
  const out = {};
  $$('[data-k]', root).forEach((el) => {
    let v;
    if (el.dataset.type === 'switch') v = el.getAttribute('aria-checked') === 'true';
    else if (el.dataset.num) v = Number(el.value || 0);
    else { v = el.value.trim(); if (v === '' && el.dataset.null) v = null; }
    out[el.dataset.k] = v;
  });
  return out;
}
// one delegated listener per content area: switches, image uploads, image clear
function wireFields(root) {
  root.addEventListener('click', (e) => {
    const sw = e.target.closest('.sw');
    if (sw) sw.setAttribute('aria-checked', String(sw.getAttribute('aria-checked') !== 'true'));
    const c = e.target.closest('[data-clear]');
    if (c) {
      const w = c.closest('.img-field');
      $('input[type=hidden]', w).value = '';
      $('.pv', w).innerHTML = 'No image';
      c.hidden = true;
    }
  });
  root.addEventListener('change', async (e) => {
    const inp = e.target.closest('[data-img]');
    if (!inp || !inp.files[0]) return;
    const w = inp.closest('.img-field');
    $('.pv', w).innerHTML = 'Uploading…';
    try {
      const path = await uploadImage(inp.files[0], 'family');
      $('input[type=hidden]', w).value = path;
      $('.pv', w).innerHTML = `<img src="${esc(publicUrl(path))}" alt="">`;
      $('[data-clear]', w).hidden = false;
      toast('Photo uploaded. Remember to press Save.');
    } catch (ex) { console.error(ex); $('.pv', w).innerHTML = 'Failed'; toast(ex.message || 'Upload failed'); }
    inp.value = '';
  });
}
function busy(btn, on, label) {
  if (!btn) return;
  if (on) { btn.dataset.l = btn.textContent; btn.disabled = true; btn.textContent = label || 'Saving…'; }
  else { btn.disabled = false; btn.textContent = btn.dataset.l || btn.textContent; }
}
async function removeFile(path) {
  if (path && /^(submissions|family)\//.test(path)) await sb.storage.from(BUCKET).remove([path]);
}

// =====================================================================
//  MODERATION
// =====================================================================
let modStatus = 'pending', modType = 'tributes';
async function viewModeration(c) {
  const [{ t, p }, approvedT, candles] = await Promise.all([
    pendingCount(),
    sb.from('memorial_tributes').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
    candleCount()
  ]);
  c.innerHTML = `
    <div class="head-row"><div><p class="eyebrow gd" style="font-size:19px">Welcome back</p><h1>Moderation</h1>
      <p class="intro">Nothing visitors send appears on the site until you approve it.</p></div></div>
    <div class="stats">
      <div class="stat"><p class="k">Tributes waiting</p><p class="v">${t}</p></div>
      <div class="stat"><p class="k">Photos waiting</p><p class="v">${p}</p></div>
      <div class="stat"><p class="k">Published tributes</p><p class="v">${approvedT.count ?? 0}</p></div>
      <div class="stat dk"><p class="k">Candles lit</p><p class="v">${candles ?? '—'}</p></div>
    </div>
    <section class="box">
      <div class="box-head">
        <div class="seg" role="group" aria-label="Type">${[['tributes', `Tributes`], ['photos', 'Photos']].map(([k, l]) => `<button type="button" data-type="${k}" aria-pressed="${k === modType}">${l}</button>`).join('')}</div>
        <div class="seg" role="group" aria-label="Status">${[['pending', 'Waiting'], ['approved', 'Published'], ['rejected', 'Hidden']].map(([k, l]) => `<button type="button" data-status="${k}" aria-pressed="${k === modStatus}">${l}</button>`).join('')}</div>
      </div>
      <div id="qlist"><p class="muted" style="padding:20px">Loading…</p></div>
    </section>`;
  c.querySelector('.box-head').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.type) modType = b.dataset.type;
    if (b.dataset.status) modStatus = b.dataset.status;
    viewModeration(c);
  });
  await loadQueue();
}

async function loadQueue() {
  const box = $('#qlist');
  const isT = modType === 'tributes';
  const table = isT ? 'memorial_tributes' : 'memorial_gallery';
  let q = sb.from(table).select('*').eq('status', modStatus).order('created_at', { ascending: modStatus === 'pending' }).limit(200);
  if (isT && modStatus === 'approved') q = sb.from(table).select('*').eq('status', 'approved').order('featured', { ascending: false }).order('created_at', { ascending: false }).limit(200);
  const [{ data, error }, seasonsR] = await Promise.all([q, isT ? { data: [] } : sb.from('memorial_seasons').select('id,title').order('sort')]);
  if (error) { box.innerHTML = `<p class="err" style="margin:20px">${esc(error.message)}</p>`; return; }
  const seasons = seasonsR.data || [];
  if (!data.length) { box.innerHTML = `<p class="muted" style="padding:24px 20px">${modStatus === 'pending' ? 'Nothing waiting for review. ' : ''}No ${isT ? 'tributes' : 'photos'} here.</p>`; return; }

  box.innerHTML = data.map((r) => {
    const img = isT ? r.photo_path : r.image_path;
    const acts = [];
    if (modStatus === 'pending') {
      acts.push(`<button class="b ok" data-act="approve">Approve</button>`);
      if (isT) acts.push(`<button class="b" data-act="pin">Approve &amp; pin</button>`);
      acts.push(`<button class="b bad" data-act="reject">Hide</button>`);
    } else if (modStatus === 'approved') {
      if (isT) acts.push(`<button class="b" data-act="${r.featured ? 'unpin' : 'pin'}">${r.featured ? 'Unpin' : 'Pin to top'}</button>`);
      acts.push(`<button class="b bad" data-act="reject">Hide from site</button>`);
    } else {
      acts.push(`<button class="b ok" data-act="approve">Publish</button>`);
    }
    acts.push(`<button class="b bad" data-act="delete">Delete</button>`);
    return `<div class="qrow" data-id="${esc(r.id)}" data-img="${esc(img || '')}">
      <div class="thumb">${img ? `<img src="${esc(publicUrl(img))}" alt="" data-zoom="${esc(publicUrl(img))}">` : '“'}</div>
      <div class="info">
        <p class="meta"><b>${esc(isT ? r.name : r.uploader_name)}</b>${isT ? `<small>${esc(r.relationship)}${r.location ? ' · ' + esc(r.location) : ''}</small>` : ''}<time>${esc(fmtDate(r.created_at))}</time>${r.featured ? '<span class="tag-s pin">Pinned</span>' : ''}</p>
        ${isT ? `<p class="msg">${esc(r.message)}</p>` : `<p class="msg">${esc([r.caption, r.people && 'With: ' + r.people, r.year_text].filter(Boolean).join('\n') || 'No caption')}</p>
          <div class="field" style="margin-top:10px;max-width:320px"><label for="s-${esc(r.id)}" style="font-size:11px">Season</label><select id="s-${esc(r.id)}" data-season><option value="">Not sure</option>${seasons.map((x) => `<option value="${esc(x.id)}" ${x.id === r.season_id ? 'selected' : ''}>${esc(x.title)}</option>`).join('')}</select></div>`}
        <div class="actions" style="margin-top:12px">${acts.join('')}</div>
      </div>
    </div>`;
  }).join('');

  box.onclick = async (e) => {
    const z = e.target.closest('[data-zoom]');
    if (z) return lightbox([{ src: z.dataset.zoom }]);
    const b = e.target.closest('[data-act]'); if (!b) return;
    const row = b.closest('.qrow'); const id = row.dataset.id; const act = b.dataset.act;
    let patch;
    if (act === 'approve') patch = { status: 'approved' };
    if (act === 'pin') patch = { status: 'approved', featured: true };
    if (act === 'unpin') patch = { featured: false };
    if (act === 'reject') patch = isT ? { status: 'rejected', featured: false } : { status: 'rejected' };
    busy(b, true, '…');
    if (act === 'delete') {
      if (!confirm('Delete this permanently? This cannot be undone.')) return busy(b, false);
      const { error } = await sb.from(table).delete().eq('id', id);
      if (error) { busy(b, false); return toast(error.message); }
      await removeFile(row.dataset.img);
    } else {
      const { error } = await sb.from(table).update(patch).eq('id', id);
      if (error) { busy(b, false); return toast(error.message); }
    }
    toast({ approve: 'Published', pin: 'Published and pinned', unpin: 'Unpinned', reject: 'Hidden from the site', delete: 'Deleted' }[act]);
    row.remove();
    if (!$('#qlist .qrow')) loadQueue();
    refreshBadge();
  };
  box.onchange = async (e) => {
    const s = e.target.closest('[data-season]'); if (!s) return;
    const id = s.closest('.qrow').dataset.id;
    const { error } = await sb.from('memorial_gallery').update({ season_id: s.value || null }).eq('id', id);
    toast(error ? error.message : 'Season updated');
  };
}

// =====================================================================
//  SETTINGS (home + story header)
// =====================================================================
async function getSettingsRow() {
  const { data } = await sb.from('memorial_settings').select('data').eq('id', 1).maybeSingle();
  return data?.data || {};
}
async function saveSettings(patch) {
  const cur = await getSettingsRow();
  const next = { ...cur, ...patch };
  const { error } = await sb.from('memorial_settings').upsert({ id: 1, data: next, updated_at: new Date().toISOString() });
  if (error) throw error;
}

const ICONS = [['family', 'Family'], ['integrity', 'Shield'], ['heart', 'Heart'], ['book', 'Book'], ['star', 'Star']];

async function viewHome(c) {
  const s = await getSettingsRow();
  const vals = Array.isArray(s.values) ? s.values : [];
  while (vals.length < 4) vals.push({ icon: 'star', title: '', text: '' });
  const F = (f) => fieldHtml(f, s[f.key]);
  c.innerHTML = `
    <h1>Home &amp; settings</h1><p class="intro">His name, the opening of the home page, the values, and the funeral service banner.</p>
    <form id="hform">
    <section class="box"><div class="box-head"><h2>Name &amp; dates</h2></div><div class="box-body ed">
      ${F({ key: 'name', label: 'His full name' })}
      <div class="grid2">${F({ key: 'birth_year', label: 'Year of birth' })}${F({ key: 'death_year', label: 'Year of passing' })}</div>
    </div></section>
    <section class="box"><div class="box-head"><h2>Home slideshow</h2><p class="help">Slide 1 is his portrait. The next slides come from every season that has a "Slideshow headline" (under Seasons &amp; photos).</p></div><div class="box-body ed">
      ${F({ key: 'portrait_url', label: 'Portrait (first slide, fills the screen)', type: 'image', help: 'A wide (landscape) photo works best on computers; the photo is cropped to fill the screen. Darker, warmly lit photos look best behind white text.' })}
      <div class="grid2">${F({ key: 'hero_headline', label: 'First slide headline (large capitals)', placeholder: 'A Life Well Lived' })}${F({ key: 'hero_accent', label: 'Small orange word beside it', placeholder: 'Forever loved' })}${F({ key: 'slide_seconds', label: 'Seconds per slide', type: 'number', help: '3 to 15. Default 6.' })}</div>
    </div></section>
    <section class="box"><div class="box-head"><h2>Welcome (under the slideshow)</h2></div><div class="box-body ed">
      <div class="grid2">${F({ key: 'tagline_before', label: 'Line, first part', placeholder: 'A life lived with' })}${F({ key: 'tagline_highlight', label: 'Line, highlighted part (orange, italic)', placeholder: 'faith, love & purpose' })}</div>
      ${F({ key: 'welcome', label: 'Welcome message', type: 'textarea', rows: 3 })}
      ${F({ key: 'saying', label: 'A saying he was known for (shown in "Who He Was")' })}
    </div></section>
    <section class="box"><div class="box-head"><h2>Who He Was</h2></div><div class="box-body ed">
      ${F({ key: 'about', label: 'Paragraph about his character', type: 'textarea', rows: 4 })}
      ${vals.slice(0, 4).map((v, i) => `<div class="item" data-value="${i}"><div class="grid2">
        ${fieldHtml({ key: 'icon', label: `Value ${i + 1} icon`, type: 'select', options: ICONS }, v.icon)}
        ${fieldHtml({ key: 'title', label: 'Title' }, v.title)}</div>
        ${fieldHtml({ key: 'text', label: 'Short description', type: 'textarea', rows: 2 }, v.text)}</div>`).join('')}
    </div></section>
    <section class="box"><div class="box-head"><h2>Funeral service details</h2></div><div class="box-body ed">
      ${F({ key: 'show_service', label: 'Show the service details in the strip at the bottom of the slideshow', type: 'switch' })}
      <div class="grid2">${F({ key: 'service_title', label: 'Title', placeholder: 'Funeral Service' })}${F({ key: 'service_date', label: 'Date', placeholder: 'Saturday, 12 December 2026' })}</div>
      <div class="grid2">${F({ key: 'service_time', label: 'Time' })}${F({ key: 'service_venue', label: 'Venue, city' })}</div>
      ${F({ key: 'service_map_url', label: 'Google Maps link', type: 'url', placeholder: 'https://maps.app.goo.gl/…' })}
      ${F({ key: 'service_programme_url', label: 'Order of service link (e.g. a Google Drive PDF)', type: 'url' })}
      ${F({ key: 'service_livestream_url', label: 'Livestream link (YouTube / Facebook)', type: 'url' })}
    </div></section>
    <section class="box"><div class="box-head"><h2>Falling petals</h2></div><div class="box-body ed">
      ${fieldHtml({ key: 'petals', label: 'White petals drifting down over the site', type: 'switch', help: 'Turned off automatically for visitors whose phones are set to reduce motion.' }, s.petals !== false)}
      ${fieldHtml({ key: 'petals_amount', label: 'How many petals', type: 'select', options: [['light', 'Light'], ['medium', 'Medium'], ['heavy', 'Heavy']] }, s.petals_amount || 'medium')}
    </div></section>
    <section class="box"><div class="box-head"><h2>Children's videos page &amp; footer</h2></div><div class="box-body ed">
      ${F({ key: 'children_intro', label: 'Introduction on the videos page', type: 'textarea', rows: 2 })}
      ${F({ key: 'children_total', label: 'Total length of all videos', placeholder: '18 minutes' })}
      ${F({ key: 'footer_note', label: 'Footer note', placeholder: 'Built with love by his family' })}
    </div></section>
    <div class="sticky-save"><button class="btn btn-dark" type="submit" id="hsave">Save changes</button><span class="saved" id="hsaved"></span></div>
    </form>`;
  $('#hform').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#hsave'); busy(btn, true);
    const top = readFields($('#hform'));
    delete top.icon; delete top.title; delete top.text;
    top.values = $$('[data-value]').map((it) => readFields(it)).filter((v) => v.title || v.text);
    try { await saveSettings(top); $('#hsaved').textContent = 'Saved ✓'; toast('Saved'); }
    catch (ex) { toast(ex.message); }
    busy(btn, false);
  });
}

// =====================================================================
//  GENERIC LIST EDITOR (story sections, timeline, seasons, children)
// =====================================================================
async function listEditor(el, cfg) {
  const { data, error } = await sb.from(cfg.table).select('*').order('sort');
  if (error) { el.innerHTML = `<p class="err">${esc(error.message)}</p>`; return; }
  el.innerHTML = `<div class="ed" data-list></div><div style="margin-top:14px"><button type="button" class="b dark" data-add>${icon.plus()} Add ${esc(cfg.noun)}</button></div>`;
  const list = $('[data-list]', el);
  const render = (row, i) => {
    const d = document.createElement('div');
    d.className = 'item'; d.dataset.id = row.id;
    d.innerHTML = `<div class="item-head"><h3>${esc(cfg.itemTitle(row, i))}</h3>
        <div class="actions"><button type="button" class="b ok" data-save>Save</button><button type="button" class="b bad" data-del>Delete</button></div></div>
      ${cfg.layout(row)}
      ${cfg.extra ? '<div data-extra></div>' : ''}`;
    if (cfg.extra) cfg.extra(row, $('[data-extra]', d));
    return d;
  };
  data.forEach((r, i) => list.append(render(r, i)));
  if (!data.length) list.innerHTML = `<p class="muted">Nothing here yet.</p>`;

  el.addEventListener('click', async (e) => {
    const add = e.target.closest('[data-add]');
    if (add && add.closest('[data-list]') === null && add.parentElement.parentElement === el) {
      busy(add, true, 'Adding…');
      const maxSort = Math.max(0, ...$$('[data-k="sort"]', list).map((x) => Number(x.value) || 0));
      const { data: row, error: er } = await sb.from(cfg.table).insert({ ...cfg.newItem(), sort: maxSort + 1 }).select().single();
      busy(add, false);
      if (er) return toast(er.message);
      if (!$('.item', list)) list.innerHTML = '';
      const node = render(row, $$('.item', list).length);
      list.append(node); node.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const item = e.target.closest('.item'); if (!item || item.parentElement !== list) return;
    if (e.target.closest('[data-save]')) {
      const btn = e.target.closest('[data-save]'); busy(btn, true);
      const vals = readFields(item);
      const { error: er } = await sb.from(cfg.table).update(vals).eq('id', item.dataset.id);
      busy(btn, false);
      toast(er ? er.message : 'Saved');
      if (!er) $('h3', item).textContent = cfg.itemTitle({ ...vals }, $$('.item', list).indexOf(item));
    }
    if (e.target.closest('[data-del]')) {
      if (!confirm(`Delete this ${cfg.noun}? This cannot be undone.`)) return;
      const { error: er } = await sb.from(cfg.table).delete().eq('id', item.dataset.id);
      if (er) return toast(er.message);
      item.remove(); toast('Deleted');
    }
  });
}

// =====================================================================
//  LIFE STORY
// =====================================================================
async function viewStory(c) {
  const s = await getSettingsRow();
  const F = (f) => fieldHtml(f, s[f.key]);
  c.innerHTML = `
    <h1>Life story &amp; timeline</h1><p class="intro">The biography page: its opening, the sections of his story, the "At a Glance" card and the timeline.</p>
    <section class="box"><div class="box-head"><h2>Page opening &amp; At a Glance</h2></div><div class="box-body ed" id="sform">
      ${F({ key: 'story_intro', label: 'Opening sentence(s)', type: 'textarea', rows: 2 })}
      ${F({ key: 'his_words', label: 'Quote: something he always used to say', type: 'textarea', rows: 2 })}
      <div class="grid2">${F({ key: 'glance_born', label: 'Born' })}${F({ key: 'glance_parents', label: 'Parents' })}</div>
      <div class="grid2">${F({ key: 'glance_married', label: 'Married to' })}${F({ key: 'glance_survived', label: 'Survived by' })}</div>
      ${F({ key: 'glance_passed', label: 'Passed on' })}
      <div><button type="button" class="b ok" id="ssave">Save</button></div>
    </div></section>
    <section class="box"><div class="box-head"><h2>Story sections</h2><p class="help">Shown in order. The "In his words" quote appears after the third section.</p></div><div class="box-body" id="secs"></div></section>
    <section class="box"><div class="box-head"><h2>Timeline</h2></div><div class="box-body" id="tl"></div></section>`;
  $('#ssave').onclick = async (e) => {
    busy(e.currentTarget, true);
    try { await saveSettings(readFields($('#sform'))); toast('Saved'); } catch (ex) { toast(ex.message); }
    busy(e.currentTarget, false);
  };
  listEditor($('#secs'), {
    table: 'memorial_story_sections', noun: 'section',
    itemTitle: (r) => r.title || 'New section',
    newItem: () => ({ eyebrow: '', title: 'New section', body: '' }),
    layout: (r) => `<div class="grid2">${fieldHtml({ key: 'title', label: 'Title' }, r.title)}${fieldHtml({ key: 'eyebrow', label: 'Small label above', placeholder: '01 · Roots' }, r.eyebrow)}${fieldHtml({ key: 'sort', label: 'Order', type: 'number' }, r.sort)}</div>
      ${fieldHtml({ key: 'body', label: 'Text', type: 'textarea', rows: 6 }, r.body)}
      <div class="grid2">${fieldHtml({ key: 'image_url', label: 'Photo (optional)', type: 'image' }, r.image_url)}${fieldHtml({ key: 'caption', label: 'Photo caption', nullable: true }, r.caption)}</div>`
  });
  listEditor($('#tl'), {
    table: 'memorial_timeline', noun: 'timeline event',
    itemTitle: (r) => `${r.year || ''} ${r.label || ''}`.trim() || 'New event',
    newItem: () => ({ year: '', label: '' }),
    layout: (r) => `<div class="grid2">${fieldHtml({ key: 'year', label: 'Year' }, r.year)}${fieldHtml({ key: 'label', label: 'What happened' }, r.label)}${fieldHtml({ key: 'sort', label: 'Order', type: 'number' }, r.sort)}</div>`
  });
}

// =====================================================================
//  SEASONS
// =====================================================================
async function viewSeasons(c) {
  c.innerHTML = `<h1>Seasons &amp; photos</h1><p class="intro">Each season of his life with its write-up and the family's photos. Photos shared by visitors are approved under Moderation and appear in their season automatically.</p>
    <section class="box"><div class="box-body" id="seas"></div></section>`;
  listEditor($('#seas'), {
    table: 'memorial_seasons', noun: 'season',
    itemTitle: (r) => `${r.numeral ? r.numeral + '. ' : ''}${r.title || 'New season'}`,
    newItem: () => ({ numeral: '', title: 'New season', eyebrow: '', writeup: '', period: '' }),
    layout: (r) => `<div class="grid2">${fieldHtml({ key: 'title', label: 'Title' }, r.title)}${fieldHtml({ key: 'numeral', label: 'Chapter number', placeholder: 'IX' }, r.numeral)}${fieldHtml({ key: 'sort', label: 'Order', type: 'number' }, r.sort)}</div>
      <div class="grid2">${fieldHtml({ key: 'period', label: 'Years', placeholder: '1960s – 1970s' }, r.period)}${fieldHtml({ key: 'eyebrow', label: 'Short line under the title', placeholder: 'Where it all began' }, r.eyebrow)}</div>
      ${fieldHtml({ key: 'hero_line', label: 'Slideshow headline on the home page (leave empty to leave this season out)', placeholder: 'The Boy from Ilorin', nullable: true, help: 'Keep it short: 2 to 5 words. It uses the cover photo below, or the first photo of this season.' }, r.hero_line)}
      ${fieldHtml({ key: 'writeup', label: 'Write-up (80–150 words)', type: 'textarea', rows: 5 }, r.writeup)}
      ${fieldHtml({ key: 'cover_url', label: 'Cover photo for the home page (optional — otherwise the first photo is used)', type: 'image' }, r.cover_url)}`,
    extra: (r, box) => seasonPhotos(r, box)
  });
}
async function seasonPhotos(season, box) {
  const fid = uid();
  box.innerHTML = `<div class="field"><span class="lbl">Family photos in this season</span>
    <div class="photos-admin" data-ph></div>
    <div class="actions" style="margin-top:10px"><input type="file" accept="image/*" multiple id="${fid}" class="sr-only" data-multi><label class="b gold" for="${fid}">${icon.upload(16)} Add photos</label><span class="help" data-st></span></div></div>`;
  const grid = $('[data-ph]', box);
  const load = async () => {
    const { data } = await sb.from('memorial_season_photos').select('*').eq('season_id', season.id).order('sort');
    grid.innerHTML = (data || []).map((p) => `<div class="pa" data-pid="${esc(p.id)}" data-path="${esc(p.image_url)}">
      <img src="${esc(publicUrl(p.image_url))}" alt="" loading="lazy">
      <div class="f"><input value="${esc(p.caption || '')}" placeholder="Caption · place, year" aria-label="Caption" data-cap>
      <div class="r"><button type="button" class="b" data-left aria-label="Move earlier">←</button><button type="button" class="b" data-right aria-label="Move later">→</button><button type="button" class="b bad" data-rm>Delete</button></div></div></div>`).join('') || '<p class="muted" style="grid-column:1/-1">No photos yet. The first photo is the large one on the Seasons page.</p>';
  };
  await load();
  $('[data-multi]', box).addEventListener('change', async (e) => {
    const files = [...e.target.files]; e.target.value = '';
    const st = $('[data-st]', box);
    const { data: last } = await sb.from('memorial_season_photos').select('sort').eq('season_id', season.id).order('sort', { ascending: false }).limit(1);
    let sort = (last?.[0]?.sort || 0) + 1;
    for (let i = 0; i < files.length; i++) {
      st.textContent = `Uploading ${i + 1} of ${files.length}…`;
      try {
        const path = await uploadImage(files[i], 'family');
        const { error } = await sb.from('memorial_season_photos').insert({ season_id: season.id, image_url: path, sort: sort++ });
        if (error) throw error;
      } catch (ex) { toast(ex.message || 'Upload failed'); }
    }
    st.textContent = ''; toast('Photos added'); load();
  });
  grid.addEventListener('change', async (e) => {
    const cap = e.target.closest('[data-cap]'); if (!cap) return;
    const { error } = await sb.from('memorial_season_photos').update({ caption: cap.value.trim() || null }).eq('id', cap.closest('.pa').dataset.pid);
    toast(error ? error.message : 'Caption saved');
  });
  grid.addEventListener('click', async (e) => {
    const pa = e.target.closest('.pa'); if (!pa) return;
    if (e.target.closest('[data-rm]')) {
      if (!confirm('Delete this photo?')) return;
      const { error } = await sb.from('memorial_season_photos').delete().eq('id', pa.dataset.pid);
      if (error) return toast(error.message);
      await removeFile(pa.dataset.path); pa.remove(); toast('Photo deleted');
    }
    const dir = e.target.closest('[data-left]') ? -1 : e.target.closest('[data-right]') ? 1 : 0;
    if (dir) {
      const items = $$('.pa', grid); const i = items.indexOf(pa); const j = i + dir;
      if (j < 0 || j >= items.length) return;
      [items[i], items[j]] = [items[j], items[i]];
      await Promise.all(items.map((it, k) => sb.from('memorial_season_photos').update({ sort: k + 1 }).eq('id', it.dataset.pid)));
      load();
    }
  });
}

// =====================================================================
//  CHILDREN
// =====================================================================
async function viewChildren(c) {
  c.innerHTML = `<h1>Children's videos</h1>
    <p class="intro">Upload each video to YouTube as <b>Unlisted</b> (or to Vimeo) and paste its link here. YouTube links play one after the other automatically when "Play all" is on. A Google Drive link also works, without auto-play.</p>
    <section class="box"><div class="box-body" id="kids"></div></section>`;
  listEditor($('#kids'), {
    table: 'memorial_children', noun: 'child',
    itemTitle: (r, i) => `${(r.sort ?? i + 1)}. ${r.name || 'New child'}`,
    newItem: () => ({ name: "[Child's Name]", relation: '' }),
    layout: (r) => `<div class="grid2">${fieldHtml({ key: 'name', label: 'Name' }, r.name)}${fieldHtml({ key: 'relation', label: 'Relationship', placeholder: 'Firstborn' }, r.relation)}${fieldHtml({ key: 'sort', label: 'Speaking order', type: 'number' }, r.sort)}</div>
      <div class="grid2">${fieldHtml({ key: 'video_url', label: 'Video link', type: 'url', placeholder: 'https://youtu.be/…' }, r.video_url)}${fieldHtml({ key: 'duration', label: 'Length', placeholder: '3:45', nullable: true }, r.duration)}</div>
      ${fieldHtml({ key: 'quote', label: 'A line from their video (optional, shown on the home page)', nullable: true }, r.quote)}
      ${fieldHtml({ key: 'transcript', label: 'Transcript (optional)', type: 'textarea', rows: 5, nullable: true }, r.transcript)}
      ${fieldHtml({ key: 'photo_url', label: 'Their photo (optional)', type: 'image' }, r.photo_url)}`
  });
}

// =====================================================================
//  ADMINS
// =====================================================================
async function viewAdmins(c) {
  const { data, error } = await sb.from('memorial_admins').select('*').order('added_at');
  c.innerHTML = `<h1>Family admins</h1>
    <p class="intro">People on this list can sign in here to approve tributes and edit the site. Each person signs in with their own email and password. If they don't have an account yet, they press "Create an account" on the sign-in screen and confirm their email.</p>
    <section class="box"><div class="box-body">
      ${error ? `<p class="err">${esc(error.message)}</p>` : (data || []).map((a) => `<div class="switch"><span><b style="font-weight:500">${esc(a.email)}</b>${a.email.toLowerCase() === me.email.toLowerCase() ? ' <span class="help">(you)</span>' : ''}</span>${a.email.toLowerCase() === me.email.toLowerCase() ? '' : `<button type="button" class="b bad" data-rm="${esc(a.email)}">Remove</button>`}</div>`).join('')}
      <form id="aform" class="grid2" style="margin-top:18px;display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end">
        <div class="field" style="flex:1 1 280px"><label for="aem">Add a family member's email</label><input id="aem" type="email" required></div>
        <button class="b dark" type="submit" style="min-height:48px">Add admin</button>
      </form>
    </div></section>`;
  $('#aform').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#aem').value.trim().toLowerCase(); if (!email) return;
    const { error: er } = await sb.from('memorial_admins').insert({ email });
    toast(er ? er.message : 'Added'); if (!er) viewAdmins(c);
  });
  c.querySelector('.box-body').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-rm]'); if (!b) return;
    if (!confirm(`Remove ${b.dataset.rm} as an admin?`)) return;
    const { error: er } = await sb.from('memorial_admins').delete().eq('email', b.dataset.rm);
    toast(er ? er.message : 'Removed'); if (!er) viewAdmins(c);
  });
}

// =====================================================================
//  EXPORT
// =====================================================================
function csv(rows, cols) {
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [cols.map(q).join(','), ...rows.map((r) => cols.map((k) => q(r[k])).join(','))].join('\r\n');
}
function download(name, text) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' }));
  a.download = name; document.body.append(a); a.click(); a.remove();
}
async function viewExport(c) {
  c.innerHTML = `<h1>Export &amp; tribute book</h1>
    <p class="intro">Keep a copy of every tribute, or print them as a book for the family.</p>
    <section class="box"><div class="box-body ed">
      <div class="actions"><button type="button" class="b dark" id="x1">Download published tributes (CSV)</button><button type="button" class="b" id="x2">Download every tribute, incl. waiting &amp; hidden (CSV)</button></div>
      <div class="actions"><a class="b gold" href="tribute-book.html" target="_blank" rel="noopener">Open the printable tribute book</a></div>
      <p class="help">The tribute book opens in a new tab. Use your browser's Print → "Save as PDF" to keep it or send it to a printer.</p>
    </div></section>`;
  const cols = ['created_at', 'name', 'relationship', 'location', 'message', 'status', 'featured'];
  $('#x1').onclick = async () => {
    const { data, error } = await sb.from('memorial_tributes').select('*').eq('status', 'approved').order('created_at');
    if (error) return toast(error.message);
    download('tributes-published.csv', csv(data, cols));
  };
  $('#x2').onclick = async () => {
    const { data, error } = await sb.from('memorial_tributes').select('*').order('created_at');
    if (error) return toast(error.message);
    download('tributes-all.csv', csv(data, cols));
  };
}
