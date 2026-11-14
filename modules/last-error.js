window.LastErrorModule = {
  last: null,

  init() {
    document.getElementById("lastErrorBtn")?.addEventListener("click", () => this.show());
  },

  remember(err) {
    if (!err) return;
    this.last = {
      message: err.message || String(err),
      code: err.code || null,
      at: Date.now(),
    };
  },

  show() {
    if (!this.last) {
      ToastModule.show("No recent errors", "info");
      return;
    }
    const when = new Date(this.last.at).toLocaleString();
    ModalModule.show({
      title: "Last error",
      message: `${this.last.message}${this.last.code ? "\nCode: " + this.last.code : ""}\n\n${when}`,
      confirmText: "OK",
      cancelText: "Close",
    });
  },
};
