// His full autobiography, "My Life Journey". The text itself lives in full-story.html,
// exactly as he wrote it; this script only adds the shared header/footer and a reading time.
import { layout } from './lib.js';

// Chapter list: open on desktop, folded on phones so the story starts higher up.
const toc = document.querySelector('.fs-toc details');
if (toc && matchMedia('(max-width:900px)').matches) toc.open = false;
toc?.addEventListener('click', (e) => { if (e.target.closest('a') && matchMedia('(max-width:900px)').matches) toc.open = false; });

await layout('story');
const words = (document.querySelector('.fs-text')?.textContent || '').trim().split(/\s+/).length;
const t = document.querySelector('[data-readtime]');
if (t) t.textContent = `About ${Math.round(words / 220)} minutes to read.`;
