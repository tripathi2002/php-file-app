window.DensityModule = {
  KEY: "fileAppDensity",

  init() {
    this.apply(localStorage.getItem(this.KEY) || "comfortable");
    document.getElementById("densityBtn")?.addEventListener("click", () => this.toggle());
  },

  toggle() {
    const next = this.current() === "compact" ? "comfortable" : "compact";
    this.apply(next);
    ToastModule.show(next === "compact" ? "Compact view" : "Comfortable view", "info");
  },

  current() {
    return localStorage.getItem(this.KEY) || "comfortable";
  },

  apply(mode) {
    localStorage.setItem(this.KEY, mode);
    document.documentElement.setAttribute("data-density", mode);
    const btn = document.getElementById("densityBtn");
    if (btn) btn.textContent = mode === "compact" ? "Comfort" : "Compact";
  },
};
