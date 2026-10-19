/* =========================================================
   SCENTOS — Journal & Analytics View
   ========================================================= */

(function (Scentos) {
  "use strict";

  var utils = Scentos.utils;
  var stateApi = Scentos.state;

  var WEATHER_MAP = {
    cerah: "\u2600\ufe0f Cerah", berawan: "\u26c5 Berawan", hujan: "\ud83c\udf27\ufe0f Hujan",
    panas: "\ud83d\udd25 Panas", dingin: "\u2744\ufe0f Dingin", lembap: "\ud83d\udca7 Lembap"
  };
  var ACTIVITY_MAP = {
    kerja: "\ud83d\udcbc Kerja", hangout: "\u2615 Hangout", olahraga: "\ud83c\udfc3 Olahraga",
    santai: "\ud83d\udecb\ufe0f Santai", acara: "\ud83c\udf89 Acara", tidur: "\ud83d\ude34 Tidur"
  };

  function formatDate(str) {
    if (!str) return "-";
    var today = new Date().toISOString().slice(0, 10);
    var yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    
    if (str === today) return "Hari ini";
    if (str === yesterday) return "Kemarin";
    
    var d = new Date(str);
    var months = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Ags","Sep","Okt","Nov","Des"];
    return d.getDate() + " " + months[d.getMonth()] + " " + d.getFullYear();
  }

  /* ---------- Render Timeline ---------- */
  function renderTimeline() {
    var perfumes = stateApi.get().perfumes;
    if (perfumes.length === 0) {
      return '<div class="empty"><h2 class="empty__title">Belum ada parfum</h2><p class="empty__desc">Tambahkan parfum ke inventory dulu sebelum mencatat pemakaian.</p><button type="button" class="btn btn--primary" data-action="switch-view" data-view="inventory">Ke Inventory</button></div>';
    }

    var html = '<div class="toolbar" style="padding:0 0 16px 0;"><div class="toolbar__row">';
    html += '<select class="select" data-action="filter-journal-perfume" aria-label="Filter parfum">';
    html += '<option value="all">Semua Parfum</option>';
    for (var i = 0; i < perfumes.length; i++) {
      var sel = stateApi.get().filterJournalPerfume === perfumes[i].id ? " selected" : "";
      html += '<option value="'+utils.escapeHtml(perfumes[i].id)+'"'+sel+'>'+utils.escapeHtml(perfumes[i].name)+'</option>';
    }
    html += '</select>';
    
    html += '<select class="select" data-action="filter-journal-range" aria-label="Filter waktu">';
    var ranges = [ {v:"all", l:"Semua Waktu"}, {v:"7d", l:"7 Hari"}, {v:"30d", l:"30 Hari"} ];
    for (var j = 0; j < ranges.length; j++) {
      var selR = stateApi.get().filterJournalRange === ranges[j].v ? " selected" : "";
      html += '<option value="'+ranges[j].v+'"'+selR+'>'+ranges[j].l+'</option>';
    }
    html += '</select></div></div>';

    var journals = stateApi.getFilteredJournals();
    if (journals.length === 0) {
      html += '<div class="empty"><h2 class="empty__title">Belum ada catatan</h2><p class="empty__desc">Catat pemakaian parfum lo hari ini.</p><button type="button" class="btn btn--primary" data-action="open-journal">+ Catat Pemakaian</button></div>';
      return html;
    }

    html += '<div class="list">';
    for (var k = 0; k < journals.length; k++) {
      var jn = journals[k];
      var wIcon = WEATHER_MAP[jn.weather] || jn.weather;
      var aIcon = ACTIVITY_MAP[jn.activity] || jn.activity;
      
      html += '<article class="card journal-card card--entering" style="--i:'+Math.min(k,5)+'">';
      html += '<div class="journal-card__header"><span class="journal-card__date">'+formatDate(jn.date)+', '+jn.time+'</span>';
      html += '<span class="journal-card__badge">'+jn.sprays+' sprays</span></div>';
      html += '<h3 class="card__name">'+utils.escapeHtml(jn.perfumeName)+'</h3>';
      html += '<p class="card__brand">'+utils.escapeHtml(jn.perfumeBrand)+'</p>';
      
      html += '<div class="journal-card__meta">';
      html += '<span>'+wIcon+'</span><span>'+aIcon+'</span>';
      html += '<span>\u23f1 '+jn.longevity+' jam</span>';
      html += '</div>';

      html += '<div class="journal-card__ratings">';
      html += '<div><span class="muted-label">Projection</span> <strong>'+jn.projection+'/5</strong></div>';
      html += '<div><span class="muted-label">Rating After</span> <strong>'+jn.ratingAfter+'/5 \u2605</strong></div>';
      html += '</div>';

      if (jn.notes) html += '<p class="journal-card__notes">"'+utils.escapeHtml(jn.notes)+'"</p>';

      html += '<div class="card__actions" style="justify-content:flex-end; margin-top:8px;">';
      html += '<button type="button" class="btn btn--ghost btn--sm" data-action="edit-journal" data-id="'+utils.escapeHtml(jn.id)+'">Edit</button>';
      html += '<button type="button" class="btn btn--danger-ghost btn--sm" data-action="delete-journal" data-id="'+utils.escapeHtml(jn.id)+'">Hapus</button>';
      html += '</div></article>';
    }
    html += '</div>';
    return html;
  }

  /* ---------- Render Statistics ---------- */
  function renderStats() {
    var journals = stateApi.get().journals;
    var perfumes = stateApi.get().perfumes;
    
    if (journals.length === 0) {
      return '<div class="empty"><h2 class="empty__title">Belum ada data</h2><p class="empty__desc">Statistik akan muncul setelah lo mencatat pemakaian.</p></div>';
    }

    // Hitung agregat
    var totalWears = journals.length;
    var totalSpend = 0;
    for (var i = 0; i < perfumes.length; i++) totalSpend += (Number(perfumes[i].priceBuy) || 0);
    
    var sumRating = 0;
    for (var r = 0; r < journals.length; r++) sumRating += (Number(journals[r].ratingAfter) || 0);
    var avgRating = (sumRating / totalWears).toFixed(1);

    var usedPerfumesCount = 0;
    for (var u = 0; u < perfumes.length; u++) {
      if (stateApi.getWearsCount(perfumes[u].id) > 0) usedPerfumesCount++;
    }

    var html = '<div class="stats-grid">';
    html += '<div class="stat-card"><span class="stat-card__label">Total Wears</span><span class="stat-card__value">'+totalWears+'</span></div>';
    html += '<div class="stat-card"><span class="stat-card__label">Total Spend</span><span class="stat-card__value">'+utils.formatRupiah(totalSpend)+'</span></div>';
    html += '<div class="stat-card"><span class="stat-card__label">Avg Rating</span><span class="stat-card__value">'+avgRating+' \u2605</span></div>';
    html += '<div class="stat-card"><span class="stat-card__label">Digunakan</span><span class="stat-card__value">'+usedPerfumesCount+' / '+perfumes.length+'</span></div>';
    html += '</div>';

    // Top 5
    var topList = perfumes.map(function(p) {
      return { p: p, wears: stateApi.getWearsCount(p.id) };
    }).filter(function(x) { return x.wears > 0; });
    
    topList.sort(function(a, b) { return b.wears - a.wears; });
    topList = topList.slice(0, 5);

    if (topList.length > 0) {
      var maxWears = topList[0].wears;
      html += '<div class="stats-section"><h3 class="list-header__title" style="margin-bottom:16px;">Top 5 Paling Sering</h3>';
      for (var t = 0; t < topList.length; t++) {
        var item = topList[t];
        var pct = (item.wears / maxWears) * 100;
        var cpw = stateApi.getCostPerWear(item.p);
        var cpwStr = cpw ? utils.formatRupiah(cpw) : "-";
        html += '<div class="bar-row">';
        html += '<div class="bar-row__head"><span class="bar-row__name">'+utils.escapeHtml(item.p.name)+'</span>';
        html += '<span class="bar-row__val">'+item.wears+'x ('+cpwStr+'/wear)</span></div>';
        html += '<div class="bar-track"><div class="bar-fill bar-fill--animate" style="--target-w: '+pct+'%;"></div></div>';
        html += '</div>';
      }
      html += '</div>';
    }

    // Estimasi Habis
    var empties = perfumes.filter(function(p) { return p.remainingMl > 0; });
    if (empties.length > 0) {
      html += '<div class="stats-section"><h3 class="list-header__title" style="margin-bottom:16px;">Sisa Isi & Estimasi Habis</h3>';
      for (var e = 0; e < empties.length; e++) {
        var pe = empties[e];
        var days = stateApi.getDaysUntilEmpty(pe);
        var dayStr = days === null ? "Belum ada data 30hr" : (days === 0 ? "Habis" : "~"+days+" hari lagi");
        var pctSize = ((Number(pe.remainingMl)/Number(pe.sizeMl))*100).toFixed(1);
        
        html += '<div class="bar-row">';
        html += '<div class="bar-row__head"><span class="bar-row__name">'+utils.escapeHtml(pe.name)+'</span>';
        html += '<span class="bar-row__val">'+utils.formatMl(pe.remainingMl)+' / '+utils.formatMl(pe.sizeMl)+' ml</span></div>';
        html += '<div class="bar-track"><div class="bar-fill bar-fill--success bar-fill--animate" style="--target-w: '+pctSize+'%;"></div></div>';
        html += '<div class="bar-row__sub">'+dayStr+'</div>';
        html += '</div>';
      }
      html += '</div>';
    }

    return html;
  }

  Scentos.ui = Scentos.ui || {};
  Scentos.ui.renderJournalTimeline = renderTimeline;
  Scentos.ui.renderJournalStats = renderStats;
  Scentos.ui.WEATHER_MAP = WEATHER_MAP;
  Scentos.ui.ACTIVITY_MAP = ACTIVITY_MAP;

})(window.Scentos = window.Scentos || {});
