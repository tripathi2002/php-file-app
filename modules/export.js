window.ExportModule = {
  init() {
    document.getElementById("exportBtn")?.addEventListener("click", () => this.exportCsv());
  },

  exportCsv() {
    const rows = [["type", "name", "folder", "size", "mtime", "mime"]];
    (FilesModule.folders || []).forEach((f) => {
      rows.push(["folder", f.name, Api.currentFolder || "", "", f.mtime || "", ""]);
    });
    (FilesModule.files || []).forEach((f) => {
      rows.push([
        "file",
        f.name,
        f.folder || Api.currentFolder || "",
        f.size || 0,
        f.mtime || "",
        f.mime || "",
      ]);
    });
    const csv = rows
      .map((r) =>
        r
          .map((cell) => {
            const s = String(cell ?? "");
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `files-${Api.space || "space"}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    ToastModule.show("CSV exported", "success");
    ActivityModule.log?.("Exported CSV");
  },
};
