'use strict';

/* ---------- Catalog ---------- */

const DPI = 300;
const MM = DPI / 25.4;

const PAPERS = {
  a4: { label: 'A4 (210 x 297 mm) / 2480 x 3508 px', w: 2480, h: 3508 },
};

const PRODUCTS = {
  magnet: {
    label: 'Fridge Magnet',
    sizes: {
      'fm-80x53': { label: 'Fridge Magnet 3.1 x 2.1" 80x53 (8 per sheet)', short: 'FridgeMagnet 3.1 x 2.1" 80x53', wmm: 80, hmm: 53, cols: 2, rows: 4 },
      'fm-63': { label: 'Fridge Magnet 2.5 x 2.5" 63.5x63.5 (8 per sheet)', short: 'FridgeMagnet 2.5 x 2.5" 63.5x63.5', wmm: 63.5, hmm: 63.5, cols: 2, rows: 4 },
      'fm-50': { label: 'Fridge Magnet 2 x 2" 50x50 (12 per sheet)', short: 'FridgeMagnet 2 x 2" 50x50', wmm: 50, hmm: 50, cols: 3, rows: 4 },
    },
  },
  round: {
    label: 'Round Fridge Magnet',
    sizes: {
      'rd-58': { label: 'Round 2.25" 58mm (12 per sheet)', short: 'Round 2.25" 58mm', wmm: 58, hmm: 58, cols: 3, rows: 4, round: true },
      'rd-50': { label: 'Round 2" 50mm (15 per sheet)', short: 'Round 2" 50mm', wmm: 50, hmm: 50, cols: 3, rows: 5, round: true },
      'rd-37': { label: 'Round 1.5" 37mm (24 per sheet)', short: 'Round 1.5" 37mm', wmm: 37, hmm: 37, cols: 4, rows: 6, round: true },
    },
  },
};

const GAP_MM = 4;
const EDIT_SCALE = 0.3;

/* ---------- Helpers ---------- */

const $ = (sel, root = document) => root.querySelector(sel);
const view = $('#view');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { t.hidden = true; }, 2200);
}

function openModal(html) {
  const m = $('#modal');
  m.innerHTML = `<div class="sheet">${html}</div>`;
  m.hidden = false;
  return m;
}
function closeModal() { $('#modal').hidden = true; $('#modal').innerHTML = ''; }
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });

function updateNet() {
  const b = $('#netBadge');
  b.textContent = navigator.onLine ? 'Online' : 'Offline';
  b.classList.toggle('off', !navigator.onLine);
}
addEventListener('online', updateNet);
addEventListener('offline', updateNet);
updateNet();

/* ---------- Storage (IndexedDB) ---------- */

const DB = {
  conn: null,
  open() {
    if (!this.conn) {
      this.conn = new Promise((resolve, reject) => {
        const req = indexedDB.open('magz', 1);
        req.onupgradeneeded = () => {
          req.result.createObjectStore('events', { keyPath: 'id' });
          req.result.createObjectStore('designs', { keyPath: 'id' });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return this.conn;
  },
  async run(store, mode, fn) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, mode);
      const req = fn(tx.objectStore(store));
      tx.oncomplete = () => resolve(req && req.result);
      tx.onerror = () => reject(tx.error);
    });
  },
  put: (store, val) => DB.run(store, 'readwrite', (s) => s.put(val)),
  get: (store, id) => DB.run(store, 'readonly', (s) => s.get(id)),
  all: (store) => DB.run(store, 'readonly', (s) => s.getAll()),
  del: (store, id) => DB.run(store, 'readwrite', (s) => s.delete(id)),
};

async function designsOf(eventId) {
  const all = await DB.all('designs');
  return all.filter((d) => d.eventId === eventId).sort((a, b) => b.createdAt - a.createdAt);
}

/* ---------- Layout + rendering ---------- */

function getGeo(cfg) {
  const paper = PAPERS[cfg.paperId];
  const size = PRODUCTS[cfg.productId].sizes[cfg.sizeId];
  const sw = Math.round(size.wmm * MM);
  const sh = Math.round(size.hmm * MM);
  const gap = Math.round(GAP_MM * MM);
  const totalW = size.cols * sw + (size.cols - 1) * gap;
  const totalH = size.rows * sh + (size.rows - 1) * gap;
  const x0 = Math.round((paper.w - totalW) / 2);
  const y0 = Math.round((paper.h - totalH) / 2);
  const rects = [];
  for (let r = 0; r < size.rows; r++) {
    for (let c = 0; c < size.cols; c++) {
      rects.push({ x: x0 + c * (sw + gap), y: y0 + r * (sh + gap), w: sw, h: sh });
    }
  }
  return { paper, size, rects, round: !!size.round };
}

