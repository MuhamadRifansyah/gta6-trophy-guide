// Leonida Trophy Guide — tracker for the 55 GTA VI trophies on PS5.
// Plain ES module, no framework, no network: it only fetches data/trophies.json (a local file)
// and keeps progress in localStorage. Export/import moves progress as a JSON file.
const KEY = 'leonida-trophy-guide-v1';
const SPOILER_KEY = 'leonida-trophy-guide-spoilers-v1';

const listEl = document.getElementById('list');
const searchEl = document.getElementById('search');
const gradeEl = document.getElementById('grade');
const spoilerEl = document.getElementById('spoilers');
const kindChipsEl = document.getElementById('kindChips');
const countEl = document.getElementById('countText');
const barFill = document.getElementById('barFill');
const progressText = document.getElementById('progressText');
const gradeText = document.getElementById('gradeText');
const nextText = document.getElementById('nextText');

const KINDS = [
  ['all', 'All'],
  ['story', 'Story'],
  ['side', 'Side quests'],
  ['collectible', 'Collectibles'],
  ['activity', 'Activities'],
  ['robbery', 'Robberies'],
  ['misc', 'Misc'],
  ['missable', 'Missable'],
];

let earned = new Set();
let spoilers = true;
let kindFilter = 'all';
let openId = null;

try { earned = new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]')); } catch { earned = new Set(); }
try { spoilers = localStorage.getItem(SPOILER_KEY) !== 'off'; } catch { spoilers = true; }

const doc = await (await fetch('data/trophies.json')).json();
const trophies = doc.trophies;

function save() {
  try { localStorage.setItem(KEY, JSON.stringify([...earned])); } catch {}
}
function saveSpoilers() {
  try { localStorage.setItem(SPOILER_KEY, spoilers ? 'on' : 'off'); } catch {}
}
function isHidden(t) {
  return t.hidden && spoilers && !earned.has(t.name);
}
function chapterLabel(t) {
  if (t.chapter === 'final') return 'Final mission';
  if (typeof t.chapter === 'number') return 'Ch. ' + t.chapter;
  return null;
}
function kindLabel(k) {
  return { story: 'Story', side: 'Side quest', collectible: 'Collectible', activity: 'Activity', robbery: 'Robbery', misc: 'Misc' }[k] || k;
}

function renderProgress() {
  const total = trophies.length;
  const n = earned.size;
  barFill.style.width = (total ? Math.round((n / total) * 100) : 0) + '%';
  progressText.textContent = n + ' / ' + total + ' earned';
  const counts = {};
  for (const t of trophies) {
    counts[t.grade] = counts[t.grade] || [0, 0];
    counts[t.grade][1] += 1;
    if (earned.has(t.name)) counts[t.grade][0] += 1;
  }
  gradeText.textContent = ['platinum', 'gold', 'silver', 'bronze']
    .map((g) => (counts[g] ? counts[g][0] + '/' + counts[g][1] + ' ' + g : ''))
    .filter(Boolean)
    .join(' · ');
  if (n === total) {
    nextText.textContent = 'Platinum earned — Vice Got a Price! is yours.';
  } else if (!earned.has('Positive Mental Attitude')) {
    nextText.textContent = 'Do not forget: Positive Mental Attitude — the Chapter 1 meditation.';
  } else {
    const next = trophies.find((t) => !earned.has(t.name));
    nextText.textContent = next ? 'Next up: ' + next.name : '';
  }
}

function visibleTrophies() {
  const q = searchEl.value.trim().toLowerCase();
  return trophies.filter((t) => {
    if (kindFilter === 'missable') {
      if (!t.missable) return false;
    } else if (kindFilter !== 'all' && t.kind !== kindFilter) {
      return false;
    }
    if (gradeEl.value !== 'all' && t.grade !== gradeEl.value) return false;
    if (!q) return true;
    // A hidden trophy never leaks through search while spoilers are on.
    if (isHidden(t)) return false;
    return (t.name + ' ' + t.description + ' ' + t.guide + ' ' + (t.count || '')).toLowerCase().includes(q);
  });
}

