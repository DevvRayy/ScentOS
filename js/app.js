/* =========================================================
   SCENTOS — Entry point
   ========================================================= */

(function (Scentos) {
  "use strict";

  function init() {
    try {
      Scentos.ui.init();
    } catch (err) {
      console.error("[Scentos] UI init error:", err);
    }

    Scentos.state.setStatus("loading");

    Scentos.db.getAllPerfumes().then(function (list) {
      Scentos.state.setPerfumes(list);
    }).catch(function (err) {
      console.error("[Scentos] Failed to load data:", err);
      Scentos.state.setStatus(
        "error",
        (err && err.message) || "Tidak bisa mengakses penyimpanan lokal."
      );
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window.Scentos = window.Scentos || {});
