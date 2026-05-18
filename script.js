/* ════════════════════════════════════════
   FOCUSPASS — script.js
   ════════════════════════════════════════ */

/* ══════════ STATE ══════════ */
let state = {
  subjects: [],
  notes:    [],
  tickets:  [],
  focusMins: 0,
};

/* load from localStorage */
(function initState() {
  try {
    const saved = localStorage.getItem('focuspass_state');
    if (saved) state = JSON.parse(saved);
  } catch(e) { /* fresh start */ }
})();

function saveState() {
  localStorage.setItem('focuspass_state', JSON.stringify(state));
}

/* ══════════ NAV ══════════ */
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    const view = btn.dataset.view;
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-' + view).classList.add('active');
    if (view === 'subjects') renderSubjects();
    if (view === 'notes')    renderNotes();
    if (view === 'tickets')  renderTickets();
    if (view === 'dashboard') renderDashboard();
  });
});

/* ══════════ CLOCK ══════════ */
function updateClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2,'0');
  const m = String(now.getMinutes()).padStart(2,'0');
  const s = String(now.getSeconds()).padStart(2,'0');
  const el = document.getElementById('live-clock');
  if (el) el.textContent = `${h}:${m}:${s}`;
}
setInterval(updateClock, 1000);
updateClock();

/* ══════════ MODALS ══════════ */
function openModal(id) {
  if (id === 'modal-add-note' || id === 'modal-gen-ticket') populateSubjectSelects();
  document.getElementById(id).classList.add('open');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

/* ══════════ SUBJECTS ══════════ */
let selectedColor = '#00f5d4';
document.querySelectorAll('.color-dot').forEach(dot => {
  dot.addEventListener('click', () => {
    document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('selected'));
    dot.classList.add('selected');
    selectedColor = dot.dataset.color;
  });
});

function addSubject() {
  const name = document.getElementById('input-subject-name').value.trim();
  if (!name) { flashInput('input-subject-name'); return; }
  state.subjects.push({ id: uid(), name, color: selectedColor, created: Date.now() });
  saveState();
  document.getElementById('input-subject-name').value = '';
  closeModal('modal-add-subject');
  renderSubjects();
  renderDashboard();
}

function renderSubjects() {
  const grid = document.getElementById('folder-grid');
  const empty = document.getElementById('subjects-empty');
  grid.innerHTML = '';
  if (state.subjects.length === 0) { empty.classList.add('show'); return; }
  empty.classList.remove('show');
  state.subjects.forEach(sub => {
    const noteCount = state.notes.filter(n => n.subjectId === sub.id).length;
    const card = document.createElement('div');
    card.className = 'folder-card';
    card.style.setProperty('--folder-color', sub.color);
    card.innerHTML = `
      <span class="folder-icon">◈</span>
      <div class="folder-name">${esc(sub.name)}</div>
      <div class="folder-meta">${noteCount} NOTE${noteCount !== 1 ? 'S' : ''}</div>
      <button class="folder-delete" onclick="deleteSubject('${sub.id}',event)">✕</button>
    `;
    card.addEventListener('click', () => {
      /* navigate to notes filtered by this subject */
      document.querySelector('[data-view="notes"]').click();
      setTimeout(() => {
        const sel = document.getElementById('note-subject-filter');
        if (sel) sel.value = sub.id;
        renderNotes();
      }, 50);
    });
    grid.appendChild(card);
  });
}

function deleteSubject(id, e) {
  e.stopPropagation();
  state.subjects = state.subjects.filter(s => s.id !== id);
  state.notes = state.notes.filter(n => n.subjectId !== id);
  saveState(); renderSubjects(); renderDashboard();
}

/* ══════════ NOTES ══════════ */
let noteType = 'note';
function selectNoteType(btn) {
  document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  noteType = btn.dataset.type;
  const label = document.getElementById('note-content-label');
  const area  = document.getElementById('input-note-content');
  if (noteType === 'pdf') {
    label.textContent = 'PDF Description / Abstract';
    area.placeholder  = 'Describe the PDF contents…';
  } else {
    label.textContent = 'Content';
    area.placeholder  = 'Write your notes here…';
  }
}

