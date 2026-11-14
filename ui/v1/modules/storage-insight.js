window.StorageInsightModule = {
  init() {
    document.getElementById("storageInsightBtn")?.addEventListener("click", () => this.show());
    document.getElementById("extStatsBtn")?.addEventListener("click", () => this.showExts());
  },

  async showExts() {
    try {
      const data = await Api.request("/ext-stats.php");
      const lines = (data.extensions || [])
        .slice(0, 15)
        .map(
          (e) =>
            `.${e.ext === "(none)" ? "(none)" : e.ext} — ${e.count} files · ${this.formatSize(e.bytes)}`
        );
      ModalModule.show({
        title: "By extension",
        message: lines.join("\n") || "No files",
        confirmText: "OK",
        cancelText: "Close",
      });
    } catch (e) {
      ToastModule.show(e.message || "Could not load extension stats", "error");
    }
  },

  formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  },

  async show() {
    try {
      const data = await Api.request("/large-files.php?limit=15");
      const lines = (data.items || []).map(
        (i, idx) =>
          `${idx + 1}. ${i.name} — ${this.formatSize(i.size)}${i.folder ? " @" + i.folder : ""}`
      );
      ModalModule.show({
        title: "Largest files",
        message:
          `Tracking ${data.totalFiles} files (${this.formatSize(data.totalBytes)})\n\n` +
          (lines.join("\n") || "No files yet"),
        confirmText: "Open top",
        cancelText: "Close",
        onConfirm: () => {
          const top = (data.items || [])[0];
          if (!top) return;
          FilesModule.openFolder(top.folder || "");
        },
      });
    } catch (e) {
      ToastModule.show(e.message || "Could not load insight", "error");
    }
  },
};
