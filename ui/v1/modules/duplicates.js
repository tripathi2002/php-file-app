window.DuplicatesModule = {
  init() {
    document.getElementById("dupesBtn")?.addEventListener("click", () => this.show());
  },

  async show() {
    try {
      const data = await Api.request("/duplicate-check.php");
      const groups = data.groups || [];
      if (!groups.length) {
        ToastModule.show("No duplicate filenames found", "success");
        return;
      }
      const lines = groups
        .slice(0, 12)
        .map((g) => {
          const locs = (g.locations || [])
            .map((l) => (l.folder ? l.folder + "/" : "") + l.name)
            .join(" | ");
          return `• ${g.name} ×${g.count}\n  ${locs}`;
        })
        .join("\n");
      ModalModule.show({
        title: `Duplicates (${data.groupCount})`,
        message: lines,
        confirmText: "Open first",
        cancelText: "Close",
        onConfirm: () => {
          const first = groups[0]?.locations?.[0];
          if (first) FilesModule.openFolder(first.folder || "");
        },
      });
    } catch (e) {
      ToastModule.show(e.message || "Duplicate scan failed", "error");
    }
  },
};