function photoMetrics(p, s) {
  const swap = Math.abs(p.rot) % 180 === 90;
  const dw = swap ? p.bmp.height : p.bmp.width;
  const dh = swap ? p.bmp.width : p.bmp.height;
  const base = Math.max(s.w / dw, s.h / dh) * p.zoom;
  return { base, maxX: Math.max(0, (dw * base - s.w) / 2 / s.w), maxY: Math.max(0, (dh * base - s.h) / 2 / s.h) };
}

function slotPath(ctx, s, round) {
  ctx.beginPath();
  if (round) ctx.arc(s.x + s.w / 2, s.y + s.h / 2, s.w / 2, 0, Math.PI * 2);
  else ctx.rect(s.x, s.y, s.w, s.h);
}

function drawPhoto(ctx, p, s, round) {
  const { base } = photoMetrics(p, s);
  ctx.save();
  slotPath(ctx, s, round);
  ctx.clip();
  ctx.translate(s.x + s.w / 2 + p.ox * s.w, s.y + s.h / 2 + p.oy * s.h);
  ctx.rotate((p.rot * Math.PI) / 180);
  ctx.scale(base, base);
  ctx.drawImage(p.bmp, -p.bmp.width / 2, -p.bmp.height / 2);
  ctx.restore();
}

// Draws the sheet; `ui` adds empty-slot placeholders and the selection outline.
function renderSheet(canvas, geo, slots, scale, ui) {
  const ctx = canvas.getContext('2d');
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, geo.paper.w, geo.paper.h);
  geo.rects.forEach((s, i) => {
    const p = slots[i];
    if (p) drawPhoto(ctx, p, s, geo.round);
    ctx.lineWidth = 2 / scale;
    ctx.strokeStyle = '#d4d4d8';
    slotPath(ctx, s, geo.round);
    ctx.stroke();
    if (ui && !p) {
      ctx.fillStyle = '#f4f4f8';
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#a1a1aa';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '120px system-ui';
      ctx.fillText('+', s.x + s.w / 2, s.y + s.h / 2 - 20);
      ctx.font = '46px system-ui';
      ctx.fillText('Slot ' + (i + 1), s.x + s.w / 2, s.y + s.h / 2 + 70);
    }
  });
  if (ui && ui.sel != null) {
    const s = geo.rects[ui.sel];
    ctx.lineWidth = 5 / scale;
    ctx.strokeStyle = '#a855f7';
    slotPath(ctx, s, geo.round);
    ctx.stroke();
  }
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

const toBlob = (canvas, type, q) => new Promise((res) => canvas.toBlob(res, type, q));

async function exportPng(design, slots) {
  const geo = getGeo(design);
  const c = makeCanvas(geo.paper.w, geo.paper.h);
  renderSheet(c, geo, slots, 1, null);
  return toBlob(c, 'image/png');
}

async function loadPhotoFile(file) {
  const src = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const k = Math.min(1, 2000 / Math.max(src.width, src.height));
  const c = makeCanvas(Math.round(src.width * k), Math.round(src.height * k));
  c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
  src.close();
  const blob = await toBlob(c, 'image/jpeg', 0.92);
  return { blob, bmp: await createImageBitmap(blob), zoom: 1, rot: 0, ox: 0, oy: 0 };
}

async function hydrate(stored) {
  return Promise.all(stored.slots.map(async (s) => (s ? { ...s, bmp: await createImageBitmap(s.blob) } : null)));
}

const serialize = (slots) => slots.map((s) => (s ? { blob: s.blob, zoom: s.zoom, rot: s.rot, ox: s.ox, oy: s.oy } : null));

function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

function printBlob(blob) {
  const img = $('#printImg');
  img.onload = () => setTimeout(() => window.print(), 100);
  img.src = URL.createObjectURL(blob);
}

/* ---------- Router ---------- */

function route() {
  const p = (location.hash.slice(1) || '/').split('/');
  closeModal();
  if (p[1] === 'new-event') return viewNewEvent();
  if (p[1] === 'event') return viewEvent(p[2]);
  if (p[1] === 'edit') return p[2] === 'new' ? viewEditor(null, p[3]) : viewEditor(p[2]);
  return viewHome();
}
addEventListener('hashchange', route);

/* ---------- Views ---------- */

