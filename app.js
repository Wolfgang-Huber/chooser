'use strict';

(() => {
  const HOLD_MS = 3000;
  const REVEAL_MS = 1100;
  const MAX_FINGERS = 10;
  const BG = '#07070b';

  const PALETTE = [
    '#FF3B5C',
    '#3DFF8A',
    '#4C9AFF',
    '#FFE14A',
    '#C56BFF',
    '#FF8A2A',
    '#3DF0FF',
    '#FF4FD8',
    '#B6FF3D',
    '#FF2F92',
  ].map(hexToRgb);

  const canvas = document.getElementById('stage');
  const hint = document.getElementById('hint');
  const live = document.getElementById('live');
  const ctx = canvas.getContext('2d');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const fingers = new Map();
  const ignored = new Set();
  let picked = null;
  let round = 0;
  let holdStart = 0;
  let audioCtx = null;
  let viewW = 1;
  let viewH = 1;
  let lastNow = 0;
  let lastTouchEnd = 0;

  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function rgba(color, alpha) {
    return `rgba(${color.r},${color.g},${color.b},${alpha})`;
  }

  function mix(a, b, t) {
    return {
      r: Math.round(a.r + (b.r - a.r) * t),
      g: Math.round(a.g + (b.g - a.g) * t),
      b: Math.round(a.b + (b.b - a.b) * t),
    };
  }

  function baseRadius() {
    return Math.max(34, Math.min(64, Math.min(viewW, viewH) * 0.08));
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || window.innerWidth;
    const height = rect.height || window.innerHeight;
    if (width < 2 || height < 2) return;
    viewW = width;
    viewH = height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const bitmapW = Math.max(1, Math.round(width * dpr));
    const bitmapH = Math.max(1, Math.round(height * dpr));
    if (canvas.width !== bitmapW || canvas.height !== bitmapH) {
      canvas.width = bitmapW;
      canvas.height = bitmapH;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function pointFromEvent(event) {
    const rect = canvas.getBoundingClientRect();
    let source = event;
    try {
      const events = event.getCoalescedEvents && event.getCoalescedEvents();
      if (events && events.length) source = events[events.length - 1];
    } catch (err) {
      source = event;
    }
    return {
      x: source.clientX - rect.left,
      y: source.clientY - rect.top,
    };
  }

  function takeColorIndex() {
    const used = new Set();
    for (const finger of fingers.values()) used.add(finger.colorIndex);
    for (let i = 0; i < PALETTE.length; i += 1) {
      if (!used.has(i)) return i;
    }
    return 0;
  }

  function addFinger(event) {
    const id = event.pointerId;
    if (fingers.has(id) || ignored.has(id)) return;
    if (fingers.size >= MAX_FINGERS) {
      ignored.add(id);
      return;
    }
    const point = pointFromEvent(event);
    const colorIndex = takeColorIndex();
    fingers.set(id, {
      colorIndex,
      color: PALETTE[colorIndex],
      x: point.x,
      y: point.y,
      tx: point.x,
      ty: point.y,
      phase: Math.random() * Math.PI * 2,
      born: performance.now(),
    });
    if (!picked) holdStart = performance.now();
  }

  function removeFinger(id) {
    ignored.delete(id);
    const finger = fingers.get(id);
    if (!finger) return;
    if (picked && picked.id === id) {
      picked.x = finger.x;
      picked.y = finger.y;
    }
    fingers.delete(id);
    if (picked) {
      if (fingers.size === 0) {
        picked = null;
        live.textContent = '';
      }
    } else {
      holdStart = performance.now();
    }
  }

  function randomIndex(count) {
    if (count <= 1) return 0;
    const cryptoObj = globalThis.crypto;
    if (cryptoObj && cryptoObj.getRandomValues) {
      const buf = new Uint32Array(1);
      const limit = Math.floor(0x100000000 / count) * count;
      let value = 0;
      do {
        cryptoObj.getRandomValues(buf);
        value = buf[0];
      } while (value >= limit);
      return value % count;
    }
    return Math.floor(Math.random() * count);
  }

  function unlockAudio() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    try {
      if (!audioCtx) audioCtx = new AudioCtx();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const rate = audioCtx.sampleRate || 22050;
      const buffer = audioCtx.createBuffer(1, Math.max(1, Math.ceil(rate * 0.02)), rate);
      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtx.destination);
      source.start();
    } catch (err) {
      /* Audio is a nice-to-have; the pick still stands without it. */
    }
  }

  function playChime() {
    if (!audioCtx) return;
    try {
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const now = audioCtx.currentTime;
      const master = audioCtx.createGain();
      master.gain.setValueAtTime(0.75, now);
      master.connect(audioCtx.destination);

      const notes = [
        { freq: 523.25, at: 0, dur: 0.55, gain: 0.14 },
        { freq: 659.25, at: 0.065, dur: 0.5, gain: 0.11 },
        { freq: 783.99, at: 0.13, dur: 0.46, gain: 0.09 },
        { freq: 1046.5, at: 0.2, dur: 0.4, gain: 0.055 },
      ];

      for (const note of notes) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const start = now + note.at;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(note.freq * 0.985, start);
        osc.frequency.exponentialRampToValueAtTime(note.freq, start + 0.07);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(note.gain, start + 0.018);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + note.dur);
        osc.connect(gain);
        gain.connect(master);
        osc.start(start);
        osc.stop(start + note.dur + 0.02);
      }
    } catch (err) {
      /* Ignore audio failures after the context was unlocked. */
    }
  }

  function vibrate() {
    try {
      if (typeof navigator.vibrate === 'function') navigator.vibrate(40);
    } catch (err) {
      /* Not supported on iOS Safari. */
    }
  }

  function choose(now) {
    const ids = [...fingers.keys()];
    const id = ids[randomIndex(ids.length)];
    const finger = fingers.get(id);
    picked = {
      id,
      color: finger.color,
      x: finger.x,
      y: finger.y,
      start: now,
    };
    round += 1;
    live.textContent = `A finger was chosen (${round})`;
    vibrate();
    playChime();
  }

  function drawBackground(now) {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, viewW, viewH);

    const vignette = ctx.createRadialGradient(
      viewW * 0.5,
      viewH * 0.45,
      Math.min(viewW, viewH) * 0.12,
      viewW * 0.5,
      viewH * 0.5,
      Math.max(viewW, viewH) * 0.75
    );
    vignette.addColorStop(0, 'rgba(255,255,255,0.03)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, viewW, viewH);

    if (!picked) return;

    const t = Math.min(1, (now - picked.start) / REVEAL_MS);
    const eased = 1 - (1 - t) ** 3;
    const bg = { r: 7, g: 7, b: 11 };
    const edge = mix(bg, picked.color, 0.62);
    const mid = mix(bg, picked.color, 0.88);
    const radius = Math.hypot(viewW, viewH);
    const flood = ctx.createRadialGradient(
      picked.x,
      picked.y,
      baseRadius() * 0.2,
      picked.x,
      picked.y,
      radius * 0.95
    );
    flood.addColorStop(0, rgba(mix(picked.color, { r: 255, g: 255, b: 255 }, 0.4), eased));
    flood.addColorStop(0.16, rgba(mid, eased));
    flood.addColorStop(0.48, rgba(mix(bg, picked.color, 0.74), eased));
    flood.addColorStop(1, rgba(edge, eased));
    ctx.fillStyle = flood;
    ctx.fillRect(0, 0, viewW, viewH);
  }

  function drawFinger(finger, alpha, scale) {
    if (alpha <= 0.01) return;
    const radius = baseRadius() * scale;
    const { x, y, color } = finger;
    ctx.save();
    ctx.globalAlpha = alpha;

    const glow = ctx.createRadialGradient(x, y, radius * 0.08, x, y, radius * 2.65);
    glow.addColorStop(0, rgba(color, 0.95));
    glow.addColorStop(0.28, rgba(color, 0.48));
    glow.addColorStop(0.62, rgba(color, 0.12));
    glow.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, radius * 2.65, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = rgba(color, 0.92);
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.64, 0, Math.PI * 2);
    ctx.fill();

    const body = ctx.createRadialGradient(
      x - radius * 0.16,
      y - radius * 0.2,
      radius * 0.04,
      x,
      y,
      radius * 0.64
    );
    body.addColorStop(0, 'rgba(255,255,255,0.98)');
    body.addColorStop(0.28, rgba(mix(color, { r: 255, g: 255, b: 255 }, 0.22), 1));
    body.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.64, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawCountdown(now) {
    if (picked || fingers.size < 2) return;
    const elapsed = now - holdStart;
    const progress = Math.max(0, Math.min(1, elapsed / HOLD_MS));
    const fade = Math.max(0, Math.min(1, elapsed / 180));
    const radius = baseRadius();
    ctx.save();
    ctx.lineWidth = Math.max(2, radius * 0.055);
    ctx.lineCap = 'round';
    for (const finger of fingers.values()) {
      const pulse = reducedMotion ? 1 : 1 + 0.06 * Math.sin(now / 280 + finger.phase);
      const ring = radius * pulse * 1.42;
      ctx.beginPath();
      ctx.strokeStyle = `rgba(255,255,255,${0.13 * fade})`;
      ctx.arc(finger.x, finger.y, ring, 0, Math.PI * 2);
      ctx.stroke();
      if (progress <= 0) continue;
      ctx.beginPath();
      ctx.strokeStyle = `rgba(255,255,255,${0.78 * fade})`;
      ctx.arc(
        finger.x,
        finger.y,
        ring,
        -Math.PI / 2,
        -Math.PI / 2 + progress * Math.PI * 2
      );
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawFlash(now) {
    if (!picked) return;
    const t = Math.min(1, (now - picked.start) / REVEAL_MS);
    if (t >= 1) return;
    ctx.save();
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = `rgba(255,255,255,${(1 - t) * 0.45})`;
    ctx.arc(picked.x, picked.y, baseRadius() * (1.5 + t * 5.2), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function render(now) {
    if (canvas.width < 2) resize();
    const dt = lastNow ? Math.min(48, now - lastNow) : 16;
    lastNow = now;
    const follow = 1 - Math.exp(-dt / 42);
    for (const finger of fingers.values()) {
      finger.x += (finger.tx - finger.x) * follow;
      finger.y += (finger.ty - finger.y) * follow;
    }

    if (!picked && fingers.size >= 2 && now - holdStart >= HOLD_MS) choose(now);

    if (picked && fingers.has(picked.id)) {
      const winner = fingers.get(picked.id);
      picked.x = winner.x;
      picked.y = winner.y;
    }

    drawBackground(now);

    const revealT = picked ? Math.min(1, (now - picked.start) / REVEAL_MS) : 0;
    const revealE = picked ? 1 - (1 - revealT) ** 3 : 0;

    for (const [id, finger] of fingers) {
      if (picked && id === picked.id) continue;
      const pulse = reducedMotion ? 1 : 1 + 0.06 * Math.sin(now / 280 + finger.phase);
      const late = picked && finger.born > picked.start;
      const alpha = late ? 0 : (picked ? 1 - Math.min(1, revealT / 0.38) : 1);
      const scale = pulse * (picked ? 1 - 0.12 * revealE : 1);
      drawFinger(finger, alpha, scale);
    }

    drawCountdown(now);

    if (picked) {
      const winner = fingers.get(picked.id);
      const pulse = reducedMotion || !winner
        ? 1
        : 1 + 0.045 * Math.sin(now / 340 + winner.phase);
      const finger = winner || { x: picked.x, y: picked.y, color: picked.color };
      drawFinger(finger, 1, pulse * (1 + 0.95 * revealE));
    }

    drawFlash(now);

    const showHint = fingers.size === 0 && !picked;
    hint.classList.toggle('is-hidden', !showHint);
    hint.setAttribute('aria-hidden', showHint ? 'false' : 'true');
    requestAnimationFrame(render);
  }

  function onPointerDown(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    unlockAudio();
    event.preventDefault();
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch (err) {
      /* Synthetic events and already-ended pointers cannot be captured. */
    }
    addFinger(event);
  }

  function onPointerMove(event) {
    const finger = fingers.get(event.pointerId);
    if (!finger) return;
    event.preventDefault();
    const point = pointFromEvent(event);
    finger.tx = point.x;
    finger.ty = point.y;
  }

  function onPointerUp(event) {
    removeFinger(event.pointerId);
  }

  function blockGesture(event) {
    event.preventDefault();
  }

  document.addEventListener('pointerdown', onPointerDown, { passive: false });
  document.addEventListener('pointermove', onPointerMove, { passive: false });
  document.addEventListener('pointerup', onPointerUp);
  document.addEventListener('pointercancel', onPointerUp);
  document.addEventListener('touchstart', blockGesture, { passive: false });
  document.addEventListener('touchmove', blockGesture, { passive: false });
  document.addEventListener('touchend', (event) => {
    const now = Date.now();
    if (now - lastTouchEnd < 300) event.preventDefault();
    lastTouchEnd = now;
  }, { passive: false });
  document.addEventListener('gesturestart', blockGesture, { passive: false });
  document.addEventListener('gesturechange', blockGesture, { passive: false });
  document.addEventListener('contextmenu', blockGesture);
  document.addEventListener('selectstart', blockGesture);
  document.addEventListener('dragstart', blockGesture);

  window.addEventListener('resize', resize);
  if (window.visualViewport) {
    visualViewport.addEventListener('resize', resize);
    visualViewport.addEventListener('scroll', resize);
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }

  resize();
  requestAnimationFrame(render);
})();
