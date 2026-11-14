window.CopyFolderUrlModule = {
  init() {
    document.getElementById("copyFolderUrlBtn")?.addEventListener("click", () => this.copy());
  },

  async copy() {
    const url = new URL(window.location.href);
    url.hash = "";
    url.searchParams.set("space", Api.space || "personal");
    if (Api.currentFolder) url.searchParams.set("folder", Api.currentFolder);
    else url.searchParams.delete("folder");
    try {
      await navigator.clipboard.writeText(url.toString());
      ToastModule.show("Folder URL copied", "success");
    } catch (e) {
      prompt("Folder URL:", url.toString());
    }
  },
};
