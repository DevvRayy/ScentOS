/* =========================================================
   SCENTOS — State & Render
   ========================================================= */

(function (Scentos) {
  "use strict";

  var utils = Scentos.utils;

  var state = {
    perfumes: [],
    status: "loading", // 'loading' | 'ready' | 'error'
    error: null,
    search: "",
    filterBrand: "all"
  };

  var lastBrandsKey = null;

  /* ---------- State mutators ---------- */

  function setStatus(status, error) {
    state.status = status;
    state.error = error || null;
    render(false);
  }

  function setPerfumes(list) {
    state.perfumes = Array.isArray(list) ? list : [];
    state.status = "ready";
    state.error = null;
    render(true);
  }

  function addPerfumeToList(perfume) {
    state.perfumes = [perfume].concat(state.perfumes);
    render(true);
  }

  function updatePerfumeInList(perfume) {
    for (var i = 0; i < state.perfumes.length; i++) {
      if (state.perfumes[i].id === perfume.id) {
        state.perfumes[i] = perfume;
        break;
      }
    }
    render(true);
  }

  function removePerfumeFromList(id) {
    state.perfumes = state.perfumes.filter(function (p) {
      return p.id !== id;
    });
    render(true);
  }

  function setSearch(q) {
    state.search = String(q || "").toLowerCase().trim();
    render(false);
  }

  function setFilterBrand(brand) {
    state.filterBrand = brand || "all";
    render(false);
  }

  function getFiltered() {
    var term = state.search;
    var brand = state.filterBrand;
    return state.perfumes.filter(function (p) {
      if (brand !== "all" && p.brand !== brand) return false;
      if (!term) return true;
      return (
        (p.name && p.name.toLowerCase().indexOf(term) !== -1) ||
        (p.brand && p.brand.toLowerCase().indexOf(term) !== -1)
      );
    });
  }

  /* ---------- Render helpers ---------- */

  function renderSkeletons() {
    var html = '<div class="list" aria-busy="true" aria-label="Memuat data">';
    for (var i = 0; i < 3; i++) {
      html += '<div class="skeleton skeleton--card"></div>';
    }
    html += "</div>";
    return html;
  }

  function renderEmpty() {
    return (
      '<div class="empty">' +
      '<div class="empty__icon" aria-hidden="true">' +
      '<svg width="56" height="56" viewBox="0 0 56 56" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M21 20 V13 a3 3 0 0 1 3-3 h8 a3 3 0 0 1 3 3 v7"/>' +
      '<rect x="15" y="20" width="26" height="28" rx="4"/>' +
      '<line x1="22" y1="32" x2="34" y2="32"/>' +
      "</svg>" +
      "</div>" +
      '<h2 class="empty__title">Koleksi parfum masih kosong</h2>' +
      '<p class="empty__desc">Mulai catat koleksi parfum lo — biar gak lupa sisa isi, harga beli, dan notes-nya.</p>' +
      '<button type="button" class="btn btn--primary" data-action="open-add">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">' +
      '<line x1="12" y1="5" x2="12" y2="19"/>' +
      '<line x1="5" y1="12" x2="19" y2="12"/>' +
      "</svg>" +
      "<span>Tambah Parfum Pertama</span>" +
      "</button>" +
      "</div>"
    );
  }

  function renderError() {
    var msg = state.error || "Terjadi kesalahan saat membuka data.";
    return (
      '<div class="empty" role="alert">' +
      '<div class="empty__icon" style="color: var(--danger);" aria-hidden="true">' +
      '<svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<circle cx="12" cy="12" r="10"/>' +
      '<line x1="12" y1="8" x2="12" y2="12"/>' +
      '<line x1="12" y1="16" x2="12.01" y2="16"/>' +
      "</svg>" +
      "</div>" +
      '<h2 class="empty__title">Gagal memuat data</h2>' +
      '<p class="empty__desc">' +
      utils.escapeHtml(msg) +
      "</p>" +
      '<button type="button" class="btn btn--ghost" data-action="reload">' +
      "<span>Coba Lagi</span>" +
      "</button>" +
      "</div>"
    );
  }

  function renderNoResult() {
    return (
      '<div class="empty">' +
      '<h2 class="empty__title">Tidak ada parfum cocok</h2>' +
      '<p class="empty__desc">Coba ubah kata kunci atau reset filter brand.</p>' +
      '<button type="button" class="btn btn--ghost" data-action="reset-filters">' +
      "<span>Reset Filter</span>" +
      "</button>" +
      "</div>"
    );
  }

  function renderCard(p, index) {
    var i = Math.min(index, 5);
    var sizeMl = Number(p.sizeMl) || 0;
    var remaining = Number(p.remainingMl);
    if (!isFinite(remaining)) remaining = 0;
    var pct = sizeMl > 0 ? Math.max(0, Math.min(100, (remaining / sizeMl) * 100)) : 0;
    var rating = Math.max(0, Math.min(5, Number(p.rating) || 0));
    var starsFull = new Array(rating + 1).join("\u2605");
    var starsEmpty = new Array(5 - rating + 1).join("\u2606");

    var metaParts = [];
    metaParts.push(
      "<span class=\"card__meta-item\">" +
        utils.escapeHtml(utils.formatMl(remaining)) +
        " / " +
        utils.escapeHtml(utils.formatMl(sizeMl)) +
        " ml</span>"
    );
    if (Number(p.priceBuy) > 0) {
      metaParts.push(
        '<span class="card__meta-item">' +
          utils.escapeHtml(utils.formatRupiah(p.priceBuy)) +
          "</span>"
      );
    }
    var metaHtml = metaParts.join(
      '<span class="card__meta-divider" aria-hidden="true">\u00b7</span>'
    );

    var idEsc = utils.escapeHtml(p.id);
    var nameEsc = utils.escapeHtml(p.name || "(tanpa nama)");
    var brandEsc = utils.escapeHtml(p.brand || "");

    return (
      '<article class="card card--entering" style="--i:' + i + '" data-id="' + idEsc + '">' +
      '<div class="card__head">' +
      '<div class="card__title-group">' +
      '<h3 class="card__name">' + nameEsc + "</h3>" +
      '<p class="card__brand">' + brandEsc + "</p>" +
      "</div>" +
      '<div class="card__rating" aria-label="Rating ' + rating + ' dari 5">' +
      starsFull + starsEmpty +
      "</div>" +
      "</div>" +
      '<div class="card__meta">' + metaHtml + "</div>" +
      '<div class="card__progress" role="progressbar" aria-valuenow="' + Math.round(pct) + '" aria-valuemin="0" aria-valuemax="100" aria-label="Sisa isi parfum">' +
      '<div class="card__progress-fill" style="width:' + pct.toFixed(2) + '%"></div>' +
      "</div>" +
      '<div class="card__actions">' +
      '<button type="button" class="btn btn--ghost btn--sm" data-action="edit" data-id="' + idEsc + '" aria-label="Edit ' + nameEsc + '">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>' +
      '<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>' +
      "</svg>" +
      "<span>Edit</span>" +
      "</button>" +
      '<button type="button" class="btn btn--danger-ghost btn--sm" data-action="delete" data-id="' + idEsc + '" aria-label="Hapus ' + nameEsc + '">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<polyline points="3 6 5 6 21 6"/>' +
      '<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>' +
      "</svg>" +
      "<span>Hapus</span>" +
      "</button>" +
      "</div>" +
      "</article>"
    );
  }

  function renderList(filtered, animate) {
    var html =
      '<div class="list-header">' +
      '<span class="list-header__title">Koleksi</span>' +
      "</div>" +
      '<div class="list">';
    for (var k = 0; k < filtered.length; k++) {
      html += renderCard(filtered[k], k);
    }
    html += "</div>";

    if (!animate) {
      // setelah innerHTML diganti, kita hapus class card--entering
      // biar tidak replay animasi saat user cuma ngetik search.
      // (lihat render() di bawah — kita pakai DOM post-process)
    }
    return html;
  }

  /* ---------- Filter dropdown sync ---------- */
  function updateBrandFilter() {
    var select = document.getElementById("filter-brand");
    if (!select) return;

    var brandsMap = {};
    for (var i = 0; i < state.perfumes.length; i++) {
      var b = state.perfumes[i].brand;
      if (b) brandsMap[b] = true;
    }
    var brands = Object.keys(brandsMap).sort();
    var key = brands.join("\u0000");

    if (key !== lastBrandsKey) {
      lastBrandsKey = key;
      var opts = '<option value="all">Semua Brand</option>';
      for (var j = 0; j < brands.length; j++) {
        var be = utils.escapeHtml(brands[j]);
        opts += '<option value="' + be + '">' + be + "</option>";
      }
      select.innerHTML = opts;
    }

    if (state.filterBrand === "all" || brands.indexOf(state.filterBrand) !== -1) {
      select.value = state.filterBrand;
    } else {
      select.value = "all";
      state.filterBrand = "all";
    }
  }

  function updateCount() {
    var badge = document.getElementById("count-badge");
    if (!badge) return;
    var total = state.perfumes.length;
    var filtered = getFiltered().length;
    if (total === 0) {
      badge.textContent = "0 parfum";
    } else if (filtered === total) {
      badge.textContent = total + " parfum";
    } else {
      badge.textContent = filtered + " / " + total;
    }
  }

  /* ---------- Render dispatcher ---------- */
  function render(animate) {
    var main = document.getElementById("main");
    if (!main) return;

    var html;
    if (state.status === "loading") {
      html = renderSkeletons();
    } else if (state.status === "error") {
      html = renderError();
    } else if (state.perfumes.length === 0) {
      html = renderEmpty();
    } else {
      var filtered = getFiltered();
      html = filtered.length === 0 ? renderNoResult() : renderList(filtered, animate);
    }

    main.innerHTML = html;

    // Jika animate=false, matikan animasi entrance (biar tidak replay saat search)
    if (animate === false) {
      var entering = main.querySelectorAll(".card--entering");
      for (var i = 0; i < entering.length; i++) {
        entering[i].classList.remove("card--entering");
      }
    }

    updateCount();
    updateBrandFilter();
  }

  /* ---------- Export ---------- */
  Scentos.state = {
    get: function () {
      return state;
    },
    setStatus: setStatus,
    setPerfumes: setPerfumes,
    addPerfumeToList: addPerfumeToList,
    updatePerfumeInList: updatePerfumeInList,
    removePerfumeFromList: removePerfumeFromList,
    setSearch: setSearch,
    setFilterBrand: setFilterBrand,
    getFiltered: getFiltered,
    render: render
  };
})(window.Scentos = window.Scentos || {});