function addNote() {
  const title   = document.getElementById('input-note-title').value.trim();
  const subjId  = document.getElementById('input-note-subject').value;
  const content = document.getElementById('input-note-content').value.trim();
  if (!title) { flashInput('input-note-title'); return; }
  state.notes.push({ id: uid(), title, subjectId: subjId, type: noteType, content, created: Date.now() });
  saveState();
  document.getElementById('input-note-title').value = '';
  document.getElementById('input-note-content').value = '';
  closeModal('modal-add-note');
  renderNotes(); renderDashboard();
}

function renderNotes() {
  const grid  = document.getElementById('notes-grid');
  const empty = document.getElementById('notes-empty');
  const filter = document.getElementById('note-subject-filter').value;
  let notes = filter ? state.notes.filter(n => n.subjectId === filter) : state.notes;
  grid.innerHTML = '';
  if (notes.length === 0) { empty.classList.add('show'); return; }
  empty.classList.remove('show');
  notes.slice().reverse().forEach(note => {
    const sub   = state.subjects.find(s => s.id === note.subjectId);
    const color = sub ? sub.color : '#4a607a';
    const card  = document.createElement('div');
    card.className = 'note-card';
    card.innerHTML = `
      <span class="note-type-badge ${note.type === 'pdf' ? 'pdf-badge' : 'note-badge'}">${note.type.toUpperCase()}</span>
      <div class="note-title">${esc(note.title)}</div>
      <div class="note-content">${esc(note.content || '— No content —')}</div>
      <div class="note-footer">
        <span class="note-subject-tag" style="color:${color};border-color:${color}40">${sub ? esc(sub.name) : 'UNASSIGNED'}</span>
        <button class="note-delete" onclick="deleteNote('${note.id}')">✕</button>
      </div>
    `;
    grid.appendChild(card);
  });
}

function deleteNote(id) {
  state.notes = state.notes.filter(n => n.id !== id);
  saveState(); renderNotes(); renderDashboard();
}

/* note subject filter */
document.getElementById('note-subject-filter').addEventListener('change', renderNotes);

/* ══════════ SUBJECT SELECT HELPERS ══════════ */
function populateSubjectSelects() {
  ['input-note-subject','input-ticket-subject','note-subject-filter'].forEach(selId => {
    const sel = document.getElementById(selId);
    if (!sel) return;
    const isFilter = selId === 'note-subject-filter';
    const prev = sel.value;
    sel.innerHTML = isFilter ? '<option value="">ALL SUBJECTS</option>' : '<option value="">NONE</option>';
    state.subjects.forEach(sub => {
      const opt = document.createElement('option');
      opt.value = sub.id; opt.textContent = sub.name.toUpperCase();
      sel.appendChild(opt);
    });
    sel.value = prev;
  });
}

/* ══════════ TICKETS ══════════ */
function generateTicket() {
  const label    = document.getElementById('input-ticket-label').value.trim() || 'STUDY SESSION';
  const subjId   = document.getElementById('input-ticket-subject').value;
  const duration = parseInt(document.getElementById('input-ticket-duration').value) || 60;
  const code     = genCode();
  const ticket   = { id: uid(), label, subjectId: subjId, duration, code, created: Date.now() };
  state.tickets.push(ticket);
  state.focusMins += duration;
  saveState();

  /* show preview */
  const preview = document.getElementById('ticket-preview');
  preview.style.display = 'flex';
  drawBarcode(document.getElementById('barcode-large'), code, 320, 70);

  const sub = state.subjects.find(s => s.id === subjId);
  document.getElementById('ticket-meta-display').innerHTML =
    `CODE: ${code}<br>${sub ? sub.name.toUpperCase() + ' — ' : ''}DURATION: ${duration}MIN`;

  renderTickets(); renderDashboard();
}

function quickGenerateTicket() {
  const code = genCode();
  drawBarcode(document.getElementById('barcode-mini'), code, 200, 50);
  document.getElementById('quick-ticket-code').textContent = code;
}

