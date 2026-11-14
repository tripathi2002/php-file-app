window.HealthBanner = {
  el: null,

  init() {
    this.el = document.getElementById("healthBanner");
    if (!this.el) {
      this.el = document.createElement("div");
      this.el.id = "healthBanner";
      this.el.className = "health-banner";
      this.el.hidden = true;
      document.body.prepend(this.el);
    }
    this.check();
  },

  async check() {
    try {
      const t0 = performance.now();
      const res = await fetch(`${SERVER}/api/${APP_API_VERSION}/health.php`, {
        cache: "no-store",
      });
      const data = await res.json();
      const ms = Math.round(performance.now() - t0);
      if (!res.ok || data.status !== "ok") {
        this.show(
          "Storage is not writable. Uploads will fail until the server folders are fixed."
        );
      } else {
        this.hide();
        if (ms > 1200) {
          ToastModule.show?.(`API is slow (${ms} ms)`, "info");
        }
      }
      try {
        await fetch(`${SERVER}/api/${APP_API_VERSION}/ping.php?space=${encodeURIComponent(Api.space || "public")}`, {
          cache: "no-store",
          headers: Api.authHeaders?.() || {},
        });
      } catch (e) {}
    } catch (e) {
      this.show("Cannot reach the API health check.");
    }
  },

  show(message) {
    this.el.textContent = message;
    this.el.hidden = false;
  },

  hide() {
    this.el.hidden = true;
    this.el.textContent = "";
  },
};
