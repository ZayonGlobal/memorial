import { sb, layout, esc, icon, bokeh, publicUrl, reveal, $ } from './lib.js';

const main = document.getElementById('main');
const s = await layout('children');
const { data } = await sb.from('memorial_children').select('*').order('sort');
const kids = data || [];

let sel = Math.max(0, Math.min(kids.length - 1, (Number(new URLSearchParams(location.search).get('child')) || 1) - 1));
let playAll = true;
let ytApi; // promise
let vimeoApi;

function parseVideo(url) {
  const u = String(url || '').trim();
  if (!u) return null;
  let m = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/i);
  if (m) return { kind: 'youtube', id: m[1] };
  m = u.match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/(\w+))?/i);
  if (m) return { kind: 'vimeo', id: m[1], hash: m[2] };
  if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(u) || u.includes('/storage/v1/object/')) return { kind: 'file', src: publicUrl(u) };
  m = u.match(/drive\.google\.com\/file\/d\/([\w-]+)/i);
  if (m) return { kind: 'iframe', src: `https://drive.google.com/file/d/${m[1]}/preview` };
  if (/^https:\/\//i.test(u)) return { kind: 'iframe', src: u };
  return null;
}
function loadScript(src) {
  return new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = src; sc.onload = res; sc.onerror = rej; document.head.append(sc); });
}
function loadYT() {
  if (!ytApi) {
    ytApi = new Promise((res) => {
      window.onYouTubeIframeAPIReady = () => res(window.YT);
      loadScript('https://www.youtube.com/iframe_api');
    });
  }
  return ytApi;
}
function loadVimeo() {
  if (!vimeoApi) vimeoApi = loadScript('https://player.vimeo.com/api/player.js').then(() => window.Vimeo);
  return vimeoApi;
}

main.innerHTML = `
<section class="dark">
  ${bokeh([['left:6%', 'top:6%', 220, 0], ['right:6%', 'top:20%', 180, -9]])}
  <div class="wrap" style="padding-top:90px;padding-bottom:20px">
    <div class="split">
      <div><p class="eyebrow rise" style="font-size:23px">In their own words</p><h1 class="h1 rise d1">The Children Speak</h1></div>
      <p class="lead rise d2">${esc(s.children_intro || '')} Press <em>play all</em> to watch them in order, or choose one below.</p>
    </div>
  </div>
  <div class="wrap" style="padding-top:24px">
    <div class="player rise d3" id="player"></div>
    <div class="player-bar">
      <div class="now" aria-live="polite" id="now"></div>
      <button class="icon-btn" type="button" id="prev" aria-label="Previous child">${icon.left()}</button>
      <button class="icon-btn" type="button" id="next" aria-label="Next child">${icon.right()}</button>
      <button class="toggle-btn" type="button" id="playall" aria-pressed="true">Play all</button>
    </div>
  </div>
  <div class="wrap" style="padding-top:20px">
    <h2 class="label" style="margin:0 0 18px;color:var(--gold)">In order of speaking</h2>
    <div class="playlist" id="playlist">
      ${kids.map((k, i) => `
      <button type="button" class="kid" data-i="${i}" aria-pressed="false">
        <span class="ph-k">${k.photo_url ? `<img src="${esc(publicUrl(k.photo_url))}" alt="">` : i + 1}</span>
        <span style="min-width:0;display:block">
          <span class="nm">${esc(k.name)}</span>
          <span class="rl">${esc([k.relation, k.duration].filter(Boolean).join(' · '))}</span>
          <span class="playing">${icon.flameOutline(12, 'flame')}Now playing</span>
        </span>
      </button>`).join('')}
    </div>
    ${!kids.length ? '<p class="empty">The videos will be shared here soon.</p>' : ''}
  </div>
  <div class="wrap" style="padding-top:72px;padding-bottom:110px;display:flex;flex-wrap:wrap;gap:32px">
    <div class="panel-dark reveal" style="flex:1 1 380px;min-width:0">
      <p class="eyebrow" style="font-size:20px">What each of us shared</p>
      <h2 class="h3" style="font-size:36px">Five questions</h2>
      <ol class="qlist">
        <li><span>1</span>A favourite memory of him</li>
        <li><span>2</span>Something he taught me that I still live by</li>
        <li><span>3</span>What people didn't know about him</li>
        <li><span>4</span>What I miss most</li>
        <li><span>5</span>My final words to him</li>
      </ol>
    </div>
    <div class="panel-light reveal" style="flex:999 1 520px;min-width:0" id="transcript"></div>
  </div>
</section>`;

const player = $('#player');
let current = null; // {type, obj}

