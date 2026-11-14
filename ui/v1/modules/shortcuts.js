window.ShortcutsModule = {
  init() {
    document.addEventListener("keydown", (e) => this.onKey(e));
  },

  isTypingTarget(el) {
    if (!el) return false;
    const tag = (el.tagName || "").toLowerCase();
    return tag === "input" || tag === "textarea" || tag === "select" || el.isContentEditable;
  },

  onKey(e) {
    if (this.isTypingTarget(e.target)) {
      if (e.key === "Escape") e.target.blur();
      return;
    }
    if (document.getElementById("loginGate")?.classList.contains("show")) return;
    if (document.getElementById("previewOverlay")?.classList.contains("show")) return;

    if (e.key === "/" && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      document.getElementById("fileSearch")?.focus();
      return;
    }
    if ((e.key === "u" || e.key === "U") && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      openUpload();
      return;
    }
    if ((e.key === "n" || e.key === "N") && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      FilesModule.createFolder();
      return;
    }
    if ((e.key === "t" || e.key === "T") && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      FilesModule.createNote?.();
      return;
    }
    if ((e.key === "r" || e.key === "R") && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      FilesModule.loadFiles();
      ToastModule.show("Refreshed", "info");
      return;
    }
    if ((e.key === "a" || e.key === "A") && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      FilesModule.selectAllVisible?.();
      return;
    }
    if (e.key === "Delete" || e.key === "Backspace") {
      if (FilesModule.selected?.size) {
        e.preventDefault();
        FilesModule.batchDelete?.();
      }
      return;
    }
    if (e.key === "Escape") {
      closeUpload();
      FilesModule.clearSelection?.();
    }
  },
};