async function viewHome() {
  const events = (await DB.all('events')).sort((a, b) => b.createdAt - a.createdAt);
  const designs = await DB.all('designs');
  view.innerHTML = `
    <div class="card hero">
      <h2>Fridge magnet sheets, made easy</h2>
      <p>Pick photos, they fit automatically, then print or download. Works offline.</p>
      <a class="btn block" href="#/new-event" style="margin-top:12px">✨ New Event</a>
    </div>
    <div class="card">
      <h3>Events</h3>
      ${events.length ? events.map((e) => `
        <a class="list-item" href="#/event/${e.id}">
          <span><b>${esc(e.name)}</b><br><span class="muted">${esc(PRODUCTS[e.productId].sizes[e.sizeId].short)}</span></span>
          <span class="muted">${designs.filter((d) => d.eventId === e.id).length} designs ›</span>
        </a>`).join('') : '<p class="muted">No events yet. Create your first one.</p>'}
    </div>`;
}

function viewNewEvent() {
  const prodOpts = Object.entries(PRODUCTS).map(([k, v]) => `<option value="${k}">${esc(v.label)}</option>`).join('');
  const paperOpts = Object.entries(PAPERS).map(([k, v]) => `<option value="${k}">${esc(v.label)}</option>`).join('');
  view.innerHTML = `
    <div class="card">
      <h2>New Event</h2>
      <p class="muted">Choose the paper size and product. You can start designing right after.</p>
      <label for="evName">Event Name *</label>
      <input type="text" id="evName" placeholder="e.g. IACI 2026" autocomplete="off">
      <div class="hint">Name of the occasion, wedding, or corporate event</div>
      <label for="evPaper">Paper Size *</label>
      <select id="evPaper"><option value="">-- Select Paper Size --</option>${paperOpts}</select>
      <label for="evProd">Product Type *</label>
      <select id="evProd"><option value="">-- Select Product Type --</option>${prodOpts}</select>
      <label for="evSize">Overlay / Template Size *</label>
      <select id="evSize" disabled><option value="">-- Select Product Type First --</option></select>
      <div class="err" id="evErr"></div>
      <div class="row" style="margin-top:18px">
        <a class="btn" href="#/">Cancel</a>
        <button class="btn primary" id="evCreate">Create &amp; Open Event</button>
      </div>
    </div>`;
  const prod = $('#evProd');
  const size = $('#evSize');
  prod.onchange = () => {
    const p = PRODUCTS[prod.value];
    size.disabled = !p;
    size.innerHTML = p
      ? '<option value="">-- Select Overlay Size --</option>' + Object.entries(p.sizes).map(([k, v]) => `<option value="${k}">${esc(v.label)}</option>`).join('')
      : '<option value="">-- Select Product Type First --</option>';
  };
  $('#evCreate').onclick = async () => {
    const name = $('#evName').value.trim();
    if (!name || !$('#evPaper').value || !prod.value || !size.value) {
      $('#evErr').textContent = 'Please fill in all fields.';
      return;
    }
    const ev = { id: uid(), name, paperId: $('#evPaper').value, productId: prod.value, sizeId: size.value, createdAt: Date.now() };
    await DB.put('events', ev);
    location.hash = '#/event/' + ev.id;
  };
}

async function viewEvent(id) {
  const ev = await DB.get('events', id);
  if (!ev) { location.hash = '#/'; return; }
  const designs = await designsOf(id);
  const size = PRODUCTS[ev.productId].sizes[ev.sizeId];
  const per = size.cols * size.rows;
  view.innerHTML = `
    <div class="crumbs"><a href="#/">Events</a> › ${esc(ev.name)}</div>
    <div class="card hero">
      <h2>${esc(ev.name)}</h2>
      <p>${designs.length} designs on this device</p>
      <div class="chips">
        <span class="chip">${esc(size.short)}</span>
        <span class="chip">${esc(PAPERS[ev.paperId].label.split(' ')[0])}</span>
        <span class="chip">${per} photos per sheet</span>
      </div>
      <a class="btn block" href="#/edit/new/${ev.id}" style="margin-top:14px">✨ Start New Design</a>
    </div>
    <div class="card">
      <h3>Saved designs <span class="muted">${designs.length}</span></h3>
      <p class="muted">Designs are saved on this device. Download them before clearing browser data.</p>
      <div class="grid" id="grid">
        ${designs.map((d, i) => `
          <div class="thumb" data-id="${d.id}">
            ${i === 0 ? '<span class="tag">Latest</span>' : ''}
            <img src="${d.thumb}" alt="">${esc(d.name)}
          </div>`).join('')}
      </div>
    </div>
    <button class="btn danger block" id="delEvent">Delete event</button>`;
  $('#grid').onclick = (e) => {
    const t = e.target.closest('.thumb');
    if (t) previewDesign(designs.find((d) => d.id === t.dataset.id), ev);
  };
  $('#delEvent').onclick = async () => {
    if (!confirm(`Delete "${ev.name}" and its ${designs.length} designs?`)) return;
    for (const d of designs) await DB.del('designs', d.id);
    await DB.del('events', ev.id);
    location.hash = '#/';
  };
}