function destroy() {
  try { if (current?.type === 'yt') current.obj.destroy(); if (current?.type === 'vimeo') current.obj.destroy(); } catch { /* ignore */ }
  current = null;
  player.innerHTML = '';
}
function idle() {
  destroy();
  const k = kids[sel];
  if (!k) return;
  const has = !!parseVideo(k.video_url);
  player.innerHTML = `<div class="idle">
    <button type="button" class="play-ring" id="bigplay" aria-label="Play video of ${esc(k.name)}" ${has ? '' : 'disabled'} style="width:104px;height:104px">${icon.play(34)}</button>
    <div><p style="margin:0;font-family:var(--serif);font-size:clamp(30px,3.4vw,44px);line-height:1.1">${esc(k.name)}</p>
    ${k.relation ? `<p style="margin:6px 0 0;font-family:var(--serif);font-style:italic;font-size:20px;color:var(--gold)">${esc(k.relation)}</p>` : ''}
    ${has ? '' : '<p class="label" style="margin-top:18px;color:var(--on-dark-3);font-weight:500">Video coming soon</p>'}</div>
  </div>`;
  $('#bigplay')?.addEventListener('click', () => play(true));
}
function onEnded() {
  if (playAll && sel < kids.length - 1) { select(sel + 1); play(true); }
  else if (playAll) { select(0); }
}
async function play(autoplay) {
  const k = kids[sel];
  const v = parseVideo(k?.video_url);
  if (!v) return idle();
  destroy();
  if (v.kind === 'youtube') {
    player.innerHTML = '<div class="yt" id="yt"></div>';
    const YT = await loadYT();
    current = { type: 'yt', obj: new YT.Player('yt', {
      videoId: v.id, width: '100%', height: '100%',
      playerVars: { autoplay: autoplay ? 1 : 0, rel: 0, modestbranding: 1, playsinline: 1, cc_load_policy: 1 },
      events: { onStateChange: (e) => { if (e.data === YT.PlayerState.ENDED) onEnded(); } }
    }) };
  } else if (v.kind === 'vimeo') {
    player.innerHTML = `<iframe src="https://player.vimeo.com/video/${v.id}?${v.hash ? 'h=' + v.hash + '&' : ''}autoplay=${autoplay ? 1 : 0}&title=0&byline=0&portrait=0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen title="Video of ${esc(k.name)}"></iframe>`;
    try { const Vimeo = await loadVimeo(); const p = new Vimeo.Player($('iframe', player)); p.on('ended', onEnded); current = { type: 'vimeo', obj: p }; } catch { /* plays without auto-advance */ }
  } else if (v.kind === 'file') {
    player.innerHTML = `<video controls playsinline ${autoplay ? 'autoplay' : ''} preload="metadata" src="${esc(v.src)}"></video>`;
    $('video', player).addEventListener('ended', onEnded);
    current = { type: 'file' };
  } else {
    player.innerHTML = `<iframe src="${esc(v.src)}" allow="autoplay; fullscreen" allowfullscreen title="Video of ${esc(k.name)}"></iframe>`;
    current = { type: 'iframe' };
  }
}
function select(i) {
  sel = (i + kids.length) % kids.length;
  document.querySelectorAll('.kid').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.i) === sel)));
  const k = kids[sel];
  $('#now').innerHTML = `<span class="label" style="color:var(--on-dark-2);font-weight:500">Now showing · ${sel + 1} of ${kids.length}</span>`;
  $('#transcript').innerHTML = `<p class="label" style="margin:0;color:var(--gold-dark)">Transcript</p>
    <h2 class="h3" style="font-size:36px">${esc(k.name)}${k.relation ? ', ' + esc(k.relation.toLowerCase()) : ''}</h2>
    <p style="margin:18px 0 0;font-family:var(--serif);font-size:21px;line-height:1.55;color:var(--text-2);white-space:pre-line">${k.transcript ? esc(k.transcript) : 'A written transcript of this video will appear here.'}</p>`;
}

if (kids.length) {
  select(sel); idle();
  $('#playlist').addEventListener('click', (e) => { const b = e.target.closest('.kid'); if (!b) return; select(Number(b.dataset.i)); play(true); $('#player').scrollIntoView({ behavior: 'smooth', block: 'center' }); });
  $('#prev').onclick = () => { select(sel - 1); play(true); };
  $('#next').onclick = () => { select(sel + 1); play(true); };
  $('#playall').onclick = (e) => { playAll = !playAll; e.currentTarget.setAttribute('aria-pressed', String(playAll)); };
} else {
  player.innerHTML = '<div class="idle"><p class="empty">The videos will be shared here soon.</p></div>';
  ['#prev', '#next', '#playall'].forEach((q) => $(q).setAttribute('disabled', ''));
}

main.removeAttribute('aria-busy');
reveal();