function render() {
  renderProgress();
  const shown = visibleTrophies();
  countEl.textContent = 'Showing ' + shown.length + ' of ' + trophies.length + ' trophies' +
    (spoilers ? ' · spoilers hidden' : ' · spoilers shown');
  listEl.replaceChildren();
  for (const t of shown) {
    const hidden = isHidden(t);
    const card = document.createElement('article');
    card.className = 'card' + (earned.has(t.name) ? ' earned' : '') + (openId === t.id ? ' open' : '');
    card.dataset.id = String(t.id);

    const head = document.createElement('div');
    head.className = 'card-head';

    const tick = document.createElement('button');
    tick.type = 'button';
    tick.className = 'tick';
    tick.textContent = '✓';
    tick.setAttribute('aria-label', (earned.has(t.name) ? 'Mark as not earned: ' : 'Mark as earned: ') + (hidden ? 'Hidden trophy' : t.name));
    tick.addEventListener('click', (e) => {
      e.stopPropagation();
      if (earned.has(t.name)) earned.delete(t.name);
      else earned.add(t.name);
      save();
      render();
    });
    head.append(tick);

    const main = document.createElement('div');
    main.className = 'card-main';
    if (hidden) {
      const name = document.createElement('div');
      name.className = 'hidden-name';
      name.textContent = '🔒 Hidden trophy';
      main.append(name);
      const desc = document.createElement('div');
      desc.className = 'card-desc';
      desc.textContent = 'A story trophy. Earn it, or turn off “Hide spoilers”, to reveal its name and guide.';
      main.append(desc);
    } else {
      const name = document.createElement('div');
      name.className = 'card-name';
      name.textContent = t.name;
      main.append(name);
      const desc = document.createElement('div');
      desc.className = 'card-desc';
      desc.textContent = t.description;
      main.append(desc);
    }
    const meta = document.createElement('div');
    meta.className = 'meta';
    if (!hidden) {
      const grade = document.createElement('span');
      grade.className = 'badge ' + t.grade;
      grade.textContent = t.grade;
      meta.append(grade);
    } else {
      const grade = document.createElement('span');
      grade.className = 'badge hidden';
      grade.textContent = 'hidden';
      meta.append(grade);
    }
    const kind = document.createElement('span');
    kind.className = 'tag';
    kind.textContent = kindLabel(t.kind);
    meta.append(kind);
    const ch = chapterLabel(t);
    if (ch && !hidden) {
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = ch;
      meta.append(tag);
    }
    if (t.count && !hidden) {
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = t.count;
      meta.append(tag);
    }
    if (t.missable) {
      const tag = document.createElement('span');
      tag.className = 'tag missable';
      tag.textContent = '⚠ Possibly missable';
      meta.append(tag);
    }
    if (/^UNCONFIRMED/.test(t.guide)) {
      const tag = document.createElement('span');
      tag.className = 'tag unconfirmed';
      tag.textContent = 'Unconfirmed';
      meta.append(tag);
    }
    main.append(meta);
    head.append(main);
    card.append(head);

    if (openId === t.id && !hidden) {
      const detail = document.createElement('div');
      detail.className = 'detail';
      if (t.count) {
        const cnt = document.createElement('p');
        cnt.className = 'cnt';
        cnt.textContent = 'Target: ' + t.count;
        detail.append(cnt);
      }
      const guide = document.createElement('p');
      guide.className = 'guide';
      guide.textContent = t.guide;
      detail.append(guide);
      const src = document.createElement('p');
      src.className = 'src';
      src.innerHTML = '';
      const b = document.createElement('b');
      b.textContent = 'Source: ' + t.source;
      src.append(b);
      src.append(document.createTextNode(' — guide written in our own words from that source; see the Sources tab for the full link.'));
      detail.append(src);
      card.append(detail);
    }
    card.addEventListener('click', () => {
      openId = openId === t.id ? null : t.id;
      render();
    });
    listEl.append(card);
  }
}

function renderChips() {
  kindChipsEl.replaceChildren();
  for (const [value, label] of KINDS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.className = kindFilter === value ? 'active' : '';
    b.addEventListener('click', () => {
      kindFilter = value;
      renderChips();
      render();
    });
    kindChipsEl.append(b);
  }
}

// Tabs
const views = { tracker: 'view-tracker', roadmap: 'view-roadmap', sources: 'view-sources' };
function showView(name) {
  for (const [key, id] of Object.entries(views)) {
    document.getElementById(id).hidden = key !== name;
  }
  for (const b of document.querySelectorAll('.tabs button')) {
    b.classList.toggle('active', b.dataset.view === name);
  }
}
for (const b of document.querySelectorAll('.tabs button')) {
  b.addEventListener('click', () => showView(b.dataset.view));
}

// Controls
searchEl.addEventListener('input', render);
gradeEl.addEventListener('change', render);
spoilerEl.checked = spoilers;
spoilerEl.addEventListener('change', () => {
  spoilers = spoilerEl.checked;
  saveSpoilers();
  render();
});
document.getElementById('export').addEventListener('click', () => {
  const payload = { app: 'leonida-trophy-guide', version: 1, exported_at: new Date().toISOString(), earned: [...earned] };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  a.download = 'gta6-trophy-progress.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});
document.getElementById('import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const names = new Set(trophies.map((t) => t.name));
    const imported = (Array.isArray(data) ? data : data.earned || []).filter((n) => names.has(n));
    earned = new Set(imported);
    save();
    render();
  } catch {
    countEl.textContent = 'Import failed: that file is not a valid progress export.';
  }
  e.target.value = '';
});
document.getElementById('reset').addEventListener('click', () => {
  if (!window.confirm('Clear all earned trophies?')) return;
  earned = new Set();
  save();
  render();
});

// Linkable state for screenshots and sharing: ?view=roadmap&spoilers=off&open=28
const params = new URLSearchParams(location.search);
if (params.get('view') && views[params.get('view')]) showView(params.get('view'));
if (params.get('spoilers') === 'off') {
  // A link parameter is a session override, not a preference change: it must not
  // persist to localStorage, or it would leak into later visits.
  spoilers = false;
  spoilerEl.checked = false;
}
const openParam = Number(params.get('open'));
if (Number.isInteger(openParam) && trophies.some((t) => t.id === openParam)) openId = openParam;

renderChips();
render();
