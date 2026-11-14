window.ActivityModule = {
  KEY: "fileAppActivity",
  MAX: 40,

  log(action, detail = "") {
    const entry = {
      t: Date.now(),
      space: Api.space || "",
      action,
      detail: String(detail || "").slice(0, 120),
    };
    const list = this.all();
    list.unshift(entry);
    localStorage.setItem(this.KEY, JSON.stringify(list.slice(0, this.MAX)));
    this.render();
  },

  all() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY) || "[]");
    } catch (e) {
      return [];
    }
  },

  clear() {
    localStorage.removeItem(this.KEY);
    this.render();
  },

  render() {
    const el = document.getElementById("activityList");
    if (!el) return;
    const items = this.all().filter((x) => !Api.space || x.space === Api.space).slice(0, 8);
    el.innerHTML = "";
    if (!items.length) {
      el.innerHTML = '<li class="activity-empty">No recent activity on this device</li>';
      return;
    }
    items.forEach((item) => {
      const li = document.createElement("li");
      const when = new Date(item.t).toLocaleString();
      li.textContent = `${item.action}${item.detail ? ": " + item.detail : ""} · ${when}`;
      el.appendChild(li);
    });
  },

  init() {
    document.getElementById("clearActivityBtn")?.addEventListener("click", () => {
      this.clear();
      ToastModule.show("Activity cleared", "info");
    });
    this.render();
  },
};