function renderTickets() {
  const list  = document.getElementById('tickets-list');
  const empty = document.getElementById('tickets-empty');
  list.innerHTML = '';
  if (state.tickets.length === 0) { empty.classList.add('show'); return; }
  empty.classList.remove('show');
  state.tickets.slice().reverse().forEach(ticket => {
    const sub = state.subjects.find(s => s.id === ticket.subjectId);
    const card = document.createElement('div');
    card.className = 'ticket-card';
    const canvasId = 'bc-' + ticket.id;
    card.innerHTML = `
      <div class="ticket-info">
        <div class="ticket-session">${esc(ticket.label)}</div>
        <div class="ticket-details">
          <span>⏱ ${ticket.duration} MIN</span>
          ${sub ? `<span>◈ ${esc(sub.name)}</span>` : ''}
          <span>${new Date(ticket.created).toLocaleDateString()}</span>
        </div>
      </div>
      <div class="ticket-barcode">
        <canvas id="${canvasId}" width="160" height="42"></canvas>
        <div class="ticket-code">${ticket.code}</div>
      </div>
      <button class="ticket-delete" onclick="deleteTicket('${ticket.id}')">✕</button>
    `;
    list.appendChild(card);
    /* draw after DOM insert */
    requestAnimationFrame(() => {
      const canvas = document.getElementById(canvasId);
      if (canvas) drawBarcode(canvas, ticket.code, 160, 42);
    });
  });
}

function deleteTicket(id) {
  state.tickets = state.tickets.filter(t => t.id !== id);
  saveState(); renderTickets(); renderDashboard();
}

/* ══════════ BARCODE DRAWING ══════════ */
function drawBarcode(canvas, code, w, h) {
  const ctx = canvas.getContext('2d');
  canvas.width = w; canvas.height = h;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'transparent';

  /* Generate deterministic bars from code string */
  const seed = code.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const rng = lcg(seed);

  const bars = 60 + (seed % 20);
  const barW = w / bars;
  let x = 0;
  for (let i = 0; i < bars; i++) {
    const v = rng();
    const bh = h * (0.3 + v * 0.7);
    const alpha = 0.5 + v * 0.5;
    ctx.fillStyle = `rgba(0,245,212,${alpha.toFixed(2)})`;
    const bw = barW * (0.3 + v * 0.5);
    ctx.fillRect(x, (h - bh) / 2, bw, bh);
    x += barW;
  }

  /* quiet zones */
  ctx.fillStyle = 'rgba(0,245,212,1)';
  ctx.fillRect(0, h * 0.1, 2, h * 0.8);
  ctx.fillRect(w - 2, h * 0.1, 2, h * 0.8);
}

/* animated barcode on dashboard */
let barcodeAnimFrame;
function animateBarcode() {
  const canvas = document.getElementById('barcode-mini');
  if (!canvas) return;
  const w = 200, h = 50;
  const ctx = canvas.getContext('2d');
  canvas.width = w; canvas.height = h;
  let tick = 0;
  function frame() {
    ctx.clearRect(0,0,w,h);
    const bars = 55;
    const barW = w / bars;
    for (let i = 0; i < bars; i++) {
      const v = Math.abs(Math.sin(i * 0.4 + tick * 0.05));
      const bh = h * (0.2 + v * 0.75);
      ctx.fillStyle = `rgba(0,245,212,${0.3 + v * 0.6})`;
      ctx.fillRect(i * barW, (h - bh) / 2, barW * 0.55, bh);
    }
    tick++;
    barcodeAnimFrame = requestAnimationFrame(frame);
  }
  frame();
}
animateBarcode();

/* fullscreen barcode animation */
function animateFSBarcode() {
  const canvas = document.getElementById('barcode-fs');
  if (!canvas) return;
  const w = 400, h = 50;
  const ctx = canvas.getContext('2d');
  let tick = 0;
  function frame() {
    ctx.clearRect(0,0,w,h);
    const bars = 80;
    const barW = w / bars;
    for (let i = 0; i < bars; i++) {
      const v = Math.abs(Math.sin(i * 0.3 + tick * 0.06));
      const bh = h * (0.15 + v * 0.8);
      ctx.fillStyle = `rgba(0,245,212,${0.2 + v * 0.55})`;
      ctx.fillRect(i * barW, (h - bh) / 2, barW * 0.5, bh);
    }
    tick++;
    if (document.getElementById('fullscreen-timer').classList.contains('open')) {
      requestAnimationFrame(frame);
    }
  }
  frame();
}

/* ══════════ DASHBOARD ══════════ */
function renderDashboard() {
  document.getElementById('stat-subjects').textContent = state.subjects.length;
  document.getElementById('stat-notes').textContent    = state.notes.length;
  document.getElementById('stat-tickets').textContent  = state.tickets.length;
  document.getElementById('stat-focus').textContent    = state.focusMins + 'm';

  populateSubjectSelects();

  /* recent subjects chips */
  const list = document.getElementById('recent-subjects-list');
  list.innerHTML = '';
  if (state.subjects.length === 0) {
    list.innerHTML = '<span class="empty-hint">No subjects yet — add one below</span>';
  } else {
    state.subjects.slice(-6).reverse().forEach(sub => {
      const chip = document.createElement('span');
      chip.className = 'subject-chip';
      chip.style.borderColor = sub.color + '60';
      chip.style.color = sub.color;
      chip.style.background = sub.color + '18';
      chip.textContent = sub.name.toUpperCase();
      list.appendChild(chip);
    });
  }
}

