window.ThemeModule = {
  KEY: "fileAppTheme",

  init() {
    const saved = localStorage.getItem(this.KEY) || "system";
    this.apply(saved);
    const btn = document.getElementById("themeBtn");
    if (btn) btn.addEventListener("click", () => this.cycle());
    if (window.matchMedia) {
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
        if ((localStorage.getItem(this.KEY) || "system") === "system") {
          this.apply("system");
        }
      });
    }
  },

  current() {
    return localStorage.getItem(this.KEY) || "system";
  },

  resolved() {
    const mode = this.current();
    if (mode === "light" || mode === "dark") return mode;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  },

  apply(mode) {
    localStorage.setItem(this.KEY, mode);
    const resolved = mode === "system"
      ? (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light")
      : mode;
    document.documentElement.setAttribute("data-theme", resolved);
    const btn = document.getElementById("themeBtn");
    if (btn) {
      btn.textContent = resolved === "dark" ? "Light" : "Dark";
      btn.setAttribute("aria-label", `Switch to ${resolved === "dark" ? "light" : "dark"} theme`);
    }
  },

  cycle() {
    const order = ["system", "light", "dark"];
    const cur = this.current();
    const next = order[(order.indexOf(cur) + 1) % order.length];
    this.apply(next);
    ToastModule.show(
      next === "system" ? "Theme: system" : `Theme: ${next}`,
      "info"
    );
  },
};
