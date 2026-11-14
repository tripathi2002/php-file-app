window.PrintListModule = {
  init() {
    document.getElementById("printListBtn")?.addEventListener("click", () => this.print());
  },

  print() {
    const { folders, files } = FilesModule.visibleItems();
    const rows = [
      ...folders.map((f) => `<tr><td>Folder</td><td>${escapeHtml(f.name)}</td><td></td><td></td></tr>`),
      ...files.map(
        (f) =>
          `<tr><td>File</td><td>${escapeHtml(f.name)}</td><td>${FilesModule.formatSize(f.size || 0)}</td><td>${FilesModule.formatDate(f.mtime || 0)}</td></tr>`
      ),
    ].join("");
    const w = window.open("", "_blank");
    if (!w) {
      ToastModule.show("Pop-up blocked", "error");
      return;
    }
    w.document.write(`<!doctype html><html><head><title>File list</title>
      <style>body{font-family:sans-serif;padding:24px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:6px 8px;text-align:left}h1{font-size:18px}</style>
      </head><body>
      <h1>${Api.space || ""} / ${Api.currentFolder || "root"}</h1>
      <table><thead><tr><th>Type</th><th>Name</th><th>Size</th><th>Modified</th></tr></thead>
      <tbody>${rows || "<tr><td colspan=4>Empty</td></tr>"}</tbody></table>
      <script>window.onload=()=>window.print()<\/script>
      </body></html>`);
    w.document.close();
  },
};

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
