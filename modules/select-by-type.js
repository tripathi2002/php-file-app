window.SelectByTypeModule = {
  init() {
    document.getElementById("selectImagesBtn")?.addEventListener("click", () =>
      this.selectMime("image/")
    );
    document.getElementById("selectDocsBtn")?.addEventListener("click", () =>
      this.selectExts(["pdf", "txt", "md", "csv", "json", "doc", "docx", "xls", "xlsx", "ppt", "pptx"])
    );
  },

  selectMime(prefix) {
    FilesModule.clearSelection();
    (FilesModule.files || []).forEach((f) => {
      if ((f.mime || "").startsWith(prefix)) FilesModule.selected.add(`f:${f.name}`);
    });
    FilesModule.updateSelectionBar();
    FilesModule.renderList();
    ToastModule.show(`${FilesModule.selected.size} selected`, "info");
  },

  selectExts(exts) {
    FilesModule.clearSelection();
    (FilesModule.files || []).forEach((f) => {
      if (exts.includes((f.ext || "").toLowerCase())) FilesModule.selected.add(`f:${f.name}`);
    });
    FilesModule.updateSelectionBar();
    FilesModule.renderList();
    ToastModule.show(`${FilesModule.selected.size} selected`, "info");
  },
};
