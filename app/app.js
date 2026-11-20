// Leonida Trophy Guide — the tracker.
// Plain script, no framework and no network: it only reads data/trophies.json (a local
// file) and keeps the checklist in localStorage. Progress can be exported to a JSON file
// and imported back. Spoilers stay hidden by default; a ?spoilers=off address only
// changes this visit, never what is saved.
(function () {
  'use strict';

  var STORE_KEY = 'leonida-trophy-guide-v1';
  var SPOILER_KEY = 'leonida-trophy-guide-spoilers-v1';

  var trophies = [];
  var earned = {};
  var kindFilter = 'all';
  var gradeFilter = 'all';
  var searchText = '';
  var spoilersHidden = true;
  var openDetail = null;

  var listEl = document.getElementById('trophyList');
  var statusEl = document.getElementById('listStatus');
  var searchEl = document.getElementById('search');
  var gradeEl = document.getElementById('gradeFilter');
  var spoilerEl = document.getElementById('spoilerToggle');
  var fillEl = document.getElementById('progressFill');
  var bigEl = document.getElementById('progressBig');
  var subEl = document.getElementById('progressSub');
  var nextEl = document.getElementById('progressNext');

  function loadSaved() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') earned = parsed;
      }
    } catch (e) { earned = {}; }
    try {
      var savedSpoilers = localStorage.getItem(SPOILER_KEY);
      if (savedSpoilers === 'off') spoilersHidden = false;
      if (savedSpoilers === 'on') spoilersHidden = true;
    } catch (e) { /* keep default */ }
    // A ?spoilers=off address only changes this visit.
    var params = new URLSearchParams(window.location.search);
    if (params.get('spoilers') === 'off') spoilersHidden = false;
    if (params.get('spoilers') === 'on') spoilersHidden = true;
    spoilerEl.checked = spoilersHidden;
    // ?open=<id> opens one trophy's guide, ?view=roadmap|sources shows another tab.
    // Both are for screenshots and deep links; they change nothing saved.
    var openId = Number(params.get('open'));
    if (openId) openDetail = openId;
    var view = params.get('view');
    if (view === 'roadmap' || view === 'sources') {
      document.querySelectorAll('#tabs .tab').forEach(function (tab) {
        tab.classList.toggle('active', tab.dataset.tab === view);
      });
      ['tracker', 'roadmap', 'sources'].forEach(function (name) {
        document.getElementById('panel-' + name).classList.toggle('hidden', name !== view);
      });
    }
  }

  function saveProgress() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(earned)); } catch (e) { /* full or blocked */ }
  }

  function saveSpoilerSetting() {
    try { localStorage.setItem(SPOILER_KEY, spoilersHidden ? 'on' : 'off'); } catch (e) { /* ignore */ }
  }

  function gradeLabel(grade) {
    return grade.charAt(0).toUpperCase() + grade.slice(1);
  }

  function kindLabel(kind) {
    var labels = {
      story: 'Story', side: 'Side quest', collectible: 'Collectible',
      activity: 'Activity', robbery: 'Robbery', misc: 'Misc'
    };
    return labels[kind] || kind;
  }

  function isHidden(trophy) {
    return trophy.hidden && spoilersHidden && !earned[trophy.id];
  }

  function matchesFilters(trophy) {
    if (kindFilter === 'missable' && !trophy.missable) return false;
    if (kindFilter !== 'all' && kindFilter !== 'missable' && trophy.kind !== kindFilter) return false;
    if (gradeFilter !== 'all' && trophy.grade !== gradeFilter) return false;
    if (searchText) {
      var hay = (trophy.name + ' ' + trophy.description + ' ' + trophy.guide).toLowerCase();
      if (hay.indexOf(searchText) === -1) return false;
    }
    return true;
  }

  function trophyCard(trophy) {
    var hidden = isHidden(trophy);
    var card = document.createElement('article');
    card.className = 'trophy-card' + (earned[trophy.id] ? ' earned' : '') + (trophy.missable ? ' missable-card' : '');
    card.dataset.id = trophy.id;

    var check = document.createElement('button');
    check.className = 'check';
    check.type = 'button';
    check.setAttribute('aria-label', (earned[trophy.id] ? 'Mark not earned: ' : 'Mark earned: ') + trophy.name);
    check.textContent = earned[trophy.id] ? '✓' : '';
    check.addEventListener('click', function (event) {
      event.stopPropagation();
      if (earned[trophy.id]) delete earned[trophy.id];
      else earned[trophy.id] = true;
      saveProgress();
      render();
    });
    card.appendChild(check);

    var body = document.createElement('div');
    body.className = 'trophy-body';

    var name = document.createElement('h3');
    name.className = 'trophy-name';
    name.textContent = hidden ? '🔒 Hidden trophy' : trophy.name;
    body.appendChild(name);

    var desc = document.createElement('p');
    desc.className = 'trophy-desc';
    desc.textContent = hidden
      ? 'A story trophy. Earn it, or turn off "Hide spoilers", to reveal its name and guide.'
      : trophy.description;
    body.appendChild(desc);

    var badges = document.createElement('div');
    badges.className = 'badges';
    if (hidden) {
      badges.appendChild(badge('HIDDEN', 'badge-hidden'));
    } else {
      badges.appendChild(badge(gradeLabel(trophy.grade).toUpperCase(), 'badge-' + trophy.grade));
      badges.appendChild(badge(kindLabel(trophy.kind), 'badge-kind'));
      if (trophy.chapter) badges.appendChild(badge('Ch. ' + trophy.chapter, 'badge-kind'));
      if (trophy.count) badges.appendChild(badge(trophy.count, 'badge-kind'));
    }
    if (trophy.missable) badges.appendChild(badge('⚠ Possibly missable', 'badge-missable'));
    body.appendChild(badges);

    if (!hidden) {
      var detail = document.createElement('div');
      detail.className = 'trophy-detail' + (openDetail === trophy.id ? ' open' : '');
      var target = document.createElement('p');
      target.className = 'detail-target';
      target.textContent = trophy.count ? ('Target: ' + trophy.count) : '';
      if (trophy.count) detail.appendChild(target);
      var guide = document.createElement('p');
      guide.className = 'detail-guide';
      guide.textContent = trophy.guide;
      detail.appendChild(guide);
      body.appendChild(detail);
    }

    card.appendChild(body);
    card.addEventListener('click', function () {
      if (isHidden(trophy)) return;
      openDetail = openDetail === trophy.id ? null : trophy.id;
      render();
    });
    return card;
  }

  function badge(text, cls) {
    var span = document.createElement('span');
    span.className = 'badge ' + cls;
    span.textContent = text;
    return span;
  }

  function render() {
    var shown = trophies.filter(matchesFilters);
    listEl.innerHTML = '';
    if (shown.length === 0) {
      var empty = document.createElement('p');
      empty.className = 'empty-list';
      empty.textContent = 'No trophies match these filters.';
      listEl.appendChild(empty);
    } else {
      shown.forEach(function (trophy) { listEl.appendChild(trophyCard(trophy)); });
    }

    var total = trophies.length;
    var done = trophies.filter(function (t) { return earned[t.id]; }).length;
    var byGrade = {};
    trophies.forEach(function (t) {
      if (!byGrade[t.grade]) byGrade[t.grade] = [0, 0];
      byGrade[t.grade][1] += 1;
      if (earned[t.id]) byGrade[t.grade][0] += 1;
    });
    fillEl.style.width = total ? Math.round((done / total) * 100) + '%' : '0%';
    bigEl.textContent = done + ' / ' + total + ' earned';
    subEl.textContent = (byGrade.platinum || [0, 0]).join('/') + ' platinum · ' +
      (byGrade.gold || [0, 0]).join('/') + ' gold · ' +
      (byGrade.silver || [0, 0]).join('/') + ' silver · ' +
      (byGrade.bronze || [0, 0]).join('/') + ' bronze';
    var next = trophies.find(function (t) { return !earned[t.id] && t.kind === 'story'; }) ||
      trophies.find(function (t) { return !earned[t.id]; });
    nextEl.textContent = done === total
      ? 'Platinum earned — Vice Got a Price! is yours.'
      : (next ? ('Next up: ' + next.name + ' — ' + next.description) : 'Next up: keep working the list.');
    statusEl.textContent = 'Showing ' + shown.length + ' of ' + total + ' trophies · spoilers ' +
      (spoilersHidden ? 'hidden' : 'shown');
  }

  function exportProgress() {
    var payload = { app: 'leonida-trophy-guide', version: 1, earned: Object.keys(earned).map(Number) };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'leonida-trophy-progress.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function importProgress(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var parsed = JSON.parse(String(reader.result));
        var ids = parsed.earned || parsed;
        if (!Array.isArray(ids)) throw new Error('no list');
        var next = {};
        ids.forEach(function (id) {
          var n = Number(id);
          if (trophies.some(function (t) { return t.id === n; })) next[n] = true;
        });
        earned = next;
        saveProgress();
        render();
      } catch (e) {
        window.alert('That file is not a Leonida Trophy Guide progress export.');
      }
    };
    reader.readAsText(file);
  }

  function wireUp() {
    searchEl.addEventListener('input', function () {
      searchText = searchEl.value.trim().toLowerCase();
      render();
    });
    gradeEl.addEventListener('change', function () {
      gradeFilter = gradeEl.value;
      render();
    });
    spoilerEl.addEventListener('change', function () {
      spoilersHidden = spoilerEl.checked;
      saveSpoilerSetting();
      render();
    });
    document.getElementById('kindChips').addEventListener('click', function (event) {
      var button = event.target.closest('[data-kind]');
      if (!button) return;
      kindFilter = button.dataset.kind;
      document.querySelectorAll('#kindChips .chip').forEach(function (chip) {
        chip.classList.toggle('active', chip === button);
      });
      render();
    });
    document.getElementById('exportBtn').addEventListener('click', exportProgress);
    document.getElementById('importBtn').addEventListener('click', function () {
      document.getElementById('importFile').click();
    });
    document.getElementById('importFile').addEventListener('change', function (event) {
      if (event.target.files && event.target.files[0]) importProgress(event.target.files[0]);
      event.target.value = '';
    });
    document.getElementById('resetBtn').addEventListener('click', function () {
      if (window.confirm('Clear all earned trophies?')) {
        earned = {};
        saveProgress();
        render();
      }
    });
    document.getElementById('tabs').addEventListener('click', function (event) {
      var button = event.target.closest('[data-tab]');
      if (!button) return;
      document.querySelectorAll('#tabs .tab').forEach(function (tab) {
        tab.classList.toggle('active', tab === button);
      });
      ['tracker', 'roadmap', 'sources'].forEach(function (name) {
        document.getElementById('panel-' + name).classList.toggle('hidden', name !== button.dataset.tab);
      });
    });
  }

  loadSaved();
  wireUp();
  fetch('data/trophies.json')
    .then(function (response) { return response.json(); })
    .then(function (data) {
      trophies = data.trophies || data;
      render();
    })
    .catch(function () {
      listEl.innerHTML = '<p class="empty-list">Could not load data/trophies.json.</p>';
    });
})();
