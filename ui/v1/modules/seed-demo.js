window.SeedDemoModule = {
  init() {
    document.getElementById("seedDemoBtn")?.addEventListener("click", () => this.run());
  },

  async run() {
    if (Api.readOnly) {
      ToastModule.show("Public space is read-only", "error");
      return;
    }
    if (!canUseCurrentSpace()) {
      AuthGate.prompt();
      return;
    }
    ModalModule.show({
      title: "Seed demo notes?",
      message: "Creates a Demo folder with a couple of sample .txt notes in the current space.",
      confirmText: "Seed",
      onConfirm: async () => {
        try {
          await Api.request("/mkdir-path.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ folder: Api.currentFolder || "", path: "Demo" }),
          }).catch(() => ({}));
          const folder = [Api.currentFolder, "Demo"].filter(Boolean).join("/");
          await Api.request("/write.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              folder,
              name: "welcome.txt",
              content:
                "Welcome to File Spaces.\n\nPublic = shared.\nPersonal = mobile + PIN.\n",
              overwrite: true,
            }),
          });
          await Api.request("/write.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              folder,
              name: "tips.md",
              content:
                "# Tips\n\n- Press ? for shortcuts\n- More → Trash to restore deletes\n- Deep search finds across folders\n",
              overwrite: true,
            }),
          });
          ToastModule.show("Demo folder ready", "success");
          FilesModule.openFolder(folder);
        } catch (e) {
          ToastModule.show(e.message || "Seed failed", "error");
        }
      },
    });
  },
};
