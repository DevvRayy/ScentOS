(function (Scentos) {
  "use strict";

  var utils = Scentos.utils; var db = Scentos.db; var stateApi = Scentos.state; var CONST = Scentos.CONST;
  var currentModal = null; var searchTimer = null;

  var icons = { bottle: '<svg width="56" height="56" viewBox="0 0 56 56" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 20 V13 a3 3 0 0 1 3-3 h8 a3 3 0 0 1 3 3 v7"/><rect x="15" y="20" width="26" height="28" rx="4"/><line x1="22" y1="32" x2="34" y2="32"/></svg>' };

  function showToast(message, type) {
    var root = document.getElementById("toast-root"); if (!root) return;
    var toast = document.createElement("div"); toast.className = "toast" + (type ? " toast--" + type : ""); toast.setAttribute("role", "status"); toast.textContent = message;
    root.appendChild(toast);
    window.setTimeout(function () { toast.classList.add("toast--leaving"); window.setTimeout(function(){ if(toast.parentNode) toast.parentNode.removeChild(toast); }, 220); }, 2800);
  }

  function trapFocus(modal) {
    modal.addEventListener("keydown", function (e) {
      if (e.key !== "Tab") return;
      var focusables = modal.querySelectorAll('button:not(:disabled), [href], input:not([type="hidden"]):not(:disabled), select:not(:disabled), textarea:not(:disabled)');
      if (!focusables.length) return;
      var first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  function closeModal() {
    var root = document.getElementById("modal-root"); if (!root) return;
    var prev = currentModal ? currentModal.previousFocus : null; currentModal = null;
    root.innerHTML = ""; document.body.classList.remove("modal-open");
    if (prev && typeof prev.focus === "function" && document.contains(prev)) prev.focus();
  }

  function openModalRoot(html, opts) {
    var root = document.getElementById("modal-root"); if (!root) return;
    if (currentModal) closeModal();
    currentModal = { mode: (opts&&opts.mode)||"add", data: (opts&&opts.data)||null, previousFocus: document.activeElement };
    root.innerHTML = html; document.body.classList.add("modal-open");
    var modal = root.querySelector(".modal"); if (modal) trapFocus(modal);
    var auto = modal.querySelector("[data-autofocus]"); if (auto) window.requestAnimationFrame(function(){ if(auto) auto.focus(); });
  }

  function renderPerfumeModal(perfume) {
    var isEdit = !!perfume; var p = perfume || {}; var n = p.notes || {}; var rating = p.rating || 3; var stars = "";
    for (var s=1; s<=5; s++) stars += '<button type="button" class="rating-picker__star '+(s<=rating?'is-active':'')+'" data-value="'+s+'">\u2605</button>';
    return '<div class="modal" role="dialog" aria-modal="true"><div class="modal__backdrop" data-action="close-modal"></div><div class="modal__panel"><header class="modal__header"><h2 class="modal__title">'+(isEdit?'Edit':'Tambah')+' Parfum</h2><button type="button" class="btn btn--ghost btn--icon" data-action="close-modal">X</button></header><form id="perfume-form" class="form" novalidate><div class="form__grid"><div class="field"><label class="field__label">Nama *</label><input name="name" class="field__input" required value="'+utils.escapeHtml(p.name||'')+'" data-autofocus><span class="field__error" id="f-name-error"></span></div><div class="field"><label class="field__label">Brand *</label><input name="brand" class="field__input" required value="'+utils.escapeHtml(p.brand||'')+'"><span class="field__error" id="f-brand-error"></span></div></div><div class="field"><label class="field__label">Top Notes</label><input name="topNotes" class="field__input" value="'+utils.escapeHtml((n.top||[]).join(', '))+'"></div><div class="field"><label class="field__label">Mid Notes</label><input name="midNotes" class="field__input" value="'+utils.escapeHtml((n.mid||[]).join(', '))+'"></div><div class="field"><label class="field__label">Base Notes</label><input name="baseNotes" class="field__input" value="'+utils.escapeHtml((n.base||[]).join(', '))+'"></div><div class="form__grid"><div class="field"><label class="field__label">Ukuran (ml) *</label><input name="sizeMl" type="number" class="field__input" required value="'+utils.escapeHtml(p.sizeMl||'')+'"><span class="field__error" id="f-sizeMl-error"></span></div><div class="field"><label class="field__label">Sisa (ml)</label><input name="remainingMl" type="number" class="field__input" value="'+utils.escapeHtml(p.remainingMl!=null?p.remainingMl:'')+'"><span class="field__error" id="f-remainingMl-error"></span></div></div><div class="form__grid"><div class="field"><label class="field__label">Harga Beli</label><input name="priceBuy" type="number" class="field__input" value="'+utils.escapeHtml(p.priceBuy||'')+'"></div><div class="field"><label class="field__label">Tgl Beli</label><input name="purchaseDate" type="date" class="field__input" value="'+utils.escapeHtml(p.purchaseDate||new Date().toISOString().slice(0,10))+'"></div></div><div class="field"><span class="field__label">Rating</span><div class="rating-picker" id="rating-picker">'+stars+'</div><input type="hidden" name="rating" value="'+rating+'"></div><div class="form__actions"><button type="button" class="btn btn--ghost" data-action="close-modal">Batal</button><button type="submit" class="btn btn--primary">Simpan</button></div></form></div></div>';
  }

  function renderJournalModal(journal) {
    var isEdit = !!journal; var j = journal || {}; var perfumes = stateApi.get().perfumes;
    var pOpts = '<option value="">-- Pilih Parfum --</option>';
    for (var i=0; i<perfumes.length; i++) pOpts += '<option value="'+utils.escapeHtml(perfumes[i].id)+'"'+((j.perfumeId===perfumes[i].id)?' selected':'')+'>'+utils.escapeHtml(perfumes[i].name)+'</option>';
    var wOpts = "", aOpts = "";
    var wKeys = Object.keys(Scentos.ui.WEATHER_MAP); for (var w=0; w<wKeys.length; w++) wOpts += '<option value="'+wKeys[w]+'"'+(j.weather===wKeys[w]?' selected':'')+'>'+Scentos.ui.WEATHER_MAP[wKeys[w]]+'</option>';
    var aKeys = Object.keys(Scentos.ui.ACTIVITY_MAP); for (var a=0; a<aKeys.length; a++) aOpts += '<option value="'+aKeys[a]+'"'+(j.activity===aKeys[a]?' selected':'')+'>'+Scentos.ui.ACTIVITY_MAP[aKeys[a]]+'</option>';
    var proj = j.projection || 3; var rat = j.ratingAfter || 3; var projHtml = "", ratHtml = "";
    for (var s=1; s<=5; s++) { projHtml += '<button type="button" class="rating-picker__star '+(s<=proj?'is-active':'')+'" data-target="proj" data-value="'+s+'">\u2605</button>'; ratHtml += '<button type="button" class="rating-picker__star '+(s<=rat?'is-active':'')+'" data-target="rat" data-value="'+s+'">\u2605</button>'; }
    var nowTime = new Date().toTimeString().slice(0,5);
    return '<div class="modal" role="dialog" aria-modal="true"><div class="modal__backdrop" data-action="close-modal"></div><div class="modal__panel"><header class="modal__header"><h2 class="modal__title">'+(isEdit?'Edit Catatan':'Catat Pemakaian')+'</h2><button type="button" class="btn btn--ghost btn--icon" data-action="close-modal">X</button></header><form id="journal-form" class="form" novalidate><div class="field"><label class="field__label">Parfum *</label><select name="perfumeId" class="field__input select" required data-autofocus>'+pOpts+'</select><span class="field__error" id="f-perfumeId-error"></span></div><div class="form__grid"><div class="field"><label class="field__label">Tanggal *</label><input name="date" type="date" class="field__input" required value="'+(j.date||new Date().toISOString().slice(0,10))+'"></div><div class="field"><label class="field__label">Jam</label><input name="time" type="time" class="field__input" value="'+(j.time||nowTime)+'"></div></div><div class="form__grid"><div class="field"><label class="field__label">Cuaca</label><select name="weather" class="field__input select">'+wOpts+'</select></div><div class="field"><label class="field__label">Aktivitas</label><select name="activity" class="field__input select">'+aOpts+'</select></div></div><div class="form__grid"><div class="field"><label class="field__label">Semprotan *</label><input name="sprays" type="number" class="field__input" required min="1" max="20" value="'+(j.sprays||3)+'"><span class="field__error" id="f-sprays-error"></span></div><div class="field"><label class="field__label">Longevity (jam)</label><input name="longevity" type="number" class="field__input" min="0.5" max="24" step="0.5" value="'+(j.longevity||6)+'"></div></div><div class="form__grid"><div class="field"><span class="field__label">Projection</span><div class="rating-picker" id="picker-proj">'+projHtml+'</div><input type="hidden" name="projection" value="'+proj+'"></div><div class="field"><span class="field__label">Rating After</span><div class="rating-picker" id="picker-rat">'+ratHtml+'</div><input type="hidden" name="ratingAfter" value="'+rat+'"></div></div><div class="field"><label class="field__label">Catatan</label><textarea name="notes" class="field__input" rows="2" placeholder="Enak buat meeting...">'+utils.escapeHtml(j.notes||'')+'</textarea></div><div class="field" style="flex-direction:row;align-items:center;gap:8px;margin-top:8px;"><input type="checkbox" name="reduceInventory" id="reduceInventory" '+(isEdit?(j.reducedInventory?'checked':''):'checked')+' style="width:20px;height:20px;accent-color:var(--accent);"><label for="reduceInventory" style="font-size:14px;color:var(--muted);">Potong sisa isi parfum otomatis ('+(CONST.ML_PER_SPRAY*1000)+' ml/semprotan)</label></div><div class="form__actions"><button type="button" class="btn btn--ghost" data-action="close-modal">Batal</button><button type="submit" class="btn btn--primary">Simpan</button></div></form></div></div>';
  }

  function openDeletePerfumeConfirm(perfume) {
    var journals = stateApi.get().journals.filter(function(j){ return j.perfumeId === perfume.id; });
    var warningHtml = journals.length > 0 ? '<p style="color:var(--danger);margin-top:8px;font-size:13px;font-weight:600;">\u26a0\ufe0f Ini juga akan menghapus '+journals.length+' catatan pemakaian terkait.</p>' : '';
    var html = '<div class="modal" role="alertdialog" aria-modal="true"><div class="modal__backdrop" data-action="close-modal"></div><div class="modal__panel modal__panel--sm"><h2 class="modal__title">Hapus Parfum?</h2><p class="modal__desc"><strong>"'+utils.escapeHtml(perfume.name)+'"</strong> akan dihapus dari koleksi.'+warningHtml+'</p><div class="modal__actions"><button type="button" class="btn btn--ghost" data-action="close-modal" data-autofocus>Batal</button><button type="button" class="btn btn--danger" data-action="confirm-delete-perfume" data-id="'+utils.escapeHtml(perfume.id)+'">Ya, Hapus</button></div></div></div>';
    openModalRoot(html, { mode: "delete-perfume", data: perfume });
  }

  function openDeleteJournalConfirm(journal) {
    var html = '<div class="modal" role="alertdialog" aria-modal="true"><div class="modal__backdrop" data-action="close-modal"></div><div class="modal__panel modal__panel--sm"><h2 class="modal__title">Hapus Catatan?</h2><p class="modal__desc">Catatan pemakaian <strong>"'+utils.escapeHtml(journal.perfumeName)+'"</strong> pada '+journal.date+' akan dihapus.</p><div class="modal__actions"><button type="button" class="btn btn--ghost" data-action="close-modal" data-autofocus>Batal</button><button type="button" class="btn btn--danger" data-action="confirm-delete-journal" data-id="'+utils.escapeHtml(journal.id)+'">Ya, Hapus</button></div></div></div>';
    openModalRoot(html, { mode: "delete-journal", data: journal });
  }

  function attachRatingPicker(selector, inputName, form) {
    var picker = form.querySelector(selector); if (!picker) return;
    picker.addEventListener("click", function(e) {
      var star = e.target.closest(".rating-picker__star"); if (!star) return;
      var val = parseInt(star.getAttribute("data-value"), 10); form.querySelector('input[name="'+inputName+'"]').value = val;
      var stars = picker.querySelectorAll(".rating-picker__star");
      for (var i=0; i<stars.length; i++) stars[i].classList.toggle("is-active", parseInt(stars[i].getAttribute("data-value"), 10) <= val);
    });
  }

  function handlePerfumeSubmit(e) {
    e.preventDefault(); var form = e.target; var fd = new FormData(form);
    var sizeMl = utils.parseNumber(fd.get("sizeMl")); var remaining = utils.parseNumber(fd.get("remainingMl"));
    if (remaining == null && sizeMl != null) remaining = sizeMl;
    var data = { name: String(fd.get("name")||"").trim(), brand: String(fd.get("brand")||"").trim(), notes: { top: String(fd.get("topNotes")||"").split(",").map(function(s){return s.trim();}).filter(Boolean), mid: String(fd.get("midNotes")||"").split(",").map(function(s){return s.trim();}).filter(Boolean), base: String(fd.get("baseNotes")||"").split(",").map(function(s){return s.trim();}).filter(Boolean) }, sizeMl: sizeMl, remainingMl: remaining, priceBuy: utils.parseNumber(fd.get("priceBuy")) || 0, purchaseDate: String(fd.get("purchaseDate")||""), rating: parseInt(fd.get("rating"), 10) || 3 };
    if (!data.name) { document.getElementById("f-name-error").textContent = "Wajib diisi"; return; }
    if (!data.brand) { document.getElementById("f-brand-error").textContent = "Wajib diisi"; return; }
    if (!data.sizeMl || data.sizeMl <= 0) { document.getElementById("f-sizeMl-error").textContent = "Min 1 ml"; return; }
    var existing = currentModal.data; var isEdit = currentModal.mode === "edit"; var now = Date.now();
    var payload = { id: isEdit ? existing.id : utils.uuid(), ...data, photo: isEdit ? existing.photo : null, createdAt: isEdit ? existing.createdAt : now, updatedAt: now };
    var op = isEdit ? db.updatePerfume(payload) : db.addPerfume(payload);
    op.then(function() { if (isEdit) { stateApi.updatePerfumeInList(payload); showToast("Parfum diperbarui"); } else { stateApi.addPerfumeToList(payload); showToast("Parfum ditambahkan"); } closeModal(); }).catch(function(err) { console.error(err); showToast("Gagal simpan", "error"); });
  }

  function handleJournalSubmit(e) {
    e.preventDefault(); var form = e.target; var fd = new FormData(form);
    var perfumeId = String(fd.get("perfumeId")||""); var sprays = utils.parseNumber(fd.get("sprays")) || 1; var reduce = fd.get("reduceInventory") === "on";
    if (!perfumeId) { document.getElementById("f-perfumeId-error").textContent = "Pilih parfum"; return; }
    var targetPerfume = null; var perfumes = stateApi.get().perfumes; for (var i=0; i<perfumes.length; i++) if (perfumes[i].id === perfumeId) targetPerfume = perfumes[i];
    if (!targetPerfume) return;
    var isEdit = currentModal.mode === "edit-journal"; var existing = isEdit ? currentModal.data : null; var now = Date.now(); var mlUsed = sprays * CONST.ML_PER_SPRAY;
    var perfumeToUpdate = null;
    if (reduce) {
      var currentRem = Number(targetPerfume.remainingMl) || 0; var oldMl = (existing && existing.reducedInventory) ? (existing.sprays * CONST.ML_PER_SPRAY) : 0;
      perfumeToUpdate = Object.assign({}, targetPerfume, { remainingMl: Math.max(0, currentRem + oldMl - mlUsed), updatedAt: now });
    } else if (isEdit && existing && existing.reducedInventory) {
      perfumeToUpdate = Object.assign({}, targetPerfume, { remainingMl: Math.min(targetPerfume.sizeMl, (Number(targetPerfume.remainingMl)||0) + (existing.sprays * CONST.ML_PER_SPRAY)), updatedAt: now });
    }
    var payload = { id: isEdit ? existing.id : utils.uuid(), perfumeId: perfumeId, perfumeName: targetPerfume.name, perfumeBrand: targetPerfume.brand, date: String(fd.get("date")), time: String(fd.get("time")), weather: String(fd.get("weather")), activity: String(fd.get("activity")), sprays: sprays, longevity: utils.parseNumber(fd.get("longevity"))||6, projection: parseInt(fd.get("projection"), 10) || 3, ratingAfter: parseInt(fd.get("ratingAfter"), 10) || 3, notes: String(fd.get("notes")||"").trim(), mlUsed: mlUsed, reducedInventory: reduce, createdAt: isEdit ? existing.createdAt : now, updatedAt: now };
    db.saveJournal(payload, perfumeToUpdate).then(function() {
      if (perfumeToUpdate) stateApi.updatePerfumeInList(perfumeToUpdate);
      if (isEdit) { stateApi.updateJournalInList(payload); showToast("Catatan diperbarui"); } else { stateApi.addJournalToList(payload); showToast("Pemakaian dicatat"); }
      closeModal();
    }).catch(function(err) { console.error(err); showToast("Gagal simpan catatan", "error"); });
  }

  function onDocumentClick(e) {
    var btn = e.target.closest("[data-action]"); if (!btn) return;
    var action = btn.getAttribute("data-action"); var id = btn.getAttribute("data-id");
    if (action === "switch-view") { stateApi.setView(btn.getAttribute("data-view")); return; }
    if (action === "switch-journal-tab") { stateApi.setJournalTab(btn.getAttribute("data-tab")); return; }
    if (action === "open-add") { openModalRoot(renderPerfumeModal(null), { mode: "add" }); document.getElementById("perfume-form").addEventListener("submit", handlePerfumeSubmit); attachRatingPicker("#rating-picker", "rating", document.getElementById("perfume-form")); return; }
    if (action === "edit" && id) { var p = stateApi.get().perfumes.find(function(x){ return x.id === id; }); if (p) { openModalRoot(renderPerfumeModal(p), { mode: "edit", data: p }); document.getElementById("perfume-form").addEventListener("submit", handlePerfumeSubmit); attachRatingPicker("#rating-picker", "rating", document.getElementById("perfume-form")); } return; }
    if (action === "delete" && id) { var p2 = stateApi.get().perfumes.find(function(x){ return x.id === id; }); if (p2) openDeletePerfumeConfirm(p2); return; }
    if (action === "confirm-delete-perfume" && id) { btn.disabled = true; db.deletePerfume(id).then(function() { stateApi.removePerfumeFromList(id); closeModal(); showToast("Parfum & catatannya dihapus"); }).catch(function(){ btn.disabled = false; showToast("Gagal hapus", "error"); }); return; }
    if (action === "open-journal") { openModalRoot(renderJournalModal(null), { mode: "add-journal" }); document.getElementById("journal-form").addEventListener("submit", handleJournalSubmit); attachRatingPicker("#picker-proj", "projection", document.getElementById("journal-form")); attachRatingPicker("#picker-rat", "ratingAfter", document.getElementById("journal-form")); return; }
    if (action === "edit-journal" && id) { var j = stateApi.get().journals.find(function(x){ return x.id === id; }); if (j) { openModalRoot(renderJournalModal(j), { mode: "edit-journal", data: j }); document.getElementById("journal-form").addEventListener("submit", handleJournalSubmit); attachRatingPicker("#picker-proj", "projection", document.getElementById("journal-form")); attachRatingPicker("#picker-rat", "ratingAfter", document.getElementById("journal-form")); } return; }
    if (action === "delete-journal" && id) { var j2 = stateApi.get().journals.find(function(x){ return x.id === id; }); if (j2) openDeleteJournalConfirm(j2); return; }
    if (action === "confirm-delete-journal" && id) { btn.disabled = true; db.deleteJournal(id).then(function() { stateApi.removeJournalFromList(id); closeModal(); showToast("Catatan dihapus"); }).catch(function(){ btn.disabled = false; showToast("Gagal hapus", "error"); }); return; }
    if (action === "reset-filters") { document.getElementById("search-input").value = ""; stateApi.setSearch(""); stateApi.setFilterBrand("all"); return; }
    if (action === "reload") { window.location.reload(); return; }
    if (action === "close-modal") { closeModal(); return; }
  }

  function onDocumentChange(e) {
    var action = e.target.getAttribute("data-action");
    if (action === "filter-journal-perfume") { stateApi.setJournalFilters(e.target.value, undefined); }
    if (action === "filter-journal-range") { stateApi.setJournalFilters(undefined, e.target.value); }
    if (e.target.id === "filter-brand") { stateApi.setFilterBrand(e.target.value); }
  }

  function onDocumentKeyDown(e) { if (e.key === "Escape" && currentModal) { e.preventDefault(); closeModal(); } }

  function init() {
    document.addEventListener("click", onDocumentClick);
    document.addEventListener("change", onDocumentChange);
    document.addEventListener("keydown", onDocumentKeyDown);
    var searchInput = document.getElementById("search-input");
    if (searchInput) { searchInput.addEventListener("input", function(e) { clearTimeout(searchTimer); var val = e.target.value; searchTimer = setTimeout(function(){ stateApi.setSearch(val); }, 150); }); }
  }

  Scentos.ui = { init: init, showToast: showToast, icons: icons, renderJournalTimeline: function(){ return ""; }, renderJournalStats: function(){ return ""; } };
})(window.Scentos = window.Scentos || {});
