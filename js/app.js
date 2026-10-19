(function (Scentos) {
  "use strict";

  function init() {
    Scentos.ui.init();
    Scentos.state.setStatus("loading");
    Promise.all([ Scentos.db.getAllPerfumes(), Scentos.db.getAllJournals() ]).then(function(results) {
      Scentos.state.setData(results[0], results[1]);
    }).catch(function(err) {
      console.error("[Scentos] Load error:", err);
      Scentos.state.setStatus("error", (err && err.message) || "Gagal buka database.");
    });
  }

  if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", init); } else { init(); }
})(window.Scentos = window.Scentos || {});
