// Hook already folders-first in FilesModule.visibleItems; this toggles files-first.
window.SortPreferenceModule = {
  KEY: "fileAppFoldersFirst",

  init() {
    this.foldersFirst = localStorage.getItem(this.KEY) !== "0";
    document.getElementById("foldersFirstBtn")?.addEventListener("click", () => this.toggle());
    this.sync();
  },

  toggle() {
    this.foldersFirst = !this.foldersFirst;
    localStorage.setItem(this.KEY, this.foldersFirst ? "1" : "0");
    this.sync();
    FilesModule.renderList();
    ToastModule.show(this.foldersFirst ? "Folders first" : "Files first", "info");
  },

  sync() {
    const btn = document.getElementById("foldersFirstBtn");
    if (btn) btn.textContent = this.foldersFirst ? "Folders first ✓" : "Files first";
  },

  preferFolders() {
    return this.foldersFirst !== false;
  },
};
