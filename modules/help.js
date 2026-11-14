window.HelpModule = {
  init() {
    document.getElementById("helpBtn")?.addEventListener("click", () => this.show());
    document.addEventListener("keydown", (e) => {
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        const tag = (e.target?.tagName || "").toLowerCase();
        if (tag === "input" || tag === "textarea") return;
        e.preventDefault();
        this.show();
      }
    });
  },

  show() {
    ModalModule.show({
      title: "Shortcuts & tips",
      message: [
        "/  filter this folder",
        "U  upload",
        "N  new folder",
        "T  new note",
        "S  slideshow",
        "R  refresh",
        "Ctrl+A  select all",
        "Del  delete selected",
        "← →  preview prev/next",
        "",
        "Deep search scans every folder in the current space.",
        "Deleted files go to Trash (restore from Trash button).",
        "Public space is shared — prefer Personal for private files.",
      ].join("\n"),
      confirmText: "Got it",
      cancelText: "Close",
    });
  },
};
