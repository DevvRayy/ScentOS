/* =========================================================
   SCENTOS — UI Layer (interaksi, modal, toast, form)
   ========================================================= */

(function (Scentos) {
  "use strict";

  var utils = Scentos.utils;
  var db = Scentos.db;
  var stateApi = Scentos.state;

  var currentModal = null; // { mode, perfume, previousFocus }
  var searchTimer = null;

  /* ---------- Toast ---------- */
  function showToast(message, type) {
    var root = document.getElementById("toast-root");
    if (!root) return;
    var toast = document.createElement("div");
    toast.className = "toast" + (type ? " toast--" + type : "");
    toast.setAttribute("role", "status");
    toast.textContent = message;
    root.appendChild(toast);
    window.setTimeout(function () {
      toast.classList.add("toast--leaving");
      window.setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 220);
    }, 2800);
  }

  /* ---------- Modal core ---------- */
  function trapFocus(modal) {
    modal.addEventListener("keydown", function (e) {
      if (e.key !== "Tab") return;
      var focusables = modal.querySelectorAll(
        'button:not(:disabled), [href], input:not([type="hidden"]):not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables.length) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  }

  function closeModal() {
    var root = document.getElementById("modal-root");
    if (!root) return;
    if (!currentModal) {
      root.innerHTML = "";
      document.body.classList.remove("modal-open");
      return;
    }
    var previousFocus = currentModal.previousFocus;
    currentModal = null;
    root.innerHTML = "";
    document.body.classList.remove("modal-open");
    if (previousFocus && typeof previousFocus.focus === "function" && document.contains(previousFocus)) {
      previousFocus.focus();
    }
  }

  function openModalRoot(html, opts) {
    var root = document.getElementById("modal-root");
    if (!root) return;
    if (currentModal) closeModal();

    currentModal = {
      mode: (opts && opts.mode) || "add",
      perfume: (opts && opts.perfume) || null,
      previousFocus: document.activeElement
    };

    root.innerHTML = html;
    document.body.classList.add("modal-open");

    var modal = root.querySelector(".modal");
    if (!modal) return;
    trapFocus(modal);

    // Pasang handler klik (delegasi backdrop + tombol close)
    modal.addEventListener("click", function (e) {
      var actionEl = e.target.closest("[data-action]");
      if (!actionEl) return;
      var action = actionEl.getAttribute("data-action");
      if (action === "close-modal") {
        e.preventDefault();
        closeModal();
      } else if (action === "confirm-delete") {
        e.preventDefault();
        confirmDelete();
      }
    });

    // Autofocus
    var auto = modal.querySelector("[data-autofocus]");
    if (auto) {
      window.requestAnimationFrame(function () {
        if (auto && typeof auto.focus === "function") auto.focus();
      });
    }
  }

  /* ---------- Form modal ---------- */
  function renderFormModal(perfume) {
    var isEdit = !!perfume;
    var title = isEdit ? "Edit Parfum" : "Tambah Parfum";
    var p = perfume || {};
    var notes = p.notes || {};
    var top = (notes.top || []).join(", ");
    var mid = (notes.mid || []).join(", ");
    var base = (notes.base || []).join(", ");
    var sizeMl = p.sizeMl != null ? p.sizeMl : "";
    var remaining = p.remainingMl != null ? p.remainingMl : "";
    var price = p.priceBuy != null ? p.priceBuy : "";
    var date = p.purchaseDate || "";
    var rating = p.rating != null ? p.rating : 3;

    var stars = "";
    for (var s = 1; s <= 5; s++) {
      stars +=
        '<button type="button" class="rating-picker__star' +
        (s <= rating ? " is-active" : "") +
        '" role="radio" aria-checked="' +
        (s === rating ? "true" : "false") +
        '" aria-label="' + s + ' bintang" data-value="' + s + '">\u2605</button>';
    }

    return (
      '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">' +
      '<div class="modal__backdrop" data-action="close-modal"></div>' +
      '<div class="modal__panel">' +
      '<header class="modal__header">' +
      '<h2 id="modal-title" class="modal__title">' + title + "</h2>" +
      '<button type="button" class="btn btn--ghost btn--icon" data-action="close-modal" aria-label="Tutup">' +
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">' +
      '<line x1="18" y1="6" x2="6" y2="18"/>' +
      '<line x1="6" y1="6" x2="18" y2="18"/>' +
      "</svg>" +
      "</button>" +
      "</header>" +
      '<form id="perfume-form" class="form" novalidate>' +
      '<div class="form__grid">' +
      '<div class="field">' +
      '<label for="f-name" class="field__label">Nama Parfum <span class="field__required">*</span></label>' +
      '<input id="f-name" name="name" type="text" class="field__input" placeholder="Baccarat Rouge 540" autocomplete="off" required aria-describedby="f-name-error" data-autofocus>' +
      '<span class="field__error" id="f-name-error" role="alert"></span>' +
      "</div>" +
      '<div class="field">' +
      '<label for="f-brand" class="field__label">Brand <span class="field__required">*</span></label>' +
      '<input id="f-brand" name="brand" type="text" class="field__input" placeholder="Maison Francis Kurkdjian" autocomplete="off" required aria-describedby="f-brand-error">' +
      '<span class="field__error" id="f-brand-error" role="alert"></span>' +
      "</div>" +
      "</div>" +
      '<div class="field">' +
      '<label for="f-top" class="field__label">Top Notes <span class="field__hint">pisahkan dengan koma</span></label>' +
      '<input id="f-top" name="topNotes" type="text" class="field__input" placeholder="saffron, jasmine" autocomplete="off">' +
      "</div>" +
      '<div class="field">' +
      '<label for="f-mid" class="field__label">Middle Notes</label>' +
      '<input id="f-mid" name="midNotes" type="text" class="field__input" placeholder="amberwood, ambergris" autocomplete="off">' +
      "</div>" +
      '<div class="field">' +
      '<label for="f-base" class="field__label">Base Notes</label>' +
      '<input id="f-base" name="baseNotes" type="text" class="field__input" placeholder="fir resin, cedar" autocomplete="off">' +
      "</div>" +
      '<div class="form__grid">' +
      '<div class="field">' +
      '<label for="f-size" class="field__label">Ukuran (ml) <span class="field__required">*</span></label>' +
      '<input id="f-size" name="sizeMl" type="number" class="field__input" min="1" step="1" inputmode="numeric" required value="' + utils.escapeHtml(sizeMl) + '" aria-describedby="f-size-error">' +
      '<span class="field__error" id="f-size-error" role="alert"></span>' +
      "</div>" +
      '<div class="field">' +
      '<label for="f-remaining" class="field__label">Sisa Isi (ml)</label>' +
      '<input id="f-remaining" name="remainingMl" type="number" class="field__input" min="0" step="0.5" inputmode="decimal" value="' + utils.escapeHtml(remaining) + '" aria-describedby="f-remaining-error" placeholder="Default = ukuran">' +
      '<span class="field__error" id="f-remaining-error" role="alert"></span>' +
      "</div>" +
      "</div>" +
      '<div class="form__grid">' +
      '<div class="field">' +
      '<label for="f-price" class="field__label">Harga Beli (Rp)</label>' +
      '<input id="f-price" name="priceBuy" type="number" class="field__input" min="0" step="1000" inputmode="numeric" value="' + utils.escapeHtml(price) + '" aria-describedby="f-price-error">' +
      '<span class="field__error" id="f-price-error" role="alert"></span>' +
      "</div>" +
      '<div class="field">' +
      '<label for="f-date" class="field__label">Tanggal Beli</label>' +
      '<input id="f-date" name="purchaseDate" type="date" class="field__input" value="' + utils.escapeHtml(date) + '">' +
      "</div>" +
      "</div>" +
      '<div class="field">' +
      '<span class="field__label" id="rating-label">Rating Pribadi</span>' +
      '<div class="rating-picker" role="radiogroup" aria-labelledby="rating-label" id="rating-picker">' +
      stars +
      "</div>" +
      '<input type="hidden" name="rating" value="' + rating + '">' +
      "</div>" +
      '<div class="form__actions">' +
      '<button type="button" class="btn btn--ghost" data-action="close-modal">Batal</button>' +
      '<button type="submit" class="btn btn--primary">Simpan</button>' +
      "</div>" +
      "</form>" +
      "</div>" +
      "</div>"
    );
  }

  function openAddModal() {
    openModalRoot(renderFormModal(null), { mode: "add", perfume: null });
    var form = document.getElementById("perfume-form");
    if (!form) return;
    var dateInput = form.querySelector('[name="purchaseDate"]');
    if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);
    form.addEventListener("submit", onFormSubmit);
    attachRatingPicker(form);
  }

  function openEditModal(perfume) {
    openModalRoot(renderFormModal(perfume), { mode: "edit", perfume: perfume });
    var form = document.getElementById("perfume-form");
    if (!form) return;
    form.addEventListener("submit", onFormSubmit);
    attachRatingPicker(form);
  }

  function openDeleteConfirm(perfume) {
    var html =
      '<div class="modal" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-desc">' +
      '<div class="modal__backdrop" data-action="close-modal"></div>' +
      '<div class="modal__panel modal__panel--sm">' +
      '<h2 id="confirm-title" class="modal__title">Hapus parfum?</h2>' +
      '<p id="confirm-desc" class="modal__desc">' +
      '<strong>"' + utils.escapeHtml(perfume.name) + '"</strong> akan dihapus dari koleksi. Tindakan ini tidak bisa dibatalkan.' +
      "</p>" +
      '<div class="modal__actions">' +
      '<button type="button" class="btn btn--ghost" data-action="close-modal" data-autofocus>Batal</button>' +
      '<button type="button" class="btn btn--danger" data-action="confirm-delete">Ya, Hapus</button>' +
      "</div>" +
      "</div>" +
      "</div>";
    openModalRoot(html, { mode: "delete", perfume: perfume });
  }

  /* ---------- Rating picker ---------- */
  function attachRatingPicker(form) {
    var picker = form.querySelector("#rating-picker");
    if (!picker) return;
    picker.addEventListener("click", function (e) {
      var star = e.target.closest(".rating-picker__star");
      if (!star) return;
      var value = parseInt(star.getAttribute("data-value"), 10);
      var hidden = form.querySelector('input[type="hidden"][name="rating"]');
      if (hidden) hidden.value = value;
      var all = picker.querySelectorAll(".rating-picker__star");
      for (var i = 0; i < all.length; i++) {
        var v = parseInt(all[i].getAttribute("data-value"), 10);
        all[i].classList.toggle("is-active", v <= value);
        all[i].setAttribute("aria-checked", v === value ? "true" : "false");
      }
    });
  }

  /* ---------- Form data & validation ---------- */
  function parseNotes(str) {
    return String(str || "")
      .split(",")
      .map(function (s) { return s.trim(); })
      .filter(Boolean);
  }

  function readFormData(form) {
    var fd = new FormData(form);
    var sizeMl = utils.parseNumber(fd.get("sizeMl"));
    var remainingMl = utils.parseNumber(fd.get("remainingMl"));
    if (remainingMl == null && sizeMl != null && sizeMl > 0) {
      remainingMl = sizeMl;
    }
    var priceBuy = utils.parseNumber(fd.get("priceBuy"));
    if (priceBuy == null) priceBuy = 0;
    var rating = parseInt(fd.get("rating"), 10);
    if (!isFinite(rating)) rating = 3;

    return {
      name: String(fd.get("name") || "").trim(),
      brand: String(fd.get("brand") || "").trim(),
      topNotes: parseNotes(fd.get("topNotes")),
      midNotes: parseNotes(fd.get("midNotes")),
      baseNotes: parseNotes(fd.get("baseNotes")),
      sizeMl: sizeMl,
      remainingMl: remainingMl,
      priceBuy: priceBuy,
      purchaseDate: String(fd.get("purchaseDate") || ""),
      rating: rating
    };
  }

  function validateFormData(data) {
    var errors = {};
    if (!data.name || data.name.length < 2) {
      errors.name = "Nama parfum minimal 2 karakter.";
    }
    if (!data.brand) {
      errors.brand = "Brand wajib diisi.";
    }
    if (data.sizeMl == null || data.sizeMl <= 0) {
      errors.sizeMl = "Ukuran botol harus lebih dari 0 ml.";
    }
    if (
      data.remainingMl == null ||
      data.remainingMl < 0 ||
      (data.sizeMl > 0 && data.remainingMl > data.sizeMl)
    ) {
      errors.remainingMl = "Sisa isi harus antara 0 dan ukuran botol.";
    }
    if (data.priceBuy < 0) {
      errors.priceBuy = "Harga tidak boleh negatif.";
    }
    if (!data.purchaseDate) {
      data.purchaseDate = new Date().toISOString().slice(0, 10);
    }
    if (data.rating < 1 || data.rating > 5) {
      errors.rating = "Rating harus antara 1 dan 5.";
    }
    return Object.keys(errors).length ? errors : null;
  }

  function clearFormErrors(form) {
    var errs = form.querySelectorAll(".field__error");
    for (var i = 0; i < errs.length; i++) errs[i].textContent = "";
    var invalid = form.querySelectorAll('[aria-invalid="true"]');
    for (var j = 0; j < invalid.length; j++) {
      invalid[j].removeAttribute("aria-invalid");
    }
  }

  function showFormErrors(form, errors) {
    Object.keys(errors).forEach(function (field) {
      var errEl = form.querySelector("#f-" + field + "-error");
      var inputEl = form.querySelector('[name="' + field + '"]');
      if (errEl) errEl.textContent = errors[field];
      if (inputEl) inputEl.setAttribute("aria-invalid", "true");
    });
    var firstInvalid = form.querySelector('[aria-invalid="true"]');
    if (firstInvalid && typeof firstInvalid.focus === "function") firstInvalid.focus();
  }

  function onFormSubmit(e) {
    e.preventDefault();
    var form = e.target;
    clearFormErrors(form);

    var data = readFormData(form);
    var errors = validateFormData(data);

    if (errors) {
      showFormErrors(form, errors);
      return;
    }

    var submitBtn = form.querySelector('button[type="submit"]');
    var originalLabel = submitBtn ? submitBtn.textContent : "Simpan";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Menyimpan\u2026";
    }

    var existing = currentModal ? currentModal.perfume : null;
    var now = Date.now();

    var perfume = {
      id: existing ? existing.id : utils.uuid(),
      name: data.name,
      brand: data.brand,
      notes: {
        top: data.topNotes,
        mid: data.midNotes,
        base: data.baseNotes
      },
      sizeMl: data.sizeMl,
      remainingMl: data.remainingMl,
      priceBuy: data.priceBuy,
      purchaseDate: data.purchaseDate,
      rating: data.rating,
      photo: existing ? existing.photo : null,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now
    };

    var op = existing ? db.updatePerfume(perfume) : db.addPerfume(perfume);

    op.then(function () {
      if (existing) {
        stateApi.updatePerfumeInList(perfume);
        showToast("Parfum berhasil diperbarui", "success");
      } else {
        stateApi.addPerfumeToList(perfume);
        showToast("Parfum berhasil ditambahkan", "success");
      }
      closeModal();
    }).catch(function (err) {
      console.error("[Scentos] Save failed:", err);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalLabel;
      }
      showToast("Gagal menyimpan: " + (err && err.message ? err.message : "Error"), "error");
    });
  }

  /* ---------- Delete ---------- */
  function confirmDelete() {
    if (!currentModal || !currentModal.perfume) return;
    var target = currentModal.perfume;

    var btns = document.querySelectorAll(".modal [data-action]");
    for (var i = 0; i < btns.length; i++) btns[i].disabled = true;

    db.deletePerfume(target.id).then(function () {
      stateApi.removePerfumeFromList(target.id);
      closeModal();
      showToast('"' + target.name + '" dihapus dari koleksi', "success");
    }).catch(function (err) {
      console.error("[Scentos] Delete failed:", err);
      for (var j = 0; j < btns.length; j++) btns[j].disabled = false;
      showToast("Gagal menghapus: " + (err && err.message ? err.message : "Error"), "error");
    });
  }

  /* ---------- Global event delegation ---------- */
  function onDocumentClick(e) {
    var el = e.target.closest("[data-action]");
    if (!el) return;

    // Kalau di dalam modal, biarkan modal handler yang proses
    if (el.closest(".modal")) return;

    var action = el.getAttribute("data-action");
    var id = el.getAttribute("data-id");

    if (action === "open-add") {
      openAddModal();
    } else if (action === "edit" && id) {
      var found = null;
      var list = stateApi.get().perfumes;
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === id) { found = list[i]; break; }
      }
      if (found) openEditModal(found);
    } else if (action === "delete" && id) {
      var target = null;
      var list2 = stateApi.get().perfumes;
      for (var k = 0; k < list2.length; k++) {
        if (list2[k].id === id) { target = list2[k]; break; }
      }
      if (target) openDeleteConfirm(target);
    } else if (action === "reset-filters") {
      var searchInput = document.getElementById("search-input");
      if (searchInput) searchInput.value = "";
      var brandSelect = document.getElementById("filter-brand");
      if (brandSelect) brandSelect.value = "all";
      stateApi.setSearch("");
      stateApi.setFilterBrand("all");
    } else if (action === "reload") {
      stateApi.setStatus("loading");
      db.getAllPerfumes().then(function (list) {
        stateApi.setPerfumes(list);
      }).catch(function (err) {
        stateApi.setStatus("error", err && err.message);
      });
    }
  }

  function onDocumentKeyDown(e) {
    if (e.key !== "Escape") return;
    if (currentModal) {
      e.preventDefault();
      closeModal();
    }
  }

  /* ---------- Search input ---------- */
  function attachSearch() {
    var input = document.getElementById("search-input");
    if (!input) return;
    input.addEventListener("input", function (e) {
      var value = e.target.value;
      window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(function () {
        stateApi.setSearch(value);
      }, 150);
    });
  }

  /* ---------- Brand filter ---------- */
  function attachBrandFilter() {
    var select = document.getElementById("filter-brand");
    if (!select) return;
    select.addEventListener("change", function (e) {
      stateApi.setFilterBrand(e.target.value);
    });
  }

  /* ---------- Init ---------- */
  function init() {
    document.addEventListener("click", onDocumentClick);
    document.addEventListener("keydown", onDocumentKeyDown);
    attachSearch();
    attachBrandFilter();

    // Animasi card: hapus class card--entering setelah selesai
    // supaya hover transform desktop tidak konflik dengan animation-fill-mode
    var main = document.getElementById("main");
    if (main) {
      main.addEventListener("animationend", function (e) {
        if (e.target && e.target.classList && e.target.classList.contains("card--entering")) {
          e.target.classList.remove("card--entering");
        }
      });
    }
  }

  /* ---------- Export ---------- */
  Scentos.ui = {
    init: init,
    openAddModal: openAddModal,
    openEditModal: openEditModal,
    openDeleteConfirm: openDeleteConfirm,
    closeModal: closeModal,
    showToast: showToast
  };
})(window.Scentos = window.Scentos || {});