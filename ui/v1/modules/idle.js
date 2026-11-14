window.IdleModule = {
  timer: null,
  minutes: 30,

  init() {
    ["click", "keydown", "touchstart", "mousemove"].forEach((evt) => {
      document.addEventListener(evt, () => this.bump(), { passive: true });
    });
    this.bump();
  },

  bump() {
    clearTimeout(this.timer);
    if (Api.space !== "personal" || !Api.getAccessKey()) return;
    this.timer = setTimeout(() => this.lock(), this.minutes * 60 * 1000);
  },

  lock() {
    if (Api.space !== "personal" || !Api.getAccessKey()) return;
    ToastModule.show("Locked after idle — enter PIN again", "info");
    AuthGate.logout?.();
  },
};
