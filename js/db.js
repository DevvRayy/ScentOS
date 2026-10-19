/* =========================================================
   SCENTOS — IndexedDB Wrapper
   Pola: IIFE, attach ke window.Scentos.
   ========================================================= */

(function (Scentos) {
  "use strict";

  var DB_NAME = "scentos-db";
  var DB_VERSION = 1;
  var STORE = "perfumes";

  var dbPromise = null;

  /* ---------- Utils ---------- */
  function uuid() {
    if (
      typeof window.crypto !== "undefined" &&
      typeof window.crypto.randomUUID === "function"
    ) {
      try {
        return window.crypto.randomUUID();
      } catch (e) {
        /* fallthrough */
      }
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatRupiah(n) {
    var num = Number(n);
    if (!isFinite(num) || num <= 0) return "Rp 0";
    return "Rp " + Math.round(num).toLocaleString("id-ID");
  }

  function formatMl(n) {
    var num = Number(n);
    if (!isFinite(num)) return "0";
    return Number.isInteger(num) ? String(num) : num.toFixed(1).replace(/\.0$/, "");
  }

  function parseNumber(v) {
    if (v === "" || v == null) return null;
    var n = Number(v);
    return isFinite(n) ? n : null;
  }

  /* ---------- Open DB ---------- */
  function openDB() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise(function (resolve, reject) {
      if (typeof window.indexedDB === "undefined") {
        reject(new Error("IndexedDB tidak didukung browser ini"));
        return;
      }

      var req;
      try {
        req = window.indexedDB.open(DB_NAME, DB_VERSION);
      } catch (err) {
        reject(err);
        return;
      }

      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(STORE)) {
          var store = db.createObjectStore(STORE, { keyPath: "id" });
          store.createIndex("by-brand", "brand", { unique: false });
          store.createIndex("by-rating", "rating", { unique: false });
          store.createIndex("by-createdAt", "createdAt", { unique: false });
        }
      };

      req.onsuccess = function () {
        resolve(req.result);
      };

      req.onerror = function () {
        reject(req.error || new Error("Gagal membuka database"));
      };

      req.onblocked = function () {
        reject(new Error("Database diblokir oleh tab lain"));
      };
    });

    return dbPromise;
  }

  /* ---------- CRUD ---------- */
  function getAllPerfumes() {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, "readonly");
        var store = tx.objectStore(STORE);
        var req = store.getAll();
        req.onsuccess = function () {
          var list = req.result || [];
          // Urut terbaru di atas
          list.sort(function (a, b) {
            return (b.createdAt || 0) - (a.createdAt || 0);
          });
          resolve(list);
        };
        req.onerror = function () {
          reject(req.error);
        };
      });
    });
  }

  function getPerfume(id) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, "readonly");
        var store = tx.objectStore(STORE);
        var req = store.get(id);
        req.onsuccess = function () {
          resolve(req.result || null);
        };
        req.onerror = function () {
          reject(req.error);
        };
      });
    });
  }

  function addPerfume(data) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, "readwrite");
        var store = tx.objectStore(STORE);
        var req = store.add(data);
        req.onsuccess = function () {
          resolve(req.result);
        };
        req.onerror = function () {
          reject(req.error);
        };
      });
    });
  }

  function updatePerfume(data) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, "readwrite");
        var store = tx.objectStore(STORE);
        var req = store.put(data);
        req.onsuccess = function () {
          resolve(req.result);
        };
        req.onerror = function () {
          reject(req.error);
        };
      });
    });
  }

  function deletePerfume(id) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, "readwrite");
        var store = tx.objectStore(STORE);
        var req = store.delete(id);
        req.onsuccess = function () {
          resolve(true);
        };
        req.onerror = function () {
          reject(req.error);
        };
      });
    });
  }

  /* ---------- Export ---------- */
  Scentos.db = {
    openDB: openDB,
    getAllPerfumes: getAllPerfumes,
    getPerfume: getPerfume,
    addPerfume: addPerfume,
    updatePerfume: updatePerfume,
    deletePerfume: deletePerfume
  };

  Scentos.utils = {
    uuid: uuid,
    escapeHtml: escapeHtml,
    formatRupiah: formatRupiah,
    formatMl: formatMl,
    parseNumber: parseNumber
  };
})(window.Scentos = window.Scentos || {});
