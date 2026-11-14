window.PasteUploadModule = {
  init() {
    document.addEventListener("paste", (e) => this.onPaste(e));
    const listCard = document.querySelector(".file-list");
    if (!listCard) return;

    ["dragenter", "dragover", "dragleave", "drop"].forEach((name) => {
      listCard.addEventListener(name, (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
      });
    });
    listCard.addEventListener("dragover", () => listCard.classList.add("drop-target"));
    listCard.addEventListener("dragleave", () => listCard.classList.remove("drop-target"));
    listCard.addEventListener("drop", (e) => {
      listCard.classList.remove("drop-target");
      if (Api.readOnly || !canUseCurrentSpace()) return;
      const files = Array.from(e.dataTransfer.files || []);
      if (!files.length) return;
      openUpload();
      UploadModule.handleFiles(files);
    });
  },

  onPaste(e) {
    if (document.getElementById("loginGate")?.classList.contains("show")) return;
    if (Api.readOnly || !canUseCurrentSpace()) return;
    const items = Array.from(e.clipboardData?.items || []);
    const files = [];
    items.forEach((item, i) => {
      if (item.kind !== "file") return;
      const file = item.getAsFile();
      if (!file) return;
      if (!file.name || file.name === "image.png") {
        const ext = (file.type.split("/")[1] || "png").replace("jpeg", "jpg");
        files.push(new File([file], `paste-${Date.now()}-${i}.${ext}`, { type: file.type }));
      } else {
        files.push(file);
      }
    });
    if (!files.length) return;
    e.preventDefault();
    openUpload();
    UploadModule.handleFiles(files);
    ToastModule.show(`Pasted ${files.length} file(s)`, "info");
  },
};
