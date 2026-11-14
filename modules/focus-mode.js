window.FocusModeModule = {
  KEY: "fileAppFocus",

  init() {
    if (localStorage.getItem(this.KEY) === "1") this.apply(true);
    document.getElementById("focusModeBtn")?.addEventListener("click", () => this.toggle());
  },

  toggle() {
    const on = document.documentElement.getAttribute("data-focus") !== "1";
    this.apply(on);
    ToastModule.show(on ? "Focus mode on" : "Focus mode off", "info");
  },

  apply(on) {
    document.documentElement.setAttribute("data-focus", on ? "1" : "0");
    localStorage.setItem(this.KEY, on ? "1" : "0");
    const btn = document.getElementById("focusModeBtn");
    if (btn) btn.textContent = on ? "Focus ✓" : "Focus";
  },
};
