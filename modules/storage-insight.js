window.StorageInsightModule = {
  init() {
    document.getElementById("storageInsightBtn")?.addEventListener("click", () => this.show());
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