async function previewDesign(d, ev) {
  const slots = await hydrate(d);
  const blob = await exportPng(d, slots);
  const url = URL.createObjectURL(blob);
  const m = openModal(`
    <h3>${esc(ev.name)} · ${esc(d.name)}</h3>
    <div class="preview"><img src="${url}" alt=""></div>
    <div class="row"><button class="btn" id="pvPrint">🖨 Print</button><button class="btn primary" id="pvDl">⬇ Download PNG</button></div>
    <div class="row" style="margin-top:10px"><a class="btn" href="#/edit/${d.id}">Edit</a><button class="btn danger" id="pvDel">Delete</button><button class="btn" id="pvClose">Close</button></div>`);
  $('#pvPrint', m).onclick = () => printBlob(blob);
  $('#pvDl', m).onclick = () => download(blob, `${ev.name} - ${d.name}.png`);
  $('#pvClose', m).onclick = closeModal;
  $('#pvDel', m).onclick = async () => {
    if (!confirm(`Delete ${d.name}?`)) return;
    await DB.del('designs', d.id);
    viewEvent(ev.id);
    closeModal();
  };
}

/* ---------- Editor ---------- */

async function viewEditor(designId, newEventId) {
  let design;
  let slots;
  let ev;
  if (designId) {
    design = await DB.get('designs', designId);
    if (!design) { location.hash = '#/'; return; }
    ev = await DB.get('events', design.eventId);
    slots = await hydrate(design);
  } else {
    ev = await DB.get('events', newEventId);
    if (!ev) { location.hash = '#/'; return; }
    const count = (await designsOf(ev.id)).length + 1;
    design = { id: uid(), eventId: ev.id, paperId: ev.paperId, productId: ev.productId, sizeId: ev.sizeId, name: 'Design ' + String(count).padStart(3, '0'), createdAt: Date.now() };
    slots = new Array(PRODUCTS[ev.productId].sizes[ev.sizeId].cols * PRODUCTS[ev.productId].sizes[ev.sizeId].rows).fill(null);
  }
  const geo = getGeo(design);
  let sel = 0;
  let dirty = false;
  let drag = null;

  view.innerHTML = `
    <div class="editor">
      <div class="editor-bar">
        <button class="btn" id="edBack">←</button>
        <div class="title"><b>${esc(ev.name)}</b>${esc(design.name)} · ${esc(geo.size.short)}</div>
        <span class="pill" id="edCount"></span>
        <button class="btn save" id="edSave">💾 Save</button>
      </div>
      <div class="stage"><canvas id="sheet" width="${Math.round(geo.paper.w * EDIT_SCALE)}" height="${Math.round(geo.paper.h * EDIT_SCALE)}"></canvas></div>
      <div class="tools">
        <div class="zoom">Zoom <input type="range" id="edZoom" min="1" max="3" step="0.01" value="1"><span id="edZoomVal">100%</span></div>
        <div class="row">
          <button class="btn" id="edAdd">＋ Add photos</button>
          <button class="btn" id="edRotL">↺</button>
          <button class="btn" id="edRotR">↻</button>
          <button class="btn" id="edAuto">Auto-rotate all</button>
          <button class="btn" id="edReplace">Replace</button>
          <button class="btn" id="edRemove">Remove</button>
        </div>
      </div>
    </div>`;

  const canvas = $('#sheet');
  const zoom = $('#edZoom');

  function redraw() {
    renderSheet(canvas, geo, slots, EDIT_SCALE, { sel });
    $('#edCount').textContent = `${slots.filter(Boolean).length} / ${slots.length} photos`;
    const p = slots[sel];
    zoom.disabled = !p;
    zoom.value = p ? p.zoom : 1;
    $('#edZoomVal').textContent = Math.round((p ? p.zoom : 1) * 100) + '%';
  }

  function refit(p) {
    const m = photoMetrics(p, geo.rects[sel]);
    p.ox = clamp(p.ox, -m.maxX, m.maxX);
    p.oy = clamp(p.oy, -m.maxY, m.maxY);
  }

  function slotAt(e) {
    const r = canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * geo.paper.w;
    const y = ((e.clientY - r.top) / r.height) * geo.paper.h;
    return geo.rects.findIndex((s) => {
      if (geo.round) return Math.hypot(x - (s.x + s.w / 2), y - (s.y + s.h / 2)) <= s.w / 2;
      return x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h;
    });
  }

  async function addFiles(files, first) {
    const empties = slots.map((s, i) => (s ? -1 : i)).filter((i) => i >= 0 && i !== first);
    const targets = first != null ? [first, ...empties] : empties;
    if (!targets.length) { toast('All slots are full'); return; }
    for (const [n, file] of [...files].slice(0, targets.length).entries()) {
      try {
        slots[targets[n]] = await loadPhotoFile(file);
      } catch {
        toast('Could not read ' + file.name);
      }
    }
    dirty = true;
    redraw();
  }

  function pick(first) {
    const input = $('#fileInput');
    input.value = '';
    input.onchange = () => addFiles(input.files, first);
    input.click();
  }

  canvas.onpointerdown = (e) => {
    const i = slotAt(e);
    if (i < 0) return;
    sel = i;
    redraw();
    const p = slots[i];
    drag = { i, x: e.clientX, y: e.clientY, ox: p ? p.ox : 0, oy: p ? p.oy : 0, moved: false };
    canvas.setPointerCapture(e.pointerId);
  };
  canvas.onpointermove = (e) => {
    const p = drag && slots[drag.i];
    if (!p) return;
    const r = canvas.getBoundingClientRect();
    const s = geo.rects[drag.i];
    const dx = ((e.clientX - drag.x) / r.width) * geo.paper.w / s.w;
    const dy = ((e.clientY - drag.y) / r.height) * geo.paper.h / s.h;
    if (Math.abs(dx) + Math.abs(dy) > 0.02) drag.moved = true;
    p.ox = drag.ox + dx;
    p.oy = drag.oy + dy;
    refit(p);
    dirty = true;
    redraw();
  };
  canvas.onpointerup = () => {
    if (drag && !drag.moved && !slots[drag.i]) pick(drag.i);
    drag = null;
  };

  zoom.oninput = () => {
    const p = slots[sel];
    if (!p) return;
    p.zoom = Number(zoom.value);
    refit(p);
    dirty = true;
    redraw();
  };

  const rotate = (p, d) => { p.rot = ((p.rot + d + 540) % 360) - 180; p.ox = 0; p.oy = 0; };
  $('#edRotL').onclick = () => { const p = slots[sel]; if (p) { rotate(p, -90); dirty = true; redraw(); } };
  $('#edRotR').onclick = () => { const p = slots[sel]; if (p) { rotate(p, 90); dirty = true; redraw(); } };
  $('#edAuto').onclick = () => {
    slots.forEach((p, i) => {
      if (!p) return;
      const s = geo.rects[i];
      const photoLandscape = p.bmp.width >= p.bmp.height;
      p.rot = s.w === s.h || photoLandscape === s.w > s.h ? 0 : -90;
      p.ox = 0;
      p.oy = 0;
    });
    dirty = true;
    redraw();
  };
  $('#edAdd').onclick = () => pick(null);
  $('#edReplace').onclick = () => pick(sel);
  $('#edRemove').onclick = () => { if (slots[sel]) { slots[sel] = null; dirty = true; redraw(); } };

  $('#edBack').onclick = () => {
    if (dirty && !confirm('Leave without saving your changes?')) return;
    dirty = false;
    location.hash = '#/event/' + ev.id;
  };

  $('#edSave').onclick = async () => {
    if (!slots.some(Boolean)) { toast('Add at least one photo'); return; }
    const t = makeCanvas(Math.round(geo.paper.w * 0.12), Math.round(geo.paper.h * 0.12));
    renderSheet(t, geo, slots, 0.12, null);
    design.thumb = t.toDataURL('image/jpeg', 0.8);
    design.slots = serialize(slots);
    await DB.put('designs', design);
    dirty = false;
    const m = openModal(`
      <h3 style="text-align:center">🎉 Design saved</h3>
      <p class="muted" style="text-align:center"><b>${esc(design.name)}</b> is in the gallery. Print or download it there, or start the next layout.</p>
      <div class="stack">
        <a class="btn primary" href="#/edit/new/${ev.id}">＋ Create Next Design</a>
        <a class="btn" href="#/event/${ev.id}">🖼 View in Gallery</a>
        <button class="btn" id="svContinue">Continue Editing</button>
      </div>`);
    $('#svContinue', m).onclick = closeModal;
  };

  redraw();
}

/* ---------- Boot ---------- */

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
route();
