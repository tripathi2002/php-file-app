window.RecentModule = {
  KEY: "fileAppRecent",
  MAX: 12,

  remember(file) {
    if (!file?.name) return;
    const entry = {
      name: file.name,
      folder: file.folder || Api.currentFolder || "",
      space: Api.space || "personal",
      mime: file.mime || "",
      ext: file.ext || "",
      viewUrl: file.viewUrl || "",
      downloadUrl: file.downloadUrl || "",
      t: Date.now(),
    };
    let list = this.all().filter(
      (x) => !(x.space === entry.space && x.folder === entry.folder && x.name === entry.name)
    );
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

  render() {
    const el = document.getElementById("recentStrip");
    if (!el) return;
    const items = this.all().filter((x) => x.space === (Api.space || "personal")).slice(0, 8);
    el.innerHTML = "";
    if (!items.length) {
      el.hidden = true;
      return;
    }
    el.hidden = false;
    items.forEach((item) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "recent-chip";
      btn.textContent = item.name;
      btn.title = (item.folder ? item.folder + "/" : "") + item.name;
      btn.addEventListener("click", () => {
        if ((item.folder || "") !== (Api.currentFolder || "")) {
          Api.currentFolder = item.folder || "";
          FilesModule.loadFiles().then(() => {
            const match = (FilesModule.files || []).find((f) => f.name === item.name);
            if (match) PreviewModule.open(match);
            else ToastModule.show("File not found here anymore", "error");
          });
        } else {
          const match = (FilesModule.files || []).find((f) => f.name === item.name);
          if (match) PreviewModule.open(match);
          else ToastModule.show("File not found here anymore", "error");
        }
      });
      el.appendChild(btn);
    });
  },

  init() {
    this.render();
  },
};
