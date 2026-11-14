window.SoundModule = {
  enabled: localStorage.getItem("fileAppSound") === "1",
  ctx: null,

  init() {
    document.getElementById("soundBtn")?.addEventListener("click", () => this.toggle());
    this.sync();
  },

  sync() {
    const btn = document.getElementById("soundBtn");
    if (btn) btn.textContent = this.enabled ? "Sound ✓" : "Sound";
  },

  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem("fileAppSound", this.enabled ? "1" : "0");
    this.sync();
    ToastModule.show(this.enabled ? "Sounds on" : "Sounds off", "info");
    if (this.enabled) this.beep(880, 0.05);
  },

  beep(freq = 660, dur = 0.08) {
    if (!this.enabled) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = this.ctx || new Ctx();
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.frequency.value = freq;
      g.gain.value = 0.03;
      o.connect(g);
      g.connect(this.ctx.destination);
      o.start();
      o.stop(this.ctx.currentTime + dur);
    } catch (e) {}
  },

  success() {
    this.beep(880, 0.07);
  },

  error() {
    this.beep(220, 0.12);
  },
};
