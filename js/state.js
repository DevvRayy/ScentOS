(function (Scentos) {
  "use strict";

  var utils = Scentos.utils;
  var CONST = Scentos.CONST;

  var state = {
    perfumes: [], journals: [], status: "loading", error: null,
    view: "inventory", journalTab: "timeline",
    search: "", filterBrand: "all", filterJournalPerfume: "all", filterJournalRange: "all"
  };
  var lastBrandsKey = null;

  function setStatus(status, error) { state.status = status; state.error = error || null; render(); }
  function setData(perfumes, journals) {
    if (perfumes) state.perfumes = perfumes;
    if (journals) state.journals = journals;
    state.status = "ready"; state.error = null; render();
  }

  function addPerfumeToList(p) { state.perfumes.unshift(p); render(); }
  function updatePerfumeInList(p) { for (var i=0; i<state.perfumes.length; i++) { if (state.perfumes[i].id === p.id) { state.perfumes[i] = p; break; } } render(); }
  function removePerfumeFromList(id) {
    state.perfumes = state.perfumes.filter(function(p){ return p.id !== id; });
    state.journals = state.journals.filter(function(j){ return j.perfumeId !== id; });
    render();
  }

  function addJournalToList(j) { state.journals.push(j); sortJournals(); render(); }
  function updateJournalInList(j) { for (var i=0; i<state.journals.length; i++) { if (state.journals[i].id === j.id) { state.journals[i] = j; break; } } sortJournals(); render(); }
  function removeJournalFromList(id) { state.journals = state.journals.filter(function(j){ return j.id !== id; }); render(); }
  function sortJournals() { state.journals.sort(function(a,b){ var d1=a.date+"T"+(a.time||"00:00"); var d2=b.date+"T"+(b.time||"00:00"); return d2.localeCompare(d1); }); }

  function setView(v) { state.view = v; render(); }
  function setJournalTab(t) { state.journalTab = t; render(); }
  function setSearch(q) { state.search = String(q||"").toLowerCase().trim(); render(); }
  function setFilterBrand(b) { state.filterBrand = b || "all"; render(); }
  function setJournalFilters(perfumeId, range) { if (perfumeId !== undefined) state.filterJournalPerfume = perfumeId; if (range !== undefined) state.filterJournalRange = range; render(); }

  function getWearsCount(perfumeId) { var count = 0; for (var i=0; i<state.journals.length; i++) { if (state.journals[i].perfumeId === perfumeId) count++; } return count; }
  function getCostPerWear(perfume) { var w = getWearsCount(perfume.id); return w === 0 ? null : perfume.priceBuy / w; }
  function getDaysUntilEmpty(perfume) {
    if (!perfume.remainingMl || perfume.remainingMl <= 0) return 0;
    var d = new Date(); d.setDate(d.getDate() - 30); var cutoff = d.toISOString().slice(0,10);
    var sprays = 0;
    for (var i=0; i<state.journals.length; i++) { if (state.journals[i].perfumeId === perfume.id && state.journals[i].date >= cutoff) sprays += Number(state.journals[i].sprays)||0; }
    if (sprays === 0) return null;
    var mlPerDay = (sprays * CONST.ML_PER_SPRAY) / 30;
    return mlPerDay <= 0 ? null : Math.round(perfume.remainingMl / mlPerDay);
  }

  function getFilteredPerfumes() {
    var term = state.search; var brand = state.filterBrand;
    return state.perfumes.filter(function(p) { if (brand !== "all" && p.brand !== brand) return false; if (!term) return true; return (p.name && p.name.toLowerCase().indexOf(term) !== -1) || (p.brand && p.brand.toLowerCase().indexOf(term) !== -1); });
  }

  function getFilteredJournals() {
    var pid = state.filterJournalPerfume; var range = state.filterJournalRange; var cutoff = null;
    if (range === "7d") { var d = new Date(); d.setDate(d.getDate()-7); cutoff = d.toISOString().slice(0,10); }
    else if (range === "30d") { var d2 = new Date(); d2.setDate(d2.getDate()-30); cutoff = d2.toISOString().slice(0,10); }
    return state.journals.filter(function(j) { if (pid !== "all" && j.perfumeId !== pid) return false; if (cutoff && j.date < cutoff) return false; return true; });
  }

  function render() {
    var main = document.getElementById("main"); if (!main) return;
    if (state.status === "loading") { main.innerHTML = '<div class="list"><div class="skeleton skeleton--card"></div><div class="skeleton skeleton--card"></div></div>'; return; }
    if (state.status === "error") { main.innerHTML = '<div class="empty" role="alert"><h2 class="empty__title">Gagal memuat data</h2><p class="empty__desc">' + utils.escapeHtml(state.error) + '</p><button type="button" class="btn btn--ghost" data-action="reload">Coba Lagi</button></div>'; return; }

    var toolbar = document.getElementById("inventory-toolbar");
    if (toolbar) toolbar.style.display = (state.view === "inventory") ? "flex" : "none";

    var navItems = document.querySelectorAll(".nav__item");
    for (var k = 0; k < navItems.length; k++) {
      if (navItems[k].getAttribute("data-view") === state.view) { navItems[k].classList.add("nav__item--active"); navItems[k].setAttribute("aria-current", "page"); }
      else { navItems[k].classList.remove("nav__item--active"); navItems[k].removeAttribute("aria-current"); }
    }

    if (state.view === "inventory") { renderInventory(main); }
    else if (state.view === "journal") { renderJournal(main); }
  }

  function renderInventory(main) {
    var filtered = getFilteredPerfumes(); var html = "";
    var badge = document.getElementById("count-badge");
    if (badge) badge.textContent = state.perfumes.length === 0 ? "0 parfum" : (filtered.length + " / " + state.perfumes.length + " parfum");

    if (state.perfumes.length === 0) {
      html = '<div class="empty"><div class="empty__icon">' + Scentos.ui.icons.bottle + '</div><h2 class="empty__title">Koleksi parfum masih kosong</h2><p class="empty__desc">Mulai catat koleksi parfum lo.</p><button type="button" class="btn btn--primary" data-action="open-add">+ Tambah Parfum</button></div>';
    } else if (filtered.length === 0) {
      html = '<div class="empty"><h2 class="empty__title">Tidak ada parfum cocok</h2><p class="empty__desc">Coba ubah kata kunci atau reset filter.</p><button type="button" class="btn btn--ghost" data-action="reset-filters">Reset Filter</button></div>';
    } else {
      html = '<div class="list-header"><span class="list-header__title">Koleksi</span></div><div class="list">';
      for (var i = 0; i < filtered.length; i++) { html += renderCardPerfume(filtered[i], i); }
      html += '</div>';
    }
    main.innerHTML = html;
  }

  function renderJournal(main) {
    var html = '<div class="journal-tabs">';
    html += '<button type="button" class="journal-tabs__btn ' + (state.journalTab === 'timeline' ? 'is-active' : '') + '" data-action="switch-journal-tab" data-tab="timeline">Timeline</button>';
    html += '<button type="button" class="journal-tabs__btn ' + (state.journalTab === 'stats' ? 'is-active' : '') + '" data-action="switch-journal-tab" data-tab="stats">Statistics</button>';
    html += '</div>';
    if (state.journalTab === 'timeline') { html += Scentos.ui.renderJournalTimeline(); } else { html += Scentos.ui.renderJournalStats(); }
    main.innerHTML = html;
  }

  function renderCardPerfume(p, index) {
    var sizeMl = Number(p.sizeMl) || 0; var remaining = Number(p.remainingMl) || 0;
    var pct = sizeMl > 0 ? Math.max(0, Math.min(100, (remaining / sizeMl) * 100)) : 0;
    var rating = Math.max(0, Math.min(5, Number(p.rating) || 0));
    var stars = new Array(rating + 1).join("\u2605") + new Array(5 - rating + 1).join("\u2606");
    var wears = getWearsCount(p.id); var cpw = getCostPerWear(p); var cpwHtml = cpw !== null ? utils.formatRupiah(cpw) : "\u2014";
    var metaParts = [];
    metaParts.push("<span class=\"card__meta-item\">" + utils.formatMl(remaining) + " / " + utils.formatMl(sizeMl) + " ml</span>");
    if (wears > 0) metaParts.push("<span class=\"card__meta-item\">\ud83d\udd25 " + wears + "x pakai</span>");
    metaParts.push("<span class=\"card__meta-item\">" + cpwHtml + " / wear</span>");
    var idEsc = utils.escapeHtml(p.id); var nameEsc = utils.escapeHtml(p.name || ""); var brandEsc = utils.escapeHtml(p.brand || "");
    return '<article class="card card--entering" style="--i:'+Math.min(index,5)+'" data-id="'+idEsc+'"><div class="card__head"><div class="card__title-group"><h3 class="card__name">'+nameEsc+'</h3><p class="card__brand">'+brandEsc+'</p></div><div class="card__rating">'+stars+'</div></div><div class="card__meta">' + metaParts.join('<span class="card__meta-divider">\u00b7</span>') + '</div><div class="card__progress"><div class="card__progress-fill" style="width:'+pct.toFixed(2)+'%"></div></div><div class="card__actions"><button type="button" class="btn btn--ghost btn--sm" data-action="edit" data-id="'+idEsc+'">Edit</button><button type="button" class="btn btn--danger-ghost btn--sm" data-action="delete" data-id="'+idEsc+'">Hapus</button></div></article>';
  }

  Scentos.state = { get: function(){return state;}, setStatus: setStatus, setData: setData, addPerfumeToList: addPerfumeToList, updatePerfumeInList: updatePerfumeInList, removePerfumeFromList: removePerfumeFromList, addJournalToList: addJournalToList, updateJournalInList: updateJournalInList, removeJournalFromList: removeJournalFromList, setView: setView, setJournalTab: setJournalTab, setSearch: setSearch, setFilterBrand: setFilterBrand, setJournalFilters: setJournalFilters, getWearsCount: getWearsCount, getCostPerWear: getCostPerWear, getDaysUntilEmpty: getDaysUntilEmpty, getFilteredPerfumes: getFilteredPerfumes, getFilteredJournals: getFilteredJournals, render: render };
})(window.Scentos = window.Scentos || {});