/* ══════════ FOCUS TIMER ══════════ */
let timerTotal   = 25 * 60;
let timerLeft    = 25 * 60;
let timerRunning = false;
let timerInterval = null;
let timerLabel   = 'FOCUS';
const CIRCUMFERENCE = 2 * Math.PI * 100; // r=100

function setTimerMode(btn, mins, label) {
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  timerTotal   = mins * 60;
  timerLeft    = mins * 60;
  timerLabel   = label;
  timerRunning = false;
  clearInterval(timerInterval);
  document.getElementById('btn-start-timer').textContent = 'START';
  updateTimerUI();
}

function timerToggle() {
  if (timerRunning) {
    timerRunning = false;
    clearInterval(timerInterval);
    document.getElementById('btn-start-timer').textContent = 'RESUME';
  } else {
    timerRunning = true;
    document.getElementById('btn-start-timer').textContent = 'PAUSE';
    timerInterval = setInterval(() => {
      if (timerLeft <= 0) {
        clearInterval(timerInterval);
        timerRunning = false;
        timerDone();
        return;
      }
      timerLeft--;
      /* accumulate focus minutes */
      if (timerLabel.includes('FOCUS') || timerLabel.includes('DEEP')) {
        if (timerLeft % 60 === 59) { state.focusMins++; saveState(); renderDashboard(); }
      }
      updateTimerUI();
    }, 1000);
  }
}

function timerReset() {
  clearInterval(timerInterval);
  timerRunning = false;
  timerLeft = timerTotal;
  document.getElementById('btn-start-timer').textContent = 'START';
  updateTimerUI();
}

function updateTimerUI() {
  const m = String(Math.floor(timerLeft / 60)).padStart(2, '0');
  const s = String(timerLeft % 60).padStart(2, '0');
  const display = `${m}:${s}`;
  document.getElementById('timer-digits').textContent = display;
  document.getElementById('timer-mode-label').textContent = timerLabel;
  document.getElementById('fs-digits').textContent  = display;
  document.getElementById('fs-mode-label').textContent = timerLabel;

  const frac  = timerLeft / timerTotal;
  const offset = CIRCUMFERENCE * (1 - frac);
  const ring  = document.getElementById('ring-progress');
  ring.style.strokeDashoffset = offset;
  /* color shift as time runs out */
  if (frac < 0.2) ring.style.stroke = '#f72585';
  else if (frac < 0.5) ring.style.stroke = '#f4a261';
  else ring.style.stroke = '#00f5d4';
}

function timerDone() {
  if (Notification.permission === 'granted') {
    new Notification('FocusPass', { body: `${timerLabel} session complete!` });
  }
  /* flash effect */
  document.body.style.transition = 'background .3s';
  document.body.style.background = 'rgba(0,245,212,.08)';
  setTimeout(() => { document.body.style.background = ''; }, 400);
}

/* Fullscreen */
function enterFullscreenTimer() {
  document.getElementById('fullscreen-timer').classList.add('open');
  updateTimerUI();
  animateFSBarcode();
}
function exitFullscreenTimer() {
  document.getElementById('fullscreen-timer').classList.remove('open');
}

/* Ring init */
document.getElementById('ring-progress').style.strokeDasharray = CIRCUMFERENCE;
updateTimerUI();

/* ══════════ UTILS ══════════ */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) code += '-';
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
function esc(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function flashInput(id) {
  const el = document.getElementById(id);
  el.style.borderColor = '#f72585';
  el.style.boxShadow = '0 0 10px rgba(247,37,133,.3)';
  setTimeout(() => { el.style.borderColor = ''; el.style.boxShadow = ''; }, 800);
}

/* LCG pseudo-random (deterministic) */
function lcg(seed) {
  let s = seed >>> 0;
  return function() {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0xFFFFFFFF;
  };
}

/* ══════════ INIT ══════════ */
(function init() {
  renderDashboard();
  renderSubjects();
  renderNotes();
  renderTickets();
  quickGenerateTicket(); /* seed dashboard barcode */
})();
