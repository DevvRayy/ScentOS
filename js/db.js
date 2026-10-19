(function (Scentos) {
  "use strict";

  var DB_NAME = "scentos-db";
  var DB_VERSION = 2; 
  var STORE_PERFUMES = "perfumes";
  var STORE_JOURNAL = "journal";
  var ML_PER_SPRAY = 0.1;

  var dbPromise = null;

  function uuid() {
    if (typeof window.crypto !== "undefined" && typeof window.crypto.randomUUID === "function") {
      try { return window.crypto.randomUUID(); } catch (e) {}
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0; var v = c === "x" ? r : (r & 0x3) | 0x8; return v.toString(16);
    });
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function formatRupiah(n) {
    var num = Number(n); if (!isFinite(num) || num <= 0) return "Rp 0";
    return "Rp " + Math.round(num).toLocaleString("id-ID");
  }

  function formatMl(n) {
    var num = Number(n); if (!isFinite(num)) return "0";
    return Number.isInteger(num) ? String(num) : num.toFixed(1).replace(/\.0$/, "");
  }

  function parseNumber(v) {
    if (v === "" || v == null) return null;
    var n = Number(v); return isFinite(n) ? n : null;
  }

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      if (typeof window.indexedDB === "undefined") { reject(new Error("IndexedDB tidak didukung")); return; }
      var req;
      try { req = window.indexedDB.open(DB_NAME, DB_VERSION); } catch (err) { reject(err); return; }

      req.onupgradeneeded = function (e) {
        var db = e.target.result; var oldVersion = e.oldVersion;
        if (oldVersion < 1) {
          if (!db.objectStoreNames.contains(STORE_PERFUMES)) {
            var pStore = db.createObjectStore(STORE_PERFUMES, { keyPath: "id" });
            pStore.createIndex("by-brand", "brand"); pStore.createIndex("by-rating", "rating"); pStore.createIndex("by-createdAt", "createdAt");
          }
        }
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains(STORE_JOURNAL)) {
            var jStore = db.createObjectStore(STORE_JOURNAL, { keyPath: "id" });
            jStore.createIndex("by-perfumeId", "perfumeId"); jStore.createIndex("by-date", "date"); jStore.createIndex("by-createdAt", "createdAt");
          }
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error("Gagal buka DB")); };
      req.onblocked = function () { reject(new Error("DB diblokir tab lain. Tutup tab SCENTOS lain.")); };
    });
    return dbPromise;
  }

  function getAllPerfumes() {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE_PERFUMES, "readonly");
        var req = tx.objectStore(STORE_PERFUMES).getAll();
        req.onsuccess = function () { var l = req.result || []; l.sort(function(a,b){return (b.createdAt||0)-(a.createdAt||0);}); resolve(l); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function addPerfume(data) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE_PERFUMES, "readwrite"); var req = tx.objectStore(STORE_PERFUMES).add(data);
        req.onsuccess = function () { resolve(req.result); }; req.onerror = function () { reject(req.error); };
      });
    });
  }

  function updatePerfume(data) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE_PERFUMES, "readwrite"); var req = tx.objectStore(STORE_PERFUMES).put(data);
        req.onsuccess = function () { resolve(req.result); }; req.onerror = function () { reject(req.error); };
      });
    });
  }

  function deletePerfume(id) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction([STORE_PERFUMES, STORE_JOURNAL], "readwrite");
        tx.objectStore(STORE_PERFUMES).delete(id);
        var index = tx.objectStore(STORE_JOURNAL).index("by-perfumeId");
        var req = index.openKeyCursor(IDBKeyRange.only(id));
        req.onsuccess = function (e) {
          var cursor = e.target.result;
          if (cursor) { tx.objectStore(STORE_JOURNAL).delete(cursor.primaryKey); cursor.continue(); }
        };
        tx.oncomplete = function () { resolve(true); }; tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  function getAllJournals() {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE_JOURNAL, "readonly"); var req = tx.objectStore(STORE_JOURNAL).getAll();
        req.onsuccess = function () {
          var l = req.result || [];
          l.sort(function(a,b){ var d1=a.date+"T"+(a.time||"00:00"); var d2=b.date+"T"+(b.time||"00:00"); return d2.localeCompare(d1); });
          resolve(l);
        };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function saveJournal(journalData, perfumeToUpdate) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var stores = [STORE_JOURNAL]; if (perfumeToUpdate) stores.push(STORE_PERFUMES);
        var tx = db.transaction(stores, "readwrite");
        tx.objectStore(STORE_JOURNAL).put(journalData);
        if (perfumeToUpdate) { tx.objectStore(STORE_PERFUMES).put(perfumeToUpdate); }
        tx.oncomplete = function () { resolve(true); }; tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  function deleteJournal(id) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE_JOURNAL, "readwrite"); var req = tx.objectStore(STORE_JOURNAL).delete(id);
        req.onsuccess = function () { resolve(true); }; req.onerror = function () { reject(req.error); };
      });
    });
  }

  Scentos.db = { openDB: openDB, getAllPerfumes: getAllPerfumes, addPerfume: addPerfume, updatePerfume: updatePerfume, deletePerfume: deletePerfume, getAllJournals: getAllJournals, saveJournal: saveJournal, deleteJournal: deleteJournal };
  Scentos.utils = { uuid: uuid, escapeHtml: escapeHtml, formatRupiah: formatRupiah, formatMl: formatMl, parseNumber: parseNumber };
  Scentos.CONST = { ML_PER_SPRAY: ML_PER_SPRAY };
})(window.Scentos = window.Scentos || {});
