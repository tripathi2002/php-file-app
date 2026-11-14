window.AutoRefreshModule = {
  timer: null,
  seconds: 0,

  init() {
    document.getElementById("autoRefreshBtn")?.addEventListener("click", () => this.cycle());
    this.sync();
  },

  cycle() {
    const order = [0, 30, 60, 120];
    const idx = order.indexOf(this.seconds);
    this.seconds = order[(idx + 1) % order.length];
    this.apply();
    ToastModule.show(
      this.seconds ? `Auto-refresh every ${this.seconds}s` : "Auto-refresh off",
      "info"
    );
  },

  apply() {
    clearInterval(this.timer);
    this.timer = null;
    this.sync();
    if (!this.seconds) return;
    this.timer = setInterval(() => {
      if (document.getElementById("loginGate")?.classList.contains("show")) return;
      if (UploadModule?.isUploading) return;
      if (document.getElementById("previewOverlay")?.classList.contains("show")) return;
      if (canUseCurrentSpace()) FilesModule.loadFiles();
    }, this.seconds * 1000);
  },

  sync() {
    const btn = document.getElementById("autoRefreshBtn");
    if (!btn) return;
    btn.textContent = this.seconds ? `Auto ${this.seconds}s` : "Auto refresh";
  },
};
