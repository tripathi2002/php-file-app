window.ClipboardPathModule = {
  init() {
    document.addEventListener("keydown", (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "l") return;
      const tag = (e.target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (document.getElementById("loginGate")?.classList.contains("show")) return;
      e.preventDefault();
      const path = Api.currentFolder || "(root)";
      navigator.clipboard?.writeText(path).then(
        () => ToastModule.show(`Path copied: ${path}`, "success"),
        () => prompt("Current folder:", path)
      );
    });
  },
};
