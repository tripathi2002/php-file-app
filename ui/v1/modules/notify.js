window.NotifyModule = {
  enabled: localStorage.getItem("fileAppNotify") === "1",

  init() {
    const btn = document.getElementById("notifyBtn");
    if (btn) {
      btn.addEventListener("click", () => this.toggle());
      this.syncBtn();
    }
  },

  syncBtn() {
    const btn = document.getElementById("notifyBtn");
    if (btn) btn.textContent = this.enabled ? "Alerts on" : "Alerts";
  },

  async toggle() {
    if (!("Notification" in window)) {
      ToastModule.show("Notifications not supported", "error");
      return;
    }
    if (!this.enabled) {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        ToastModule.show("Permission denied", "error");
        return;
      }
      this.enabled = true;
      localStorage.setItem("fileAppNotify", "1");
      ToastModule.show("Upload alerts on", "success");
    } else {
      this.enabled = false;
      localStorage.setItem("fileAppNotify", "0");
      ToastModule.show("Upload alerts off", "info");
    }
    this.syncBtn();
  },

  ping(title, body) {
    if (!this.enabled || !("Notification" in window) || Notification.permission !== "granted") {
      return;
    }
    if (document.visibilityState === "visible") return;
    try {
      new Notification(title, { body, silent: true });
    } catch (e) {}
  },
};
