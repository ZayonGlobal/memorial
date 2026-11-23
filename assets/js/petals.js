// Gentle white petals drifting down over the page.
// Drawn on one <canvas> that ignores clicks, so nothing underneath is blocked.
// Off for visitors who ask their device for reduced motion; pauses when the
// tab is hidden.

const AMOUNTS = { light: [12, 8], medium: [24, 14], heavy: [40, 22] }; // [desktop, phone]

export function startPetals(amount = 'medium') {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (document.querySelector('canvas.petals')) return;

  const c = document.createElement('canvas');
  c.className = 'petals';
  c.setAttribute('aria-hidden', 'true');
  document.body.append(c);
  const ctx = c.getContext('2d');

  let W = 0, H = 0;
  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
    c.style.width = W + 'px'; c.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  addEventListener('resize', resize);

  const [desk, phone] = AMOUNTS[amount] || AMOUNTS.medium;
  const N = W < 700 ? phone : desk;
  const rand = (a, b) => a + Math.random() * (b - a);
  const make = (anywhere) => ({
    x: rand(-20, W + 20),
    y: anywhere ? rand(-H, H) : rand(-80, -20),
    r: rand(6, 12.5),              // size
    vy: rand(18, 42),              // fall speed (px/s)
    vx: rand(-6, 10),              // drift
    rot: rand(0, Math.PI * 2), vr: rand(-0.6, 0.6),      // spin
    flip: rand(0, Math.PI * 2), vf: rand(0.6, 1.8),      // 3D tumble
    sway: rand(10, 28), phase: rand(0, Math.PI * 2), sf: rand(0.4, 0.9), // side-to-side
    a: rand(0.72, 0.95)
  });
  const P = Array.from({ length: N }, () => make(true));

  function petal(p) {
    const r = p.r;
    ctx.save();
    ctx.translate(p.x + Math.sin(p.phase) * p.sway, p.y);
    ctx.rotate(p.rot);
    ctx.scale(Math.max(0.22, Math.abs(Math.cos(p.flip))), 1);
    // a blossom petal: narrow at the base, round at the tip with a small notch
    ctx.beginPath();
    ctx.moveTo(0, r);
    ctx.bezierCurveTo(r * 1.05, r * 0.3, r * 0.95, -r, r * 0.26, -r);
    ctx.quadraticCurveTo(0, -r * 0.72, -r * 0.26, -r);
    ctx.bezierCurveTo(-r * 0.95, -r, -r * 1.05, r * 0.3, 0, r);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, -r, 0, r);
    g.addColorStop(0, `rgba(255,255,255,${p.a})`);
    g.addColorStop(1, `rgba(240,236,232,${p.a})`);
    ctx.fillStyle = g;
    // a faint shadow keeps white petals visible over white sections
    ctx.shadowColor = 'rgba(0,0,0,0.16)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetY = 1.5;
    ctx.fill();
    ctx.restore();
  }

  let last = performance.now(), running = true, t = 0;
  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now; t += dt;
    const gust = Math.sin(t * 0.35) * 8 + Math.sin(t * 0.9) * 3; // soft, changing breeze
    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < P.length; i++) {
      const p = P[i];
      p.y += p.vy * dt;
      p.x += (p.vx + gust) * dt;
      p.rot += p.vr * dt;
      p.flip += p.vf * dt;
      p.phase += p.sf * dt;
      if (p.y > H + 30 || p.x < -60 || p.x > W + 60) P[i] = make(false);
      petal(P[i]);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) running = false;
    else if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); }
  });
}
