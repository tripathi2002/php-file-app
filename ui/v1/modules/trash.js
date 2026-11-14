window.TrashModule = {
  init() {
    document.getElementById("trashBtn")?.addEventListener("click", () => this.open());
    document.getElementById("purgeTrashBtn")?.addEventListener("click", () => this.purgeOld());
  },

  purgeOld() {
    ModalModule.show({
      title: "Purge old trash",
      message: "Permanently remove trash items older than 7 days in this space?",
      confirmText: "Purge",
      danger: true,
      onConfirm: async () => {
        try {
          const res = await Api.request("/purge-expired-trash.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ days: 7 }),
          });
          ToastModule.show(`Purged ${res.removed || 0} old item(s)`, "success");
        } catch (e) {
          ToastModule.show(e.message || "Purge failed", "error");
        }
      },
    });
  },

  async softDelete(name) {
    await Api.request("/trash.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "softDelete",
        name,
        folder: Api.currentFolder || "",
      }),
    });
  },

  async open() {
    if (Api.readOnly) {
      ToastModule.show("Public space is read-only", "error");
      return;
    }
    try {
      const data = await Api.request("/trash.php");
      const items = data.items || [];
      if (!items.length) {
        ModalModule.show({
          title: "Trash",
          message: "Trash is empty.",
          confirmText: "OK",
          cancelText: "Close",
        });
        return;
      }
      const lines = items
        .slice(0, 15)
        .map((i) => `• ${i.name}${i.folder ? " (" + i.folder + ")" : ""}`)
        .join("\n");
      ModalModule.show({
        title: `Trash (${items.length})`,
        message: lines + (items.length > 15 ? "\n…" : "") + "\n\nRestore newest, or empty all?",
        confirmText: "Restore newest",
        cancelText: "Empty trash",
        danger: false,
        onConfirm: async () => {
          try {
            await Api.request("/trash.php", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "restore", id: items[0].id }),
            });
            ToastModule.show("Restored", "success");
            FilesModule.loadFiles();
          } catch (e) {
            ToastModule.show(e.message || "Restore failed", "error");
          }
        },
        onCancel: () => {
          ModalModule.show({
            title: "Empty trash?",
            message: "Permanently delete all trashed files?",
            confirmText: "Empty",
            danger: true,
            onConfirm: async () => {
              try {
                const res = await Api.request("/trash.php", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "empty" }),
                });
                ToastModule.show(`Removed ${res.removed || 0}`, "success");
              } catch (e) {
                ToastModule.show(e.message || "Empty failed", "error");
              }
            },
          });
        },
      });
    } catch (e) {
      ToastModule.show(e.message || "Could not open trash", "error");
    }
  },
};
